<template>
  <view class="safe-image" :class="{ 'safe-image--loading': isLoading }">
    <image
      v-if="!hasError"
      :src="displaySrc"
      :mode="mode"
      :class="['safe-image__img', customClass, { 'safe-image__img--hidden': isLoading }]"
      :style="customStyle"
      @error="onError"
      @load="onLoad"
    />
    <image
      v-else
      :src="fallback"
      :mode="mode"
      :class="['safe-image__img', 'safe-image__img--fallback', customClass]"
      :style="customStyle"
    />
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
 * 3. 加载成功：隐藏骨架屏，淡入显示图片
 *
 * 使用方式：<SafeImage :src="url" fallback="/static/assets/default-avatar.png" mode="aspectFill" />
 */
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  src: string;
  fallback?: string;
  mode?: string;
  customClass?: string;
  customStyle?: string;
}>(), {
  src: '',
  fallback: '/static/assets/default-avatar.png',
  mode: 'aspectFill',
  customClass: '',
  customStyle: '',
});

const hasError = ref(false);
const isLoading = ref(true);
const displaySrc = ref(props.src);

watch(() => props.src, (newSrc) => {
  hasError.value = false;
  isLoading.value = true;
  displaySrc.value = newSrc;
});

function onError() {
  if (!hasError.value) {
    console.warn(`[SafeImage] 图片加载失败，降级到 fallback: src="${displaySrc.value}", fallback="${props.fallback}"`);
    if (props.fallback) {
      hasError.value = true;
    }
    isLoading.value = false;
  }
}

function onLoad() {
  hasError.value = false;
  isLoading.value = false;
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
