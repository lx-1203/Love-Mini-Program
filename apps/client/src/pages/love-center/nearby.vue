<script setup lang="ts">
/**
 * 附近的人（2026-08-07 重构为寻觅卡片模式）。
 *
 * 原实现：后台配置 H5 URL 渲染 web-view，或展示本地 mock 用户列表
 * （点击仅 toast，无真实数据）。
 *
 * 现改为：直接拉取推荐接口（同校区优先），复用寻觅的卡片组件
 * CardSwiper 展示与交互（滑动/喜欢/收藏/查看主页），点击卡片进入
 * 个人主页页。
 */
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import CardSwiper from "../../components/discover/CardSwiper.vue";
import { clientApi } from "../../services/api";
import { mapToDiscoverCard, NEARBY_MAX_DISTANCE_KM } from "../../stores/discover/utils";
import type { DiscoverCard, SwipeDirection } from "../../stores/discover/types";
import { useDiscoverStore } from "../../stores/discover";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import { showErrorToast } from "../../utils/error-toast";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();
const discoverStore = useDiscoverStore();
const sessionStore = useSessionStore();

/** 返回按钮图标 */
const backIcon = IMAGE_PATHS.ICONS_COMMON.BACK;

/** 卡片数据（与寻觅一致：推荐接口 → DiscoverCard） */
const cards = ref<DiscoverCard[]>([]);
/** 加载中 */
const loading = ref(false);
/** 错误信息（拉取失败时展示重试） */
const errorMessage = ref("");

onLoad(() => {
  void loadNearbyCards();
});

/**
 * 拉取附近卡片（R4-00034：与寻觅页"附近"语义对齐——透传 distanceMax
 * 距离上限筛选（后端以用户注册/定位城市为基准计算距离），
 * 不再裸调全量推荐接口导致"附近"名不副实）。
 */
async function loadNearbyCards() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const people = await clientApi.getRecommendations({
      distanceMax: NEARBY_MAX_DISTANCE_KM,
    });
    cards.value = people.map((person) => mapToDiscoverCard(person));
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("contentPages.nearby.loadFailed");
  } finally {
    loading.value = false;
  }
}

/** 返回上一页（右上角固定按钮） */
function goBack() {
  uni.navigateBack();
}

/** 2026-08-10 功能补齐：附近的人滑动/喜欢/发消息接真实链路（与寻觅页一致） */

/** 交互登录守卫：未登录仅提示不跳转 */
function requireLogin(): boolean {
  if (sessionStore.isLoggedIn) return true;
  uni.showToast({ title: t("apiErrors.loginRequired"), icon: "none" });
  return false;
}

/** 滑动：右滑=喜欢（复用 discover store 真实接口），左滑=跳过（本地移除卡片） */
async function handleSwipe(direction: SwipeDirection, cardId: string) {
  if (direction !== "left" && !requireLogin()) return;
  try {
    if (direction === "left") {
      await discoverStore.swipeLeft(cardId);
    } else {
      const card = discoverStore.cards.find((c) => c.id === cardId);
      await discoverStore.swipeRight(cardId);
      const result = discoverStore.lastSwipeResult;
      if (result?.matched) {
        uni.showToast({ title: t("contentPages.nearby.likeHint"), icon: "none" });
        openAppPath(`/pages/chat-session/index?userId=${encodeURIComponent(String(card?.userId ?? ""))}`);
      } else {
        uni.showToast({ title: t("contentPages.nearby.liked"), icon: "success" });
      }
    }
  } catch (error) {
    const storeMessage = discoverStore.errorMessage;
    if (storeMessage) {
      uni.showToast({ title: storeMessage, icon: "none" });
    } else {
      showErrorToast(error, t("contentPages.nearby.operationFailed"));
    }
  }
}

/** 超级喜欢：复用寻觅的 swipeRight(isSuper=true) 真实接口 */
async function handleSuperLike(cardId: string) {
  if (!requireLogin()) return;
  try {
    const card = discoverStore.cards.find((c) => c.id === cardId);
    await discoverStore.swipeRight(cardId, true);
    const result = discoverStore.lastSwipeResult;
    if (result?.matched) {
      uni.showToast({ title: t("contentPages.nearby.likeHint"), icon: "none" });
      openAppPath(`/pages/chat-session/index?userId=${encodeURIComponent(String(card?.userId ?? ""))}`);
    }
  } catch (error) {
    const storeMessage = discoverStore.errorMessage;
    if (storeMessage) {
      uni.showToast({ title: storeMessage, icon: "none" });
    } else {
      showErrorToast(error, t("contentPages.nearby.operationFailed"));
    }
  }
}

/** 发消息：进入聊天会话页（会话懒创建，进入后由聊天页完成） */
function handleMessage(userId: string) {
  if (!requireLogin()) return;
  if (!userId || userId.trim().length === 0) {
    uni.showToast({ title: t("discover.userIdInvalid"), icon: "none" });
    return;
  }
  openAppPath(`/pages/chat-session/index?userId=${encodeURIComponent(userId)}`);
}

/** 视频角标：跳转全屏视频播放页（个人视频展示） */
function handleVideoTap(cardId: string, videoUrl: string): void {
  if (!videoUrl) return;
  openAppPath(
    `/pages/discover/video-player?videoUrl=${encodeURIComponent(videoUrl)}&cardId=${encodeURIComponent(cardId)}`
  );
}
</script>

<template>
  <view class="content-page">
    <view class="content-header">
      <text class="content-header__title">{{ t('contentPages.nearby.title') }}</text>
      <view class="content-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <image class="content-header__back-icon" :src="backIcon" mode="aspectFit" alt="" />
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="nearby-loading">
      <text class="nearby-loading__text">{{ t('contentPages.nearby.loading') }}</text>
    </view>

    <!-- 错误态 + 重试 -->
    <view v-else-if="errorMessage" class="nearby-error">
      <text class="nearby-error__text">{{ errorMessage }}</text>
      <view class="nearby-error__retry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.retryAria')" @tap="loadNearbyCards">
        <text class="nearby-error__retry-text">{{ t('common.retry') }}</text>
      </view>
    </view>

    <!-- 空态 -->
    <view v-else-if="!loading && cards.length === 0" class="nearby-empty">
      <text class="nearby-empty__text">{{ t('contentPages.nearby.empty') }}</text>
    </view>

    <!-- 寻觅卡片（与寻觅页同一组件/交互：滑动、喜欢、点击进主页） -->
    <!-- 附近的人 = 匿名匹配场景：masked 蒙面模式，头像模糊 + 「互发喜欢解锁头像」规则提示 -->
    <view v-else class="nearby-card-area">
      <CardSwiper
        class="card-swiper-host"
        :cards="cards"
        :remaining-count="0"
        :masked="true"
        @swipe="handleSwipe"
        @superLike="handleSuperLike"
        @videoTap="handleVideoTap"
        @message="handleMessage"
      />
    </view>
  </view>
</template>

<style scoped lang="scss">
.content-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--c-bg-page);
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + var(--sp-4)) var(--sp-5) var(--sp-3);
  flex-shrink: 0;
}

.content-header__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.content-header__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--c-neutral-0);
  box-shadow: var(--s-sm);
}

.content-header__back-icon {
  width: 32rpx;
  height: 32rpx;
}

.nearby-card-area {
  flex: 1;
  min-height: 0;
  padding: var(--sp-2) 0;
}

/* 2026-08-08 P0：微信自定义组件宿主节点默认 flex:0 1 auto 高度仅由内容决定，
 * 与 discover/index.vue 同款修复——让 CardSwiper 宿主节点 flex:1 撑满父容器。
 * H5 端组件宿主即根节点，已有高度链，无需该样式。 */
// #ifndef H5
.card-swiper-host {
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
}
// #endif

.nearby-loading,
.nearby-error,
.nearby-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
}

.nearby-loading__text,
.nearby-error__text,
.nearby-empty__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

.nearby-error__retry {
  padding: var(--sp-2) var(--sp-6);
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
}

.nearby-error__retry-text {
  font-size: var(--fs-sm);
  color: var(--c-neutral-0);
  font-weight: 600;
}
</style>
