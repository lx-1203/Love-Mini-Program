<script setup lang="ts">
/**
 * 圈子主页（2026-09-02 W2 骨架补齐：对照理想效果图「圈子详情，摄影圈参考.png」）
 *
 * 结构（自上而下，与效果图一一对应）：
 *  1. Hero 头图：圈封面大图 + 返回 / 分享 / 更多（半透明圆底按钮）
 *  2. 圈子信息卡：圈头像 + 名称 + 热门徽章 + 简介 + 「x.xw 人加入 · N 条动态」
 *     + 朋友头像组「等 N 位朋友已加入」+ 绿色「加入圈子」按钮
 *  3. 标签 chips 行（摄影技巧 / 风景拍摄 / 人像写真 / 城市漫游）
 *  4. 多 Tab 栏：动态 / 精华 / 活动 / 作品墙 / 成员（激活态品牌绿下划线）
 *  5. 置顶公告卡（浅绿底 + 置顶徽章）
 *  6. 动态 feed：作者行（头像 + 昵称 + 校徽 pill + 时间）→ 话题标签 + 正文
 *     → 三图网格 → 点赞 / 评论互动行
 *  7. 「查看全部话题」链接（保留原 topics 话题列表链路）
 *  8. 底部固定栏：加入圈子（未加入）主按钮 + 发帖编辑浮动按钮
 *
 * 数据策略：
 *  - 圈子主体数据来自 circleStore（fetchCircles 后按 circleId 匹配），
 *    未命中时回退本地演示数据（骨架可独立渲染，不阻塞验收）；
 *  - 动态 feed / 标签 / 朋友头像为本地 mock —— TODO(后端): 圈内动态分页接口。
 *
 * 视觉纪律：
 *  - 品牌绿 var(--c-brand-500, #36C99A)（#36C99A 系）与 tabBar selectedColor 同源；
 *  - 图标全部使用 static SVG/PNG 资产（红线：禁用 emoji）。
 *
 * 2026-09-12 封面修复：圈名→封面统一走 config/circle-covers（circleCoverFor）。
 */
import { computed, ref, watch } from "vue";
import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCircleStore, type CircleItem } from "../../../stores/circle";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
import { circleCoverFor } from "../../../config/circle-covers";
import { resolveMediaUrl } from "../../../utils/media";
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import { useMock } from "../../../stores/helpers/use-mock";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";

const { t } = useI18n();
const circleStore = useCircleStore();
const { circles, loading } = storeToRefs(circleStore);
// 注入 --statusbar：hero 上的返回/分享按钮需避开状态栏（开发者工具 env 恒 0，原按钮被顶进刘海区不可见）
const { styleVars: menuStyleVars } = useMenuButtonRect();

/** 圈子 ID（onLoad 带入） */
const circleId = ref("");
/** 当前激活 Tab（动态/精华/活动/作品墙/成员） */
const activeTab = ref<"posts" | "featured" | "activities" | "works" | "members">("posts");

/** Tab 定义 → i18n key 映射（复用语言包已有圈子详情词条） */
const TAB_KEYS = ["posts", "featured", "activities", "works", "members"] as const;
const TAB_LABEL_KEYS: Record<(typeof TAB_KEYS)[number], string> = {
  posts: "circle.detailFeed",
  featured: "circle.detailHot",
  activities: "circle.detailActivitiesTab",
  works: "circle.detailWorks",
  members: "circle.detailMembersTab",
};

/** 本地演示圈（store 未命中时兜底，字段与 CircleItem 对齐） */
const FALLBACK_CIRCLE: CircleItem = {
  id: "circle-photo",
  name: "摄影圈",
  icon: IMAGE_PATHS.CIRCLE_COVERS.PHOTO,
  description: "用镜头记录生活的美好瞬间",
  memberCount: 12000,
  topicCount: 362,
  isJoined: false,
  friendJoinedCount: 8,
};

/** 传入 ID 的圈优先，未命中回退演示圈（mock 模式骨架不空屏）。
 *  MP-R4-CIRCLEHOME-01（2026-09-13 独立审查 IA-CIRCLEHOME-01）：real 模式下
 *  缺参/无效圈 id 不再静默套用演示圈——isUnknownCircle 标记后走真实空态，
 *  避免用户在 real 包看到成套虚构统计与演示动态且无任何异常标识。 */
const circle = computed<CircleItem>(() => {
  return circles.value.find((c) => c.id === circleId.value) || FALLBACK_CIRCLE;
});

/** real 模式且圈子未被 store 命中（缺参 / 无效 id / 列表拉取失败）。
 *  mock 模式保持原兜底（演示场景骨架不空屏）。
 *  R10-P1-001（2026-09-17 冷启动审查）：深链/冷启动直连时 store 尚未拉取完成，
 *  「未就绪」不能当「不存在」——先走骨架态，拉取落定后才允许判定未知圈，
 *  否则分享卡片直达有效圈子会先闪「圈子不存在或已解散」。 */
const circlesFetchSettled = ref(useMock());
const isUnknownCircle = computed<boolean>(() => {
  if (useMock()) return false;
  if (!circleId.value) return true;
  if (!circlesFetchSettled.value) return false;
  return !circles.value.some((c) => c.id === circleId.value);
});

/** 未命中圈空态吉祥物（mascot_cry.png，与 XunmiMascot sad 态同源） */
const NOT_FOUND_MASCOT = "/static/assets/images/mascot/mascot_cry.png";

/** 圈封面：统一走 config/circle-covers 单一映射（2026-09-12 修复图文不一致：
 *  本页原副本缺 阅读/宠物/考研/天文/篮球 等关键词，列表页显示专属封面、
 *  进主页却回退默认摄影图；现与列表页/首页兴趣推荐共用 circleCoverFor） */
const coverImage = computed<string>(() => circleCoverFor(circle.value.name));

/** 是否已加入（控制底部栏按钮态） */
const joined = computed(() => circle.value.isJoined);

/** 圈标签（本地 mock —— TODO(后端): 圈子标签字段）。
 *  MP-R1-CIRCLEHOME-001：real 模式不渲染写死演示标签（任何圈子都显示摄影技巧…） */
const circleTags = computed<string[]>(() =>
  useMock() ? ["摄影技巧", "风景拍摄", "人像写真", "城市漫游"] : []
);

/** 置顶公告（本地 mock —— TODO(后端): 圈公告接口）。
 *  MP-R1-CIRCLEHOME-001：real 模式不渲染写死演示公告 */
const pinnedNotice = computed<string>(() =>
  useMock() ? "【规约】友善交流，尊重原创，分享美好瞬间" : ""
);

/** 动态 feed 项（2026-09-12：真实数据来自 circleStore.fetchTopics，mock 仅兜底） */
interface FeedItem {
  id: string;
  nickname: string;
  /** 作者头像（MP-R1-CIRCLE-001：后端透传 users.avatar_url，空则回退默认头像） */
  avatar?: string;
  /** 后端话题无学校字段，真实数据为空则不渲染校徽 pill */
  school?: string;
  timeText: string;
  /** 话题标签（mock 专属；真实数据无该字段） */
  tag?: string;
  /** 话题标题（真实数据） */
  title?: string;
  content: string;
  images: string[];
  likes: number;
  comments: number;
  liked: boolean;
}

const feedItems = ref<FeedItem[]>([
  {
    id: "f1",
    nickname: "阿辰",
    school: "北京大学",
    timeText: "30 分钟前",
    tag: "校园风光",
    content: "周末去爬山拍到了云海，太震撼了！",
    images: [
      // R4：post-5 海岸悬崖山感不足，换 post-2 暗色云雾海岸（更贴近「爬山云海」语义）
      "/static/assets/images/posts/post-placeholder.jpg",
      "/static/assets/images/posts/post-2.jpg",
      "/static/assets/images/posts/post-8.jpg",
    ],
    likes: 256,
    comments: 32,
    liked: false,
  },
  {
    id: "f2",
    nickname: "光影捕手",
    school: "清华大学",
    timeText: "2 小时前",
    tag: "人像写真",
    content: "夕阳下的校园，氛围感拉满～",
    images: [
      IMAGE_PATHS.CIRCLE_COVERS.PHOTO,
      IMAGE_PATHS.CIRCLE_COVERS.MUSIC,
      IMAGE_PATHS.CIRCLE_COVERS.TRAVEL,
    ],
    likes: 128,
    comments: 18,
    liked: true,
  },
  {
    id: "f3",
    nickname: "老鹰视觉",
    school: "复旦大学",
    timeText: "3 小时前",
    tag: "器材交流",
    content: "最近入手了新镜头，分享一下使用感受～",
    images: [
      IMAGE_PATHS.CIRCLE_COVERS.PHOTO,
      IMAGE_PATHS.CIRCLE_COVERS.FOOD,
      IMAGE_PATHS.CIRCLE_COVERS.READING,
    ],
    likes: 89,
    comments: 12,
    liked: false,
  },
]);

/** 朋友头像组（本地 mock —— TODO(后端): 好友关系接口）。
 *  MP-R1-CIRCLEHOME-003（2026-09-20）：按圈 id 稳定取不同头像，修复三头像同图。 */
const FRIEND_AVATAR_POOL = [
  IMAGE_PATHS.PEOPLE.AVATAR_1,
  IMAGE_PATHS.PEOPLE.AVATAR_2,
  IMAGE_PATHS.PEOPLE.AVATAR_3,
];
const friendAvatars = computed<string[]>(() => {
  const seed = circle.value.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return [
    FRIEND_AVATAR_POOL[seed % 3] ?? IMAGE_PATHS.DEFAULT_AVATAR,
    FRIEND_AVATAR_POOL[(seed + 1) % 3] ?? IMAGE_PATHS.DEFAULT_AVATAR,
    FRIEND_AVATAR_POOL[(seed + 2) % 3] ?? IMAGE_PATHS.DEFAULT_AVATAR,
  ];
});

/** 朋友加入数展示（MP-R1-CIRCLEHOME-003）：真实字段优先；mock 种子圈缺该字段时
 *  按圈 id 稳定推导 5~12（与列表页 friendJoinCount 同规则），修复「等 0 位朋友已加入」。 */
const friendJoinedCount = computed<number>(() => {
  const raw = circle.value.friendJoinedCount;
  if (raw != null && raw > 0) return raw;
  if (!useMock()) return 0;
  const seed = circle.value.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return 5 + (seed % 8);
});

/**
 * ISO 时间 → 相对时间文案（x 分钟前 / x 小时前 / x 天前 / 日期）。
 * 后端 createdAt 为 "yyyy-MM-ddTHH:mm:ss"，无时区后缀按本地时区解析。
 */
function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
  if (diff < MIN) return "刚刚";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 圈内真实话题 → 动态 feed（2026-09-12：对齐理想图信息结构，替换原纯 mock）。
 *  MP-R1-CIRCLEHOME-001（2026-09-20）：改存响应式 ref —— 原 computed 每次重映射生成
 *  非响应式普通对象，toggleLike 原地修改不触发重渲染（点赞后计数不变、爱心不变色）。 */
const { currentTopics } = storeToRefs(circleStore);
const realFeed = ref<FeedItem[]>([]);
watch(
  [currentTopics, circleId],
  () => {
    realFeed.value = currentTopics.value
      .filter((tp) => !circleId.value || tp.circleId === circleId.value)
      .map((tp) => ({
        id: tp.id,
        nickname: tp.author?.name || "圈友",
        avatar: resolveMediaUrl(tp.author?.avatar || ""),
        timeText: relativeTime(tp.createdAt),
        title: tp.title,
        content: tp.content,
        images: (tp.images ?? []).slice(0, 3).map((img) => resolveMediaUrl(img)),
        likes: 0,
        comments: tp.replyCount ?? 0,
        liked: false,
      }));
  },
  { immediate: true }
);

/** 展示列表：真实话题优先，空/失败回退本地演示数据（骨架不空屏）。
 *  MP-R4-CIRCLEHOME-01：real 模式未知圈不回退演示动态（见 isUnknownCircle）。
 *  MP-R1-CIRCLEHOME-001：real 模式已知圈子暂无话题时同样不回退演示动态
 *  （原 IA-CIRCLEHOME-01 只修未知圈一半——真实圈空 feed 也渲染假校名/假点赞），
 *  空 feed 走空态；演示回退仅 mock 模式保留。 */
const displayFeed = computed<FeedItem[]>(() => {
  if (isUnknownCircle.value) return [];
  if (realFeed.value.length > 0) return realFeed.value;
  return useMock() ? feedItems.value : [];
});

onLoad((query) => {
  if (query?.circleId) {
    circleId.value = String(query.circleId);
  }
  // store 为空时补拉（复用列表页韧性逻辑：登录态/mock 判定由 store 内部处理）。
  // R10-P1-001：落定前 isUnknownCircle 恒 false（骨架态），防止冷启动误判「圈子不存在」。
  if (circles.value.length === 0 && !circleStore.loading) {
    circleStore
      .fetchCircles()
      .catch(() => {
        // 拉取失败：落定后走未知圈空态（与既有失败表现一致），不阻塞渲染
      })
      .finally(() => {
        circlesFetchSettled.value = true;
      });
  } else if (circleStore.loading) {
    // 列表页等前置页已在拉取：等本次拉取落定再判定，避免空列表窗口期误判
    const stopWatch = watch(loading, (pending) => {
      if (!pending) {
        circlesFetchSettled.value = true;
        stopWatch();
      }
    });
  } else {
    circlesFetchSettled.value = true;
  }
  // 动态 feed：真实圈内话题（失败/空回退本地演示数据，不阻塞渲染）
  // 分享直达时 circleId 可能为空——仅在有真实圈 id 时拉取，避免 mock 圈 id 打到后端 404
  if (circleId.value) {
    circleStore.fetchTopics(circleId.value, 1).catch(() => {
      // store 内部已置 errorMessage；本页静默回退 mock feed
    });
  }
});

// 分享卡片：圈名 + 封面
onShareAppMessage(() => ({
  title: circle.value.name,
  path: `${ROUTES.CIRCLES.HOME}?circleId=${circle.value.id}`,
}));

/**
 * 成员数格式化（1.2w / 3.4k / 原值，与兴趣圈列表页同规则）
 */
function formatMemberCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}w`;
  }
  // R21：对齐理想图（8,932 精确千分位），不用英文 k 单位
  if (count >= 1000) {
    return count.toLocaleString("en-US");
  }
  return String(count);
}

/** 热门徽章：成员数 ≥ 1w 展示（与列表页阈值一致） */
const isHot = computed(() => circle.value.memberCount >= 10000);

/**
 * 返回上一页；无栈时（分享直达）回兴趣圈列表
 */
function goBack(): void {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    openAppPath(ROUTES.CIRCLES.INDEX);
  }
}

/**
 * 加入 / 退出圈子（复用 store 真实接口）
 * MP-R1-REQ20-006：补 isJoining 防连点守卫——mock 毫秒级返回下快击×5 会交替
 * join/leave 造成成员数与按钮态抖动，real 下对 POST/DELETE 连发 5 次请求
 * （对齐全站 isSubmitting 惯例）
 */
const isJoining = ref(false);
async function toggleJoin(): Promise<void> {
  if (isJoining.value) return;
  isJoining.value = true;
  try {
    if (joined.value) {
      await circleStore.leaveCircle(circle.value.id);
    } else {
      await circleStore.joinCircle(circle.value.id);
    }
  } catch (e) {
    // MP-R1-CIRCLES-001：store 只置 errorMessage 后 rethrow，从不出 toast——补用户可见反馈
    uni.showToast({
      title: e instanceof Error && e.message ? e.message : t("apiErrors.operationFailed"),
      icon: "none",
    });
  } finally {
    isJoining.value = false;
  }
}

/**
 * 查看全部话题（保留原话题列表链路）
 */
function goToTopics(): void {
  openAppPath(`${ROUTES.CIRCLES.TOPICS}?circleId=${circle.value.id}`);
}

/**
 * 去圈内发帖（跳发布话题页）
 */
function goToPostTopic(): void {
  openAppPath(`${ROUTES.CIRCLES.POST_TOPIC}?circleId=${circle.value.id}`);
}

/**
 * 点赞（本地态翻转 —— TODO(后端): 点赞接口回填）
 */
function toggleLike(item: FeedItem): void {
  item.liked = !item.liked;
  item.likes += item.liked ? 1 : -1;
}

/**
 * 动态卡 more 图标操作菜单。
 * MP-R1-J20-004/MP-R1-REQ20-004：该图标此前无任何 @tap 处理器，点击零反馈（死按钮）；
 * 补 ActionSheet（复用页内既有链路：查看全部话题 / 去圈内发帖）。
 */
function onFeedMore(): void {
  uni.showActionSheet({
    itemList: [t("circle.home.viewAllTopics"), t("circle.home.postInCircle")],
    success: (res) => {
      if (res.tapIndex === 0) goToTopics();
      else if (res.tapIndex === 1) goToPostTopic();
    },
    fail: () => {
      // 用户取消：无需处理
    },
  });
}

/**
 * 动态卡点击 → 话题详情（2026-09-12：真实话题可进入详情互动）。
 * MP-R1-CIRCLEHOME-002（2026-09-20）：去掉「纯数字 id」白名单——原白名单把
 * mock 标准圈话题 id（如 "photo-topic-1"）与数字后端 id 之外的一切都静默拦下，
 * 卡片点击无响应。现对齐 topics.vue goToDetail：非空 id 直接跳详情
 * （详情页有完整的「话题不存在」降级态兜底）。
 */
function openFeedDetail(item: FeedItem): void {
  if (!item.id) return;
  openAppPath(`${ROUTES.CIRCLES.TOPIC_DETAIL}?topicId=${encodeURIComponent(item.id)}`);
}

/**
 * Tab 文案（成员 tab 拼接人数）
 */
/**
 * Tab 文案（成员 tab 拼接人数，与效果图「成员 1.2w」一致）
 */
function tabLabel(key: (typeof TAB_KEYS)[number]): string {
  if (key === "members") {
    return `${t(TAB_LABEL_KEYS.members)} ${formatMemberCount(circle.value.memberCount)}`;
  }
  return t(TAB_LABEL_KEYS[key]);
}
</script>

<template>
  <!-- MP-R4-CIRCLEHOME-01：real 模式缺参/无效圈 id → 真实空态（不再静默渲染演示圈+演示动态） -->
  <view v-if="isUnknownCircle" class="circle-home" :style="menuStyleVars">
    <view class="circle-notfound">
      <image class="circle-notfound__mascot" :src="NOT_FOUND_MASCOT" mode="aspectFit" />
      <text class="circle-notfound__title">圈子不存在或已解散</text>
      <text class="circle-notfound__desc">去看看别的圈子吧</text>
      <view class="circle-notfound__btn press-feedback" hover-class="press-feedback--active" @tap="goBack">
        <text class="circle-notfound__btn-text">返回</text>
      </view>
    </view>
  </view>
  <!-- R10-P1-001：冷启动/深链拉取未落定 → 骨架态，禁止提前渲染演示圈或误判未知圈 -->
  <view v-else-if="!circlesFetchSettled" class="circle-home" :style="menuStyleVars">
    <view class="circle-home-loading">
      <SkeletonBlock variant="list" :rows="4" :label="t('common.loading')" />
    </view>
  </view>
  <view v-else class="circle-home" :style="menuStyleVars">
    <!-- 1. Hero 头图 -->
    <view class="hero">
      <image class="hero-img" :src="coverImage" mode="aspectFill" />
      <view class="hero-actions">
        <view class="hero-btn" hover-class="hero-btn--active" @tap="goBack">
          <!-- R3：灰 chevron 在深色封面上不可见，改白色粗 chevron 文字 -->
          <text class="hero-btn-chevron">‹</text>
        </view>
        <view class="hero-actions-right">
          <!-- MP-R1-CIRCLEHOME-004（2026-09-20）：「分享」接通原生分享
               （button open-type="share" 触发本页 onShareAppMessage），不再是无事件死按钮 -->
          <button class="hero-btn hero-btn--share" open-type="share" hover-class="hero-btn--active" aria-label="分享圈子">
            <image class="hero-btn-icon" :src="IMAGE_PATHS.ICONS_SOCIAL.SHARE" mode="aspectFit" />
          </button>
        </view>
      </view>
      <!-- 顶部渐隐遮罩（保证白色按钮可读） -->
      <view class="hero-mask" />
    </view>

    <!-- 2. 圈子信息卡 -->
    <view class="info-card">
      <view class="info-main">
        <image class="info-avatar" :src="coverImage" mode="aspectFill" />
        <view class="info-body">
          <view class="info-title-row">
            <text class="info-name">{{ circle.name }}</text>
            <text v-if="isHot" class="info-hot">{{ t("circle.hotBadge") }}</text>
          </view>
          <text class="info-desc">{{ circle.description }}</text>
          <text class="info-meta">
            {{ formatMemberCount(circle.memberCount) }} {{ t("circle.memberUnit") }}
            · {{ circle.topicCount }} {{ t("circle.topicUnit") }}
          </text>
          <view v-if="friendJoinedCount > 0" class="info-friends">
            <view class="info-friend-avatars">
              <image
                v-for="(avatar, idx) in friendAvatars"
                :key="idx"
                class="info-friend-avatar"
                :src="avatar"
                mode="aspectFill"
              />
            </view>
            <text class="info-friend-text">
              {{ t("circle.friendsJoined", { count: friendJoinedCount }) }}
            </text>
          </view>
        </view>
        <view class="info-join" hover-class="info-join--active" @tap="toggleJoin">
          <text class="info-join-text">
            {{ joined ? t("circle.joinedBtn") : t("circle.home.joinCta") }}
          </text>
        </view>
      </view>

      <!-- 3. 标签 chips（real 模式无圈标签数据时不渲染空容器，避免 hero 下方留白块） -->
      <view v-if="circleTags.length" class="tag-row">
        <view v-for="tag in circleTags" :key="tag" class="tag-chip">
          <text class="tag-chip-text">{{ tag }}</text>
        </view>
      </view>
    </view>

    <!-- 4. 多 Tab 栏 -->
    <view class="tabs">
      <view
        v-for="key in TAB_KEYS"
        :key="key"
        class="tab-item"
        :class="{ 'tab-item--active': activeTab === key }"
        @tap="activeTab = key"
      >
        <text class="tab-text">{{ tabLabel(key) }}</text>
        <view v-if="activeTab === key" class="tab-indicator" />
      </view>
    </view>

    <!-- 5. 置顶公告（real 模式无公告数据时整条不渲染，避免只剩空绿带） -->
    <view v-if="pinnedNotice" class="pinned-card">
      <text class="pinned-badge">{{ t("circle.home.pinnedBadge") }}</text>
      <text class="pinned-text">{{ pinnedNotice }}</text>
      <image class="pinned-arrow" :src="IMAGE_PATHS.ICONS_COMMON.ARROW_RIGHT" mode="aspectFit" />
    </view>

    <!-- 6. 动态 feed（仅动态 tab；其余 tab 骨架空态） -->
    <template v-if="activeTab === 'posts'">
      <view v-if="displayFeed.length === 0" class="tab-empty">
        <text class="tab-empty-text">{{ t("circle.home.emptyTab") }}</text>
      </view>
      <view v-for="item in displayFeed" :key="item.id" class="feed-card" hover-class="feed-card--hover" @tap="openFeedDetail(item)">
        <view class="feed-author">
          <image class="feed-avatar" :src="item.avatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" />
          <view class="feed-author-body">
            <view class="feed-author-row">
              <text class="feed-nickname">{{ item.nickname }}</text>
              <view v-if="item.school" class="feed-school">
                <image class="feed-school-icon" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFit" />
                <text class="feed-school-text">{{ item.school }}</text>
              </view>
            </view>
            <text class="feed-time">{{ item.timeText }}</text>
          </view>
          <!-- MP-R1-J20-004/REQ20-004：补 @tap（原死按钮零反馈），.stop 防止冒泡到卡片 openFeedDetail 双触发 -->
          <image class="feed-more" :src="IMAGE_PATHS.ICONS_V2.MORE_SVG" mode="aspectFit" @tap.stop="onFeedMore" />
        </view>

        <view class="feed-content">
          <text v-if="item.tag" class="feed-tag"># {{ item.tag }}</text>
          <text v-if="item.title" class="feed-title">{{ item.title }}</text>
          <text class="feed-text">{{ item.content }}</text>
        </view>

        <view v-if="item.images.length > 0" class="feed-images">
          <image
            v-for="(img, idx) in item.images"
            :key="idx"
            class="feed-image"
            :src="img"
            mode="aspectFill"
          />
        </view>

        <view class="feed-actions">
          <view class="feed-action" @tap="toggleLike(item)">
            <image
              class="feed-action-icon"
              :src="item.liked ? IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED : IMAGE_PATHS.ICONS_SOCIAL.LIKE"
              mode="aspectFit"
            />
            <text class="feed-action-text" :class="{ 'feed-action-text--active': item.liked }">
              {{ item.likes }}
            </text>
          </view>
          <!-- MP-R1-J20-004/REQ20-004：评论 action 补 @tap（原死按钮零反馈）——跳话题详情互动 -->
          <view class="feed-action" @tap.stop="openFeedDetail(item)">
            <image class="feed-action-icon" :src="IMAGE_PATHS.ICONS_SOCIAL.COMMENT" mode="aspectFit" />
            <text class="feed-action-text">{{ item.comments }}</text>
          </view>
        </view>
      </view>

      <!-- 7. 查看全部话题（保留原 topics 链路） -->
      <view class="topics-link" hover-class="topics-link--active" @tap="goToTopics">
        <text class="topics-link-text">{{ t("circle.home.viewAllTopics") }}</text>
        <image class="topics-link-arrow" :src="IMAGE_PATHS.ICONS_COMMON.ARROW_RIGHT" mode="aspectFit" />
      </view>
    </template>

    <view v-else class="tab-empty">
      <text class="tab-empty-text">{{ t("circle.home.emptyTab") }}</text>
    </view>

    <!-- 底部安全区占位（固定栏高度） -->
    <view class="bottom-placeholder" />

    <!-- 8. 底部固定栏 -->
    <view class="bottom-bar">
      <view v-if="!joined" class="bottom-join" hover-class="bottom-join--active" @tap="toggleJoin">
        <text class="bottom-join-text">{{ t("circle.home.joinCta") }}</text>
      </view>
      <view v-else class="bottom-post" hover-class="bottom-post--active" @tap="goToPostTopic">
        <text class="bottom-post-text">{{ t("circle.home.postInCircle") }}</text>
      </view>
      <view class="bottom-fab" hover-class="bottom-fab--active" @tap="goToPostTopic">
        <image class="bottom-fab-icon" :src="IMAGE_PATHS.ICONS_COMMON.EDIT" mode="aspectFit" />
      </view>
    </view>

    <!-- 加载态（store 拉取中且无数据） -->
    <view v-if="loading && circles.length === 0" class="loading-tip">
      <SkeletonBlock variant="list" :rows="3" :label="t('common.loading')" />
    </view>
  </view>
</template>

<style lang="scss" scoped>

.circle-home {
  min-height: 100vh;
  background-color: #f4f6f5;
}

/* ===== MP-R4-CIRCLEHOME-01：未知圈空态 ===== */
.circle-notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0 96rpx;
  background: var(--c-bg-page, #eef7f2);
}

.circle-notfound__mascot {
  width: 220rpx;
  height: 220rpx;
  margin-bottom: 32rpx;
}

.circle-notfound__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1a1e1c);
  margin-bottom: 12rpx;
}

.circle-notfound__desc {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #6b7571);
  margin-bottom: 40rpx;
}

.circle-notfound__btn {
  padding: 18rpx 64rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36c99a);
}

.circle-notfound__btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}

/* ===== 1. Hero ===== */
.hero {
  position: relative;
  height: 440rpx;
}

.hero-img {
  width: 100%;
  height: 100%;
}

.hero-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 160rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
}

.hero-actions {
  position: absolute;
  /* R3：env 兜底改 --statusbar（开发者工具 env 恒 0，按钮被顶进状态栏/刘海） */
  top: calc(var(--statusbar, env(safe-area-inset-top)) + 16rpx);
  left: 24rpx;
  right: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 2;
}

.hero-actions-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.hero-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-btn--active {
  background: rgba(0, 0, 0, 0.45);
}

.hero-btn-icon {
  width: 36rpx;
  height: 36rpx;
}

/* MP-R1-CIRCLEHOME-004：分享为原生 button（open-type="share"），复位默认样式以对齐 hero-btn */
.hero-btn--share {
  margin: 0;
  padding: 0;
  border: none;
  line-height: 1;
  font-size: 0;
}

.hero-btn--share::after {
  border: none;
}

/* R3：返回按钮白色 chevron（原灰色 back.svg 在深色封面上对比度不足） */
.hero-btn-chevron {
  font-size: 44rpx;
  line-height: 1;
  color: #ffffff;
  font-weight: 600;
  /* 视觉居中：chevron 字形偏上 */
  transform: translateY(-2rpx);
}

/* ===== 2. 信息卡 ===== */
.info-card {
  position: relative;
  z-index: 3;
  margin: -96rpx 24rpx 0;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(31, 42, 37, 0.06);
}

.info-main {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}

.info-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
}

.info-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.info-name {
  font-size: 34rpx;
  font-weight: 600;
  color: #1f2a25;
}

.info-hot {
  font-size: 20rpx;
  color: #e6731c;
  background: #fdf0e3;
  border-radius: 8rpx;
  padding: 2rpx 12rpx;
}

.info-desc {
  font-size: 26rpx;
  color: #5d6c7b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-meta {
  font-size: 24rpx;
  color: #8595a4;
}

.info-friends {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 4rpx;
}

.info-friend-avatars {
  display: flex;
}

.info-friend-avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 3rpx solid #ffffff;
  margin-right: -12rpx;
}

.info-friend-avatar:first-child {
  margin-left: 0;
}

.info-friend-text {
  margin-left: 16rpx;
  font-size: 22rpx;
  color: #8595a4;
}

.info-join {
  flex-shrink: 0;
  align-self: center;
  background: var(--c-brand-500, #36C99A);
  border-radius: 999rpx;
  padding: 18rpx 32rpx;
}

.info-join--active {
  background: var(--c-brand-600, #2AAE83);
}

.info-join-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
}

/* ===== 3. 标签 chips ===== */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 28rpx;
}

.tag-chip {
  background: #f1f4f3;
  border-radius: 999rpx;
  padding: 10rpx 24rpx;
}

.tag-chip-text {
  font-size: 24rpx;
  color: #5d6c7b;
}

/* ===== 4. Tab 栏 ===== */
.tabs {
  display: flex;
  align-items: center;
  background: #ffffff;
  margin-top: 24rpx;
  padding: 0 24rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0 20rpx;
}

.tab-text {
  font-size: 28rpx;
  color: #5d6c7b;
}

.tab-item--active .tab-text {
  color: var(--c-brand-500, #36C99A);
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: var(--c-brand-500, #36C99A);
}

/* ===== 5. 置顶公告 ===== */
.pinned-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 24rpx 24rpx 0;
  background: var(--c-brand-50, #E8FAF3);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}

.pinned-badge {
  flex-shrink: 0;
  font-size: 20rpx;
  color: var(--c-brand-600, #2AAE83);
  background: #ffffff;
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}

.pinned-text {
  flex: 1;
  font-size: 24rpx;
  color: #1f8d6a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pinned-arrow {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}

/* ===== 6. 动态 feed ===== */
.feed-card {
  margin: 24rpx 24rpx 0;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
}

.feed-card--hover {
  background: #f9fbfa;
}

.feed-author {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.feed-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.feed-author-body {
  flex: 1;
  min-width: 0;
}

.feed-author-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.feed-nickname {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2a25;
}

.feed-school {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: var(--c-brand-50, #E8FAF3);
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}

.feed-school-icon {
  width: 22rpx;
  height: 22rpx;
}

.feed-school-text {
  font-size: 20rpx;
  color: var(--c-brand-600, #2AAE83);
}

.feed-time {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8595a4;
}

.feed-more {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.feed-content {
  margin-top: 20rpx;
}

.feed-tag {
  display: block;
  font-size: 26rpx;
  color: var(--c-brand-500, #36C99A);
  font-weight: 600;
}

/* 2026-09-12：真实话题标题行（加粗深色，对齐理想图 feed 信息层级） */
.feed-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2a25;
}

.feed-text {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: #1f2a25;
}

.feed-images {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}

.feed-image {
  flex: 1;
  height: 190rpx;
  border-radius: 16rpx;
  background: #f1f4f3;
}

.feed-actions {
  display: flex;
  align-items: center;
  gap: 48rpx;
  margin-top: 24rpx;
}

.feed-action {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.feed-action-icon {
  width: 36rpx;
  height: 36rpx;
}

.feed-action-text {
  font-size: 24rpx;
  color: #8595a4;
}

.feed-action-text--active {
  color: var(--c-brand-500, #36C99A);
}

/* ===== 7. 查看全部话题 ===== */
.topics-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin: 24rpx 24rpx 0;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
}

.topics-link--active {
  background: #f9fbfa;
}

.topics-link-text {
  font-size: 26rpx;
  color: var(--c-brand-500, #36C99A);
  font-weight: 600;
}

.topics-link-arrow {
  width: 28rpx;
  height: 28rpx;
}

/* 空 tab 骨架空态 */
.tab-empty {
  margin: 24rpx;
  padding: 96rpx 0;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-empty-text {
  font-size: 26rpx;
  color: #8595a4;
}

/* ===== 8. 底部固定栏 ===== */
.bottom-placeholder {
  height: calc(140rpx + env(safe-area-inset-bottom));
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  box-shadow: 0 -4rpx 16rpx rgba(31, 42, 37, 0.06);
}

.bottom-join,
.bottom-post {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 999rpx;
  background: var(--c-brand-500, #36C99A);
}

.bottom-join--active,
.bottom-post--active {
  background: var(--c-brand-600, #2AAE83);
}

.bottom-join-text,
.bottom-post-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

.bottom-fab {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--c-brand-50, #E8FAF3);
  border: 2rpx solid var(--c-brand-200, #A3EBCF);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-fab--active {
  background: var(--c-brand-100, #D1F5E7);
}

.bottom-fab-icon {
  width: 40rpx;
  height: 40rpx;
}

/* 加载提示 */
.loading-tip {
  padding: 24rpx;
  display: flex;
  justify-content: center;
}

/* R10-P1-001：冷启动骨架整页容器 */
.circle-home-loading {
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 24rpx) 24rpx 24rpx;
}

.loading-tip-text {
  font-size: 24rpx;
  color: #8595a4;
}
</style>
