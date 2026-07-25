<script setup lang="ts">
/**
 * WallPostCard — 村口帖子卡片
 *
 * 功能：
 * - 展示帖子作者、内容、图片、互动数据（点赞/评论/分享）
 * - 点赞：未点赞状态下点击会触发心形爆破动画（LikeBurst）
 * - 举报：右上角"..."按钮打开 PostReportDialog，复用 /api/reports 接口
 *
 * mp-weixin 兼容：
 * - 使用 @tap.stop 阻止冒泡，避免触发卡片整体 tap
 * - 使用 hover-class 而非 :hover
 * - 不使用 import.meta.env
 * - 子组件 ref 调用使用 defineExpose 暴露的 play() 方法
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Avatar from '../common/Avatar.vue';
import { IMAGE_PATHS } from '../../config/images';
import LikeBurst from './LikeBurst.vue';
import PostReportDialog from './PostReportDialog.vue';
import { lightHaptic } from '../../utils/haptic';

const props = defineProps<{
  avatarUrl?: string;
  initials?: string;
  name?: string;
  school?: string;
  time?: string;
  content?: string;
  images?: string[];
  likes?: number;
  comments?: number;
  shares?: number;
  isLiked?: boolean;
  /** 帖子 ID（用于举报接口调用，可选） */
  postId?: string | number | null;
}>();

const emit = defineEmits<{
  like: [];
  comment: [];
  share: [];
  tap: [];
  /** 举报提交成功后透传给父组件 */
  report: [];
}>();

const { t } = useI18n();

/* ========== LikeBurst 引用 ========== */
const burstRef = ref<InstanceType<typeof LikeBurst> | null>(null);

/* ========== 举报弹窗状态 ========== */
const reportVisible = ref(false);

/** ARIA 标签 */
const ariaLabel = computed(() =>
  t('village.likedBy', { n: props.likes || 0 }) + ', ' + t('village.commentedBy', { n: props.comments || 0 })
);
const likeAriaLabel = computed(() => t('village.like') + ', ' + (props.likes || 0));
const commentAriaLabel = computed(() => t('village.comment') + ', ' + (props.comments || 0));
const shareAriaLabel = computed(() => t('village.share') + ', ' + (props.shares || 0));
const reportAriaLabel = computed(() => t('postReport.reportAria'));

/**
 * 处理点赞点击：
 * 1. 触发心形爆破动画（仅当本次点击会让状态变为"已点赞"时）
 * 2. 透传 like 事件给父组件，由父组件更新 isLiked 状态
 *
 * 设计说明：
 * - 动画在子组件本地触发，不依赖父组件状态更新（避免延迟感）
 * - 仅当 isLiked 为 false 时播放动画，重复点赞不重复触发
 */
function handleLike() {
  lightHaptic();
  // 仅在"未点赞 → 已点赞"的过渡时播放动画
  if (!props.isLiked) {
    burstRef.value?.play();
  }
  emit('like');
}

/**
 * 打开举报弹窗
 * 使用 .stop 阻止冒泡到卡片 tap
 */
function openReport() {
  lightHaptic();
  if (props.postId === undefined || props.postId === null || props.postId === '') {
    uni.showToast({ title: t('postReport.submitFailed'), icon: 'none' });
    return;
  }
  reportVisible.value = true;
}

/** 关闭举报弹窗 */
function closeReport() {
  reportVisible.value = false;
}

/** 举报提交成功：透传给父组件 */
function onReportSubmitted() {
  emit('report');
}
</script>

<template>
  <view
    class="wall-card"
    @tap="emit('tap')"
    <!-- #ifdef H5 -->
    role="article"
    :aria-label="ariaLabel"
    <!-- #endif -->
  >
    <view class="wall-header">
      <Avatar :name="initials || name?.charAt(0)" :src="avatarUrl" size="sm" />
      <view class="wall-meta">
        <text class="wall-name">{{ name }}</text>
        <text class="wall-time">{{ time }} · {{ school }}</text>
      </view>
      <!-- 举报按钮：右上角"..."，仅当 postId 有效时展示 -->
      <view
        v-if="postId !== undefined && postId !== null && postId !== ''"
        class="wall-header__more press-feedback"
        @tap.stop="openReport"
        hover-class="wall-header__more--hover"
        hover-stay-time="100"
        <!-- #ifdef H5 -->
        role="button"
        :aria-label="reportAriaLabel"
        <!-- #endif -->
      >
        <text class="wall-header__more-icon">⋯</text>
      </view>
    </view>
    <text class="wall-content" v-if="content">{{ content }}</text>
    <view class="wall-images" v-if="images && images.length > 0">
      <image
        v-for="(img, idx) in images.slice(0, 3)"
        :key="idx"
        class="wall-img"
        :src="img"
        mode="aspectFill"
        lazy-load
        <!-- #ifdef H5 -->
        role="img"
        :aria-label="`${t('village.detailTitle')} ${idx + 1}`"
        <!-- #endif -->
      />
    </view>
    <view class="wall-actions">
      <!-- 点赞按钮：相对定位，LikeBurst 绝对定位在其中 -->
      <view
        class="wall-action wall-action--like"
        :class="{ 'wall-action--liked': isLiked }"
        @tap.stop="handleLike"
        <!-- #ifdef H5 -->
        role="button"
        :aria-label="likeAriaLabel"
        :aria-pressed="isLiked || false"
        <!-- #endif -->
      >
        <image class="wall-action__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED" mode="aspectFit" />
        <text>{{ likes || 0 }}</text>
        <!-- 点赞爆破动画：定位到点赞按钮中心 -->
        <LikeBurst ref="burstRef" />
      </view>
      <view
        class="wall-action"
        @tap.stop="emit('comment')"
        <!-- #ifdef H5 -->
        role="button"
        :aria-label="commentAriaLabel"
        <!-- #endif -->
      >
        <image class="wall-action__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.COMMENT" mode="aspectFit" />
        <text>{{ comments || 0 }}</text>
      </view>
      <view
        class="wall-action"
        @tap.stop="emit('share')"
        <!-- #ifdef H5 -->
        role="button"
        :aria-label="shareAriaLabel"
        <!-- #endif -->
      >
        <text>↗</text>
        <text>{{ shares || 0 }}</text>
      </view>
    </view>

    <!-- 举报弹窗：受 reportVisible 控制，提交成功后透传 report 事件 -->
    <PostReportDialog
      v-model:visible="reportVisible"
      :post-id="postId ?? null"
      @submitted="onReportSubmitted"
      @close="closeReport"
    />
  </view>
</template>

<style scoped>
.wall-card {
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  padding: 28rpx;
  box-shadow: var(--s-sm);
  border: 1rpx solid var(--c-border-light);
  transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.wall-card:active {
  box-shadow: var(--s-md);
}
.wall-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
/* 举报按钮"⋯" */
.wall-header__more {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 160ms ease-out;
}
.wall-header__more--hover {
  background: var(--c-bg-hover, #f5f5f7);
}
.wall-header__more-icon {
  font-size: 36rpx;
  color: var(--c-text-quaternary, #9ca3af);
  line-height: 1;
  transform: translateY(-4rpx);
}
.wall-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.wall-name {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
  line-height: 1.3;
}
.wall-time {
  font-size: var(--fs-sm);
  color: var(--c-text-quaternary);
  margin-top: 2rpx;
  line-height: 1.3;
}
.wall-content {
  margin-top: 16rpx;
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.5;
}
.wall-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
  border-radius: var(--r-md);
  overflow: hidden;
  margin-top: 16rpx;
}
.wall-img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--r-sm);
}
.wall-actions {
  display: flex;
  gap: 48rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--c-border-light);
}
.wall-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: var(--fs-sm);
  color: var(--c-text-quaternary);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  padding: 4rpx 0;
}
.wall-action__icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}
.wall-action:active {
  transform: scale(0.97);
  color: var(--c-brand-400);
}
/* 点赞按钮：相对定位，供 LikeBurst 绝对定位锚定 */
.wall-action--like {
  position: relative;
}
.wall-action--liked {
  color: var(--c-romance-500, #EC4899);
  font-weight: 600;
}
.wall-action--liked:active {
  color: var(--c-romance-600, #DB2777);
  transform: scale(0.97);
}
</style>
