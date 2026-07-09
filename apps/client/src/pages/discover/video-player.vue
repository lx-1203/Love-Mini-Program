<script setup lang="ts">
/**
 * 视频播放页 - 全屏播放用户个人视频 (Phase D2)
 *
 * 入口：CardSwiper 视频角标点击 → discover/index.vue 处理 videoTap 事件 →
 *      openAppPath("/pages/discover/video-player?videoUrl=xxx&cardId=xxx")
 *
 * 功能：
 * - 全屏视频播放（基于 uni-app `<video>` 组件，原生 controls）
 * - 顶部返回按钮（自定义，因 navigationStyle: custom）
 * - 加载中 / 加载失败 / 无视频 URL 三种状态展示
 * - 视频元数据加载完成后展示时长与封面
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（hover-class 替代）
 * - 不使用 backdrop-filter（黑色背景 + 高不透明度降级）
 * - 不使用 import.meta.env.DEV
 * - 所有动画内联在 .vue 文件中
 */
import { ref, onMounted, onUnmounted, computed } from "vue";
import { IMAGE_PATHS } from "../../config/images";
import { lightHaptic } from "../../utils/haptic";

/** 视频地址（由 query 参数注入） */
const videoUrl = ref<string>("");
/** 关联卡片 ID（用于埋点 / 日志，不参与渲染） */
const cardId = ref<string>("");
/** 视频是否正在加载元数据 */
const isMetadataLoading = ref<boolean>(true);
/** 视频加载是否失败 */
const isLoadError = ref<boolean>(false);
/** 视频时长（秒，元数据加载后填充） */
const videoDuration = ref<number>(0);
/** 视频当前播放位置（秒） */
const videoCurrentTime = ref<number>(0);
/** 是否显示自定义控件（uni-app video controls 已开启，此变量保留备用） */
const showControls = ref<boolean>(true);

/**
 * 从当前页面 options 中读取 query 参数。
 *
 * 兼容 mp-weixin（options 挂在 currentPage.options）与 H5（currentPage.$page.options）双端。
 * videoUrl 使用 decodeURIComponent 解码，避免特殊字符（如 & =）被截断。
 */
function loadQueryParams(): void {
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = (currentPage as any)?.options || (currentPage as any)?.$page?.options || {};
    const rawUrl = typeof options.videoUrl === "string" ? options.videoUrl : "";
    videoUrl.value = rawUrl ? decodeURIComponent(rawUrl) : "";
    cardId.value = typeof options.cardId === "string" ? options.cardId : "";
  } catch (_e) {
    videoUrl.value = "";
    cardId.value = "";
  }
}

/** 是否有有效视频 URL */
const hasVideo = computed<boolean>(() => videoUrl.value.length > 0);

/** 格式化时长 mm:ss */
const formattedDuration = computed<string>(() => formatTime(videoDuration.value));

/** 格式化当前播放位置 mm:ss */
const formattedCurrentTime = computed<string>(() => formatTime(videoCurrentTime.value));

/**
 * 将秒数格式化为 mm:ss 字符串
 * @param seconds - 秒数
 * @returns mm:ss 格式字符串
 */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * video 元数据加载完成事件
 */
function onLoadedMetadata(e: any) {
  isMetadataLoading.value = false;
  videoDuration.value = e?.detail?.duration || 0;
}

/**
 * video 时间更新事件
 */
function onTimeUpdate(e: any) {
  videoCurrentTime.value = e?.detail?.currentTime || 0;
}

/**
 * video 加载失败事件
 */
function onVideoError() {
  isMetadataLoading.value = false;
  isLoadError.value = true;
}

/**
 * 返回上一页
 */
function handleBack() {
  lightHaptic();
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    // 兜底：无上一页时跳转到寻觅页
    uni.switchTab({ url: "/pages/discover/index" });
  }
}

/**
 * 重试加载视频
 */
function handleRetry() {
  lightHaptic();
  isLoadError.value = false;
  isMetadataLoading.value = true;
  // 通过 key 重置 video 组件，触发重新加载
  // uni-app video 组件无 reload 方法，采用页面级 reLaunch 触发刷新
  if (videoUrl.value) {
    const url = encodeURIComponent(videoUrl.value);
    const cid = cardId.value;
    const query = `videoUrl=${url}${cid ? `&cardId=${cid}` : ""}`;
    uni.redirectTo({ url: `/pages/discover/video-player?${query}` });
  }
}

onMounted(() => {
  loadQueryParams();
  // 视频加载状态由 <video> 的 @loadedmetadata / @error 事件驱动
});

onUnmounted(() => {
  // 组件卸载时清理：video 组件由 uni-app 自动管理生命周期，无需手动释放
});
</script>

<template>
  <view class="video-player">
    <!-- 顶部返回按钮（自定义，因 navigationStyle: custom） -->
    <view class="video-player__topbar">
      <view
        class="video-player__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="handleBack"
      >
        <image class="video-player__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" />
      </view>
      <text class="video-player__title">个人视频</text>
      <view class="video-player__topbar-placeholder" />
    </view>

    <!-- 主区域 -->
    <view class="video-player__main">
      <!-- 无视频 URL -->
      <view v-if="!hasVideo" class="video-player__state">
        <image class="video-player__state-icon" :src="IMAGE_PATHS.ICONS_COMMON.NOTIFICATION" mode="aspectFit" />
        <text class="video-player__state-title">暂无视频</text>
        <text class="video-player__state-subtitle">该用户未上传个人视频</text>
        <view
          class="video-player__state-btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleBack"
        >
          <text class="video-player__state-btn-text">返回</text>
        </view>
      </view>

      <!-- 加载失败 -->
      <view v-else-if="isLoadError" class="video-player__state">
        <image class="video-player__state-icon" :src="IMAGE_PATHS.ICONS_COMMON.NOTIFICATION" mode="aspectFit" />
        <text class="video-player__state-title">视频加载失败</text>
        <text class="video-player__state-subtitle">请检查网络后重试</text>
        <view
          class="video-player__state-btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleRetry"
        >
          <text class="video-player__state-btn-text">重试</text>
        </view>
      </view>

      <!-- 视频播放区 -->
      <template v-else>
        <video
          class="video-player__video"
          :src="videoUrl"
          :controls="showControls"
          :show-center-play-btn="true"
          :show-play-btn="true"
          :show-fullscreen-btn="true"
          :show-progress="true"
          :enable-progress-gesture="true"
          :object-fit="'contain'"
          :autoplay="true"
          :loop="false"
          :muted="false"
          @loadedmetadata="onLoadedMetadata"
          @timeupdate="onTimeUpdate"
          @error="onVideoError"
        />

        <!-- 加载中遮罩（元数据加载前展示） -->
        <view v-if="isMetadataLoading" class="video-player__loading">
          <view class="video-player__loading-spinner" />
          <text class="video-player__loading-text">加载中...</text>
        </view>

        <!-- 底部时长展示（辅助原生 controls，元数据加载后展示） -->
        <view v-if="!isMetadataLoading && videoDuration > 0" class="video-player__meta">
          <text class="video-player__meta-text">
            {{ formattedCurrentTime }} / {{ formattedDuration }}
          </text>
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.video-player {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000000;
  display: flex;
  flex-direction: column;
  z-index: 1;
}

/* ========== 顶部栏 ========== */
.video-player__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-5);
  padding-top: calc(env(safe-area-inset-top) + var(--sp-3));
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.video-player__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.12);
  /* 高不透明度降级 backdrop-filter（mp-weixin 不支持） */
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.video-player__back-icon {
  width: 36rpx;
  height: 36rpx;
}

.video-player__title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-inverse);
  line-height: 1.2;
}

.video-player__topbar-placeholder {
  width: 64rpx;
  height: 64rpx;
}

/* ========== 主区域 ========== */
.video-player__main {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-player__video {
  width: 100%;
  height: 100%;
  background: #000000;
}

/* ========== 状态展示（无视频 / 加载失败） ========== */
.video-player__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  padding: var(--sp-8);
}

.video-player__state-icon {
  width: 120rpx;
  height: 120rpx;
  opacity: 0.4;
}

.video-player__state-title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.video-player__state-subtitle {
  font-size: var(--fs-base);
  color: rgba(255, 255, 255, 0.6);
}

.video-player__state-btn {
  margin-top: var(--sp-3);
  padding: var(--sp-3) var(--sp-8);
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.16);
  border: 1rpx solid rgba(255, 255, 255, 0.25);
}

.video-player__state-btn-text {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-inverse);
}

/* ========== 加载中遮罩 ========== */
.video-player__loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  background: rgba(0, 0, 0, 0.5);
  z-index: 5;
}

.video-player__loading-spinner {
  width: 56rpx;
  height: 56rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--c-text-inverse);
  border-radius: 50%;
  animation: video-spinner 1s linear infinite;
}

@keyframes video-spinner {
  to {
    transform: rotate(360deg);
  }
}

.video-player__loading-text {
  font-size: var(--fs-base);
  color: var(--c-text-inverse);
}

/* ========== 底部时长展示 ========== */
.video-player__meta {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom) + var(--sp-4));
  left: 50%;
  transform: translateX(-50%);
  padding: var(--sp-2) var(--sp-5);
  background: rgba(0, 0, 0, 0.6);
  border-radius: var(--r-full);
  z-index: 5;
  pointer-events: none;
}

.video-player__meta-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 500;
  line-height: 1;
}
</style>
