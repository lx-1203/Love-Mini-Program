<template>
  <view
    class="safe-image"
    :class="[rootClass, { 'safe-image--loading': isLoading, 'safe-image--failed': allFailed }]"
    role="img"
    :aria-label="alt || t('common.imageAria')"
    :aria-busy="isLoading"
  >
    <image
      v-if="!hasError"
      :src="displaySrc"
      :mode="mode"
      :lazy-load="lazyLoad"
      :alt="alt"
      :class="['safe-image__img', customClass, { 'safe-image__img--hidden': isLoading }]"
      :style="customStyle"
      @error="onError"
      @load="onLoad"
    />
    <image
      v-else-if="!allFailed"
      :src="resolvedFallback"
      :mode="mode"
      :lazy-load="lazyLoad"
      :alt="alt"
      :class="['safe-image__img', 'safe-image__img--fallback', customClass]"
      :style="customStyle"
      @error="onFallbackError"
      @load="onFallbackLoad"
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
 * 使用方式：<SafeImage :src="url" fallback="/static/assets/default-avatar.jpg" mode="aspectFill" />
 */
import { computed, ref, watch } from 'vue';
import { resolveMediaUrl } from '../../utils/media';
// 2026-08-08：pexels 外链本地化兜底（mp 端无法加载外链，见 image-local.ts）
import { toLocalImage } from '../../utils/image-local';
// R4-batch2: aria-label 兜底文案 i18n 化
import { useI18n } from 'vue-i18n';
// R4-batch4: 调试日志走环境开关（仅开发环境输出），生产包不保留
import { isDev } from '../../config/env';

const { t } = useI18n();

const props = withDefaults(defineProps<{
  src: string;
  fallback?: string;
  mode?: string;
  customClass?: string;
  /** 2026-08-08 走查 P0-1：应用到根容器 <view class="safe-image"> 的类。
   * 背景大图场景需拉伸根容器（其默认无尺寸，内层 image 填不满 0 高度容器）。 */
  rootClass?: string;
  customStyle?: string | Record<string, string | number>;
  lazyLoad?: boolean;
  alt?: string;
}>(), {
  src: '',
  fallback: '/static/assets/default-avatar.jpg',
  mode: 'aspectFill',
  customClass: '',
  rootClass: '',
  customStyle: '',
  // 2026-08-10 切换提速：默认开启懒加载（列表场景图片按需加载，减少首屏开销）
  lazyLoad: true,
  alt: '',
});

/** 最多重试次数（原 src 失败时）——2026-08-10 切换提速：2→1，弱网下列表重试开销减半 */
const MAX_RETRY = 1;

/**
 * 2026-08-12 卡顿修复：URL 解析缓存。
 *
 * <p>resolveMediaUrl 每次调用都会附加最新 token（URL 每次都变），同 URL 在
 * 列表刷新/卡片重建时反复解析。模块级缓存「原 URL → resolved URL」，
 * 命中即复用，消除重复解析开销与 token 抖动导致的图片反复加载。
 * 缓存条目上限 {@link URL_CACHE_MAX}（LRU 式：超出时清空重建，防内存增长）。</p>
 */
const resolvedUrlCache = new Map<string, string>();
/** URL 解析缓存上限（超出时整体清空，简单 LRU 近似） */
const URL_CACHE_MAX = 200;

/** 解析一次并缓存（原 URL → resolved URL）。 */
function resolveOnce(raw: string): string {
  const cached = resolvedUrlCache.get(raw);
  if (cached !== undefined) {
    return cached;
  }
  if (resolvedUrlCache.size >= URL_CACHE_MAX) {
    resolvedUrlCache.clear();
  }
  const resolved = localizeHttpIfNeeded(toLocalImage(resolveMediaUrl(raw)));
  resolvedUrlCache.set(raw, resolved);
  return resolved;
}

/* ===== MP-R5-HTTPIMG（2026-09-13）：http 图片源运行时本地化 =====
 * 基础库 3.16.2 对 <image> 的 http:// 源拒绝渲染（2026-09-03 已有 app-assets
 * 同类问题记录）。开发态 real 后端即 http://127.0.0.1:8080，用户上传的
 * 头像/照片墙媒体 URL 全部命中 → 页面只显示占位图。
 * 方案：检测到 http 源时改走 uni.downloadFile 下载到本地临时文件渲染
 * （wx.getImageInfo 同源实测可加载，仅 <image> 渲染层受限）。
 * 生产 https 环境不进入该分支；下载结果按 URL 缓存避免重复下载。 */
const httpLocalCache = new Map<string, string>();
const httpInFlight = new Set<string>();

/** 稳定字符串哈希（djb2）：用于本地化文件命名，避免路径特殊字符 */
function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
/** http 源本地化进行中（抑制 onError 降级竞态：DevTools/基础库会立刻
 * 对 http 源报 error，若不抑制会在 base64 就绪前就切到 fallback） */
const localizingHttp = ref(false);

function localizeHttpIfNeeded(resolved: string): string {
  if (!resolved.startsWith("http://")) {
    return resolved;
  }
  // 项目规范：mp-weixin 专有 API 统一走 uni.*（运行时 uni.env 自 wx 透传，
  // 见 @dcloudio/uni-mp-weixin uni.api.esm 的 objectKeys；类型层未声明，
  // 按 compat 层惯例以结构化类型收敛读取）。H5 等无 USER_DATA_PATH 的平台
  // 无 http 渲染限制，直接回原 URL，不再触碰 wx 全局（原写法在 H5 会 ReferenceError）。
  const uniEnv = (uni as unknown as { env?: { USER_DATA_PATH?: string } }).env;
  const userDataPath = uniEnv?.USER_DATA_PATH;
  if (!userDataPath) {
    return resolved;
  }
  const cached = httpLocalCache.get(resolved);
  if (cached) {
    return cached;
  }
  if (!httpInFlight.has(resolved)) {
    httpInFlight.add(resolved);
    // MP-R5-HTTPIMG-RACE：本地化在途时置位，onError 据此抑制降级竞态
    localizingHttp.value = true;
    // 两段式本地化：downloadFile → copyFile 到 USER_DATA_PATH 常驻本地文件。
    // 原因：基础库 3.16.2+ 的 <image> 渲染层拒绝 http:// 图片源（含 DevTools
    // 的 http://tmp 临时路径）；本地用户文件路径全环境可渲染。仅 http 源
    // 进入此分支，生产 https 媒体不受影响。
    uni.downloadFile({
      url: resolved,
      success: (res) => {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          localizingHttp.value = false;
          return;
        }
        const destPath = `${userDataPath}/safeimg-${hashString(resolved)}.jpg`;
        uni.getFileSystemManager().copyFile({
          srcPath: res.tempFilePath,
          destPath,
          success: () => {
            httpLocalCache.set(resolved, destPath);
            // 同步改写 URL 缓存：resolveOnce 在下载完成前已缓存 http 原串
            for (const [key, value] of resolvedUrlCache) {
              if (value === resolved) {
                resolvedUrlCache.set(key, destPath);
              }
            }
            // 仅当当前展示的仍是同一 http 源时替换，避免覆盖用户已切换的图
            if (displaySrc.value === resolved || displaySrc.value === "") {
              displaySrc.value = destPath;
              hasError.value = false;
              allFailed.value = false;
              isLoading.value = false;
            }
            localizingHttp.value = false;
          },
          fail: (copyErr) => {
            if (isDev) {
              console.warn("[SafeImage] 本地文件拷贝失败:", copyErr);
            }
            localizingHttp.value = false;
          },
        });
      },
      fail: () => {
        localizingHttp.value = false;
        if (isDev) {
          console.warn("[SafeImage] http 源本地化下载失败");
        }
      },
      complete: () => {
        httpInFlight.delete(resolved);
      },
    });
  } else {
    // 下载已在途（并发渲染）：维持本地化标记，抑制 onError 降级竞态
    localizingHttp.value = true;
  }
  // 本地化在途：返回空 src（骨架态），base64/本地文件就绪后由回调热替换
  return "";
}

const hasError = ref(false);
const isLoading = ref(true);
/** 2026-08-08：pexels 外链先本地化（mp 端无法加载），再走鉴权代理解析 */
const displaySrc = ref(resolveOnce(props.src));
/** 原 src 重试计数 */
const retryCount = ref(0);
/** fallback 是否也加载失败 */
const allFailed = ref(false);
/**
 * fallback 是否已加载成功（修复 P1 BUG：防无限循环）。
 * 原实现 fallback 的 @load 也绑定 onLoad，而 onLoad 会重置 hasError=false，
 * 导致「原图失败 → 切 fallback → fallback 加载成功 → 重置 hasError → 切回原图
 * → 原图再次失败 → 再切 fallback」无限循环。现用独立标志区分：fallback 加载
 * 成功只标记 fallbackLoaded，绝不重置 hasError。
 */
const fallbackLoaded = ref(false);

/**
 * Task 0.3.4：将 fallback prop 经 resolveMediaUrl 处理后使用。
 *
 * <p>静态资源路径（如 {@code /static/assets/default-avatar.jpg}）会被 resolveMediaUrl
 * 原样返回；用户上传的 fallback 路径（如 {@code /uploads/...}）会被重写为鉴权代理 URL。</p>
 */
const resolvedFallback = computed(() => resolveMediaUrl(props.fallback));

watch(() => props.src, (newSrc) => {
  hasError.value = false;
  isLoading.value = true;
  // Task 0.3.4：每次 src 变化时重新走鉴权代理 URL 解析，附加最新 token
  // 2026-08-08：同时应用 pexels 外链本地化兜底
  // 2026-08-12：走 URL 缓存（命中复用，消除重复解析与 token 抖动）
  displaySrc.value = resolveOnce(newSrc);
  retryCount.value = 0;
  allFailed.value = false;
  fallbackLoaded.value = false;
});

/** 原 src 加载失败：未达重试上限时重试，达到上限才降级到 fallback */
function onError() {
  // MP-R5-HTTPIMG：http 源本地化在途时不计错误、不降级——基础库会对 http 源
  // 立刻报 error，base64 就绪后 displaySrc 热替换即恢复正常渲染
  if (localizingHttp.value) {
    return;
  }
  if (retryCount.value < MAX_RETRY) {
    // 重试：通过修改 displaySrc 触发 image 重新加载
    retryCount.value += 1;
    // 拼接 timestamp 避免缓存命中
    const base = toLocalImage(resolveMediaUrl(props.src));
    const sep = base.includes('?') ? '&' : '?';
    displaySrc.value = `${base}${sep}_retry=${retryCount.value}`;
    return;
  }

  if (isDev) {
    console.warn(`[SafeImage] 图片加载失败（已重试 ${MAX_RETRY} 次），降级到 fallback: src="${props.src}", fallback="${props.fallback}"`);
  }
  if (props.fallback) {
    hasError.value = true;
  } else {
    allFailed.value = true;
  }
  isLoading.value = false;
}

/** fallback 图片也加载失败：显示纯色占位 */
function onFallbackError() {
  if (isDev) {
    console.warn(`[SafeImage] fallback 也加载失败，显示纯色占位: fallback="${props.fallback}"`);
  }
  allFailed.value = true;
  isLoading.value = false;
}

/** fallback 加载成功：仅标记 fallbackLoaded，不重置 hasError（避免与原图无限循环切换） */
function onFallbackLoad() {
  fallbackLoaded.value = true;
  allFailed.value = false;
  isLoading.value = false;
}

/** 原图加载成功：重置全部错误状态 */
function onLoad() {
  hasError.value = false;
  isLoading.value = false;
  allFailed.value = false;
  fallbackLoaded.value = false;
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
  transition: opacity var(--d-slow, 240ms) cubic-bezier(0.4, 0, 0.2, 1);
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
  background: var(--c-bg-surface, #EEF7F2);
  display: block;
}

.safe-image__skeleton {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 2026-08-10 切换提速：骨架层改静态（去掉 1400ms 无限 shimmer 动画），
     长列表（头像/九宫格）不再叠加大量动画层，低端机不再掉帧 */
  background: var(--c-overlay-white-bg-tint-mid, rgba(15, 23, 42, 0.05));
  pointer-events: none;
}
</style>
