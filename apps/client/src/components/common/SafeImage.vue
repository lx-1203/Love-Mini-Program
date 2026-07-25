<template>
  <view
    class="safe-image"
    :class="{ 'safe-image--loading': isLoading, 'safe-image--failed': allFailed }"
    <!-- #ifdef H5 -->
    role="img"
    :aria-label="alt || '图片'"
    :aria-busy="isLoading"
    <!-- #endif -->
  >
    <image
      v-if="!hasError"
      :src="displaySrc"
      :mode="mode"
      :lazy-load="lazyLoad"
      :class="['safe-image__img', customClass, { 'safe-image__img--hidden': isLoading }]"
      :style="customStyle"
      @error="onError"
      @load="onLoad"
    />
    <image
      v-else-if="!allFailed"
      :src="fallback"
      :mode="mode"
      :lazy-load="lazyLoad"
      :class="['safe-image__img', 'safe-image__img--fallback', customClass]"
      :style="customStyle"
      @error="onFallbackError"
      @load="onLoad"
    />
    <!-- fallback 也失败时显示纯色占位背景 -->
    <view v-else class="safe-image__placeholder" :class="customClass" :style="customStyle" />
    <!-- 加载骨架屏 -->
    <view v-if="isLoading && !hasError" class="safe-image__skeleton" />
  </view>
</template>

<script setup lang="ts">
/**
 * SafeImage - 带加载骨架屏与错误降级的图片组件
 *
 * 功能：
 * 1. 加载中：显示灰色骨架屏动画
 * 2. 加载失败：自动切换到 fallback 图片（默认头像），并 console.warn 输出错误
 * 3. fallback 也失败：显示纯色占位背景，避免空白
 * 4. 重试机制：原 src 最多重试 2 次，避免瞬时网络抖动导致的误降级
 * 5. 加载成功：隐藏骨架屏，淡入显示图片
 *
 * 使用方式：<SafeImage :src="url" fallback="/static/assets/default-avatar.png" mode="aspectFill" />
 */
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  src: string;
  fallback?: string;
  mode?: string;
  customClass?: string;
  customStyle?: string | Record<string, string | number>;
  lazyLoad?: boolean;
  alt?: string;
}>(), {
  src: '',
  fallback: '/static/assets/default-avatar.png',
  mode: 'aspectFill',
  customClass: '',
  customStyle: '',
  lazyLoad: false,
  alt: '',
});

/** 最多重试次数（原 src 失败时） */
const MAX_RETRY = 2;

const hasError = ref(false);
const isLoading = ref(true);
const displaySrc = ref(props.src);
/** 原 src 重试计数 */
const retryCount = ref(0);
/** fallback 是否也加载失败 */
const allFailed = ref(false);

watch(() => props.src, (newSrc) => {
  hasError.value = false;
  isLoading.value = true;
  displaySrc.value = newSrc;
  retryCount.value = 0;
  allFailed.value = false;
});

/** 原 src 加载失败：未达重试上限时重试，达到上限才降级到 fallback */
function onError() {
  if (retryCount.value < MAX_RETRY) {
    // 重试：通过修改 displaySrc 触发 image 重新加载
    retryCount.value += 1;
    // 拼接 timestamp 避免缓存命中
    const sep = props.src.includes('?') ? '&' : '?';
    displaySrc.value = `${props.src}${sep}_retry=${retryCount.value}`;
    return;
  }

  console.warn(`[SafeImage] 图片加载失败（已重试 ${MAX_RETRY} 次），降级到 fallback: src="${props.src}", fallback="${props.fallback}"`);
  if (props.fallback) {
    hasError.value = true;
  } else {
    allFailed.value = true;
  }
  isLoading.value = false;
}

/** fallback 图片也加载失败：显示纯色占位 */
function onFallbackError() {
  console.warn(`[SafeImage] fallback 也加载失败，显示纯色占位: fallback="${props.fallback}"`);
  allFailed.value = true;
  isLoading.value = false;
}

function onLoad() {
  hasError.value = false;
  isLoading.value = false;
  allFailed.value = false;
}
</script>

<style scoped>
.safe-image {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.safe-image__img {
  width: 100%;
  height: 100%;
  display: block;
  transition: opacity 240ms cubic-bezier(0.4, 0, 0.2, 1);
}

.safe-image__img--hidden {
  opacity: 0;
}

.safe-image__img--fallback {
  opacity: 1;
}

/* fallback 也失败时的纯色占位背景，避免空白 */
.safe-image__placeholder {
  width: 100%;
  height: 100%;
  background: var(--c-neutral-100, #F4F6FA);
  display: block;
}

.safe-image__skeleton {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.06) 25%,
    rgba(0, 0, 0, 0.1) 37%,
    rgba(0, 0, 0, 0.06) 63%
  );
  background-size: 400% 100%;
  animation: safe-image-shimmer 1.4s ease infinite;
  pointer-events: none;
}

@keyframes safe-image-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
</style>
