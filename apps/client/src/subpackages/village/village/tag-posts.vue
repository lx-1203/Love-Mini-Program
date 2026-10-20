<script setup lang="ts">
/**
 * 标签聚合页
 * 展示指定话题标签下的所有帖子，支持下拉刷新和上拉加载更多
 */
import { ref } from "vue";
import { onLoad, onUnload, onShareAppMessage, onShareTimeline } from "@dcloudio/uni-app";
import { ROUTES } from "../../../constants/routes";
import { useI18n } from "vue-i18n";
import { openAppPath } from "../../../utils/navigation";
import { request } from "../../../services/http";
import { appEnv } from "../../../services/env";
import { IMAGE_PATHS } from "../../../config/images";
import { TOAST_DURATION } from "../../../constants/limits";
// 修复 no-duplicate-imports：合并 ../../stores/village 的重复 import
import { useVillageStore, formatRelativeTime, type PostItem } from "../../../stores/village";
import { useMock } from "../../../stores/helpers/use-mock";
// R4-batch2: mock 标签帖子数据源（仅 apiMode === "mock" 分支使用，real 模式不读取）
import { mockTagPosts, mockPosts } from "../../../stores/village/mock-data";
// MP-R7-GUEST-LANDING：游客进入标签聚合页即引导到登录/注册（裁定：setup/引导链路也不豁免）
import { guideGuestToLogin } from "../../../guards/guest-access";

/** 状态/互动图标（emoji 实体替换为 SVG） */
const stateIcons = {
  error: IMAGE_PATHS.ICONS_EMOJI.WARNING,
  empty: IMAGE_PATHS.ICONS_EMOJI.BOOKMARK,
  comment: IMAGE_PATHS.ICONS_EMOJI.CHAT,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  heartFilled: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED,
  share: IMAGE_PATHS.ICONS_COMMON.SHARE_ICON_SVG,
} as const;

/** Phase 4.4 验收 · 帖子点赞（2026-08-08 论坛互动真实化：接入 villageStore.likePost，后端为准） */
async function toggleLike(post: PostItem): Promise<void> {
  // MP-R2-TAGPOSTS-001：mock 模式本页 posts 不在 store 列表中，likePost 必抛
  // 「帖子不存在」——mock 直接翻转本地状态；real 走 store 真实接口
  if (useMock()) {
    post.isLiked = !post.isLiked;
    post.likes = Math.max(0, post.likes + (post.isLiked ? 1 : -1));
    return;
  }
  try {
    await villageStore.likePost(post.id);
    // R4-00092：store 的乐观更新仅作用于 store 内部列表，本页为独立本地列表，
    // 需在服务端 toggle 成功后同步本地点赞态/计数，避免"点赞状态不回显"。
    post.isLiked = !post.isLiked;
    post.likes = Math.max(0, post.likes + (post.isLiked ? 1 : -1));
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : t("village.likeFailed"),
      icon: "none",
    });
    console.error("点赞失败:", error);
  }
}

/** Phase 4.4 验收 · 帖子分享（引导使用微信转发菜单，H5 提示说明） */
function handleSharePost(post: PostItem): void {
  // mp-weixin：开启转发菜单；H5：提示说明（浏览器环境无原生分享）
  try {
    uni.showShareMenu({
      withShareTicket: true,
      menus: ["shareAppMessage", "shareTimeline"],
    });
  } catch (_e) {
    // H5 端 showShareMenu 不支持时静默降级
  }
  uni.showToast({
    title: t("village.tagPosts.shareHint", { author: post.author.name }),
    icon: "none",
    duration: TOAST_DURATION.NORMAL_MS,
  });
}
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../../utils/media";
// R10-P1-003：注入 --statusbar/--capsule-right（DevTools env(safe-area-inset-top) 恒 0，标题叠印状态栏）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const villageStore = useVillageStore();
const { t } = useI18n();


/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 */
// R4-00159：页面卸载时清理 village store 定时器/请求资源
onUnload(() => {
  villageStore.dispose();
});

/** 当前标签名称 */
const tagName = ref("");
/** 帖子列表 */
const posts = ref<PostItem[]>([]);
/** 加载状态 */
const loading = ref(false);
/** 是否正在刷新 */
const isRefreshing = ref(false);
/** 是否正在加载更多 */
const isLoadingMore = ref(false);
/**
 * 当前页码（R4-00093：改为 1 基分页，与 /posts 契约分页口径一致；
 * 此前 0 基导致与契约约定漂移，联调易出错）
 * R6-L04-D01 补充：本页**内部状态**是 1 基，但 `/post-tags/posts` 端点本身是 0 基
 * （见 loadPosts 内注释），换算只做在请求出口（`page=${currentPageNum - 1}`），
 * 不要把这里改回 0 基——mock 分支的起点算式与 hasMore 判定都以 1 基为准。
 */
const page = ref(1);
/** 是否还有更多 */
const hasMore = ref(true);
/** 错误信息 */
const errorMessage = ref("");

/** 每页数量 */
const PAGE_SIZE = 20;
/** Mock 模式模拟网络延迟（R4-batch4：魔法数字提取） */
const MOCK_LOAD_DELAY_MS = 600;
/** 缺失 tagName 参数时提示后返回的延时（R4-batch4：魔法数字提取） */
const MISSING_PARAM_NAV_DELAY_MS = 600;

/**
 * 加载标签下的帖子列表
 * @param reset - 是否重置列表
 */
async function loadPosts(reset = true) {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";

  // R4-00093：1 基分页（首页=1），与 /posts 契约一致
  const currentPageNum = reset ? 1 : page.value + 1;

  try {
    if (appEnv.apiMode === "mock") {
      // Mock 模式：模拟标签帖子数据
      await new Promise((r) => setTimeout(r, MOCK_LOAD_DELAY_MS));
      const mockTagPosts = getMockTagPosts(tagName.value);
      // MP-R1-TAGPOSTS-001（2026-09-20）：1 基页码取片起点应为 (页码-1)*PAGE_SIZE，
      // 原 from=page*PAGE_SIZE 整体错位一页——第 1 页从第 21 条取，mock 共 6 条恒空列表
      const from = (currentPageNum - 1) * PAGE_SIZE;
      const to = Math.min(from + PAGE_SIZE, mockTagPosts.length);
      const pageItems = from < mockTagPosts.length ? mockTagPosts.slice(from, to) : [];
      posts.value = reset ? pageItems : [...posts.value, ...pageItems];
      hasMore.value = to < mockTagPosts.length;
      page.value = currentPageNum;
      return;
    }

    // R6-L04-D01（P0，本条唯一病灶就在这一行的基址换算）：
    // 后端 `GET /api/v1/post-tags/posts` 是 **0 基**契约——PostTagController.java:63 javadoc
    // 逐字「页码（从 0 开始，默认 0）」、:71 `defaultValue = "0"` + `@Min(0)`，
    // RealPostTagService.java:103-105 直接 `PageRequest.of(page, size, …)`（Spring 0 基）。
    // 同族 `/posts*`（VillageController.java:77/186/261/382 `defaultValue = "1"` + `@Min(1)`
    // + 参数名 pageSize）才是 1 基。R4-00093 把「1 基」当成全站口径一并写进本请求，
    // ⇒ 首屏把 1 原样送出 = 跳过 0 基首页。真接口复核（identity A 铸票后 curl，读数见
    // tmp/qa/lanes/R6fix/F4-report.md）：
    //   ?tagName=运动&page=0&size=20 → 200，2 条（id 406,398）
    //   ?tagName=运动&page=1&size=20 → 200，`[]`（2 字节）  ← 帧上恒空态的直接成因
    // 修法：页面内部状态继续保持 1 基（与 mock 分支 / hasMore 判定 / R4-00093 口径一致），
    // 只在**本端点出口**换算成 0 基偏移。端点侧统一为 1 基属后端契约改动 ⇒ 已登记 F9 车道。
    // R4-00092：响应类型补充可选互动字段（后端返回时直接映射回显，
    // 缺失时兜底 false，保证「点赞/收藏/置顶回显」真实化）
    const data = await request<Array<{
      id: number; title: string; summary: string;
      author: { userId: number; nickname: string; avatarUrl: string; campusName: string };
      category: string; tags: string[];
      likeCount: number; commentCount: number; shareCount: number;
      favoriteCount?: number; viewCount?: number;
      createdAt: string; isHot: boolean; isAlumni: boolean;
      isLiked?: boolean; isFollowed?: boolean; isShared?: boolean; isFavorite?: boolean;
    }>>({
      url: `/post-tags/posts?tagName=${encodeURIComponent(tagName.value)}&page=${currentPageNum - 1}&size=${PAGE_SIZE}`,
      method: "GET",
    });

    const newPosts: PostItem[] = data.map((raw) => ({
      id: String(raw.id),
      author: {
        userId: String(raw.author.userId),
        name: raw.author.nickname,
        avatar: raw.author.avatarUrl || "",
        headline: raw.author.campusName || "",
        campusName: raw.author.campusName,
      },
      categoryId: raw.category,
      title: raw.title,
      content: raw.summary,
      images: [],
      tags: raw.tags,
      likes: raw.likeCount,
      comments: raw.commentCount,
      shares: raw.shareCount,
      isLiked: raw.isLiked ?? false,
      isFollowed: raw.isFollowed ?? false,
      isShared: raw.isShared ?? false,
      isAlumni: raw.isAlumni ?? false,
      // 2026-08-08 论坛互动真实化：收藏/浏览量透传（标签页后端可能缺失，兜底）
      favorites: raw.favoriteCount ?? 0,
      isFavorite: raw.isFavorite ?? false,
      views: raw.viewCount ?? 0,
      createdAt: raw.createdAt,
    }));

    posts.value = reset ? newPosts : [...posts.value, ...newPosts];
    hasMore.value = data.length >= PAGE_SIZE;
    page.value = currentPageNum;
  } catch (error) {
    // R4-00094：兜底文案走 i18n
    errorMessage.value = error instanceof Error ? error.message : t("village.tagPosts.loadFailed");
  } finally {
    loading.value = false;
    isRefreshing.value = false;
    isLoadingMore.value = false;
  }
}

/**
 * 下拉刷新
 */
function onRefresh() {
  isRefreshing.value = true;
  loadPosts(true);
}

/**
 * 上拉加载更多
 */
function onLoadMore() {
  if (isLoadingMore.value || loading.value || !hasMore.value) return;
  isLoadingMore.value = true;
  loadPosts(false);
}

/**
 * Mock 标签帖子数据
 *
 * R4-batch2：mock 作者 ID（1001-1006）与帖子数据已移入
 * stores/village/mock-data.ts 的 mockTagPosts（mock-only 数据源），
 * 本函数仅在 appEnv.apiMode === "mock" 分支被调用。
 */
function getMockTagPosts(tag: string): PostItem[] {
  // 过滤匹配的帖子
  // MP-R1-TAGPOSTS-201：聚合范围并入主 feed（mockPosts）——带「#摄影」等标签的
  // 主 feed 帖此前不在候选内，标签聚合页恒空态；浅拷贝避免与 store 列表同引用
  // （同 stores/village/index.ts setCurrentPost 的双 toggle 教训）。
  const lowerTag = tag.toLowerCase();
  return [...mockTagPosts, ...mockPosts]
    .filter((p) => p.tags.some((t) => t.toLowerCase().includes(lowerTag)))
    .map((p) => ({ ...p }));
}

/**
 * 点击帖子进入详情
 */
function goToDetail(postId: string) {
  villageStore.setCurrentPost(postId);
  // MP-R1-DETAIL-006：携带 ?id= 直达——setCurrentPost（real）为异步请求，不带 id 时
  // 详情页 onLoad 无 id 分支会在 currentPost 落定前误判「帖子不存在」并闪空态
  openAppPath(`/subpackages/village/village/detail?id=${encodeURIComponent(postId)}`);
}

/**
 * 返回上一页
 * MP-R1-TAGPOSTS-002（2026-09-20）：栈=1（分享卡/深链直开）时 navigateBack 无处可退；
 * 村口页（subpackages/village/village/index）不是 tabBar 页，switchTab 会静默失败，
 * 统一用 reLaunch 兜底（与 publish.vue leave() 同款守卫）。
 */
function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({ url: "/subpackages/village/village/index" });
  }
}

/**
 * 空态出口：去发帖（R6-L04-D05）。
 * 目标页取本页同族、且在村口页实际在用的发布页路由（village/index.vue:390 亦走
 * ROUTES.VILLAGE.POST），不新造路径。
 */
function goToPublish(): void {
  openAppPath(ROUTES.VILLAGE.POST);
}

onLoad((query) => {
  /* MP-R7-GUEST-LANDING：游客入口即拦。本页原先两条路径都会把游客留在内容页：
     ① 无 tagName ⇒ toast 后 goBack()（:258 navigateBack / :260 reLaunch 到村口列表，都是内容页）；
     ② 带 tagName 且 mock 带 ⇒ loadPosts() 走本地 fixture（:133），永远不触发 401 兜底。 */
  if (guideGuestToLogin()) return;
  const raw = query?.tagName;
  if (raw && typeof raw === "string" && raw.trim().length > 0) {
    tagName.value = decodeURIComponent(raw);
    loadPosts(true);
    return;
  }
  // P1-36：无 tagName 参数时提示并返回，不再发空请求
  uni.showToast({ title: t("village.tagPostsMissingParam"), icon: "none" });
  // MP-R1-TAGPOSTS-002：复用 goBack 守卫——原 switchTab 到非 tabBar 村口页静默失败
  setTimeout(goBack, MISSING_PARAM_NAV_DELAY_MS);
});

/**
 * 标签话题页分享（2026-08-10 A3 修复）：
 * 页面 :52 调用了 showShareMenu 但此前无 onShareAppMessage 处理器，
 * 右上角分享只会走微信默认截图分享——补上自定义卡片。
 */
onShareAppMessage(() => ({
  title: t("share.shareTagPosts", { tag: tagName.value }),
  path: `${ROUTES.VILLAGE.TAG_POSTS}?tagName=${encodeURIComponent(tagName.value)}`,
}));

/** 朋友圈分享（query 带标签名） */
onShareTimeline(() => ({
  title: t("share.shareTagPosts", { tag: tagName.value }),
  query: `tagName=${encodeURIComponent(tagName.value)}`,
}));
</script>

<template>
  <view class="tag-posts-page" :style="menuStyleVars">
    <!-- 顶部导航栏 -->
    <view class="tag-header">
      <!-- R8-L03-D12（P2 素材缺失）：返回位此前是一枚 28rpx 白字「返回」（帧实测 x8..40 是
           四个汉字宽度的文字块），与相邻 history/detail/campus 页头的 BACK 箭头不同形。
           换成仓内既有 BACK 素材（IMAGE_PATHS.ICONS_V2.BACK，与 ICONS_COMMON.BACK 同图形、
           深墨 #333 描边；已用 PNG 逐像素核过两枚墨色：common/back.png 折线是 #94A2B7 蓝灰
           压白底仅 1.6:1（location.vue:174 的 R7-L10-D09 就是为此换掉的），v2/back.png 是
           #333333），40rpx 盒 + aspectFit 与 history.vue:168 同规格，并给白色圆底承托深色墨迹。
           aria-label 保留。 -->
      <view class="tag-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <image class="tag-header__back-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_V2.BACK)" mode="aspectFit" alt="" />
      </view>
      <!-- R11-N4：缺参时 tagName 为空会渲染裸「#」，改为占位标题
           （键路径修正：village.tagFallbackTitle 在 locales/zh-CN.ts 里不存在，
           实际键是 village.tagPosts.tagFallbackTitle，原写法会把键名当文案渲染） -->
      <text class="tag-header__title">{{ tagName ? "#" + tagName : t("village.tagPosts.tagFallbackTitle") }}</text>
      <view class="tag-header__spacer" />
    </view>

    <!-- R8-L03-D10（P2 需新建）：标签页此前导航带之下 y98 直接进列表，与 circle-home 同族页
         相比少一整个信息层。补标签头卡＝#标签名 + 该标签下帖子数 + 内容入口按钮。
         数据全部来自本页既有状态（tagName / posts.length），按钮走既有 goToPublish()
         （→ ROUTES.VILLAGE.POST，R6-L04-D05 已裁定同族出口）；「关注/参与标签」后端无字段，
         不在前端编造 ⇒ 入口取真实可用的「去发布」。文案复用既有键，locales 不在本车道可写集。 -->
    <view class="tag-hero">
      <view class="tag-hero__main">
        <text class="tag-hero__name">{{ tagName ? "#" + tagName : t("village.tagPosts.tagFallbackTitle") }}</text>
        <text v-if="!loading" class="tag-hero__count">{{ t("village.history.count", { n: posts.length }) }}</text>
      </view>
      <view
        class="tag-hero__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('circle.topicsEmptyAction')"
        @tap="goToPublish"
      >
        <text class="tag-hero__btn-text">{{ t("circle.topicsEmptyAction") }}</text>
      </view>
    </view>

    <!-- 帖子列表 -->
    <scroll-view
      class="post-feed"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- 加载状态 -->
      <view v-if="loading && posts.length === 0" class="feed-state">
        <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('common.loading')" />
        <text class="feed-state__text">{{ t("village.tagPosts.loadingPosts") }}</text>
      </view>

      <!-- 错误状态 -->
      <!-- R6-L04-D02（P1 素材缺失）：本页 5 处状态/互动图标此前是裸 `:src`（未过 resolveMediaUrl），
           违反 §1.6 铁律 3「裸 :src 一律包 resolveMediaUrl / SafeImage」。真档下 assets/icons 一旦
           被 cdn-buckets 划到后端出图，裸绑包内路径就是空白。统一改为过解析器。 -->
      <view v-else-if="errorMessage && posts.length === 0" class="feed-state">
        <image class="feed-state__icon" :src="resolveMediaUrl(stateIcons.error)" mode="aspectFit" alt="" />
        <text class="feed-state__text">{{ errorMessage }}</text>
        <view class="feed-state__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="onRefresh">
          <text class="feed-state__btn-text">{{ t("common.retry") }}</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading && posts.length === 0" class="feed-state">
        <image class="feed-empty__icon" :src="resolveMediaUrl(stateIcons.empty)" mode="aspectFit" alt="" />
        <text class="feed-empty__title">{{ t("village.emptyPosts") }}</text>
        <text class="feed-empty__desc">{{ t("village.tagPosts.emptyDesc") }}</text>
        <!-- R6-L04-D05（P1 可达性）：空列表此前既无翻页也无终止信号、更无任何出口（死屏）。
             补一条「去发布」可达入口；文案复用既有键 circle.topicsEmptyAction（逐字「去发布」），
             不新增 i18n 键（locales 不在本车道可写集）。 -->
        <view
          class="feed-state__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('circle.topicsEmptyAction')"
          @tap="goToPublish"
        >
          <text class="feed-state__btn-text">{{ t("circle.topicsEmptyAction") }}</text>
        </view>
      </view>

      <!-- 帖子卡片列表 -->
      <view
        v-for="post in posts" :key="post.id"
        class="post-card list-item"
        @tap="goToDetail(post.id)"
      >
        <!-- 作者信息行 -->
        <view class="post-card__header">
          <view class="post-card__user">
            <view class="user-avatar">
              <image
                v-if="post.author.avatar"
                class="user-avatar__img"
                :src="resolveMediaUrl(post.author.avatar)"
                mode="aspectFill"
                lazy-load alt=""
              />
              <text v-else class="user-avatar__char">{{ post.author.name[0] }}</text>
            </view>
            <view class="user-info">
              <view class="user-info__name-row">
                <text class="user-info__name">{{ post.author.name }}</text>
              </view>
              <text class="user-info__headline">{{ post.author.headline }}</text>
            </view>
          </view>
        </view>

        <!-- 正文内容 -->
        <view class="post-card__body">
          <text class="post-card__content">{{ post.content }}</text>
        </view>

        <!-- 标签 -->
        <view v-if="post.tags.length > 0" class="post-card__tags">
          <text
            v-for="tag in post.tags" :key="tag"
            class="post-card__tag"
          >{{ tag }}</text>
        </view>

        <!-- 底部互动栏 -->
        <view class="post-card__footer">
          <text class="post-card__time">{{ formatRelativeTime(post.createdAt) }}</text>
          <view class="post-card__actions">
            <view
              class="action-btn press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('village.tagPosts.commentAria')"
              @tap.stop="goToDetail(post.id)"
            >
              <image class="action-btn__icon" :src="resolveMediaUrl(stateIcons.comment)" mode="aspectFit" alt="" />
              <text v-if="post.comments > 0" class="action-btn__count">{{ post.comments }}</text>
            </view>
            <view
              class="action-btn press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('village.tagPosts.likeAria')"
              :aria-pressed="post.isLiked"
              @tap.stop="toggleLike(post)"
            >
              <image class="action-btn__icon" :src="resolveMediaUrl(post.isLiked ? stateIcons.heartFilled : stateIcons.heart)" mode="aspectFit" alt="" />
              <text v-if="post.likes > 0" class="action-btn__count">{{ post.likes }}</text>
            </view>
            <view
              class="action-btn press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('village.tagPosts.shareAria')"
              @tap.stop="handleSharePost(post)"
            >
              <image class="action-btn__icon" :src="resolveMediaUrl(stateIcons.share)" mode="aspectFit" alt="" />
              <text v-if="post.shares > 0" class="action-btn__count">{{ post.shares }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多提示 -->
      <view v-if="isLoadingMore" class="load-more" role="status" aria-live="polite">
        <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('common.loading')" />
        <text class="load-more__text">{{ t("village.tagPosts.loadMore") }}</text>
      </view>
      <view v-else-if="!hasMore && posts.length > 0" class="load-more">
        <text class="load-more__text">{{ t("village.tagPosts.noMore") }}</text>
      </view>

      <!-- 底部留白 -->
      <view class="feed-bottom-spacer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand, #36C99A);
$green-light: var(--c-tint-green-50, #E8F9F4);
$pink-primary: var(--c-romance-500, #FF6B81);
$pink-light: var(--c-tint-pink-soft, #FFF0F5);
$bg-page: var(--c-bg-page, #EEF7F2);
/* ui-ux 修复：$text-primary 统一为文本次要色 token（原 --c-neutral-800 语义漂移） */
$text-primary: var(--c-text-primary, #222222);
/* ui-ux 修复：$text-secondary 语义应为文本次要色（原映射到 tertiary） */
$text-secondary: var(--c-text-secondary, #666666);
$text-tertiary: var(--c-text-quaternary, #B8B8C8);
$divider: var(--c-neutral-100, #EEF0F5);
$white: var(--c-neutral-0, #FFFFFF);
$red-badge: var(--c-error, #FF4757);

.tag-posts-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域。
     MP-R1-TAGPOSTS-102：必须定高（height:100% 而非 min-height:100%）——min-height
     让容器随内容增长，flex:1 的 scroll-view 失去高度约束 → 整页 window 滚动，
     @scrolltolower 翻页与 refresher 失效（对齐 campus/campus/index.vue 修复模式）。 */
  height: 100%;
  background: $bg-page;
  overflow: hidden;
}

/* ========== 顶部导航栏 ========== */
/* R8-L03-D08（P2 颜色token）：导航带此前 135deg 从 #46CFA1 渐变到 #EA9DA7——
   brand 绿与 romance 粉压在同一元素上（违反 §1.1 色义分工），且以 SCSS 变量 $green-primary
   起头未走 var(--c-*) 令牌。粉端整段删除，改为 brand 同族深档渐变 + var(--c-*) 令牌。
   端点深浅不是随手挑的：缺陷行 R8-L03-D11 要求白字 ≥4.5:1，WCAG 相对亮度复算
   ——brand-500 #36C99A=2.24:1、brand-600=2.81:1、brand-700 #1F8D6A=4.14:1 均不达标
   （正是缺陷行建议的「brand-600→brand-700」，复算后仍不够），
   brand-800 #156B51=6.45:1、brand-900 #0B4A38=10.24:1 全带最低 6.45:1 ⇒ 取 800→900。 */
.tag-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 24rpx) 32rpx 24rpx;
  background: linear-gradient(135deg, var(--c-brand-800, #156B51) 0%, var(--c-brand-900, #0B4A38) 100%);
}

/* R8-L03-D12：白色圆底承托深墨 BACK 箭头（与 history/detail 的 64rpx 圆钮同规格） */
.tag-header__back {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-container, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-header__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.tag-header__title {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  /* R4-02540：品牌渐变底上的反色文字改用 --c-text-inverse（深色模式自动适配）
     R8-L03-D11：底档加深到 brand-800/900 后，白字复算 6.45..10.24:1，过 4.5:1 */
  color: var(--c-text-inverse);
  text-shadow: 0 2rpx 8rpx var(--c-black-shadow-md, var(--c-black-shadow-md, rgba(0,0,0,0.1)));
}

.tag-header__spacer {
  min-width: 64rpx;
}

/* ========== 标签头卡（R8-L03-D10 新建） ========== */
.tag-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin: var(--section-gap, 24rpx) var(--page-padding, 32rpx) 0;
  padding: 28rpx;
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--card-radius, 40rpx);
  box-shadow: var(--s-card-soft, 0 1rpx 2rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)), 0 4rpx 12rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
}

.tag-hero__main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
}

.tag-hero__name {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tag-hero__count {
  /* §1.3：帖子数是要读的数据，取 --fs-base(24rpx=12px) 档，与 history.vue:348 .history-count 同口径 */
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
}

.tag-hero__btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  /* 白字压 brand-500 仅 2.24:1（复算），主操作用档取同族 brand-800 ⇒ 6.45:1 过 AA */
  background: var(--c-brand-800, #156B51);
}

.tag-hero__btn-text {
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: var(--c-text-inverse);
}

/* ========== 帖子列表容器 ========== */
.post-feed {
  flex: 1;
  overflow-y: auto;
}

/* ========== 状态提示 ========== */
/* R6-L04-D03（P2 位置）：原 `flex: 1` 写在 scroll-view 的直接子节点上——mp-weixin 的
   scroll-view 不是 flex 容器，子节点不参与主轴分配 ⇒ justify-content:center 无空间可用，
   空态整块吊在屏顶（帧实测 y=215–256px，而 feed 可视区中心应 ≈y=456px，下半屏 558px 全空）。
   改为让状态块自己占满 scroll-view 可视高度再居中；.post-feed 有确定高度
   （:462 定高修复，MP-R1-TAGPOSTS-102），故百分比高度可解。 */
.feed-state {
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 120rpx 40rpx;
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid $divider;
  border-top-color: $green-primary;
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-slowest, 600ms) linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.feed-state__icon {
  width: 80rpx;
  height: 80rpx;
  color: var(--c-text-tertiary);
}

/* R6-L04-D04：加载/错误提示与 .feed-empty__desc 同属正文级，一并离开 $text-tertiary，
   依据与对比度复算见 .feed-empty__desc 上方注释。 */
.feed-state__text {
  font-size: var(--fs-lg, 28rpx);
  color: $text-secondary;
  text-align: center;
  line-height: 1.6;
}

.feed-state__btn {
  padding: 18rpx 48rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-400, #36C99A) 100%);
  box-shadow: var(--s-brand-md, 0 4rpx 16rpx var(--c-brand-shadow-tint-mid, rgba(61, 201, 148, 0.20)));
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.feed-state__btn:active {
  transform: scale(0.96);
}
/* #endif */

.feed-state__btn-text {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-neutral-0, #ffffff);
  font-weight: 600;
}

.feed-empty__icon {
  width: 88rpx;
  height: 88rpx;
  color: var(--c-text-tertiary);
}

.feed-empty__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 600;
  color: $text-primary;
}

/* R6-L04-D04（P2 颜色token）：副文案是正文级说明，原走 $text-tertiary——而本文件 :449 把
   $text-tertiary 映射到 --c-text-quaternary（#9AA39F），压 --c-bg-page #EEF7F2 上复算对比度
   2.37:1（WCAG 相对亮度法，与卡片实测 2.35:1 同档），远低于 4.5:1。
   按卡片裁定「$text-tertiary 只留给角标/时间戳」，正文级两处（本行副文案 + 同组
   .feed-state__text 加载/错误提示）一并改走 --c-text-secondary（#4A524E）
   ⇒ 复算对比度 7.38:1，过 AA。 */
.feed-empty__desc {
  font-size: var(--fs-md, 26rpx);
  color: $text-secondary;
}

/* ========== 帖子卡片 ========== */
/* R8-L03-D13（P2 间距）：左右外缩 24rpx（帧上白卡 x13..365，两侧各 13px≈26rpx）比 §1.4
   页边距基线 32rpx 少 8rpx，上下 16rpx 也低于 --section-gap 24rpx（实测卡间隙 9px=18rpx）。
   改吃令牌，与 circles/detail、同页新建的标签头卡（.tag-hero）同一基线。 */
.post-card {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin: var(--section-gap, 24rpx) var(--page-padding, 32rpx);
  padding: 28rpx;
  /* R4-02540：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: var(--s-card-soft, 0 1rpx 2rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)), 0 4rpx 12rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.post-card:active {
  transform: scale(0.98);
}
/* #endif */

/* --- 作者信息行 --- */
.post-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.post-card__user {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, $green-light, $green-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar__img {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}

.user-avatar__char {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  /* R4-02540：品牌色底上的头像占位字改用 --c-text-inverse（深色模式自动适配） */
  color: var(--c-text-inverse);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.user-info__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.user-info__name {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: $text-primary;
  line-height: 1.2;
}

.user-info__headline {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- 正文内容 --- */
.post-card__body {
  padding: 0 4rpx;
}

.post-card__content {
  font-size: var(--fs-xl, 30rpx);
  color: $text-primary;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 6.8em;
  /* #endif */
}

/* --- 标签 --- */
.post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.post-card__tag {
  font-size: var(--fs-base, 24rpx);
  color: $green-primary;
  background: $green-light;
  padding: 8rpx 18rpx;
  border-radius: var(--r-full, 9999rpx);
  font-weight: 500;
}

/* --- 底部互动栏 --- */
.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid $divider;
}

.post-card__time {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.post-card__actions {
  display: flex;
  align-items: center;
  gap: 28rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 0;
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.action-btn:active {
  transform: scale(0.9);
}
/* #endif */

.action-btn__icon {
  width: 28rpx;
  height: 28rpx;
  color: $text-tertiary;
}

.action-btn__count {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
  font-weight: 500;
}

/* ========== 加载更多 & 底部留白 ========== */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 32rpx 0;
}

.load-more__text {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.feed-bottom-spacer {
  height: 100rpx;
}
</style>

