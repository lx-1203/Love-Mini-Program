<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { designTokens } from '../../theme/tokens';
import { IMAGE_PATHS } from '../../config/images';

const props = defineProps<{
  school: string;
  degree?: '本科' | '硕士' | '博士' | '专科' | string;
  verified?: boolean;
  size?: 'sm' | 'md' | 'lg';
}>();

const t = designTokens;
const { t: tt } = useI18n();

const sizeMap = {
  sm: { padding: '4rpx 8rpx', fontSize: '20rpx', iconSize: '16rpx' },
  md: { padding: '4rpx 12rpx', fontSize: '22rpx', iconSize: '20rpx' },
  lg: { padding: '8rpx 16rpx', fontSize: '24rpx', iconSize: '24rpx' },
};

const currentSize = computed(() => sizeMap[props.size || 'md']);

const badgeStyle = computed(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4rpx',
  padding: currentSize.value.padding,
  borderRadius: `${t.component.tag.radiusPill}rpx`,
  background: props.verified ? t.color.gradient.brand : t.color.bg.surface,
  color: props.verified ? t.color.text.inverse : t.color.text.secondary,
  fontSize: currentSize.value.fontSize,
  fontWeight: String(t.typography.weight.medium),
  lineHeight: '1',
  border: props.verified ? 'none' : `1rpx solid ${t.color.border.default}`,
  whiteSpace: 'nowrap',
}));

const shieldStyle = computed(() => ({
  width: currentSize.value.iconSize,
  height: currentSize.value.iconSize,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const ariaLabel = computed(() => {
  const parts: string[] = [props.school];
  if (props.degree) parts.push(props.degree);
  if (props.verified) parts.push(tt('profile.verificationSchool'));
  return parts.join(' · ');
});
</script>

<template>
  <view
    class="edu-badge"
    :style="badgeStyle"
    <!-- #ifdef H5 -->
    role="img"
    :aria-label="ariaLabel"
    <!-- #endif -->
  >
    <view class="edu-badge__shield" :style="shieldStyle">
      <image v-if="verified" class="edu-badge__check" :src="IMAGE_PATHS.ICONS_COMMON.CHECK" mode="aspectFit" />
      <text v-else class="edu-badge__dot">•</text>
    </view>
    <text class="edu-badge__school">{{ school }}</text>
    <text v-if="degree" class="edu-badge__degree">· {{ degree }}</text>
  </view>
</template>

<style lang="scss" scoped>
.edu-badge {
  &__check {
    font-weight: 700;
    opacity: 0.95;
  }
  &__dot { opacity: 0.5; }
  &__degree { opacity: 0.85; }
}
</style>
