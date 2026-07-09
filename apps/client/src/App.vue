<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useSessionStore } from "./stores/session";
import { useUnlockGuideStore } from "./stores/unlock-guide";
import UnlockGuideModal from "./components/UnlockGuideModal.vue";
import UnlockGuideOverlay from "./components/UnlockGuideOverlay.vue";

const sessionStore = useSessionStore();
const unlockGuideStore = useUnlockGuideStore();
const { visible, featureName, completionPercent, overlayVisible } = storeToRefs(unlockGuideStore);

/** @update:visible 事件处理 - 使用命名函数避免 Vue 编译器对箭头函数的缓存问题 */
function handleUpdateVisible(val) {
  if (!val) unlockGuideStore.hide();
}

onLaunch(() => {
  uni.onError?.((error: string | Error) => {
    console.error("[App.onError]", error);
  });

  uni.onUnhandledRejection?.((res: { reason: unknown; promise: Promise<unknown> }) => {
    console.error("[App.onUnhandledRejection]", res.reason);
  });

  sessionStore.bootstrap().catch((err: unknown) => {
    console.error("[App.onLaunch] bootstrap 初始化异常:", err);
  });
});
</script>

<template>
  <!-- App.vue 不直接渲染页面内容（由 pages.json 配置驱动），仅作为全局根容器 -->
  <!-- Phase 4 任务 20：全局挂载解锁引导弹窗 + 首次教学蒙层，监听 store 状态自动显隐 -->
  <UnlockGuideModal
    :visible="visible"
    :feature-name="featureName"
    :completion-percent="completionPercent"
    @update:visible="handleUpdateVisible"
    @confirm="unlockGuideStore.confirm"
    @cancel="unlockGuideStore.hide"
  />
  <UnlockGuideOverlay
    :visible="overlayVisible"
    @known="unlockGuideStore.hideOverlay"
  />
</template>

<style lang="scss">
@import "./theme/design-variables.scss";
@import "./theme/global.scss";

page {
  background: var(--c-gradient-page);
  color: var(--c-text-primary);
  font-family:
    -apple-system,
    "SF Pro Text",
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
  width: 100%;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

view, text, image {
  box-sizing: border-box;
}

view, button, scroll-view, swiper, input, textarea {
  -webkit-tap-highlight-color: transparent;
}

/* ================================================================
   全局微动效系统
   ================================================================ */

/* 页面进入动画 - 向上淡入 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 简单淡入动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 弹性缩放进入动画 */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 脉冲动画（在线红点） */
@keyframes pulseDot {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.7;
  }
}

/* 弹性弹出动画（点赞爱心） */
@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.1);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 上下漂浮动画（FAB提示气泡） */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8rpx);
  }
}

/* 心跳动画（喜欢按钮） */
@keyframes heartBeat {
  0%, 100% {
    transform: scale(1);
  }
  14% {
    transform: scale(1.2);
  }
  28% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.2);
  }
  70% {
    transform: scale(1);
  }
}

/* 光泽流动效果 */
@keyframes gradientShine {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

/* 页面进入动画类 */
.animate-fade-in {
  animation: fadeInUp 400ms cubic-bezier(0.4, 0, 0.2, 1) both;
  will-change: transform, opacity;
}

/* 列表/卡片交错入场延迟类 */
.stagger-1 {
  animation-delay: 100ms;
}
.stagger-2 {
  animation-delay: 200ms;
}
.stagger-3 {
  animation-delay: 300ms;
}

/* 淡入动画类 */
.animate-fade {
  animation: fadeIn 200ms ease-out both;
  will-change: opacity;
}

/* 弹性缩放入场类 */
.animate-scale-in {
  animation: scaleIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  will-change: transform, opacity;
}

/* 按钮点击缩放 */
.btn-press {
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
.btn-press:active {
  transform: scale(0.96);
}

/* 通用点击缩放 */
.press-scale {
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
.press-scale:active {
  transform: scale(0.98);
}

/* 在线红点脉冲 */
.pulse-dot {
  animation: pulseDot 2s ease-in-out infinite;
  will-change: transform, opacity;
}

/* 点赞爱心弹出 */
.bounce-in {
  animation: bounceIn 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  will-change: transform, opacity;
}

/* 漂浮动画 */
.float {
  animation: float 3s ease-in-out infinite;
  will-change: transform;
}

/* 心跳动画 */
.heart-beat {
  animation: heartBeat 1.2s ease-in-out infinite;
  will-change: transform;
}

/* 光泽流动按钮 */
.gradient-shine {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: gradientShine 2s linear infinite;
}

::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  color: transparent;
}

.radius-card {
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(15, 23, 42, 0.05), 0 1rpx 4rpx rgba(15, 23, 42, 0.04);
  border: 1rpx solid #EEF0F4;
}

.text-brand { color: #3FCF8E; }
.text-brand-romance { color: #EC4899; }
.text-pink { color: #EC4899; }
.text-vip { color: #C9A36A; }

.gradient-brand {
  background: linear-gradient(135deg, #3FCF8E 0%, #7CD9A6 100%);
}
.gradient-romance {
  background: linear-gradient(135deg, #EC4899 0%, #F97316 100%);
}
.gradient-pink {
  background: linear-gradient(135deg, #EC4899 0%, #F97316 100%);
}
.gradient-vip {
  background: linear-gradient(135deg, #C9A36A 0%, #E8C98A 100%);
}

.float-shadow {
  box-shadow: 0 6rpx 20rpx rgba(63, 207, 142, 0.35);
}

.shadow-card-soft {
  box-shadow: 0 2rpx 12rpx rgba(15, 23, 42, 0.05), 0 1rpx 4rpx rgba(15, 23, 42, 0.04);
  border: 1rpx solid #EEF0F4;
}

.shadow-brand {
  box-shadow: 0 4rpx 16rpx rgba(63, 207, 142, 0.25);
}

.shadow-romance {
  box-shadow: 0 4rpx 16rpx rgba(236, 72, 153, 0.25);
}

/* ================================================================
   安全区域适配 - 全局样式
   ================================================================ */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-top {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

/* 页面根容器默认高度 */
.page-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* ================================================================
   页面过渡动画 - 350ms 淡入+上移（全局唯一定义）
   - .page-fade-in 直接由 CSS 类应用，无需 JS 状态切换
   - 350ms + cubic-bezier(0.34, 1.56, 0.64, 1) 弹性缓动
   - opacity 0→1 + translateY(8px)→0，从下方滑入
   - mp-weixin 兼容：纯 CSS 动画，无 DOM API 依赖
   ================================================================ */
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-fade-in {
  animation: pageFadeIn 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* ================================================================
   列表项 stagger 入场动画（解决"切换时需要能明显感知切换过程"）
   - 在列表容器上添加 .list-stagger
   - 列表项添加 .list-item
   - mp-weixin 支持 :nth-child 和 animation-delay
   ================================================================ */
@keyframes list-item-enter {
  from { opacity: 0; transform: translateY(16rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.list-item {
  animation: list-item-enter 300ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 60ms; }
.list-item:nth-child(3) { animation-delay: 120ms; }
.list-item:nth-child(4) { animation-delay: 180ms; }
.list-item:nth-child(5) { animation-delay: 240ms; }
.list-item:nth-child(6) { animation-delay: 300ms; }
.list-item:nth-child(n+7) { animation-delay: 360ms; }

/* ================================================================
   卡片错位入场动画（Phase F3）
   - 在卡片容器上添加 .card-stagger
   - 子卡片自动按 100ms 间隔错位入场
   - 用于首页推荐卡片、寻觅页权益卡片、村口页帖子卡片
   - mp-weixin 兼容：:nth-child + animation-delay
   ================================================================ */
@keyframes cardStaggerIn {
  from {
    opacity: 0;
    transform: translateY(32rpx) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.card-stagger > * {
  animation: cardStaggerIn 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

.card-stagger > *:nth-child(1) { animation-delay: 0ms; }
.card-stagger > *:nth-child(2) { animation-delay: 100ms; }
.card-stagger > *:nth-child(3) { animation-delay: 200ms; }
.card-stagger > *:nth-child(4) { animation-delay: 300ms; }
.card-stagger > *:nth-child(5) { animation-delay: 400ms; }
.card-stagger > *:nth-child(n+6) { animation-delay: 500ms; }

/* ================================================================
   Tab 切换动画工具类（下划线滑动 + 内容淡入）
   - 在 tab 容器上添加 .tab-bar-slide
   - 在 tab 下划线上添加 .tab-underline（使用 transform 控制位置）
   - 在 tab 内容上添加 .tab-content-fade
   ================================================================ */
.tab-underline {
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1),
              width 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-content-fade {
  animation: tab-content-enter 250ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes tab-content-enter {
  from { opacity: 0; transform: translateY(8rpx); }
  to { opacity: 1; transform: translateY(0); }
}

/* ================================================================
   页面滑入动画（从下往上，更强的切换感知）
   ================================================================ */
@keyframes page-slide-up {
  from { opacity: 0; transform: translateY(40rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.page-slide-up {
  animation: page-slide-up 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* ================================================================
   页面缩放淡入动画（modal 风格切换）
   ================================================================ */
@keyframes page-scale-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.page-scale-in {
  animation: page-scale-in 300ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

/* ================================================================
   通用按压反馈工具类（mp-weixin :active 伪类不可靠，用 JS 控制）
   - 200ms cubic-bezier(0.4, 0, 0.2, 1) 标准缓动
   - 按压时 scale + box-shadow + opacity 三重视觉反馈
   ================================================================ */
.press-feedback {
  transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 180ms cubic-bezier(0.4, 0, 0.2, 1),
              filter 180ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 180ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, filter, opacity;
}

.press-feedback--active {
  transform: scale(0.88);
  filter: brightness(0.95);
  opacity: 0.92;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.12);
  transition-duration: 120ms;
}

/* 按钮按下时的涟漪扩散动画（替代单纯震动） */
.press-feedback--ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(91, 127, 255, 0.15);
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;
  transition: width 400ms ease-out, height 400ms ease-out, opacity 400ms ease-out;
}

.press-feedback--ripple.press-feedback--active::after {
  width: 200%;
  height: 200%;
  opacity: 0.6;
  transition: width 300ms ease-out, height 300ms ease-out, opacity 600ms ease-out;
}

/* ================================================================
   全局滚动条美化
   ================================================================ */
::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* ================================================================
   骨架屏 Shimmer 动画（全局可用）
   ================================================================ */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* ================================================================
   基础卡片 hover 提升
   ================================================================ */
.card-hover {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.card-hover:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.06);
}

/* ================================================================
   视觉层级与边缘强化工具类（解决"边缘色未显示、层级划分不清晰"）
   使用：在卡片元素上添加 .card-base + .press-feedback
   ================================================================ */
.card-base {
  position: relative;
  background: #FFFFFF;
  border: var(--card-border);
  border-radius: 24rpx;
  box-shadow: var(--card-shadow);
  margin-bottom: var(--section-gap);
  overflow: hidden;
}

.card-base--pressed {
  transform: scale(0.98);
  box-shadow: var(--card-shadow-active);
}

/* 高层级卡片：更强的阴影和边缘，用于主推荐卡片 */
.card-base--elevated {
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.08), 0 4rpx 12rpx rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

/* 区块分隔（明确可见的边缘色） */
.section-divider {
  border-bottom: var(--border-default);
}

.section-divider--subtle {
  border-bottom: var(--border-subtle);
}

.section-divider--strong {
  border-bottom: var(--border-strong);
}

/* 强调边缘（品牌色/浪漫色） */
.edge-accent {
  border: var(--border-accent);
}

.edge-romance {
  border: var(--border-romance);
}

/* ================================================================
   Phase G · 视觉层级与边缘强化工具类（全局生效）
   说明：theme/global.css 在项目中未被导入，故将这两个工具类
   同步至 App.vue 全局 <style> 块，确保 .img-rounded 与
   .section-title-brand 在 H5 与 mp-weixin 双端均能生效。
   ================================================================ */

/* 图片分割：圆角 + 阴影，用于主要 <image> 元素或图片包裹容器 */
.img-rounded {
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.08), 0 1rpx 4rpx rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

/* 章节标题品牌色竖线装饰：左侧 4rpx 蓝色渐变竖线 */
.section-title-brand {
  position: relative;
  padding-left: 20rpx;
}

.section-title-brand::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 48rpx;
  background: linear-gradient(180deg, #5B7FFF 0%, #7C9BFF 100%);
  border-radius: 2rpx;
  box-shadow: 0 0 8rpx rgba(91, 127, 255, 0.3);
}

/* ================================================================
   底部安全区 - 为自定义 TabBar 预留空间（固定底部 ~160rpx）
   ================================================================ */
.page-bottom-safe {
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

/* 带缩进的底部安全区（内边距与左右边距一致） */
.page-bottom-safe--inset {
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  padding-left: var(--sp-7);
  padding-right: var(--sp-7);
}

/* TabBar 容器高度参考（供页面计算偏移用） */
:root {
  --tabbar-height: calc(140rpx + env(safe-area-inset-bottom));
}

</style>