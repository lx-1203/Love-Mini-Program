<script setup lang="ts">
import type { UserProfileDTO, UserProfilePost } from "../../../types/profile";
import MyStory from "./MyStory.vue";
import ProfileEmptyState from "../ProfileEmptyState.vue";

defineProps<{
  profile: UserProfileDTO;
  posts?: UserProfilePost[];
}>();

const emit = defineEmits<{
  (e: "storyPhoto", index: number): void;
  (e: "storyVideo"): void;
  (e: "postTap", id: string): void;
  (e: "addStory"): void;
}>();
</script>

<template>
  <view class="my-content">
    <MyStory
      :photos="profile.media.photos"
      :videos="profile.media.videos"
      @tap-photo="emit('storyPhoto', $event)"
      @tap-video="emit('storyVideo')"
    />

    <ProfileEmptyState
      v-if="profile.media.photos.length === 0 && profile.media.videos.length === 0"
      title="还没有故事"
      description="添加第一段生活记录，让别人更了解你"
      action-text="添加故事"
      @action="emit('addStory')"
    />

    <view v-if="posts && posts.length > 0" class="my-content__posts">
      <text class="my-content__title">我的动态</text>
      <view
        v-for="post in posts"
        :key="post.id"
        class="my-content__post"
        hover-class="my-content__post--pressed"
        @tap="emit('postTap', post.id)"
      >
        <text class="my-content__post-text">{{ post.content }}</text>
        <text class="my-content__post-meta">{{ post.likes }} 赞 · {{ post.comments }} 评论</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-content {
  margin-top: 24rpx;
}

.my-content__posts {
  margin: 24rpx 24rpx 0;
}

.my-content__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #222222;
}

.my-content__post {
  margin-bottom: 16rpx;
  padding: 24rpx;
  border-radius: 40rpx;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.06);
}

.my-content__post--pressed {
  opacity: 0.85;
}

.my-content__post-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 28rpx;
  line-height: 1.5;
  color: #222222;
}

.my-content__post-meta {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #777777;
}
</style>

