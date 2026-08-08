<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';

const props = defineProps<{
  title?: string;
  subtitle?: string;
}>();

const { t } = useI18n();
const titleLabel = computed(() => props.title || t('login.heroTitle'));
const subtitleLabel = computed(() => props.subtitle || t('login.heroSubtitleDefault'));
</script>

<template>
  <view
    class="login-header"
    role="banner"
    :aria-label="titleLabel"
  >
    <!-- 品牌 Logo -->
    <view class="login-logo">
      <image
        class="login-logo-icon"
        :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL"
        mode="aspectFit"
        role="img"
        :aria-label="titleLabel"
      />
    </view>
    <!-- 主标题 -->
    <text class="login-title">{{ titleLabel }}</text>
    <!-- 副标题 -->
    <text class="login-subtitle">{{ subtitleLabel }}</text>
  </view>
</template>

<style scoped>
.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.login-logo {
  width: 144rpx;
  height: 144rpx;
  border-radius: var(--r-xl, 40rpx);
  background: var(--c-gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-secondary-blue-md, 0 8rpx 32rpx rgba(91, 127, 255, 0.3));
  margin-bottom: 12rpx;
}

.login-logo-icon {
  width: 72rpx;
  height: 72rpx;
  /* 白色 SVG 着色：通过 CSS filter 将图标转为白色 */
  filter: brightness(0) invert(1);
}

.login-title {
  font-size: 72rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
  letter-spacing: 0.04em;
  /* FIXME: token 化需补充 —— 现有 --c-overlay-text-shadow-mid 为 0.2 alpha，0.25 介于 mid/strong 之间无精确 token */
  text-shadow: 0 2rpx 12rpx var(--c-text-shadow-soft, rgba(0, 0, 0, 0.2));
  line-height: 1.2;
}

.login-subtitle {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-overlay-white-text-strong, rgba(255, 255, 255, 0.8));
  text-align: center;
  line-height: 1.6;
  letter-spacing: 0.02em;
  text-shadow: 0 1rpx 6rpx var(--c-overlay-text-shadow-light, rgba(0, 0, 0, 0.15));
  max-width: 480rpx;
}
</style>