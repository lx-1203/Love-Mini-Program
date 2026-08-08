<script setup lang="ts">
/**
 * 帖子卡片（PostCard）
 *
 * 2026-08-08 频道化重构：自村口页抽取的帖子卡片组件（QQ 频道 + 贴吧风格）。
 * - 作者行（头像/校友徽章/名字/年龄·城市·学历/签名/关注按钮）
 * - 正文 + 九宫格图片 + 标签
 * - 关联活动卡内嵌（post.activity，点击跳活动详情）
 * - 最新 2 条评论预览（post.recentComments，QQ 频道特色）
 * - 底部互动栏（评论/点赞动画/分享/收藏）
 *
 * 事件：like / favorite / follow / open-detail / open-author / open-tag / open-activity
 */
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  formatRelativeTime,
  type PostAuthor,
  type PostItem,
} from "../../stores/village";
import { useSessionStore } from "../../stores/session";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";
import { useImageFallback } from "../../composables/useImageFallback";
import SafeImage from "../common/SafeImage.vue";
import ActivityCard from "./ActivityCard.vue";

const { t } = useI18n();
const sessionStore = useSessionStore();

const props = defineProps<{
  post: PostItem;
}>();

const emit = defineEmits<{
  (e: "like", postId: string): void;
  (e: "favorite", postId: string): void;
  (e: "follow", userId: string): void;
  (e: "open-detail", postId: string): void;
  (e: "open-author", userId: string): void;
  (e: "open-tag", tagName: string): void;
  (e: "open-activity", activityId: number): void;
}>();

/** 单帖最大图片数（与 stores/village/constants.ts 保持一致） */
const MAX_POST_IMAGES = 9;

/* ========== 图片失败兜底 ========== */
const imageFallback = useImageFallback();
const onImageError = imageFallback.onImageError;
const isImageFailed = imageFallback.isImageFailed;

/** 当前用户校区（来自 session，校友徽章比对用） */
const myCampus = computed(() => sessionStore.userSession?.campusName ?? "");

/** 是否为校友（头像徽章 + 名字旁徽章） */
const isAlumni = computed(
  () => props.post.isAlumni || Boolean(myCampus.value && props.post.author.campusName === myCampus.value)
);

/** 空操作占位（catchtap 占位 handler，mp-weixin 要求 catchtap 必须绑定 handler） */
function noop() {}

// 修复（vue-tsc 无法识别 catchtap 原生属性对 noop/handleLike 的引用，
// 与 CardSwiper 同法：defineExpose 标记为已使用，避免 TS6133 unused 误报）
defineExpose({ noop, handleLike });

/* ========== 点赞动画 ========== */
const likeAnimating = ref(false);
let likeAnimTimer: ReturnType<typeof setTimeout> | null = null;

function handleLike() {
  const wasLiked = props.post.isLiked;
  if (!wasLiked) {
    likeAnimating.value = true;
    if (likeAnimTimer) clearTimeout(likeAnimTimer);
    likeAnimTimer = setTimeout(() => {
      likeAnimTimer = null;
      likeAnimating.value = false;
    }, 300);
  }
  emit("like", props.post.id);
}

/* ========== 作者信息段（年龄 · 城市 · 学历） ========== */
function authorMetaText(author: PostAuthor): string {
  const parts: string[] = [];
  if (typeof author.age === "number" && !Number.isNaN(author.age) && author.age > 0) {
    parts.push(`${author.age}${t("village.authorAgeUnit")}`);
  }
  if (author.city) {
    parts.push(author.city);
  }
  if (author.education) {
    const label = t(`village.educationLabels.${author.education}`);
    if (label && !label.startsWith("village.")) {
      parts.push(label);
    }
  }
  return parts.join(" · ");
}

// 修复（TS2322）：ActivityCard 的 open-detail emit 参数类型为 string | number，
// 此处放宽入参并在 emit 时统一转为 number
function openActivity(activityId: number | string) {
  emit("open-activity", typeof activityId === "number" ? activityId : Number(activityId));
}
</script>

<template>
  <view
    class="post-card clickable"
    hover-class="post-card--pressed"
    :hover-stay-time="100"
    role="button"
    :aria-label="t('village.postItemAria', { title: post.title || post.content })"
    @tap="emit('open-detail', post.id)"
  >
    <!-- 作者信息行 -->
    <view class="post-card__header">
      <view
        class="post-card__user clickable"
        hover-class="post-card__user--pressed"
        :hover-stay-time="100"
        catchtap="emit('open-author', post.author.userId)"
      >
        <view class="user-avatar">
          <image
            v-if="post.author.avatar && !isImageFailed(`avatar-${post.id}`)"
            class="user-avatar__img"
            :src="resolveMediaUrl(post.author.avatar)"
            mode="aspectFill"
            lazy-load
            alt=""
            @error="onImageError(`avatar-${post.id}`)"
          />
          <text v-else class="user-avatar__char">{{ post.author.name[0] }}</text>
          <!-- 校友徽章（左上角） -->
          <view v-if="isAlumni" class="user-avatar__badge">
            <SafeImage :src="IMAGE_PATHS.ICONS_EMOJI.GRAD_CAP" custom-class="user-avatar__badge-icon" mode="aspectFit" />
          </view>
        </view>
        <view class="user-info">
          <view class="user-info__name-row">
            <text class="user-info__name">{{ post.author.name }}</text>
            <text v-if="isAlumni" class="user-info__campus-badge">{{ t('village.alumni') }}</text>
          </view>
          <text v-if="authorMetaText(post.author)" class="user-info__meta">
            {{ authorMetaText(post.author) }}
          </text>
          <text class="user-info__headline">{{ post.author.headline || t('village.recentlyActive') }}</text>
        </view>
      </view>
      <view
        class="follow-chip"
        :class="{ 'follow-chip--active': post.isFollowed }"
        catchtap="emit('follow', post.author.userId)"
      >
        <text class="follow-chip__text">
          {{ post.isFollowed ? t('village.followed') : t('village.follow') }}
        </text>
      </view>
    </view>

    <!-- 正文内容 -->
    <view class="post-card__body">
      <text class="post-card__content">{{ post.content }}</text>
    </view>

    <!-- 图片展示 -->
    <view
      v-if="post.images.length > 0"
      class="post-card__images"
      :class="'post-card__images--' + Math.min(post.images.length, MAX_POST_IMAGES)"
      catchtap="noop"
    >
      <view
        v-for="(img, idx) in post.images.slice(0, MAX_POST_IMAGES)"
        :key="idx"
        class="post-card__image-wrap"
        :class="{ 'post-card__image-wrap--single': post.images.length === 1 }"
      >
        <image
          class="post-card__image img-rounded"
          :src="resolveMediaUrl(img)"
          mode="aspectFill"
          lazy-load
          alt=""
        />
      </view>
      <view v-if="post.images.length > MAX_POST_IMAGES" class="post-card__image-more">
        <text class="post-card__image-more-text">+{{ post.images.length - MAX_POST_IMAGES }}</text>
      </view>
    </view>

    <!-- 关联活动卡（2026-08-08 频道化重构：帖子内直接发活动链接） -->
    <view v-if="post.activity" class="post-card__activity" catchtap="noop">
      <ActivityCard :activity="post.activity" compact @open-detail="openActivity" />
    </view>

    <!-- 标签 -->
    <view v-if="post.tags.length > 0" class="post-card__tags">
      <text
        v-for="(tag, tagIdx) in post.tags"
        :key="tag"
        class="post-card__tag"
        :class="tagIdx % 2 === 0 ? 'post-card__tag--green' : 'post-card__tag--pink'"
        catchtap="emit('open-tag', tag)"
      >{{ tag.startsWith('#') ? tag : '#' + tag }}</text>
    </view>

    <!-- 最新 2 条评论预览（QQ 频道风格） -->
    <view v-if="post.recentComments && post.recentComments.length > 0" class="post-card__comments" catchtap="noop">
      <view
        v-for="c in post.recentComments.slice(0, 2)"
        :key="c.id"
        class="comment-preview"
        @tap="emit('open-detail', post.id)"
      >
        <image
          v-if="c.author.avatar"
          class="comment-preview__avatar"
          :src="resolveMediaUrl(c.author.avatar)"
          mode="aspectFill"
          lazy-load
          alt=""
        />
        <text v-else class="comment-preview__char">{{ c.author.name[0] }}</text>
        <text class="comment-preview__name">{{ c.author.name }}</text>
        <text class="comment-preview__content">{{ c.content }}</text>
      </view>
    </view>

    <!-- 底部互动栏 -->
    <view class="post-card__footer">
      <text class="post-card__time">{{ formatRelativeTime(post.createdAt) }}</text>
      <view class="post-card__actions">
        <!-- 评论 -->
        <view class="action-btn" catchtap="emit('open-detail', post.id)">
          <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" alt="" />
          <text v-if="post.comments > 0" class="action-btn__count">{{ post.comments }}</text>
        </view>
        <!-- 点赞 -->
        <view
          class="action-btn"
          :class="{ 'action-btn--liked': post.isLiked, 'action-btn--animating': likeAnimating }"
          catchtap="handleLike"
        >
          <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART" mode="aspectFit" alt="" />
          <text v-if="post.likes > 0" class="action-btn__count" :class="{ 'action-btn__count--liked': post.isLiked }">{{ post.likes }}</text>
        </view>
        <!-- 分享 -->
        <view class="action-btn" catchtap="noop">
          <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.SPARKLES" mode="aspectFit" alt="" />
        </view>
        <!-- 收藏 -->
        <view
          class="action-btn"
          :class="{ 'action-btn--collected': post.isFavorite }"
          catchtap="emit('favorite', post.id)"
        >
          <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.BOOKMARK" mode="aspectFit" alt="" />
          <text v-if="post.favorites > 0" class="action-btn__count">{{ post.favorites }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   PostCard - 帖子卡片（自村口页抽取，2026-08-08 频道化重构）
   ================================================================ */
.post-card {
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  padding: var(--sp-5) var(--sp-6);
  box-shadow: var(--s-card-soft);
  margin-bottom: var(--sp-4);
}

.post-card--pressed {
  transform: scale(0.99);
}

/* ---------- 作者行 ---------- */
.post-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.post-card__user {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex: 1;
  min-width: 0;
}

.post-card__user--pressed {
  opacity: 0.7;
}

.user-avatar {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-brand, #f0fdf9);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar__img {
  width: 100%;
  height: 100%;
  border-radius: var(--r-full);
}

.user-avatar__char {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--c-brand-500, #3fcf8e);
}

.user-avatar__badge {
  position: absolute;
  top: -6rpx;
  left: -6rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-brand-200, #b3f5dd);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar__badge-icon {
  width: 22rpx;
  height: 22rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.user-info__name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.user-info__name {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
}

.user-info__campus-badge {
  padding: 2rpx 10rpx;
  border-radius: var(--r-full);
  font-size: 20rpx;
  color: var(--c-brand-500, #3fcf8e);
  background: var(--c-bg-brand, #f0fdf9);
  border: 1rpx solid var(--c-brand-100, #ccfbef);
}

.user-info__meta {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}

.user-info__headline {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 420rpx;
}

.follow-chip {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: var(--r-full);
  border: 1rpx solid var(--c-brand-300, #86e8c8);
  background: var(--c-bg-container);
  display: flex;
  align-items: center;
  justify-content: center;
}

.follow-chip--active {
  border-color: var(--c-neutral-100, #eef1f6);
  background: var(--c-neutral-50, #f7f8fa);
}

.follow-chip__text {
  font-size: 22rpx;
  font-weight: 500;
  color: var(--c-brand-500, #3fcf8e);
}

.follow-chip--active .follow-chip__text {
  color: var(--c-text-tertiary);
}

/* ---------- 正文 ---------- */
.post-card__body {
  margin-top: var(--sp-4);
}

.post-card__content {
  font-size: var(--fs-base, 28rpx);
  line-height: 1.65;
  color: var(--c-text-primary);
  word-break: break-all;
}

/* ---------- 图片九宫格 ---------- */
.post-card__images {
  display: grid;
  gap: 8rpx;
  margin-top: var(--sp-4);
}

.post-card__images--1 {
  grid-template-columns: repeat(1, 1fr);
}

.post-card__images--1 .post-card__image-wrap {
  width: 60%;
}

.post-card__images--2,
.post-card__images--4 {
  grid-template-columns: repeat(2, 1fr);
}

.post-card__images--3,
.post-card__images--5,
.post-card__images--6,
.post-card__images--7,
.post-card__images--8,
.post-card__images--9 {
  grid-template-columns: repeat(3, 1fr);
}

.post-card__image-wrap {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--r-md);
  background: var(--c-neutral-50);
}

.post-card__image-wrap--single {
  aspect-ratio: 4 / 3;
}

.post-card__image {
  width: 100%;
  height: 100%;
}

.post-card__image-more {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 4rpx 12rpx;
  border-radius: var(--r-full) 0 0 0;
  background: var(--c-bg-overlay, rgba(15, 23, 42, 0.45));
}

.post-card__image-more-text {
  font-size: 20rpx;
  color: var(--c-neutral-0);
}

/* ---------- 活动卡 ---------- */
.post-card__activity {
  margin-top: var(--sp-4);
}

/* ---------- 标签 ---------- */
.post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: var(--sp-4);
}

.post-card__tag {
  padding: 6rpx 16rpx;
  border-radius: var(--r-full);
  font-size: 22rpx;
}

.post-card__tag--green {
  color: var(--c-brand-500, #3fcf8e);
  background: var(--c-bg-brand, #f0fdf9);
}

.post-card__tag--pink {
  color: var(--c-romance-500, #ec4899);
  background: var(--c-bg-romance-soft, #fdf2f8);
}

/* ---------- 最新评论预览（QQ 频道风格） ---------- */
.post-card__comments {
  margin-top: var(--sp-3);
  border-radius: var(--r-md);
  background: var(--c-neutral-50, #f7f8fa);
  padding: var(--sp-2) var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.comment-preview {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
}

.comment-preview__avatar,
.comment-preview__char {
  width: 36rpx;
  height: 36rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
  background: var(--c-bg-brand, #f0fdf9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  color: var(--c-brand-500, #3fcf8e);
}

.comment-preview__name {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}

.comment-preview__content {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 互动栏 ---------- */
.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--sp-4);
}

.post-card__time {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}

.post-card__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx;
}

.action-btn__icon {
  width: 36rpx;
  height: 36rpx;
}

.action-btn__count {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}

.action-btn--liked .action-btn__icon {
  filter: none;
}

.action-btn__count--liked {
  color: var(--c-romance-500, #ec4899);
  font-weight: 600;
}

/* 点赞动画（沿用村口页原实现） */
.action-btn--animating .action-btn__icon {
  animation: like-burst 0.3s ease;
}

@keyframes like-burst {
  0% { transform: scale(1); }
  50% { transform: scale(1.45); }
  100% { transform: scale(1); }
}

.action-btn--collected .action-btn__icon {
  opacity: 1;
}
</style>
