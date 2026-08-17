<script setup lang="ts">
import type { UserProfileDTO, UserProfilePost, UserProfileSocialProof } from "../../types/profile";
import PublicProfile from "./public/PublicProfile.vue";
import { useProfileTracker } from "../../composables/useProfileTracker";
import MyProfile from "./mine/MyProfile.vue";
import type { InteractionItem } from "./mine/MyInteraction.vue";
import type { MoreItem } from "./mine/MyMore.vue";

const props = withDefaults(defineProps<{
  mode: "mine" | "public";
  profile: UserProfileDTO | null;
  loading?: boolean;
  errorMessage?: string;
  posts?: UserProfilePost[];
  socialProof?: UserProfileSocialProof;
  percent?: number;
  interactionItems?: InteractionItem[];
  moreItems?: MoreItem[];
}>(), {
  loading: false,
  errorMessage: "",
  posts: () => [],
  socialProof: () => ({ likedMeCount: 0, likesCount: 0, visitorCount: 0, matchCount: 0 }),
  percent: 0,
  interactionItems: () => [],
  moreItems: () => [],
});

const { trackPageView } = useProfileTracker();
trackPageView(props.mode);

const emit = defineEmits<{
  (e: "retry"): void;
  (e: "like"): void;
  (e: "message"): void;
  (e: "whisper"): void;
  (e: "more"): void;
  (e: "report"): void;
  (e: "block"): void;
  (e: "unmatch"): void;
  (e: "follow"): void;
  (e: "tapAvatar"): void;
  (e: "tapPhoto", index: number): void;
  (e: "edit"): void;
  (e: "complete"): void;
  (e: "statTap", key: string): void;
  (e: "storyPhoto", index: number): void;
  (e: "storyVideo"): void;
  (e: "interactionTap", key: string): void;
  (e: "moreTap", key: string): void;
}>();
</script>

<template>
  <view class="profile-shell">
    <view v-if="loading && !profile" class="profile-shell__state">
      <text class="profile-shell__text">加载中...</text>
    </view>
    <view v-else-if="errorMessage && !profile" class="profile-shell__state">
      <text class="profile-shell__text">{{ errorMessage }}</text>
      <view class="profile-shell__retry" @tap="emit('retry')">
        <text class="profile-shell__retry-text">重试</text>
      </view>
    </view>

    <PublicProfile
      v-else-if="mode === 'public' && profile"
      :profile="profile"
      :loading="loading"
      :error-message="errorMessage"
      :posts="props.posts"
      @retry="emit('retry')"
      @like="emit('like')"
      @message="emit('message')"
      @whisper="emit('whisper')"
      @more="emit('more')"
      @report="emit('report')"
      @block="emit('block')"
      @unmatch="emit('unmatch')"
      @follow="emit('follow')"
      @tap-avatar="emit('tapAvatar')"
      @tap-photo="emit('tapPhoto', $event)"
    />

    <MyProfile
      v-else-if="mode === 'mine' && profile"
      :profile="profile"
      :social-proof="props.socialProof"
      :percent="props.percent"
      :interaction-items="props.interactionItems"
      :more-items="props.moreItems"
      @edit="emit('edit')"
      @tap-avatar="emit('tapAvatar')"
      @complete="emit('complete')"
      @stat-tap="emit('statTap', $event)"
      @story-photo="emit('storyPhoto', $event)"
      @story-video="emit('storyVideo')"
      @interaction-tap="emit('interactionTap', $event)"
      @more-tap="emit('moreTap', $event)"
    >
      <template #legacy>
        <slot name="legacy" />
      </template>
    </MyProfile>
  </view>
</template>

<style scoped lang="scss">
.profile-shell {
  min-height: 100vh;
  background: #F7FAF9;
}

.profile-shell__state {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.profile-shell__text {
  font-size: 28rpx;
  color: #777777;
}

.profile-shell__retry {
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: #DFF8EF;
}

.profile-shell__retry-text {
  font-size: 26rpx;
  color: #36C99A;
  font-weight: 700;
}
</style>
