<script setup lang="ts">
import { ref } from "vue";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";
import type { CommunityPostViewModel } from "../../view-models/home-dashboard";
import SafeImage from "../common/SafeImage.vue";

defineProps<{
  items: CommunityPostViewModel[];
  /** 2026-08-26 R1：帖子区加载中（骨架行） */
  loading?: boolean;
  /** 2026-08-26 R1：帖子区错误信息（非空展示错误态 + 重试） */
  error?: string | null;
}>();
/**
 * 2026-09-02 R5：emit 改 const 形式以便在 handleRefresh 中引用
 */
const emit = defineEmits<{
  (e: "more"): void;
  (e: "select", id: number): void;
  /** 2026-08-31：帖子作者头像/昵称点击 → 跳他人主页（payload 为整条 post，含 authorId） */
  (e: "openAuthor", post: { authorId?: number | null; authorName?: string }): void;
  /** 2026-08-26 R1：错误态重试 */
  (e: "retry"): void;
}>();

/**
 * 2026-08-31 修复「社区动态大图 24s 灰占位无终态」：
 * 图片加载失败（URL 失效/网络异常）时原生 image 会永久停在灰占位。
 * 这里记录失败的 key，失败后切换为默认占位图/纯色块，保证有终态。
 */
const failedKeys = ref<Set<string>>(new Set());
function onImageError(key: string) {
  if (!key || failedKeys.value.has(key)) return;
  failedKeys.value = new Set(failedKeys.value).add(key);
}
function isFailed(key: string): boolean {
  return failedKeys.value.has(key);
}
function avatarSrc(post: CommunityPostViewModel): string {
  return isFailed(`avatar-${post.id}`) ? IMAGE_PATHS.DEFAULT_AVATAR : (post.authorAvatar || IMAGE_PATHS.DEFAULT_AVATAR);
}
/**
 * 2026-09-02 R5：刷新触发——清失败记录（让已失败图片重新尝试加载）+ 触发父组件重拉
 * R21：右上入口已改为「查看更多」（emit more），刷新逻辑保留给错误态重试按钮
 */
function handleRefresh() {
  failedKeys.value = new Set();
  emit("retry");
}
// 引用占位避免 noUnusedLocals（保留刷新能力供错误态复用）
void handleRefresh;
</script>

<template>
  <view class="community-feed">
    <view class="section-head">
      <text class="section-head__title">社区动态</text>
      <!-- R21（2026-09-09）：右上入口对齐理想图「查看更多」（原「刷新」语义不清） -->
      <text class="section-head__more press-feedback" hover-class="press-feedback--active" hover-stay-time="40" @tap="$emit('more')">查看更多 ›</text>
    </view>

    <!-- 2026-08-26 R1：加载中骨架行 -->
    <view v-if="loading" class="community-feed__loading">
      <view class="community-feed__skeleton" v-for="n in 2" :key="n">
        <view class="skeleton-avatar" />
        <view class="skeleton-body">
          <view class="skeleton-line skeleton-line--short" />
          <view class="skeleton-line" />
          <view class="skeleton-line skeleton-line--thumb" />
        </view>
      </view>
    </view>

    <!-- 2026-08-26 R1：错误态 + 重试 -->
    <view v-else-if="error" class="community-feed__error">
      <text class="community-feed__error-text">动态加载失败：{{ error }}</text>
      <view class="community-feed__retry" hover-class="community-feed__retry--pressed" @tap="$emit('retry')">
        <text class="community-feed__retry-text">重试</text>
      </view>
    </view>

    <view v-else-if="items.length === 0" class="community-feed__empty">今天还没有新的动态，去附近看看</view>
    <scroll-view v-else scroll-x class="community-feed__scroll" :show-scrollbar="false">
      <view class="community-feed__list">
        <view v-for="post in items" :key="post.id" class="post-card" @tap="$emit('select', post.id)">
          <view class="post-card__head">
            <view class="post-card__author-tap" @tap.stop="$emit('openAuthor', post)" role="button" :aria-label="post.authorName">
              <!-- 2026-09-02 R10：作者头像换 SafeImage 兜底（破图不再显示灰山形） -->
              <SafeImage :src="avatarSrc(post)" custom-class="post-card__avatar" mode="aspectFill" :fallback="IMAGE_PATHS.DEFAULT_AVATAR" :lazy-load="false" alt="" />
            </view>
            <view class="post-card__author" @tap.stop="$emit('openAuthor', post)" role="button" :aria-label="post.authorName">
              <view class="post-card__name-row">
                <text class="post-card__name">{{ post.authorName }}</text>
                <text class="post-card__school">· {{ post.circleName }}</text>
              </view>
              <text class="post-card__time">{{ post.timeText }}</text>
            </view>
            <view class="post-card__follow">
              <text class="post-card__follow-text">关注</text>
            </view>
          </view>
          <text class="post-card__content">{{ post.content }}</text>
          <view v-if="post.images.length" class="post-card__images">
            <view v-for="(img, idx) in post.images.slice(0, 3)" :key="img" class="post-card__img-wrap">
              <!-- 2026-09-03（用户反馈①"论坛图片"）：原生 image 直接渲染。
                   原SafeImage 内层 image 因 scoped 类名失配未继承 88rpx 约束，
                   加载中按 320x240 默认尺寸渲染出大灰占位；改为父模板直写
                   image（scoped 类命中）+ error 换本地 placeholder。 -->
              <image
                v-if="!isFailed(`img-${post.id}-${idx}`)"
                class="post-card__img"
                :src="resolveMediaUrl(img)"
                mode="aspectFill"
                lazy-load
                @error="onImageError(`img-${post.id}-${idx}`)"
              />
              <image
                v-else
                class="post-card__img"
                :src="resolveMediaUrl(IMAGE_PATHS.POST_PLACEHOLDER)"
                mode="aspectFill"
              />
            </view>
          </view>
          <view class="post-card__meta">
            <view class="post-card__stat-item">
              <image class="post-card__stat-icon" :src="resolveMediaUrl(IMAGE_PATHS.HOME_ICONS.TB_LIKE)" mode="aspectFit" />
              <text class="post-card__stat post-card__stat--like">{{ post.likeCount }}</text>
            </view>
            <view class="post-card__stat-item">
              <image class="post-card__stat-icon" :src="resolveMediaUrl(IMAGE_PATHS.HOME_ICONS.TB_COMMENT)" mode="aspectFit" />
              <text class="post-card__stat">{{ post.commentCount }}</text>
            </view>
            <view class="post-card__stat-item">
              <image class="post-card__stat-icon" :src="resolveMediaUrl(IMAGE_PATHS.HOME_ICONS.TB_SHARE)" mode="aspectFit" />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.community-feed {
  padding: 8rpx 32rpx 16rpx;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0 12rpx;
}

.section-head__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #222222;
}

.section-head__more {
  font-size: 22rpx;
  color: #999999;
}

.community-feed__empty {
  padding: 32rpx;
  border-radius: 20rpx;
  background: #ffffff;
  border: 1rpx solid #EEF2F0;
  color: #999999;
  font-size: 22rpx;
  text-align: center;
}

/* 2026-08-26 R1：加载骨架行 */
.community-feed__loading {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.community-feed__skeleton {
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
  border-radius: 40rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.skeleton-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #F0F2F5;
  flex-shrink: 0;
}

.skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.skeleton-line {
  height: 22rpx;
  border-radius: 6rpx;
  background: #F0F2F5;
}

.skeleton-line--short {
  width: 40%;
}

.skeleton-line--thumb {
  width: 70%;
  height: 120rpx;
}

/* 2026-08-26 R1：错误态 + 重试 */
.community-feed__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-radius: 20rpx;
  background: #ffffff;
  border: 1rpx solid #FFE3E3;
  color: #999999;
  font-size: 22rpx;
}

.community-feed__error-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.community-feed__retry {
  flex-shrink: 0;
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  background: #36C99A;
}

.community-feed__retry--pressed {
  opacity: 0.8;
}

.community-feed__retry-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 600;
}

.community-feed__scroll {
  width: 100%;
}

.community-feed__list {
  display: inline-flex;
  gap: 16rpx;
  padding-right: 16rpx;
}

.post-card {
  width: 320rpx;
  flex-shrink: 0;
  padding: 20rpx;
  border-radius: 40rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.post-card__head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.post-card__avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #F0F2F5;
  flex-shrink: 0;
}

/* 2026-08-31：作者头像点击热区（跳他人主页） */
.post-card__author-tap {
  display: inline-flex;
  flex-shrink: 0;
  margin: -8rpx;
  padding: 8rpx;
  border-radius: 50%;
}

.post-card__author {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.post-card__name-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
  min-width: 0;
}

.post-card__name {
  font-size: 24rpx;
  font-weight: 700;
  color: #222222;
}

.post-card__school {
  font-size: 18rpx;
  color: #36C99A;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.post-card__time {
  font-size: 18rpx;
  color: #999999;
}

.post-card__follow {
  flex-shrink: 0;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #E8FBF2;
}

.post-card__follow-text {
  font-size: 20rpx;
  color: #36C99A;
  font-weight: 600;
}

.post-card__content {
  display: -webkit-box;
  /* R20（2026-09-08）：固定两行高度——此前无图帖缺图片行导致同排卡片高度参差、
     底部无法对齐（社区动态排版错落杂乱）；正文恒占两行基线，卡片高度对齐 */
  min-height: calc(24rpx * 1.5 * 2);
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #333333;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-card__images {
  display: flex;
  gap: 8rpx;
  margin-top: 14rpx;
  /* R20：图片行固定高度（无图时由数据侧保证至少 1 图；本行高度恒定防塌陷） */
  min-height: 88rpx;
}

.post-card__img {
  width: 88rpx;
  height: 88rpx;
  border-radius: 10rpx;
  background: #F0F2F5;
}

.post-card__img-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 10rpx;
  overflow: hidden;
  flex-shrink: 0;
}

/* 图片加载失败占位：纯色块（与灰占位区分，标识为已降级终态） */
.post-card__img--placeholder {
  display: block;
  width: 88rpx;
  height: 88rpx;
  border-radius: 10rpx;
  background: #EAF6F1;
}

.post-card__meta {
  display: flex;
  gap: 20rpx;
  margin-top: 14rpx;
}

/* 2026-09-03 修复：stat 图标缺尺寸规则 → 原生 image 默认 320x240
   把 meta 行撑到 265px（卡片下方"大灰块"的元凶） */
.post-card__stat-icon {
  display: block;
  width: 32rpx;
  height: 32rpx;
}

.post-card__stat {
  font-size: 20rpx;
  color: #999999;
}

.post-card__stat--like {
  color: #FF6B81;
}
</style>



