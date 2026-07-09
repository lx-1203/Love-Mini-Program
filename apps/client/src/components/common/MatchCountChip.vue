<script setup lang="ts">
/**
 * MatchCountChip - 匹配次数 Chip 组件
 *
 * 用途：在 home / profile 等页面顶部展示今日剩余匹配次数，点击跳转到寻觅页。
 *
 * 设计规范：
 * - 视觉样式与 discover 页面 .discover-header__count-chip 完全一致
 * - 背景色：var(--c-brand-50) 薄荷绿淡底
 * - 边框：1rpx solid var(--c-brand-200)
 * - 字号：30rpx，font-weight: 700
 * - H5 端文字使用渐变色（绿→粉），mp-weixin 端使用品牌色
 *
 * 使用方式：
 * <MatchCountChip :count="remainingCount" />
 */
import { IMAGE_PATHS } from "../../config/images";
import { openAppPath } from "../../utils/navigation";
import SafeImage from "./SafeImage.vue";

const props = withDefaults(defineProps<{
  /** 剩余匹配次数 */
  count: number;
  /** 图标资源路径，默认使用 social/match.png */
  icon?: string;
}>(), {
  count: 0,
  icon: IMAGE_PATHS.ICONS_SOCIAL.MATCH,
});

/** emit tap 事件，便于父组件监听 */
const emit = defineEmits<{
  (e: "tap"): void;
}>();

/**
 * 点击 chip 跳转到寻觅页
 */
function handleTap() {
  emit("tap");
  openAppPath("/pages/discover/index");
}
</script>

<template>
  <view
    class="match-count-chip press-feedback"
    hover-class="press-feedback--active"
    hover-stay-time="120"
    @tap="handleTap"
  >
    <SafeImage
      :src="props.icon"
      custom-class="match-count-chip__icon"
      mode="aspectFit"
    />
    <text class="match-count-chip__count">{{ props.count }} 次</text>
  </view>
</template>

<style scoped lang="scss">
/* 与 discover 页面 .discover-header__count-chip 样式完全一致 */
.match-count-chip {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--r-xxl);
  background: var(--c-brand-50);
  border: 1rpx solid var(--c-brand-200);
}

.match-count-chip__icon {
  width: 28rpx;
  height: 28rpx;
}

.match-count-chip__count {
  font-size: var(--fs-xl);
  font-weight: 700;
  /* #ifdef H5 */
  background: linear-gradient(135deg, var(--c-brand-500) 0%, var(--c-romance-500) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  /* #endif */
  /* #ifndef H5 */
  color: var(--c-brand-500);
  /* #endif */
}
</style>
