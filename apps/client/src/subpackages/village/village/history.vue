<script setup lang="ts">
/**
 * 浏览记录页（2026-08-08 论坛互动真实化）
 *
 * 展示当前用户的帖子浏览历史（按最近浏览时间倒序）：
 * - 数据源：villageStore.fetchPostHistory（real 走 GET /api/v1/posts/history，mock 走内置数据）
 * - 交互：下拉刷新 / 上拉加载更多 / 清空记录（确认弹窗）/ 点击卡片进详情 / 点头像进主页
 */
import { ref, onUnmounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { openAppPath, openUserProfile } from "../../../utils/navigation";
import { resolveMediaUrl } from "../../../utils/media";
// MP-R1-HISTORY-201：注入 --statusbar/--capsule-right——本页是同批唯一没有
// 状态栏/胶囊避让的页面，返回键顶入状态栏、清空记录钮与微信胶囊叠印
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();
// 2026-08-09：返回键图标需要 IMAGE_PATHS
import { IMAGE_PATHS } from "../../../config/images";
import {
  useVillageStore,
  formatRelativeTime,
  PAGE_SIZE,
  type PostHistoryItem,
} from "../../../stores/village";
import EmptyState from "../../../components/common/EmptyState.vue";

const villageStore = useVillageStore();
const { t } = useI18n();
const { historyPosts, loadingHistory } = storeToRefs(villageStore);

/**
 * R4-00090：昵称首字符兜底（author.name 为空/null 时返回占位符，
 * 避免 name[0] 抛 TypeError 崩溃渲染）。
 */
function initialOf(name?: string | null): string {
  return name && name.length > 0 ? name.charAt(0) : "?";
}

/**
 * 返回上一页（自定义导航栏返回键，navigationStyle: custom 无系统返回栏）。
 * MP-R1-HISTORY-001（2026-09-20）：无上一页时（如从 reLaunch/分享卡直达进入）
 * 原 switchTab 到村口页会静默失败——村口页不是 tabBar 页，改 reLaunch 兜底。
 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.reLaunch({ url: "/subpackages/village/village/index" });
  }
}

/** 上拉加载中 */
const isLoadingMore = ref(false);
/**
 * 是否还有更多
 * R6-L04-D11（P2 可达性）：原初值 true 且只在 onLoadMore 里翻转，而本页当时走 window 滚动、
 * scroll-view 的 @scrolltolower 永不触发 ⇒ hasMore 恒 true ⇒「没有更多」终止态整条链路不可达
 * （bottom 帧实测：最后一张卡止于 y≈468px，其下 346px 全为页面底色，0 条终止提示）。
 * 现改为「首屏 fetch 后按已取回条数直接判定」——不足一页即到底；配合 D10 把滚动收回
 * scroll-view 内部，@scrolltolower 也重新可达。
 */
const hasMore = ref(true);
/** 清空确认弹窗 */
const showClearDialog = ref(false);
const clearing = ref(false);

/** 图片加载失败 key 集合 */
const failedImageKeys = ref<Set<string>>(new Set());

function isImageFailed(key: string): boolean {
  return failedImageKeys.value.has(key);
}

function onImageError(key: string): void {
  const next = new Set(failedImageKeys.value);
  next.add(key);
  failedImageKeys.value = next;
}

/** 首次加载 / 下拉刷新 */
async function loadHistory(reset = true): Promise<void> {
  await villageStore.fetchPostHistory(reset);
  // R6-L04-D11：store 的 fetchPostHistory 返回 void 且不落 total，这里按「已取回条数 < 一页
  // 即到底」判定（与 stores/village/index.ts:1040-1047 的取数语义一致，PAGE_SIZE 同源常量）。
  if (reset) {
    hasMore.value = historyPosts.value.length >= PAGE_SIZE;
  }
}

function onRefresh(): void {
  void loadHistory(true);
}

/** 上拉加载更多（加载下一页追加） */
async function onLoadMore(): Promise<void> {
  if (isLoadingMore.value || loadingHistory.value || !hasMore.value) return;
  isLoadingMore.value = true;
  try {
    const before = historyPosts.value.length;
    await villageStore.fetchPostHistory(false);
    hasMore.value = historyPosts.value.length > before;
  } catch (_e) {
    hasMore.value = false;
  } finally {
    isLoadingMore.value = false;
  }
}

/** 清空记录（确认后调用后端 DELETE /api/v1/posts/history） */
async function handleClear(): Promise<void> {
  if (clearing.value) return;
  clearing.value = true;
  try {
    await villageStore.clearPostHistory();
    showClearDialog.value = false;
    uni.showToast({ title: t("village.history.cleared"), icon: "none" });
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : t("village.history.clearFailed"),
      icon: "none",
    });
  } finally {
    clearing.value = false;
  }
}

/** 点击卡片进入帖子详情 */
function goToDetail(item: PostHistoryItem): void {
  villageStore.setCurrentPost(item.post.id);
  // MP-R1-DETAIL-006：携带 ?id= 直达（避免详情页在 setCurrentPost 异步落定前误报「帖子不存在」）
  openAppPath(`/subpackages/village/village/detail?id=${encodeURIComponent(String(item.post.id))}`);
}

/** 点击头像进入用户主页 */
function goToUserProfile(userId: string | undefined): void {
  if (!userId) return;
  openUserProfile(userId);
}

onLoad(() => {
  void loadHistory(true);
});

onShow(() => {
  // 从详情页返回时浏览记录可能已新增（详情页浏览埋点），静默刷新列表
  void loadHistory(true);
});

onUnmounted(() => {
  villageStore.dispose();
});
</script>

<template>
  <view class="history-page" :style="menuStyleVars">
    <!-- 2026-08-09：返回键（常驻，navigationStyle: custom 无系统返回栏） -->
    <view
      class="history-back press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      role="button"
      :aria-label="t('common.back')"
      @tap="goBack"
    >
      <image class="history-back__icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.BACK)" mode="aspectFit" alt="" />
    </view>

    <!-- 顶部操作栏 -->
    <view v-if="historyPosts.length > 0" class="history-toolbar">
      <text class="history-count">{{ t("village.history.count", { n: historyPosts.length }) }}</text>
      <view
        class="history-clear press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('village.history.clear')"
        @tap="showClearDialog = true"
      >
        <text class="history-clear__text">{{ t("village.history.clear") }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loadingHistory && historyPosts.length === 0" class="history-loading" role="status" aria-live="polite">
      <view class="loading-spinner" />
      <text class="history-loading__text">{{ t("common.loading") }}</text>
    </view>

    <!-- 浏览记录列表 -->
    <scroll-view
      v-else-if="historyPosts.length > 0"
      class="history-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="loadingHistory"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view
        v-for="item in historyPosts" :key="item.post.id"
        class="history-item press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="goToDetail(item)"
      >
        <!-- 作者头像（点击进主页） -->
        <view
          class="history-item__avatar"
          @tap.stop="goToUserProfile(item.post.author.userId)"
        >
          <image
            v-if="item.post.author.avatar && !isImageFailed(item.post.id)"
            class="history-item__avatar-img"
            :src="resolveMediaUrl(item.post.author.avatar)"
            mode="aspectFill" lazy-load alt=""
            @error="onImageError(item.post.id)"
          />
          <text v-else class="history-item__avatar-text">{{ initialOf(item.post.author.name) }}</text>
        </view>

        <!-- 帖子摘要 -->
        <view class="history-item__body">
          <view class="history-item__header">
            <text class="history-item__author">{{ item.post.author.name }}</text>
            <text class="history-item__time">{{ formatRelativeTime(item.viewedAt) }}</text>
          </view>
          <text class="history-item__title">{{ item.post.title || t("village.history.untitled") }}</text>
          <!-- R6-L04-D06（P2 文案）：真档三张卡实测「标题行 = 摘要行」逐字相同
               （curl GET /api/v1/posts/history?page=1&pageSize=20 →
               {"post":{"title":"汉服出行日，路上好多同袍","summary":"汉服出行日，路上好多同袍"}}，
               后端 PostSummaryView.summary = truncate(content,120)，而种子数据 title 与 content 同值）。
               同一卡里印两遍零信息增量 ⇒ 摘要行只在真的提供新增信息时才渲染。
               数据侧（title 与 content 同值的种子）另登记 NEEDS-DATA，由 F10 车道清。 -->
          <text
            v-if="item.post.content && item.post.content.trim() !== (item.post.title || '').trim()"
            class="history-item__summary"
          >{{ item.post.content }}</text>
          <view class="history-item__stats">
            <text class="history-item__stat">{{ t("village.history.likes", { n: item.post.likes }) }}</text>
            <text class="history-item__stat">{{ t("village.history.favorites", { n: item.post.favorites }) }}</text>
            <text class="history-item__stat">{{ t("village.history.views", { n: item.post.views }) }}</text>
            <text v-if="item.post.comments > 0" class="history-item__stat">{{ t("village.history.comments", { n: item.post.comments }) }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="isLoadingMore" class="history-load-more">
        <view class="loading-spinner" />
        <text class="history-load-more__text">{{ t("common.loading") }}</text>
      </view>
      <view v-else-if="!hasMore" class="history-load-more">
        <text class="history-load-more__text">{{ t("village.noMorePosts") }}</text>
      </view>
      <view class="history-bottom-spacer" />
    </scroll-view>

    <!-- 空状态 -->
    <EmptyState
      v-else
      :title="t('village.history.empty')"
      :action-text="t('village.history.backToVillage')"
      type="no-data"
      @action="openAppPath('/subpackages/village/village/index')"
    />

    <!-- 清空确认弹窗 -->
    <view v-if="showClearDialog" class="clear-dialog-mask" @tap.self="showClearDialog = false">
      <view class="clear-dialog">
        <text class="clear-dialog__title">{{ t("village.history.clearTitle") }}</text>
        <text class="clear-dialog__desc">{{ t("village.history.clearDesc") }}</text>
        <view class="clear-dialog__actions">
          <view
            class="clear-dialog__btn clear-dialog__btn--cancel press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="showClearDialog = false"
          >
            <text>{{ t("common.cancel") }}</text>
          </view>
          <view
            class="clear-dialog__btn clear-dialog__btn--confirm press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('village.history.clear')"
            @tap="handleClear"
          >
            <text>{{ clearing ? t("common.loading") : t("village.history.clear") }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* R6-L04-D10（P1 层级遮挡）：原实现是 `min-height: 100vh` + `.history-list{height:calc(100vh - 88rpx)}`
   ——页面因此走 window 滚动，工具栏不是吸顶层，bottom 帧实测「清空记录」胶囊整行顶到屏幕最上沿
   （白底从 y=0 起，胶囊落 y=13–25px，正压系统状态栏 y=0–29px，帧上读作「22:39 条记录」）。
   改法按同仓既有范式（tag-posts.vue:458-464 / campus/index MP-R2-CAMPUSINDEX-001）：
   页面根改成**定高 flex 列 + overflow:hidden**，滚动只留在 .history-list 内部 ⇒ 返回键与工具栏
   固定在 padding-top 让出的状态栏之下，永不随内容滚走。
   padding-top 保留（继续承担状态栏 + 20px 内衬），--statusbar 由 :284 的 useMenuButtonRect 注入。 */
.history-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  /* MP-R1-HISTORY-201：navigationStyle=custom 下整页自 y=0 布局，返回键顶入状态栏、
     工具栏按钮进入胶囊带；下移一个状态栏 + 20px，让首行内容落在胶囊之下 */
  padding-top: calc(var(--statusbar, env(safe-area-inset-top)) + 20px);
  box-sizing: border-box;
  background: var(--c-bg-page, #f5f6fa);
}

/* 2026-08-09：返回键（圆角图标按钮） */
.history-back {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container, #ffffff);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--section-gap);
}

.history-back__icon {
  width: 40rpx;
  height: 40rpx;
}

/* 顶部操作栏 */
.history-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: var(--c-bg-container);
}

.history-count {
  font-size: 24rpx;
  color: var(--c-text-secondary);
}

.history-clear {
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
  background: var(--c-romance-bg-tint);
}

.history-clear__text {
  font-size: 24rpx;
  color: var(--c-romance-500);
}

/* 加载状态 */
.history-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 240rpx;
}

.history-loading__text {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: var(--c-text-secondary);
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid var(--c-neutral-100);
  border-top-color: var(--c-romance-500);
  border-radius: 50%;
  animation: history-spin 0.8s linear infinite;
}

@keyframes history-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 列表 */
/* R6-L04-D10 / D11：原 `height: calc(100vh - 88rpx)` 少扣了状态栏内衬 + 返回键 + 工具栏，
   容器高度大于可视剩余区域 ⇒ 页面退化成 window 滚动，scroll-view 内部零滚动、
   @scrolltolower 与终止态双双不可达。改 flex:1 由定高父级给出确定高度，min-height:0
   解锁 flex 子项收缩（mp-weixin 同 H5 一致生效）。 */
.history-list {
  flex: 1;
  min-height: 0;
}

.history-item {
  display: flex;
  gap: 20rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
  background: var(--c-bg-container);
}

.history-item__avatar {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  overflow: hidden;
  background: var(--c-bg-surface);
}

.history-item__avatar-img {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}

.history-item__avatar-text {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 36rpx;
  color: var(--c-text-inverse);
  /* R4-batch4：品牌红渐变 #ff9a9e→#ff4d6d 无等值 token（近似 --c-romance-400→--c-error），保留原值 */
  background: linear-gradient(135deg, #ff9a9e, #ff4d6d);
}

.history-item__body {
  flex: 1;
  min-width: 0;
}

.history-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-item__author {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--c-text-primary);
}

.history-item__time {
  font-size: 22rpx;
  color: var(--c-text-secondary);
}

.history-item__title {
  display: block;
  margin-top: 8rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-text-primary);
}

.history-item__summary {
  display: -webkit-box;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--c-text-secondary);
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.history-item__stats {
  display: flex;
  gap: 24rpx;
  margin-top: 12rpx;
}

/* R6-L04-D07（P2 颜色token）+ R6-L04-D08（P3 字号）：
   互动计数「赞/藏/看/评」是**要读的数据**，原 22rpx(=11px) 落在规范 §1.3「极小档只给角标·法务」，
   且 `var(--c-text-tertiary, #bbb)` 的兜底 #bbb 比令牌本身(--c-text-tertiary #6B7571)更浅、
   深色档还会再掉一档 ⇒ 帧上实测最暗字形 #848D89 / 众数 #C7C9C8，压白卡对比度 3.41:1 < 4.5:1。
   改：字号提到 --fs-base(24rpx=12px) 与作者名/时间戳同族；颜色走 --c-text-secondary
   （#4A524E 压白底 ≈7.6:1），并去掉比令牌更浅的字面兜底。 */
.history-item__stat {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
}

/* 加载更多 */
.history-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
}

/* R6-L04-D07 同族：原写 `var(--text-tertiary, #bbb)`——全仓 `--text-tertiary:` 定义 **0 处**
   （本车道 grep apps/client/src 实测；只有 --c-text-tertiary），即这条声明恒等于走 #bbb 字面量。
   D11 的终止提示就是这一行，改吃可读令牌并去掉死兜底。 */
.history-load-more__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
}

.history-bottom-spacer {
  height: 40rpx;
}

/* 清空确认弹窗 */
.clear-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-overlay);
}

.clear-dialog {
  width: 560rpx;
  padding: 40rpx 36rpx;
  border-radius: 24rpx;
  background: var(--c-bg-container);
}

.clear-dialog__title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  color: var(--c-text-primary);
}

.clear-dialog__desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  text-align: center;
  color: var(--c-text-secondary);
}

.clear-dialog__actions {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}

.clear-dialog__btn {
  flex: 1;
  padding: 20rpx 0;
  border-radius: 16rpx;
  text-align: center;
  font-size: 28rpx;
}

.clear-dialog__btn--cancel {
  background: var(--c-bg-surface);
  color: var(--c-text-secondary);
}

.clear-dialog__btn--confirm {
  background: var(--c-romance-500);
  color: var(--c-text-inverse);
}
</style>
