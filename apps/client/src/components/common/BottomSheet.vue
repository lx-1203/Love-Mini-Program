<script setup lang="ts">
/**
 * BottomSheet — 通用底部弹出弹窗（2026-09-02 R5：用户需求"从下面出来的弹窗状窗口"）
 *
 * 设计：
 * - 从屏幕底部 30% → 0% 滑入（CSS transform + transition，兼容 mp-weixin）；
 * - 顶部圆角 32rpx + 拖动指示棒（handle bar，可选）；
 * - 遮罩层淡入（fade-in），点击遮罩或顶部"✕"按钮触发 close；
 * - 内容由 slot 提供，支持滚动（scroll-y）；
 * - 底部安全区占位（env safe-area-inset-bottom）。
 *
 * 使用：
 *   <BottomSheet :visible="show" title="实名认证" @close="show = false">
 *     <view class="...">认证内容...</view>
 *   </BottomSheet>
 */
import { watch, nextTick, ref, onUnmounted } from "vue";
// 2026-09-04 问题1修复：弹层打开时自动隐藏自定义 tabBar（tabBar 恒在页面之上，
// z-index 无法穿透，中央浮岛圆钮凸出更高会盖住 footer 按钮）。
// setTabBarHidden 内部 getTabBar 容错，非 tab 页（如 profile/other）为无害 no-op。
import { setTabBarHidden } from "../../utils/navigation";

const props = withDefaults(
  defineProps<{
    /** 是否可见（双向绑定用 v-model 也可） */
    visible: boolean;
    /** 标题（顶部居中）；传空串可隐藏整条标题栏 */
    title?: string;
    /** 最高高度占屏比例（0.4 ~ 0.95），默认 0.85 */
    maxHeightRatio?: number;
    /** 是否显示顶部 handle 拖动棒 */
    showHandle?: boolean;
    /** 是否显示右上角关闭按钮（默认 true） */
    showClose?: boolean;
    /** 点击遮罩是否允许关闭（默认 true） */
    maskClosable?: boolean;
  }>(),
  {
    title: "",
    maxHeightRatio: 0.85,
    showHandle: true,
    showClose: true,
    maskClosable: true,
  },
);
const emit = defineEmits<{ (e: "update:visible", val: boolean): void; (e: "close"): void }>();

const sheetVisible = ref(props.visible);
watch(() => props.visible, (v) => { sheetVisible.value = v; });
watch(sheetVisible, (v) => {
  // 2026-09-04 问题1修复：随弹层显隐自动隐藏/恢复 tabBar，保证 footer 按钮不被浮岛遮挡
  setTabBarHidden(v);
  if (v !== props.visible) emit("update:visible", v);
  if (!v) emit("close");
});

// 2026-09-04 问题1修复：组件卸载兜底恢复 tabBar，防止残留隐藏态污染其他 tab 页
onUnmounted(() => {
  setTabBarHidden(false);
});

function closeSheet() {
  sheetVisible.value = false;
}

function onMaskTap() {
  if (props.maskClosable) closeSheet();
}
</script>

<template>
  <view v-if="sheetVisible" class="bottom-sheet-root">
    <view class="bottom-sheet-mask" @tap="onMaskTap" />
    <view
      class="bottom-sheet-panel"
      :style="{
        // 2026-09-04 问题1修复：root 已恢复 inset:0 且弹窗自动隐藏 tabBar（watch visible
        // → setTabBarHidden），不再需要为 tabBar 预留 -13vh，恢复纯比例 max-height。
        // 注：mp-weixin 内联 style 不支持 calc() 嵌套 var + rpx，保持纯 vh 算式。
        maxHeight: (maxHeightRatio * 100) + 'vh',
      }"
    >
      <!-- 顶部 handle 棒（视觉提示，可拖拽区域） -->
      <view v-if="showHandle" class="bottom-sheet-handle" aria-hidden="true">
        <view class="bottom-sheet-handle-bar" />
      </view>

      <!-- 标题栏（可隐藏） -->
      <view v-if="title" class="bottom-sheet-header">
        <text class="bottom-sheet-title">{{ title }}</text>
        <view v-if="showClose" class="bottom-sheet-close press-feedback" hover-class="press-feedback--active" role="button" :aria-label="'关闭'" @tap="closeSheet">
          <text class="bottom-sheet-close-text">×</text>
        </view>
      </view>

      <!-- 内容区（slot） -->
      <scroll-view scroll-y class="bottom-sheet-body" :show-scrollbar="false">
        <slot />
      </scroll-view>

      <!-- 2026-09-02 R11：固定底部操作区（footer slot）——不随内容滚动，按钮始终可见可点 -->
      <view v-if="$slots.footer" class="bottom-sheet-footer">
        <slot name="footer" />
      </view>

      <!-- 底部安全区 -->
      <view class="bottom-sheet-safe-area" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.bottom-sheet-root {
  position: fixed;
  /* 2026-09-04 问题1修复：弹窗打开时自动隐藏自定义 tabBar（watch visible → setTabBarHidden，
     卸载兜底恢复），不再预留 tabBar 高度，root 恢复全屏 inset:0（top/left/right/bottom 全 0）：
     遮罩覆盖全屏，footer 贴底，底部安全区由 .bottom-sheet-safe-area 承担，
     footer 按钮（重新定位/我知道了）不再被 tabBar 浮岛遮挡。
     其他使用点（profile/other 的"更多操作"弹窗）同理纯改善，非 tab 页 setTabBarHidden 为 no-op。 */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  pointer-events: auto;
  transform: translateZ(0);
}

.bottom-sheet-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  /* mp-weixin 兼容性：simple animation */
  animation: sheet-mask-fade 200ms ease both;
}

@keyframes sheet-mask-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.bottom-sheet-panel {
  position: relative;
  width: 100%;
  background: #ffffff;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  box-shadow: 0 -16rpx 48rpx rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 2026-09-03 R11 终极修 + 2026-09-04 问题1修复：max-height 由内联 style 按
     maxHeightRatio 纯比例计算（tabBar 已自动隐藏，无需预留），面板 fit-content，
     自适应内容；footer flex-shrink:0 永远可见。 */
  animation: sheet-panel-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes sheet-panel-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.bottom-sheet-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 0 8rpx;
  flex-shrink: 0;
}

.bottom-sheet-handle-bar {
  width: 64rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #E2E8E0;
}

.bottom-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 32rpx 20rpx;
  flex-shrink: 0;
  position: relative;
}

.bottom-sheet-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #1A1E1C;
}

.bottom-sheet-close {
  position: absolute;
  right: 24rpx;
  top: 4rpx;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #F4F6F4;
}

.bottom-sheet-close-text {
  font-size: 36rpx;
  color: #6B7571;
  line-height: 1;
}

.bottom-sheet-body {
  flex: 1;
  min-height: 0;
  /* 内容可滚动 */
}

/* 2026-09-02 R11：footer 固定区（不随内容滚动） */
.bottom-sheet-footer {
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  padding: 8rpx 32rpx 16rpx;
}

.bottom-sheet-safe-area {
  height: env(safe-area-inset-bottom);
  flex-shrink: 0;
  z-index: 2;
}
</style>