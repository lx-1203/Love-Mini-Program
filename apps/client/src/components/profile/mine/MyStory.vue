<script setup lang="ts">
/**
 * P5「我的故事」= 我的相册 + 我的帖子。
 *
 * 结构（自上而下）：
 * 1. 我的相册：横排最多 3 张照片墙缩略图（props.photos = photoGallery，最多 6 张），
 *    点击单张 → emit('tapPhoto', index)，由父级路由到相册页（/subpackages/profile-extra/profile/album）。
 * 2. 我的帖子：当前登录用户的帖子卡片列表（图片 + 内容 + 点赞评论数），
 *    点击卡片 → 帖子详情页 /subpackages/village/village/detail?id=<postId>。
 *
 * 数据来源：
 * - photos：UserProfileDTO.media.photos（当前用户照片墙）
 * - posts：UserProfilePost[]（当前登录用户帖子，父级从 profileView.myPostsPreview 映射）
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（改用 hover-class）
 * - 不使用 import.meta.env.DEV / backdrop-filter / display:grid / catch{}
 */
import { computed } from "vue";
import type { UserProfilePost, UserProfileStory } from "../../../types/profile";
import { IMAGE_PATHS } from "../../../config/images";
import { openAppPath } from "../../../utils/navigation";

const props = withDefaults(defineProps<{
  photos: string[];
  videos: string[];
  stories?: UserProfileStory[];
  posts?: UserProfilePost[];
}>(), {
  photos: () => [],
  videos: () => [],
  stories: () => [],
  posts: () => [],
});

const emit = defineEmits<{
  /** R16：故事卡点击（日常详情，index = stories 序号） */
  (e: "tapPhoto", index: number): void;
  /** R16：相册缩略图点击（打开恋爱相册页），与故事卡分离，避免误入帖子历史 */
  (e: "tapAlbum", index: number): void;
  (e: "tapVideo"): void;
  (e: "addStory"): void;
}>();

/** 我的相册：横排最多 3 张缩略图 */
const albumThumbs = computed(() => props.photos.slice(0, 3));

/** 点击帖子卡片 → 帖子详情页 */
function openPost(postId: string): void {
  if (!postId) return;
  openAppPath(`/subpackages/village/village/detail?id=${encodeURIComponent(postId)}`);
}
</script>

<template>
  <view class="my-story">
    <text class="my-story__title">我的故事</text>

    <!-- ===== 我的故事卡（R16：真实「日常」内容 + 添加日常虚线卡常驻） ===== -->
    <view class="story-cards">
      <scroll-view scroll-x class="story-cards__scroll" :show-scrollbar="false">
        <view class="story-cards__row">
          <view
            v-for="(story, storyIdx) in props.stories"
            :key="story.id"
            class="story-card press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="story.title"
            @tap="emit('tapPhoto', storyIdx)"
          >
            <image class="story-card__img" :src="story.cover" mode="aspectFill" lazy-load alt="" />
            <view class="story-card__mask" />
            <view class="story-card__label">
              <text class="story-card__title">{{ story.title }}</text>
              <text v-if="story.dateText" class="story-card__count">{{ story.dateText }}</text>
            </view>
          </view>
          <view
            class="story-add press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            aria-label="添加日常"
            @tap="emit('addStory')"
          >
            <image class="story-add__icon" :src="IMAGE_PATHS.ICONS_EMOJI.PLUS" mode="aspectFit" alt="" />
            <text class="story-add__text">添加日常</text>
          </view>
        </view>
      </scroll-view>
      <text class="story-cards__hint">日常仅互相喜欢或你关注的人可见</text>
    </view>

    <!-- ===== 我的相册：横排 3 张缩略图 ===== -->
    <view class="album-block">
      <view class="story-section-head">
        <text class="story-section-head__title">我的相册</text>
        <text v-if="props.photos.length > 0" class="story-section-head__count">{{ props.photos.length }} 张</text>
      </view>
      <view v-if="albumThumbs.length > 0" class="album-thumbs">
        <view
          v-for="(photo, index) in albumThumbs"
          :key="`album-${index}`"
          class="album-thumb press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="'查看相册'"
          @tap="emit('tapAlbum', index)"
        >
          <image class="album-thumb__img" :src="photo" mode="aspectFill" lazy-load alt="" />
        </view>
      </view>
      <view v-else class="album-empty">
        <text class="album-empty__text">还没有相册照片，去相册上传一张吧～</text>
      </view>
    </view>

    <!-- ===== 我的帖子：卡片列表 ===== -->
    <view class="posts-block">
      <view class="story-section-head">
        <text class="story-section-head__title">我的帖子</text>
        <text v-if="props.posts.length > 0" class="story-section-head__count">{{ props.posts.length }} 篇</text>
      </view>
      <view v-if="props.posts.length > 0" class="post-list">
        <view
          v-for="post in props.posts"
          :key="post.id"
          class="post-card press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="post.content"
          @tap="openPost(post.id)"
        >
          <text class="post-card__content">{{ post.content }}</text>
          <view v-if="(post.images || []).length > 0" class="post-card__images">
            <image
              v-for="(img, idx) in (post.images || []).slice(0, 3)"
              :key="`${post.id}-${idx}`"
              class="post-card__img"
              :src="img"
              mode="aspectFill"
              lazy-load
              alt=""
            />
          </view>
          <view class="post-card__footer">
            <view class="post-card__stat">
              <image class="post-card__stat-icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
              <text class="post-card__stat-text">{{ post.likes }}</text>
            </view>
            <view class="post-card__stat">
              <image class="post-card__stat-icon" :src="IMAGE_PATHS.ICONS_SOCIAL.MESSAGE" mode="aspectFit" alt="" />
              <text class="post-card__stat-text">{{ post.comments }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="posts-empty">
        <text class="posts-empty__text">还没有发布帖子，去村口分享你的第一篇吧～</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ===== 故事区容器 ===== */
.my-story {
  margin: var(--sp-5) var(--sp-5) 0;
}

.my-story__title {
  display: block;
  margin-bottom: var(--sp-4);
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 800;
  color: var(--c-text-primary);
}

/* ===== 我的故事卡：横向滚动（理想图 3 卡 + 添加故事虚线卡） ===== */
.story-cards {
  margin-bottom: var(--sp-5);
}

/* R16：日常可见范围说明 */
.story-cards__hint {
  display: block;
  margin-top: 8rpx;
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary);
}

.story-cards__scroll {
  white-space: nowrap;
}

.story-cards__row {
  display: inline-flex;
  gap: var(--sp-3);
  padding-bottom: 4rpx;
}

.story-card {
  position: relative;
  flex-shrink: 0;
  width: 208rpx;
  height: 264rpx;
  border-radius: var(--r-lg);
  overflow: hidden;
  background: var(--c-bg-container);
  border: var(--c-border-card);
  box-sizing: border-box;
}

.story-card__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.story-card__mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 96rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%);
}

.story-card__label {
  position: absolute;
  left: 16rpx;
  right: 16rpx;
  bottom: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.story-card__title {
  font-size: var(--fs-sm, 24rpx);
  font-weight: 700;
  color: #ffffff;
}

.story-card__count {
  font-size: var(--fs-xs, 20rpx);
  color: rgba(255, 255, 255, 0.85);
}

/* 添加故事：虚线加号卡 */
.story-add {
  flex-shrink: 0;
  width: 208rpx;
  height: 264rpx;
  border-radius: var(--r-lg);
  border: 2rpx dashed #B9C4C0;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-sizing: border-box;
}

.story-add__icon {
  width: 48rpx;
  height: 48rpx;
  color: #36C99A;
}

.story-add__text {
  font-size: var(--fs-sm, 24rpx);
  color: #36C99A;
  font-weight: 600;
}

/* ===== 区块标题 ===== */
.story-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
}

.story-section-head__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.story-section-head__count {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary);
  font-variant-numeric: tabular-nums;
}

/* ===== 我的相册：横排 3 张 ===== */
.album-block {
  margin-bottom: var(--sp-5);
}

/* mp-weixin 不支持 display:grid，3 列等宽改用 Flexbox + width: calc */
.album-thumbs {
  display: flex;
  gap: var(--sp-3);
}

.album-thumb {
  position: relative;
  width: calc((100% - 2 * var(--sp-3)) / 3);
  padding-top: calc((100% - 2 * var(--sp-3)) / 3);
  border-radius: var(--r-lg);
  overflow: hidden;
  background: var(--c-bg-container);
  border: var(--c-border-card);
  box-sizing: border-box;
}

.album-thumb__img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.album-empty {
  padding: var(--sp-8);
  border-radius: var(--r-lg);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-empty__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

/* ===== 我的帖子：卡片列表 ===== */
.posts-block {
  margin-bottom: var(--sp-2);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.post-card {
  padding: var(--sp-4);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft, 0 8rpx 32rpx rgba(0, 0, 0, 0.06));
}

.post-card__content {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  font-size: var(--fs-base, 26rpx);
  line-height: 1.55;
  color: var(--c-text-secondary);
}

.post-card__images {
  display: flex;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}

.post-card__img {
  width: 200rpx;
  height: 200rpx;
  border-radius: var(--r-lg);
  background: var(--c-bg-surface, #f1f5f9);
}

.post-card__footer {
  display: flex;
  gap: var(--sp-5);
  margin-top: var(--sp-3);
}

.post-card__stat {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.post-card__stat-icon {
  width: 22rpx;
  height: 22rpx;
}

.post-card__stat-text {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary);
}

.posts-empty {
  padding: var(--sp-8);
  border-radius: var(--r-lg);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.posts-empty__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}
</style>