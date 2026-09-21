<script setup lang="ts">
import type { UserProfileDTO, UserProfileSocialProof, UserProfilePost } from "../../../types/profile";
import MyHeader from "./MyHeader.vue";
import MyCompletion from "./MyCompletion.vue";
import MyStats from "./MyStats.vue";
import MyStory from "./MyStory.vue";
import MyInteraction, { type InteractionItem } from "./MyInteraction.vue";
import MyMore, { type MoreItem } from "./MyMore.vue";

const props = withDefaults(defineProps<{
  profile: UserProfileDTO;
  socialProof: UserProfileSocialProof;
  percent: number;
  interactionItems?: InteractionItem[];
  moreItems?: MoreItem[];
  posts?: UserProfilePost[];
}>(), {
  interactionItems: () => [],
  moreItems: () => [],
  posts: () => [],
});

const emit = defineEmits<{
  (e: "edit"): void;
  (e: "tapAvatar"): void;
  (e: "complete"): void;
  (e: "statTap", key: string): void;
  (e: "storyPhoto", index: number): void;
  (e: "tapAlbum", index: number): void;
  (e: "storyVideo"): void;
  (e: "addStory"): void;
  (e: "postTap", id: string): void;
  (e: "interactionTap", key: string): void;
  // MP-R1-PROFILE-204：growthTap emit 已删（模板内无发射点，契约断裂的死声明；
  // MyGrowth.vue 孤儿组件一并移除）
  (e: "moreTap", key: string): void;
}>();
</script>

<template>
  <view class="my-profile">
    <MyHeader :profile="props.profile" @edit="emit('edit')" @tap-avatar="emit('tapAvatar')">
      <template #bottom>
        <MyCompletion :percent="props.percent" @complete="emit('complete')" />
      </template>
    </MyHeader>
    <MyStats :social-proof="props.socialProof" @tap="emit('statTap', $event)" />

    <MyStory
      :photos="props.profile.media.photos"
      :videos="props.profile.media.videos"
      :stories="props.profile.stories ?? []"
      :posts="props.posts"
      @tap-photo="emit('storyPhoto', $event)"
      @tap-album="emit('tapAlbum', $event)"
      @tap-video="emit('storyVideo')"
      @add-story="emit('addStory')"
    />

    <MyInteraction :items="props.interactionItems" @tap="emit('interactionTap', $event)" />
    <MyMore :items="props.moreItems" @tap="emit('moreTap', $event)" />
  </view>
</template>

<style scoped lang="scss">
.my-profile {
  min-height: 100vh;
  background: #EEF7F2;
  padding-bottom: 120rpx;
}
</style>
