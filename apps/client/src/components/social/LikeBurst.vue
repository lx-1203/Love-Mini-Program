<script setup lang="ts">
/**
 * LikeBurst — 点赞动画组件
 *
 * 功能：
 * - 在点赞按钮位置触发心形粒子爆破动画
 * - 12 个心形粒子向不同方向飞散并淡出
 * - 支持 scale 弹跳效果（中心大红心 → 复位）
 *
 * mp-weixin 兼容：
 * - 使用 CSS animation 而非 JS 动画（mp-weixin 对 requestAnimationFrame 支持有限）
 * - 不使用 backdrop-filter
 * - 使用 @tap / hover-class
 * - 不使用 import.meta.env
 *
 * 使用方式：
 *   <LikeBurst ref="burstRef" />
 *   burstRef.value?.play();
 */
import { ref, nextTick, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// 修复（严格模式 noUnusedLocals）：t 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用。
defineExpose({ t });

/** 是否正在播放动画 */
const playing = ref<boolean>(false);

/** 动画 key，用于强制重启动画（每次 play 自增） */
const animKey = ref<number>(0);

/** 重置定时器引用，用于卸载时清理 */
let resetTimer: ReturnType<typeof setTimeout> | null = null;

/** 粒子列表：12 个粒子，每个有不同角度、距离、缩放、延迟 */
const particles = Array.from({ length: 12 }, (_, i) => {
  // 均匀分布 12 个方向，加少量随机偏移避免完全对称
  const angle = (i * 360) / 12 + (i % 2 ? 8 : -8);
  // 距离 80~120rpx，呈不规则散射
  const distance = 80 + (i % 3) * 20;
  return {
    id: i,
    angle,
    distance,
    delay: i * 16, // 错峰启动，制造层次感
    scale: (0.6 + (i % 3) * 0.2).toFixed(2),
    color: ["#EC4899", "#F43F5E", "#FB7185"][i % 3],
  };
});

/**
 * 触发点赞爆破动画
 *
 * 通过强制重置 animKey 来重启 CSS 动画，
 * 确保 consecutive 多次点击都能正常播放。
 */
async function play() {
  // 重置 playing 让 DOM 移除后再添加，触发动画重启
  playing.value = false;
  await nextTick();
  animKey.value += 1;
  playing.value = true;
  // 1.5s 后自动复位（与 CSS 动画时长一致）
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    playing.value = false;
    resetTimer = null;
  }, 1500);
}

/**
 * 组件卸载前清理重置定时器，避免内存泄漏。
 * 修复（P1 BUG）：原实现未保存 setTimeout 返回值，组件卸载后定时器仍会触发，
 * 修改已销毁组件的响应式状态。
 */
onBeforeUnmount(() => {
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
});

defineExpose({ play });
</script>

<template>
  <view
    v-if="playing"
    :key="animKey"
    class="like-burst"
    role="img"
    :aria-label="t('likeAnimation.burstAria')"
  >
    <!-- 中心大红心：弹跳缩放 -->
    <view class="like-burst__heart">
      <text class="like-burst__heart-icon">❤</text>
    </view>

    <!-- 12 个心形粒子：向四周飞散 -->
    <view
      v-for="p in particles"
      :key="p.id"
      class="like-burst__particle"
      :style="{
        '--particle-angle': p.angle + 'deg',
        '--particle-distance': p.distance + 'rpx',
        '--particle-delay': p.delay + 'ms',
        '--particle-scale': p.scale,
        '--particle-color': p.color,
      } as Record<string, string>"
    >
      <text class="like-burst__particle-icon">❤</text>
    </view>
  </view>
</template>

<style scoped>
/* ==================== 容器定位 ==================== */
.like-burst {
  position: absolute;
  /* 定位到点赞按钮中心（父级使用 relative） */
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  pointer-events: none; /* 不阻塞后续点击 */
  z-index: 10;
  transform: translate(-50%, -50%);
}

/* ==================== 中心大红心 ==================== */
.like-burst__heart {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%) scale(0);
  animation: like-burst-heart 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.like-burst__heart-icon {
  font-size: 56rpx;
  color: #EC4899;
  text-shadow: 0 4rpx 16rpx rgba(236, 72, 153, 0.4);
}

@keyframes like-burst-heart {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(-15deg);
    opacity: 0;
  }
  30% {
    transform: translate(-50%, -50%) scale(1.3) rotate(0deg);
    opacity: 1;
  }
  60% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.6) rotate(8deg);
    opacity: 0;
  }
}

/* ==================== 粒子飞散 ==================== */
.like-burst__particle {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%) scale(0);
  animation: like-burst-particle 1200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--particle-delay, 0ms);
}

.like-burst__particle-icon {
  font-size: 24rpx;
  color: var(--particle-color, #EC4899);
  /* 微微旋转增加灵动感 */
  display: inline-block;
  animation: like-burst-particle-rotate 1200ms ease-out forwards;
  animation-delay: var(--particle-delay, 0ms);
}

@keyframes like-burst-particle {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  20% {
    transform: translate(-50%, -50%) scale(calc(var(--particle-scale, 1) * 1.2));
    opacity: 1;
  }
  100% {
    /* 通过 rotate + translate 实现向四周飞散 */
    transform:
      translate(-50%, -50%)
      rotate(var(--particle-angle, 0deg))
      translateY(calc(var(--particle-distance, 80rpx) * -1))
      scale(calc(var(--particle-scale, 1) * 0.3));
    opacity: 0;
  }
}

@keyframes like-burst-particle-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(calc(var(--particle-angle, 0deg) * 0.5)); }
}
</style>
