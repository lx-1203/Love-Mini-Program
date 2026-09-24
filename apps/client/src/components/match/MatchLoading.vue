<script setup lang="ts">
// MP-R2-MATCHING-011：启用 virtualHost 使宿主节点不产生包裹元素，
// 组件根 min-height:100% 高度链成立（背景覆盖全视口，消除底部色差带）
defineOptions({ options: { virtualHost: true } });
import { onMounted, onUnmounted } from "vue";
import { IMAGE_PATHS } from "../../config/images";
// MP-R2-MATCHING-006：用户可见文案 i18n 化
import { useI18n } from "vue-i18n";
const { t } = useI18n();

withDefaults(
  defineProps<{
    myAvatar: string;
    partnerAvatar: string;
    partnerName: string;
  }>(),
  { myAvatar: "", partnerAvatar: "", partnerName: "" }
);

const emit = defineEmits<{
  (e: "finished"): void;
  (e: "skip"): void;
}>();

let finished = false;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

function finish() {
  if (finished) return;
  finished = true;
  if (fallbackTimer) clearTimeout(fallbackTimer);
  emit("finished");
}

function onHeartAnimationEnd() {
  finish();
}

onMounted(() => {
  fallbackTimer = setTimeout(() => finish(), 2600);
});

onUnmounted(() => {
  if (fallbackTimer) clearTimeout(fallbackTimer);
});

/** 匹配度进度（旅行/音乐/电影/生活方式 四维）。
 * MP-R1-MATCHING-REQ-01：冻结契约 §12「匹配中进度为视觉模拟，不显示虚假算法百分比」——
 * 删除写死的 90/85/80/79 数值与 totalPercent（均值+5 的假数据），进度条改为纯视觉
 * 律动动画（indeterminate），标题接 matching.searching 冻结文案。 */
const PROGRESS = [
  { labelKey: "matching.dimTravel", icon: IMAGE_PATHS.MASCOT.STAR },
  // R4：heart_pink.png 为全透明空文件（行图标渲染空白圆），换 lucide music 图标
  { labelKey: "matching.dimMusic", icon: IMAGE_PATHS.ICONS_EMOJI.MUSIC },
  { labelKey: "matching.dimMovie", icon: IMAGE_PATHS.MASCOT.SPARKLE },
  { labelKey: "matching.dimLifestyle", icon: IMAGE_PATHS.ICONS_V2.SPROUT },
];
</script>

<template>
  <view class="match-loading">
    <!-- 粉色爱心装饰 - 用图片替换emoji -->
    <image class="match-loading__deco match-loading__deco--1" :src="IMAGE_PATHS.MASCOT.HEART_PINK_LARGE" mode="aspectFit" />
    <image class="match-loading__deco match-loading__deco--2" :src="IMAGE_PATHS.MASCOT.HEART_PINK_LARGE" mode="aspectFit" />
    <image class="match-loading__deco match-loading__deco--3" :src="IMAGE_PATHS.MASCOT.HEART_PINK_LARGE" mode="aspectFit" />
    <image class="match-loading__deco match-loading__deco--4" :src="IMAGE_PATHS.MASCOT.HEART_GREEN" mode="aspectFit" />
    <image class="match-loading__deco match-loading__deco--5" :src="IMAGE_PATHS.MASCOT.HEART_PINK_LARGE" mode="aspectFit" />
    <image class="match-loading__deco match-loading__deco--6" :src="IMAGE_PATHS.MASCOT.HEART_PINK_LARGE" mode="aspectFit" />
    <image class="match-loading__deco match-loading__deco--7" :src="IMAGE_PATHS.MASCOT.HEART_GREEN" mode="aspectFit" />
    <image class="match-loading__deco match-loading__deco--8" :src="IMAGE_PATHS.MASCOT.HEART_PINK_LARGE" mode="aspectFit" />

    <!-- 右上角跳过 -->
    <view class="match-loading__skip" hover-class="match-loading__skip--pressed" @tap="emit('skip')">
      <text class="match-loading__skip-text">{{ t("matching.skip") }}</text>
    </view>

    <!-- 头像区域 + 涟漪动画 -->
    <view class="match-loading__avatar-area">
      <!-- 中央轨道旋转动画（虚线环 + 连接节点） -->
      <view class="match-loading__orbit">
        <view class="match-loading__orbit-ring match-loading__orbit-ring--outer"></view>
        <view class="match-loading__orbit-ring match-loading__orbit-ring--inner"></view>
        <view class="match-loading__orbit-node match-loading__orbit-node--1"></view>
        <view class="match-loading__orbit-node match-loading__orbit-node--2"></view>
        <view class="match-loading__orbit-node match-loading__orbit-node--3"></view>
      </view>
      <!-- 涟漪扩散圆环 -->
      <view class="match-loading__ripple-wrap">
        <view class="match-loading__ripple match-loading__ripple--1"></view>
        <view class="match-loading__ripple match-loading__ripple--2"></view>
        <view class="match-loading__ripple match-loading__ripple--3"></view>
        <view class="match-loading__ripple match-loading__ripple--4"></view>
        <view class="match-loading__ripple match-loading__ripple--5"></view>
      </view>
      <view class="match-loading__avatars">
        <image class="match-loading__avatar" :src="myAvatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
        <view class="match-loading__heart" @animationend="onHeartAnimationEnd">
          <image class="match-loading__heart-img" :src="IMAGE_PATHS.MASCOT.HEART_GRADIENT" mode="aspectFit" alt="" />
        </view>
        <view class="match-loading__avatar-wrap">
          <image class="match-loading__avatar match-loading__avatar--blur" :src="partnerAvatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
          <view class="match-loading__avatar-mask" />
          <text class="match-loading__avatar-hint">{{ t("matching.matching") }}</text>
        </view>
      </view>
    </view>

    <!-- MP-R1-MATCHING-REQ-01：标题接 matching.searching 冻结文案（原硬编码中文且未走 i18n） -->
    <text class="match-loading__title">{{ t("matching.searching") }}</text>
    <text class="match-loading__subtitle">{{ t("matching.subtitle") }}</text>

    <!-- 匹配度进度卡片（纯视觉律动，无数值） -->
    <view class="match-loading__progress">
      <view class="match-loading__progress-header">{{ t("matching.progressTitle") }}</view>
      <view v-for="p in PROGRESS" :key="p.labelKey" class="match-loading__row">
        <view class="match-loading__row-icon-wrap">
          <image class="match-loading__row-icon-img" :src="p.icon" mode="aspectFit" />
        </view>
        <text class="match-loading__row-label">{{ t(p.labelKey) }}</text>
        <view class="match-loading__row-bar">
          <view class="match-loading__row-bar-inner match-loading__row-bar-inner--pulse" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* MP-R2-MATCHING-011：宿主节点撑满（配合 virtualHost） */
:host {
  flex: 1;
  min-height: 100%;
}

.match-loading {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 48rpx 60rpx;
  box-sizing: border-box;
  overflow: hidden;
  background: linear-gradient(180deg, #E8FAF3 0%, #EEF7F2 70%);
}

/* ========== 装饰爱心 ========== */
.match-loading__deco {
  position: absolute;
  z-index: 1;
  width: 60rpx;
  height: 60rpx;
  animation: deco-float 3s ease-in-out infinite alternate;
}

.match-loading__deco--1 { top: 15%; left: 10%; width: 52rpx; height: 52rpx; opacity: 0.65; animation-delay: 0s; }
.match-loading__deco--2 { top: 8%; right: 15%; width: 44rpx; height: 44rpx; opacity: 0.55; animation-delay: 0.5s; }
.match-loading__deco--3 { top: 25%; left: 5%; width: 36rpx; height: 36rpx; opacity: 0.45; animation-delay: 1s; }
.match-loading__deco--4 { bottom: 35%; right: 8%; width: 48rpx; height: 48rpx; opacity: 0.55; animation-delay: 1.5s; }
.match-loading__deco--5 { top: 40%; left: 2%; width: 32rpx; height: 32rpx; opacity: 0.38; animation-delay: 2s; }
.match-loading__deco--6 { bottom: 25%; left: 12%; width: 40rpx; height: 40rpx; opacity: 0.42; animation-delay: 2.5s; }
.match-loading__deco--7 { top: 12%; left: 50%; width: 30rpx; height: 30rpx; opacity: 0.35; animation-delay: 0.8s; }
.match-loading__deco--8 { bottom: 15%; right: 20%; width: 42rpx; height: 42rpx; opacity: 0.28; animation-delay: 0.3s; }

@keyframes deco-float {
  0% { transform: translateY(0) rotate(0deg) scale(1); }
  100% { transform: translateY(-20rpx) rotate(8deg) scale(1.08); }
}

/* ========== 跳过按钮 ========== */
.match-loading__skip {
  position: absolute;
  /* 避开微信胶囊安全区（右上角）：下移至胶囊下方，right 预留胶囊宽度
     R4：右移+下移，避免叠压右侧头像下缘（judged 碰撞证据） */
  top: calc(calc(var(--statusbar, env(safe-area-inset-top)) + 20px) + 240rpx);
  right: 140rpx;
  padding: 14rpx 30rpx;
  border-radius: 999rpx;
  background: rgba(54, 201, 154, 0.85);
  z-index: 10;
}

.match-loading__skip--pressed {
  opacity: 0.8;
}

.match-loading__skip-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

/* ========== 头像区域 ========== */
.match-loading__avatar-area {
  position: relative;
  width: 400rpx;
  height: 240rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20rpx;
}

/* 涟漪扩散圆环容器 */
.match-loading__ripple-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
}

.match-loading__ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(54, 201, 154, 0.35);
  transform: translate(-50%, -50%) scale(1);
  animation: ripple-expand 3s ease-out infinite;
}

.match-loading__ripple--1 { animation-delay: 0s; }
.match-loading__ripple--2 { animation-delay: 0.6s; }
.match-loading__ripple--3 { animation-delay: 1.2s; }
.match-loading__ripple--4 { animation-delay: 1.8s; }
.match-loading__ripple--5 { animation-delay: 2.4s; }

@keyframes ripple-expand {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.55;
    border-color: rgba(54, 201, 154, 0.4);
  }
  100% {
    transform: translate(-50%, -50%) scale(2.8);
    opacity: 0;
    border-color: rgba(54, 201, 154, 0.05);
  }
}

/* ========== 头像与中间爱心 ========== */
.match-loading__avatars {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 28rpx;
}

.match-loading__avatar-wrap {
  position: relative;
}
.match-loading__avatar--blur {
  border-radius: var(--r-full);

  filter: blur(6rpx);
}
.match-loading__avatar-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
}
.match-loading__avatar-hint {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 22rpx;
  color: var(--c-brand, #36C99A);
  font-weight: 700;
  background: rgba(255, 255, 255, 0.85);
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  white-space: nowrap;
  z-index: 2;
}

.match-loading__avatar {
  width: 168rpx;
  height: 168rpx;
  border-radius: 50%;
  border: 8rpx solid #ffffff;
  box-shadow: 0 14rpx 36rpx rgba(30, 80, 65, 0.16);
  background: #eaf3ef;
}

.match-loading__heart {
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: match-loading-heart 1200ms ease-out both;
}

.match-loading__heart-img {
  width: 80rpx;
  height: 80rpx;
}

/* ========== 标题 ========== */
.match-loading__title {
  margin-top: 28rpx;
  font-size: 34rpx;
  font-weight: 800;
  color: #222222;
}

.match-loading__subtitle {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #8a9694;
}

/* ========== 匹配度进度卡片 ========== */
.match-loading__progress {
  width: 100%;
  margin-top: 40rpx;
  padding: 28rpx 28rpx 20rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
}

.match-loading__progress-header {
  font-size: 26rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 16rpx;
  padding-left: 4rpx;
}

.match-loading__row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  /* R4-batch4 像素级对齐：参考图 4 行间距更舒展（原 12rpx → 14rpx） */
  padding: 14rpx 0;
}

.match-loading__row-icon-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #E8F8F5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.match-loading__row-icon-img {
  width: 32rpx;
  height: 32rpx;
}

.match-loading__row-label {
  width: 120rpx;
  font-size: 24rpx;
  color: #333333;
  flex-shrink: 0;
}

.match-loading__row-bar {
  flex: 1;
  height: 14rpx;
  border-radius: 999rpx;
  background: #F0F0F0;
  overflow: hidden;
}

.match-loading__row-bar-inner {
  height: 100%;
  border-radius: 999rpx;
  /* R4-batch4 像素级对齐：参考图进度条用品牌绿 var(--c-brand, #36C99A)，更柔和 */
  background: var(--c-brand, #36C99A);
  transition: width 1.2s ease-out;
}

/* MP-R1-MATCHING-REQ-01：纯视觉律动（indeterminate），不携带任何数值语义 */
.match-loading__row-bar-inner--pulse {
  width: 40%;
  animation: match-loading-bar-pulse 1.8s ease-in-out infinite;
}

@keyframes match-loading-bar-pulse {
  0% { width: 24%; }
  50% { width: 72%; }
  100% { width: 24%; }
}

/* MP-R1-MATCHING-REQ-01：总进度（89% 假数据）渲染与样式已随契约 §12 一并移除 */

/* ========== 动画 ========== */
@keyframes match-loading-heart {
  0% { transform: scale(0); opacity: 0; }
  55% { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* ========== 中央轨道旋转动画（虚线环 + 连接节点） ========== */
.match-loading__orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 520rpx;
  height: 520rpx;
  transform: translate(-50%, -50%);
  z-index: 1;
}
.match-loading__orbit-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  border: 2rpx dashed rgba(54, 201, 154, 0.22);
  transform: translate(-50%, -50%);
}
.match-loading__orbit-ring--outer {
  width: 520rpx;
  height: 520rpx;
  animation: orbit-rotate 12s linear infinite;
}
.match-loading__orbit-ring--inner {
  width: 360rpx;
  height: 360rpx;
  border-style: solid;
  border-color: rgba(54, 201, 154, 0.12);
  animation: orbit-rotate 9s linear infinite reverse;
}
.match-loading__orbit-node {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18rpx;
  height: 18rpx;
  margin: -9rpx 0 0 -9rpx;
  border-radius: 50%;
  background: #4CDC9D;
  box-shadow: 0 0 0 6rpx rgba(54, 201, 154, 0.18);
}
.match-loading__orbit-node--1 { animation: orbit-node 12s linear infinite; }
.match-loading__orbit-node--2 { animation: orbit-node 12s linear infinite; animation-delay: -4s; }
.match-loading__orbit-node--3 { animation: orbit-node 12s linear infinite; animation-delay: -8s; }
@keyframes orbit-rotate {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes orbit-node {
  0% { transform: rotate(0deg) translateX(260rpx) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(260rpx) rotate(-360deg); }
}
</style>
