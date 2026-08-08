<script setup lang="ts">
/**
 * 频道 Tab 栏（ChannelTabs）
 *
 * 2026-08-08 频道化重构：参考 QQ 频道手机版顶部横向频道 Tab。
 * - 横向 scroll-view 滑动
 * - icon(SVG) + 文字，选中态青藤绿渐变下划线 + 文字加粗
 * - 学校圈未认证时 Tab 右上角小锁标（LOCK SVG）
 */
import { useI18n } from "vue-i18n";
import type { ChannelConfig } from "../../config/channels";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();

const props = defineProps<{
  modelValue: string;
  configs: ChannelConfig[];
  /** 需要锁定提示的频道 ID 集合（如学校圈未认证） */
  lockedIds?: string[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", id: string): void;
  (e: "change", id: string): void;
}>();

function select(id: string) {
  if (props.modelValue === id) return;
  emit("update:modelValue", id);
  emit("change", id);
}
</script>

<template>
  <scroll-view scroll-x class="channel-tabs" :show-scrollbar="false" enhanced>
    <view class="channel-tabs__inner" role="tablist">
      <view
        v-for="cfg in configs"
        :key="cfg.id"
        class="channel-tab press-feedback"
        hover-class="channel-tab--pressed"
        hover-stay-time="120"
        :class="{ 'channel-tab--active': modelValue === cfg.id }"
        role="tab"
        :aria-selected="modelValue === cfg.id"
        :aria-label="t(cfg.labelKey)"
        @tap="select(cfg.id)"
      >
        <view class="channel-tab__icon-wrap">
          <image class="channel-tab__icon" :src="cfg.icon" mode="aspectFit" alt="" />
          <!-- 未认证锁定标（学校圈） -->
          <image
            v-if="lockedIds?.includes(cfg.id)"
            class="channel-tab__lock"
            :src="IMAGE_PATHS.ICONS_EMOJI.LOCK"
            mode="aspectFit"
            alt=""
          />
        </view>
        <text class="channel-tab__label">{{ t(cfg.labelKey) }}</text>
        <view class="channel-tab__indicator" />
      </view>
    </view>
  </scroll-view>
</template>

<style scoped lang="scss">
/* ================================================================
   ChannelTabs - 频道 Tab 栏（QQ 频道风格横向滑动）
   ================================================================ */
.channel-tabs {
  width: 100%;
  white-space: nowrap;
  background: var(--c-bg-container);
}

.channel-tabs__inner {
  display: inline-flex;
  align-items: stretch;
  padding: 0 var(--sp-3);
}

.channel-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  min-width: 148rpx;
  padding: 18rpx 20rpx 16rpx;
  box-sizing: border-box;
}

.channel-tab--pressed {
  opacity: 0.7;
}

.channel-tab__icon-wrap {
  position: relative;
  width: 44rpx;
  height: 44rpx;
}

.channel-tab__icon {
  width: 44rpx;
  height: 44rpx;
  opacity: 0.55;
  transition: opacity var(--d-fast, 150ms);
}

.channel-tab--active .channel-tab__icon {
  opacity: 1;
}

/* 未认证锁标（右上角，红色警示） */
.channel-tab__lock {
  position: absolute;
  top: -8rpx;
  right: -10rpx;
  width: 26rpx;
  height: 26rpx;
}

.channel-tab__label {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-tertiary);
  font-weight: 500;
  transition: color var(--d-fast, 150ms);
}

.channel-tab--active .channel-tab__label {
  color: var(--c-text-primary);
  font-weight: 700;
}

/* 选中态：青藤绿渐变下划线（QQ 频道指示条风格） */
.channel-tab__indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 6rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  transition: width var(--d-fast, 150ms);
}

.channel-tab--active .channel-tab__indicator {
  width: 64rpx;
}
</style>
