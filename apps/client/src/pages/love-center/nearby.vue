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
import { mapToDiscoverCard } from "../../stores/discover/utils";
import type { DiscoverCard } from "../../stores/discover/types";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();

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

/** 拉取推荐卡片（同校区优先，与寻觅同一数据源） */
async function loadNearbyCards() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const people = await clientApi.getRecommendations({});
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

/** 卡片操作事件：附近的人场景不执行喜欢/超级喜欢/滑动持久化（浏览为主） */
function handleSwipe() {
  /* 浏览模式：不持久化滑动 */
}

function handleSuperLike() {
  uni.showToast({ title: t("contentPages.nearby.likeHint"), icon: "none" });
}

function handleMessage() {
  uni.showToast({ title: t("contentPages.nearby.messageHint"), icon: "none" });
}

function handleVideoTap() {
  /* 视频功能暂未启用，忽略 */
}
</script>

<template>
  <view class="content-page page-fade-in">
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
