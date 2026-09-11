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
 */
import { computed, ref } from "vue";
import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCircleStore, type CircleItem } from "../../../stores/circle";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
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

/** 传入 ID 的圈优先，未命中回退演示圈（骨架不空屏） */
const circle = computed<CircleItem>(() => {
  return circles.value.find((c) => c.id === circleId.value) || FALLBACK_CIRCLE;
});

/** 圈封面：按圈名关键词映射 CIRCLE_COVERS，兜底摄影圈封面 */
const coverImage = computed<string>(() => {
  const name = circle.value.name;
  const map: Array<[string, string]> = [
    ["摄影", IMAGE_PATHS.CIRCLE_COVERS.PHOTO],
    ["旅行", IMAGE_PATHS.CIRCLE_COVERS.TRAVEL],
    ["音乐", IMAGE_PATHS.CIRCLE_COVERS.MUSIC],
    ["美食", IMAGE_PATHS.CIRCLE_COVERS.FOOD],
    ["运动", IMAGE_PATHS.CIRCLE_COVERS.SPORTS],
    ["读书", IMAGE_PATHS.CIRCLE_COVERS.READING],
    ["游戏", IMAGE_PATHS.CIRCLE_COVERS.GAME],
  ];
  for (const [keyword, cover] of map) {
    if (name.includes(keyword)) return cover;
  }
  return IMAGE_PATHS.CIRCLE_COVERS.DEFAULT;
});

/** 是否已加入（控制底部栏按钮态） */
const joined = computed(() => circle.value.isJoined);

/** 圈标签（本地 mock —— TODO(后端): 圈子标签字段） */
const circleTags = ["摄影技巧", "风景拍摄", "人像写真", "城市漫游"];

/** 置顶公告（本地 mock —— TODO(后端): 圈公告接口） */
const pinnedNotice = "【规约】友善交流，尊重原创，分享美好瞬间";

/** 动态 feed mock（TODO(后端): 圈内动态分页接口；图片复用封面资产） */
interface FeedItem {
  id: string;
  nickname: string;
  school: string;
  timeText: string;
  tag: string;
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
      // R3（MP-R3-CIRCLEHOME-002）：原三图（房车/摄影师/暗色天文）与「云海」文案不符，换云雾山景素材
      "/static/assets/images/posts/post-placeholder.jpg",
      "/static/assets/images/posts/post-5.jpg",
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

/** 朋友头像组（本地 mock —— TODO(后端): 好友关系接口） */
const friendAvatars = [
  IMAGE_PATHS.DEFAULT_AVATAR,
  IMAGE_PATHS.DEFAULT_AVATAR,
  IMAGE_PATHS.DEFAULT_AVATAR,
];

onLoad((query) => {
  if (query?.circleId) {
    circleId.value = String(query.circleId);
  }
  // store 为空时补拉（复用列表页韧性逻辑：登录态/mock 判定由 store 内部处理）
  if (circles.value.length === 0 && !circleStore.loading) {
    void circleStore.fetchCircles();
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
 */
async function toggleJoin(): Promise<void> {
  try {
    if (joined.value) {
      await circleStore.leaveCircle(circle.value.id);
    } else {
      await circleStore.joinCircle(circle.value.id);
    }
  } catch (_e) {
    // store 内部已 toast 错误，此处静默
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
  <view class="circle-home" :style="menuStyleVars">
    <!-- 1. Hero 头图 -->
    <view class="hero">
      <image class="hero-img" :src="coverImage" mode="aspectFill" />
      <view class="hero-actions">
        <view class="hero-btn" hover-class="hero-btn--active" @tap="goBack">
          <!-- R3：灰 chevron 在深色封面上不可见，改白色粗 chevron 文字 -->
          <text class="hero-btn-chevron">‹</text>
        </view>
        <view class="hero-actions-right">
          <view class="hero-btn" hover-class="hero-btn--active">
            <image class="hero-btn-icon" :src="IMAGE_PATHS.ICONS_SOCIAL.SHARE" mode="aspectFit" />
          </view>
          <view class="hero-btn" hover-class="hero-btn--active">
            <image class="hero-btn-icon" src="/static/assets/icons/v2/more.svg" mode="aspectFit" />
          </view>
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
          <view class="info-friends">
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
              {{ t("circle.friendsJoined", { count: circle.friendJoinedCount || 0 }) }}
            </text>
          </view>
        </view>
        <view class="info-join" hover-class="info-join--active" @tap="toggleJoin">
          <text class="info-join-text">
            {{ joined ? t("circle.joinedBtn") : t("circle.home.joinCta") }}
          </text>
        </view>
      </view>

      <!-- 3. 标签 chips -->
      <view class="tag-row">
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

    <!-- 5. 置顶公告 -->
    <view class="pinned-card">
      <text class="pinned-badge">{{ t("circle.home.pinnedBadge") }}</text>
      <text class="pinned-text">{{ pinnedNotice }}</text>
      <image class="pinned-arrow" :src="IMAGE_PATHS.ICONS_COMMON.ARROW_RIGHT" mode="aspectFit" />
    </view>

    <!-- 6. 动态 feed（仅动态 tab；其余 tab 骨架空态） -->
    <template v-if="activeTab === 'posts'">
      <view v-for="item in feedItems" :key="item.id" class="feed-card">
        <view class="feed-author">
          <image class="feed-avatar" :src="IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" />
          <view class="feed-author-body">
            <view class="feed-author-row">
              <text class="feed-nickname">{{ item.nickname }}</text>
              <view class="feed-school">
                <image class="feed-school-icon" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFit" />
                <text class="feed-school-text">{{ item.school }}</text>
              </view>
            </view>
            <text class="feed-time">{{ item.timeText }}</text>
          </view>
          <image class="feed-more" src="/static/assets/icons/v2/more.svg" mode="aspectFit" />
        </view>

        <view class="feed-content">
          <text class="feed-tag"># {{ item.tag }}</text>
          <text class="feed-text">{{ item.content }}</text>
        </view>

        <view class="feed-images">
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
          <view class="feed-action">
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

.loading-tip-text {
  font-size: 24rpx;
  color: #8595a4;
}
</style>
