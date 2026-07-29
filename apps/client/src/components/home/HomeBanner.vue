<script setup lang="ts">
/**
 * HomeBanner - 首页 Banner 自动轮播组件
 *
 * 功能：
 * - 使用 uni 的 swiper 组件实现自动轮播（3秒间隔）
 * - 自定义指示点样式（激活态拉长，非激活态圆点）
 * - 支持点击 Banner 跳转到对应页面
 * - 数据源从 config/home-banners.ts 读取，便于运营维护
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（hover-class 替代）
 * - 不使用 backdrop-filter（仅 H5 通过条件编译启用）
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding
 * - 所有过渡动画内联在 .vue 文件中
 *
 * 错误处理：
 * - 图片加载失败时通过 @error 事件降级为占位图（避免显示破损图标）
 * - 点击跳转失败时通过 toast 提示用户重试
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { homeBanners, type HomeBannerItem } from "../../config/home-banners";
import { IMAGE_PATHS } from "../../config/images";
import { openAppPath } from "../../utils/navigation";
import { lightHaptic } from "../../utils/haptic";

const { t } = useI18n();

/** 当前轮播索引（用于指示点高亮） */
const currentIndex = ref(0);

/** 自动轮播间隔（毫秒），3秒 */
const AUTO_PLAY_INTERVAL_MS = 3000;

/** 轮播切换动画时长（毫秒） */
const SWIPER_DURATION_MS = 500;

/**
 * swiper 切换事件回调。
 * 同步更新 currentIndex 以驱动自定义指示点高亮。
 */
function onSwiperChange(e: { detail: { current: number; source: string } }) {
  // 防御性编程：detail.current 可能在边界场景为 undefined
  if (typeof e?.detail?.current === "number") {
    currentIndex.value = e.detail.current;
  }
}

/**
 * 点击 Banner 项跳转。
 * 通过 openAppPath 走统一的导航入口，便于埋点与权限校验。
 */
function onTapBanner(banner: HomeBannerItem) {
  lightHaptic();
  try {
    if (!banner.link) {
      uni.showToast({ title: t("homeBanner.linkMissing"), icon: "none" });
      return;
    }
    openAppPath(banner.link);
  } catch (error) {
    // 跳转失败时提示用户重试，避免静默失败
    const message = error instanceof Error ? error.message : t("homeBanner.navigateFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/**
 * 图片加载失败回调：替换为占位图，避免显示破损图标。
 */
function onImageError(item: HomeBannerItem, event: Event) {
  // 通过 dataset 标记已替换，避免循环加载
  const target = event?.target as { dataset?: { fallback?: string } } | undefined;
  if (target && target.dataset && target.dataset.fallback === "1") {
    return;
  }
  // 直接替换 imageUrl 字段不可行（props 只读），通过 v-if 切换占位图
  item.imageUrl = IMAGE_PATHS.POSTERS.HOME;
  if (target && target.dataset) {
    target.dataset.fallback = "1";
  }
}
</script>

<template>
  <view class="home-banner">
    <swiper
      class="home-banner__swiper"
      :autoplay="true"
      :interval="AUTO_PLAY_INTERVAL_MS"
      :duration="SWIPER_DURATION_MS"
      :circular="true"
      :indicator-dots="false"
      @change="onSwiperChange"
    >
      <swiper-item
        v-for="banner in homeBanners"
        :key="banner.id"
      >
        <view
          class="home-banner__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="onTapBanner(banner)"
        >
          <image
            class="home-banner__image"
            :src="banner.imageUrl"
            mode="aspectFill"
            lazy-load
            data-fallback="0"
            @error="onImageError(banner, $event)" alt=""
          />
          <!-- 渐变蒙层，增强文字可读性 -->
          <view class="home-banner__overlay" />
          <!-- 标题与副标题 -->
          <view class="home-banner__content">
            <text class="home-banner__title">{{ banner.title }}</text>
            <text v-if="banner.subtitle" class="home-banner__subtitle">{{ banner.subtitle }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 自定义指示点（圆点 + 激活态拉长） -->
    <view class="home-banner__dots">
      <view
        v-for="(banner, idx) in homeBanners"
        :key="`dot-${banner.id}`"
        class="home-banner__dot"
        :class="{ 'home-banner__dot--active': idx === currentIndex }"
      />
    </view>
  </view>
</template>

<style scoped lang="scss">
.home-banner {
  position: relative;
  margin: 0 16rpx 24rpx;
  border-radius: var(--r-xl);
  overflow: hidden;
  /* mp-weixin 兼容：使用 opacity 兜底，H5 启用毛玻璃 */
  background: var(--c-bg-container);
}

.home-banner__swiper {
  width: 100%;
  height: 280rpx;
}

.home-banner__item {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.home-banner__image {
  width: 100%;
  height: 100%;
  display: block;
}

.home-banner__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 40%,
    rgba(0, 0, 0, 0.55) 100%
  );
  pointer-events: none;
}

.home-banner__content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--sp-5) var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  z-index: 1;
}

.home-banner__title {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
  line-height: 1.3;
  /* FIXME: token 化需补充 —— 0.35 alpha 超出现有 --c-black-shadow-xl(0.24) 范围，需新增 --c-overlay-text-shadow-strong token */
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.35);
}

.home-banner__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85));
  line-height: 1.4;
  /* FIXME: token 化需补充 —— 0.35 alpha 超出现有 --c-black-shadow-xl(0.24) 范围，需新增 --c-overlay-text-shadow-strong token */
  text-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.35);
}

.home-banner__dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  z-index: 2;
  pointer-events: none;
}

.home-banner__dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: var(--r-xs, 6rpx);
  background: var(--c-overlay-white-bg-tint-strong, rgba(255, 255, 255, 0.45));
  transition: width var(--d-slow, 280ms) cubic-bezier(0.4, 0, 0.2, 1), background var(--d-slow, 280ms) ease;
}

.home-banner__dot--active {
  width: 36rpx;
  background: var(--c-bg-container, #ffffff);
}
</style>
