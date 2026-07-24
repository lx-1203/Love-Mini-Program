<script setup lang="ts">
/**
 * LongPressMenu — 长按快捷操作菜单
 *
 * 长按卡片 500ms 后触发，卡片轻微缩放 + 暗色遮罩，
 * 底部弹出 ActionSheet：查看详情 / 超级喜欢 / 举报
 */
import { ref, watch, nextTick } from "vue";
import { lightHaptic, mediumHaptic } from "../../utils/haptic";

const props = defineProps<{
  visible: boolean;
  cardName: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "detail"): void;
  (e: "superLike"): void;
  (e: "report"): void;
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

function handleAction(action: "detail" | "superLike" | "report") {
  lightHaptic();
  animating.value = false;
  setTimeout(() => {
    if (action === "detail") {
      emit("detail");
    } else if (action === "superLike") {
      emit("superLike");
    } else if (action === "report") {
      emit("report");
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
  <view v-if="visible" class="long-press-menu" :class="{ 'long-press-menu--active': animating }">
    <!-- 半透明遮罩 -->
    <view class="long-press-menu__backdrop" :class="{ 'long-press-menu__backdrop--active': animating }"
      @tap="handleClose" />

    <!-- 菜单面板 -->
    <view class="long-press-menu__panel" :class="{ 'long-press-menu__panel--active': animating }">
      <!-- 拖拽指示条 -->
      <view class="long-press-menu__handle">
        <view class="long-press-menu__handle-bar" />
      </view>

      <!-- 标题 -->
      <view class="long-press-menu__header">
        <text class="long-press-menu__title">快捷操作</text>
        <text class="long-press-menu__subtitle">{{ cardName }}</text>
      </view>

      <!-- 菜单项 -->
      <view class="long-press-menu__item press-feedback" hover-class="long-press-menu__item--pressed"
        @tap="handleAction('detail')">
        <view class="long-press-menu__item-icon long-press-menu__item-icon--detail">
          <text class="long-press-menu__item-icon-emoji">👤</text>
        </view>
        <view class="long-press-menu__item-content">
          <text class="long-press-menu__item-title">查看详情</text>
          <text class="long-press-menu__item-desc">浏览完整资料和照片</text>
        </view>
        <text class="long-press-menu__item-arrow">›</text>
      </view>

      <view class="long-press-menu__item press-feedback" hover-class="long-press-menu__item--pressed"
        @tap="handleAction('superLike')">
        <view class="long-press-menu__item-icon long-press-menu__item-icon--super">
          <text class="long-press-menu__item-icon-emoji">⭐</text>
        </view>
        <view class="long-press-menu__item-content">
          <text class="long-press-menu__item-title">超级喜欢</text>
          <text class="long-press-menu__item-desc">让对方优先看到你</text>
        </view>
        <text class="long-press-menu__item-arrow">›</text>
      </view>

      <view class="long-press-menu__item press-feedback" hover-class="long-press-menu__item--pressed"
        @tap="handleAction('report')">
        <view class="long-press-menu__item-icon long-press-menu__item-icon--report">
          <text class="long-press-menu__item-icon-emoji">⚠️</text>
        </view>
        <view class="long-press-menu__item-content">
          <text class="long-press-menu__item-title">举报</text>
          <text class="long-press-menu__item-desc">举报不当行为或虚假信息</text>
        </view>
        <text class="long-press-menu__item-arrow">›</text>
      </view>

      <!-- 取消按钮 -->
      <view class="long-press-menu__cancel press-feedback" hover-class="long-press-menu__cancel--pressed"
        @tap="handleClose">
        <text class="long-press-menu__cancel-text">取消</text>
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
  background: rgba(0, 0, 0, 0);
  transition: background 250ms ease;
}

.long-press-menu__backdrop--active {
  background: rgba(0, 0, 0, 0.4);
}

/* ========== 面板 ========== */
.long-press-menu__panel {
  position: relative;
  width: 100%;
  background: #fff;
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
  background: #e3f2fd;
}

.long-press-menu__item-icon--super {
  background: #fff8e1;
}

.long-press-menu__item-icon--report {
  background: #fce4ec;
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
