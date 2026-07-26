<script setup lang="ts">
/**
 * LongPressMenu — 长按快捷操作菜单
 *
 * 长按卡片 500ms 后触发，卡片轻微缩放 + 暗色遮罩，
 * 底部弹出 ActionSheet：查看详情 / 超级喜欢 / 举报
 */
import { ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
// 修复（严格模式 noUnusedLocals）：mediumHaptic 导入后未使用，仅保留 lightHaptic。
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";

const props = defineProps<{
  visible: boolean;
  cardName: string;
}>();

const { t } = useI18n();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "detail"): void;
  (e: "superLike"): void;
  (e: "report"): void;
  /** 不感兴趣：减少类似推荐 */
  (e: "notInterested"): void;
}>();

const animating = ref(false);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      nextTick(() => { animating.value = true; });
    } else {
      animating.value = false;
    }
  }
);

function handleAction(action: "detail" | "superLike" | "report" | "notInterested") {
  try {
    lightHaptic();
  } catch (err) {
    // 振动反馈失败时静默降级，不影响主流程
    console.warn("[LongPressMenu] haptic failed:", err);
  }
  animating.value = false;
  setTimeout(() => {
    if (action === "detail") {
      emit("detail");
    } else if (action === "superLike") {
      emit("superLike");
    } else if (action === "report") {
      emit("report");
    } else if (action === "notInterested") {
      emit("notInterested");
    }
    emit("close");
  }, 200);
}

function handleClose() {
  animating.value = false;
  setTimeout(() => emit("close"), 200);
}
</script>

<template>
  <view
    v-if="visible"
    class="long-press-menu"
    :class="{ 'long-press-menu--active': animating }"
    role="dialog"
    aria-modal="true"
    :aria-label="t('discover.menuTitle')"
  >
    <!-- 半透明遮罩 -->
    <view
      class="long-press-menu__backdrop"
      :class="{ 'long-press-menu__backdrop--active': animating }"
      @tap="handleClose"
      role="button"
      :aria-label="t('common.cancel')"
    />

    <!-- 菜单面板 -->
    <view class="long-press-menu__panel" :class="{ 'long-press-menu__panel--active': animating }">
      <!-- 拖拽指示条 -->
      <view class="long-press-menu__handle">
        <view class="long-press-menu__handle-bar" />
      </view>

      <!-- 标题 -->
      <view class="long-press-menu__header">
        <text class="long-press-menu__title">{{ t('discover.menuTitle') }}</text>
        <text class="long-press-menu__subtitle">{{ cardName }}</text>
      </view>

      <!-- 菜单项 -->
      <view
        class="long-press-menu__item press-feedback"
        hover-class="long-press-menu__item--pressed"
        @tap="handleAction('detail')"
        role="button"
        :aria-label="t('discover.menuDetail')"
      >
        <view class="long-press-menu__item-icon long-press-menu__item-icon--detail">
          <image class="long-press-menu__item-icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.USER" mode="aspectFit" alt="" />
        </view>
        <view class="long-press-menu__item-content">
          <text class="long-press-menu__item-title">{{ t('discover.menuDetail') }}</text>
          <text class="long-press-menu__item-desc">{{ t('discover.menuDetailDesc') }}</text>
        </view>
        <text class="long-press-menu__item-arrow">›</text>
      </view>

      <view
        class="long-press-menu__item press-feedback"
        hover-class="long-press-menu__item--pressed"
        @tap="handleAction('superLike')"
        role="button"
        :aria-label="t('discover.superLike')"
      >
        <view class="long-press-menu__item-icon long-press-menu__item-icon--super">
          <image class="long-press-menu__item-icon-img" :src="IMAGE_PATHS.ICONS_COMMON.STAR_SVG" mode="aspectFit" alt="" />
        </view>
        <view class="long-press-menu__item-content">
          <text class="long-press-menu__item-title">{{ t('discover.superLike') }}</text>
          <text class="long-press-menu__item-desc">{{ t('discover.menuSuperLikeDesc') }}</text>
        </view>
        <text class="long-press-menu__item-arrow">›</text>
      </view>

      <view
        class="long-press-menu__item press-feedback"
        hover-class="long-press-menu__item--pressed"
        @tap="handleAction('notInterested')"
        role="button"
        :aria-label="t('discover.menuNotInterested')"
      >
        <view class="long-press-menu__item-icon long-press-menu__item-icon--not-interested">
          <image class="long-press-menu__item-icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.EYE_OFF" mode="aspectFit" alt="" />
        </view>
        <view class="long-press-menu__item-content">
          <text class="long-press-menu__item-title">{{ t('discover.menuNotInterested') }}</text>
          <text class="long-press-menu__item-desc">{{ t('discover.menuNotInterestedDesc') }}</text>
        </view>
        <text class="long-press-menu__item-arrow">›</text>
      </view>

      <view
        class="long-press-menu__item press-feedback"
        hover-class="long-press-menu__item--pressed"
        @tap="handleAction('report')"
        role="button"
        :aria-label="t('discover.menuReport')"
      >
        <view class="long-press-menu__item-icon long-press-menu__item-icon--report">
          <image class="long-press-menu__item-icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.WARNING" mode="aspectFit" alt="" />
        </view>
        <view class="long-press-menu__item-content">
          <text class="long-press-menu__item-title">{{ t('discover.menuReport') }}</text>
          <text class="long-press-menu__item-desc">{{ t('discover.menuReportDesc') }}</text>
        </view>
        <text class="long-press-menu__item-arrow">›</text>
      </view>

      <!-- 取消按钮 -->
      <view
        class="long-press-menu__cancel press-feedback"
        hover-class="long-press-menu__cancel--pressed"
        @tap="handleClose"
        role="button"
        :aria-label="t('common.cancel')"
      >
        <text class="long-press-menu__cancel-text">{{ t('common.cancel') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.long-press-menu {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1001;
  display: flex;
  align-items: flex-end;
}

.long-press-menu__backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-black-overlay-transparent, var(--c-black-overlay-transparent, rgba(0, 0, 0, 0)));
  transition: background 250ms ease;
}

.long-press-menu__backdrop--active {
  background: var(--c-black-overlay-mid, var(--c-black-overlay-mid, rgba(0, 0, 0, 0.4)));
}

/* ========== 面板 ========== */
.long-press-menu__panel {
  position: relative;
  width: 100%;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 28rpx 28rpx 0 0;
  padding: 16rpx 28rpx 28rpx;
  padding-bottom: calc(28rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.long-press-menu__panel--active {
  transform: translateY(0);
}

.long-press-menu__handle {
  display: flex;
  justify-content: center;
  padding: 10rpx 0 16rpx;
}

.long-press-menu__handle-bar {
  width: 56rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: var(--c-neutral-200);
}

/* ========== 头部 ========== */
.long-press-menu__header {
  padding: 0 4rpx 20rpx;
}

.long-press-menu__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.long-press-menu__subtitle {
  display: block;
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  margin-top: 4rpx;
}

/* ========== 菜单项 ========== */
.long-press-menu__item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 16rpx;
  border-radius: 16rpx;
  margin-bottom: 8rpx;
  transition: background 150ms ease;
}

.long-press-menu__item--pressed {
  background: var(--c-neutral-50);
}

.long-press-menu__item-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.long-press-menu__item-icon-emoji {
  font-size: 36rpx;
}

.long-press-menu__item-icon--detail {
  background: var(--c-tint-blue-50, #E3F2FD);
}

.long-press-menu__item-icon--super {
  background: var(--c-tint-amber-50, #FFF8E1);
}

.long-press-menu__item-icon--report {
  background: var(--c-tint-pink-50, #FCE4EC);
}

.long-press-menu__item-icon--not-interested {
  background: var(--c-tint-gray-50, #F3F4F6);
}

.long-press-menu__item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.long-press-menu__item-title {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.long-press-menu__item-desc {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.long-press-menu__item-arrow {
  font-size: var(--fs-3xl);
  color: var(--c-text-tertiary);
  padding-right: 4rpx;
}

/* ========== 取消 ========== */
.long-press-menu__cancel {
  margin-top: 12rpx;
  padding: 22rpx 0;
  border-radius: 16rpx;
  background: var(--c-neutral-50);
  text-align: center;
}

.long-press-menu__cancel--pressed {
  background: var(--c-neutral-100);
}

.long-press-menu__cancel-text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-secondary);
}
</style>
