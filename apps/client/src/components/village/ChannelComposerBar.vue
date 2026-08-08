<script setup lang="ts">
/**
 * 频道底部发帖输入条（ChannelComposerBar）
 *
 * 2026-08-08 频道化重构：QQ 频道「底部文本输入框即发帖入口」风格。
 * 只读圆角输入框（随频道换占位文案）+ 右侧「发帖」按钮；
 * 学校圈未认证时点击先引导认证（locked）。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";

const props = defineProps<{
  /** 当前频道占位文案 */
  placeholder: string;
  /** 锁定（如学校圈未认证）：点击引导认证 */
  locked?: boolean;
}>();

const emit = defineEmits<{
  (e: "publish"): void;
  (e: "unlock"): void;
}>();

const { t } = useI18n();

const publishLabel = computed(() => t("village.publish"));

function handleTap() {
  if (props.locked) {
    emit("unlock");
    return;
  }
  emit("publish");
}
</script>

<template>
  <view class="composer-bar">
    <view
      class="composer-bar__input press-feedback"
      hover-class="composer-bar__input--pressed"
      hover-stay-time="100"
      role="button"
      :aria-label="placeholder"
      @tap="handleTap"
    >
      <image
        v-if="locked"
        class="composer-bar__lock"
        :src="IMAGE_PATHS.ICONS_EMOJI.LOCK"
        mode="aspectFit"
        alt=""
      />
      <text class="composer-bar__placeholder">{{ placeholder }}</text>
    </view>
    <view
      class="composer-bar__publish press-feedback"
      hover-class="composer-bar__publish--pressed"
      hover-stay-time="100"
      role="button"
      :aria-label="publishLabel"
      @tap="handleTap"
    >
      <image class="composer-bar__publish-icon" :src="IMAGE_PATHS.ICONS_EMOJI.PENCIL" mode="aspectFit" alt="" />
      <text class="composer-bar__publish-text">{{ publishLabel }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   ChannelComposerBar - 底部发帖输入条（QQ 频道风格）
   ================================================================ */
.composer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-3));
  background: var(--c-bg-container);
  border-top: 1rpx solid var(--c-neutral-100, #eef1f6);
  box-shadow: 0 -8rpx 24rpx var(--c-black-shadow-sm, rgba(0, 0, 0, 0.08));
}

/* 输入框占位（只读，点击进发帖页） */
.composer-bar__input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10rpx;
  height: 72rpx;
  padding: 0 var(--sp-4);
  border-radius: var(--r-full);
  background: var(--c-neutral-50, #f7f8fa);
  border: 1rpx solid var(--c-neutral-100, #eef1f6);
  min-width: 0;
}

.composer-bar__input--pressed {
  background: var(--c-neutral-100, #eef1f6);
}

.composer-bar__lock {
  width: 30rpx;
  height: 30rpx;
  flex-shrink: 0;
}

.composer-bar__placeholder {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 发帖按钮（品牌渐变） */
.composer-bar__publish {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 72rpx;
  padding: 0 var(--sp-5);
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
}

.composer-bar__publish--pressed {
  transform: scale(0.96);
  opacity: 0.9;
}

.composer-bar__publish-icon {
  width: 32rpx;
  height: 32rpx;
}

.composer-bar__publish-text {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: var(--c-neutral-0);
}
</style>
