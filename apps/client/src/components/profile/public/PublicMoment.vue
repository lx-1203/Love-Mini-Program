```vue
<script setup lang="ts">
import type { UserProfilePost } from "../../../types/profile";
import { IMAGE_PATHS } from "../../../config/images";

withDefaults(
  defineProps<{
    posts: UserProfilePost[];
    authorName?: string;
    authorAvatar?: string;
  }>(),
  {
    posts: () => [],
    authorName: "",
    authorAvatar: "",
  },
);

// 2026-09-05 R18：帖子卡可点击进详情（修复"看不了 TA 的帖子"）
const emit = defineEmits<{ (e: "openPost", postId: string): void }>();

/** 将 ISO 时间转成 "3天前" 这种相对文案（理想图：最近动态 3天前·北京） */
function relativeTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "刚刚";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}小时前`;
  const diffDay = Math.floor(diffSec / 86400);
  if (diffDay < 30) return `${diffDay}天前`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}个月前`;
  return `${Math.floor(diffDay / 365)}年前`;
}
</script>

<template>
  <view v-if="posts.length > 0" class="public-moment">
    <view class="public-moment__head">
      <text class="public-moment__title">最近动态</text>
      <text class="public-moment__more">···</text>
    </view>
    <view
      v-for="post in posts"
      :key="post.id"
      class="public-moment__card press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="40"
      role="button"
      :aria-label="`查看${authorName || 'TA'}的动态`"
      @tap="emit('openPost', String(post.id))"
    >
      <view class="public-moment__author">
        <image
          v-if="authorAvatar"
          class="public-moment__avatar"
          :src="authorAvatar"
          mode="aspectFill"
          alt=""
        />
        <view v-else class="public-moment__avatar public-moment__avatar--placeholder">
          <text class="public-moment__avatar-text">{{ (authorName || "·").slice(0, 1) }}</text>
        </view>
        <view class="public-moment__author-meta">
          <text class="public-moment__author-name">{{ authorName || "匿名用户" }}</text>
          <text class="public-moment__author-sub">{{ relativeTime(post.createdAt) }}</text>
        </view>
      </view>
      <text class="public-moment__content">{{ post.content }}</text>
      <view v-if="post.images && post.images.length > 0" class="public-moment__images">
        <image
          v-for="(img, idx) in post.images.slice(0, 3)"
          :key="`${post.id}-${idx}`"
          class="public-moment__img"
          :src="img"
          mode="aspectFill"
          alt=""
        />
      </view>
      <view class="public-moment__footer">
        <view class="public-moment__stat">
          <image class="public-moment__stat-icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
          <text>{{ post.likes }}</text>
        </view>
        <text class="public-moment__stat">○ {{ post.comments }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.public-moment {
  margin: 24rpx 24rpx 0;
}

.public-moment__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.public-moment__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.public-moment__more {
  font-size: 36rpx;
  color: #9AA39F;
  line-height: 1;
}

.public-moment__card {
  margin-bottom: 16rpx;
  padding: 24rpx;
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.public-moment__author {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.public-moment__avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #EEF2F0;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.public-moment__avatar--placeholder {
  background: linear-gradient(135deg, #E8FBF3 0%, #C7F0E0 100%);
}

.public-moment__avatar-text {
  font-size: 28rpx;
  font-weight: 800;
  color: #36C99A;
}

.public-moment__author-meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.public-moment__author-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #333A37;
  line-height: 1.3;
}

.public-moment__author-sub {
  font-size: 22rpx;
  color: #9AA39F;
  line-height: 1.3;
}

.public-moment__content {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  font-size: 26rpx;
  line-height: 1.55;
  color: #333333;
}

.public-moment__images {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.public-moment__img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 32rpx;
  background: #EEF2F0;
}

.public-moment__footer {
  display: flex;
  gap: 24rpx;
  margin-top: 16rpx;
}

.public-moment__stat {
  font-size: 22rpx;
  color: #9AA39F;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.public-moment__stat-icon {
  width: 22rpx;
  height: 22rpx;
  color: #FF6B81;
}
</style>
```
