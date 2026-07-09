<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../../theme/tokens';

const props = withDefaults(defineProps<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  src?: string;
  name?: string;
  online?: boolean;
  vip?: boolean;
  gradient?: string;
  ring?: boolean;
  vipRing?: boolean;
  liveDot?: boolean | 'green' | 'red';
}>(), {
  size: 'md',
  online: false,
  vip: false,
  ring: false,
  vipRing: false,
  liveDot: false,
  gradient: designTokens.color.gradient.brand,
});

const t = designTokens;

const sizeMap = { xs: t.component.avatar.xs, sm: t.component.avatar.sm, md: t.component.avatar.md, lg: t.component.avatar.lg, xl: t.component.avatar.xl };

const avatarPadding = computed(() => {
  if (props.vipRing) return '6rpx';
  if (props.ring) return '4rpx';
  if (props.vip) return '4rpx';
  return '0';
});

const sizeStyle = computed(() => ({
  width: `${sizeMap[props.size]}rpx`,
  height: `${sizeMap[props.size]}rpx`,
  padding: avatarPadding.value,
}));

const innerSizeStyle = computed(() => {
  const s = sizeMap[props.size];
  const pad = parseInt(avatarPadding.value);
  return {
    width: `${s - pad * 2}rpx`,
    height: `${s - pad * 2}rpx`,
  };
});

const fontSize = computed(() => {
  const s = sizeMap[props.size];
  return `${Math.round(s * 0.4)}rpx`;
});

const dotSize = computed(() => {
  const s = sizeMap[props.size];
  if (s <= 40) return 14;
  if (s <= 48) return 18;
  return 22;
});

const dotBorderSize = computed(() => {
  const s = sizeMap[props.size];
  if (s <= 40) return 3;
  if (s <= 48) return 4;
  return 5;
});

const showFallback = computed(() => !props.src);
const initial = computed(() => props.name?.charAt(0) || '?');

const showOnlineDot = computed(() => props.online || props.liveDot === true || props.liveDot === 'green');
const showLiveDot = computed(() => props.liveDot === 'red');

const ringBg = computed(() => {
  if (props.vipRing || props.vip) return t.color.gradient.vip;
  if (props.ring) return t.color.brand[400];
  return 'transparent';
});
</script>

<template>
  <view
    class="avatar"
    :class="{
      'avatar--ring': ring || vipRing || vip,
      'avatar--vip-ring': vipRing || vip,
      'avatar--green-ring': ring && !vipRing && !vip,
    }"
    :style="{ ...sizeStyle, background: ringBg }"
  >
    <image
      v-if="!showFallback"
      :src="src"
      class="avatar-img"
      mode="aspectFill"
      lazy-load
      :style="innerSizeStyle"
    />
    <view v-else class="avatar-fallback" :style="{ ...innerSizeStyle, background: gradient, fontSize }">
      {{ initial }}
    </view>
    <view
      v-if="showOnlineDot"
      class="avatar-dot avatar-dot--online"
      :style="{
        width: `${dotSize}rpx`,
        height: `${dotSize}rpx`,
        borderWidth: `${dotBorderSize}rpx`,
      }"
    />
    <view
      v-if="showLiveDot"
      class="avatar-dot avatar-dot--live"
      :style="{
        width: `${dotSize}rpx`,
        height: `${dotSize}rpx`,
        borderWidth: `${dotBorderSize}rpx`,
      }"
    />
  </view>
</template>

<style scoped>
.avatar {
  position: relative;
  border-radius: var(--r-full);
  overflow: visible;
  flex-shrink: 0;
}
.avatar-img {
  border-radius: var(--r-full);
  display: block;
  border: var(--avatar-border);
}
.avatar-fallback {
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-inverse);
  font-weight: 600;
}
.avatar-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  border-radius: var(--r-full);
  border-style: solid;
  border-color: var(--c-neutral-0);
}
.avatar-dot--online {
  background: var(--c-brand);
}
.avatar-dot--live {
  background: var(--c-error);
}
</style>
