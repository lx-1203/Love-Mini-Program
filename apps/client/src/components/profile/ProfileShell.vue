<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { UserProfileDTO, UserProfilePost, UserProfileSocialProof } from "../../types/profile";
import PublicProfile from "./public/PublicProfile.vue";
import { useProfileTracker } from "../../composables/useProfileTracker";
import MyProfile from "./mine/MyProfile.vue";
import type { InteractionItem } from "./mine/MyInteraction.vue";
import type { MoreItem } from "./mine/MyMore.vue";
import SkeletonBlock from "../common/SkeletonBlock.vue";

const { t } = useI18n();

const props = withDefaults(defineProps<{
  mode: "mine" | "public";
  profile: UserProfileDTO | null;
  loading?: boolean;
  errorMessage?: string;
  /** 错误态是否提供重试按钮（无 userId 等参数缺失场景不可重试） */
  retryable?: boolean;
  posts?: UserProfilePost[];
  /** 2026-09-05 R18：他人主页关注状态（CTA 按钮态切换） */
  following?: boolean;
  socialProof?: UserProfileSocialProof;
  percent?: number;
  interactionItems?: InteractionItem[];
  moreItems?: MoreItem[];
}>(), {
  loading: false,
  errorMessage: "",
  retryable: true,
  posts: () => [],
  following: false,
  socialProof: () => ({ followingCount: 0, followersCount: 0, likesCount: 0, matchCount: 0 }),
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
  /** 2026-09-05 R18：他人主页帖子卡点击进详情 */
  (e: "openPost", postId: string): void;
  (e: "edit"): void;
  (e: "complete"): void;
  (e: "statTap", key: string): void;
  (e: "storyPhoto", index: number): void;
  (e: "storyVideo"): void;
  (e: "addStory"): void;
  (e: "interactionTap", key: string): void;
  (e: "moreTap", key: string): void;
}>();
</script>

<template>
  <view class="profile-shell">
    <!-- 2026-09-03 骨架屏升级：资料态骨架替代纯文字 loading（避免白屏/跳动） -->
    <view v-if="loading && !profile" class="profile-shell__state">
      <SkeletonBlock variant="profile" :label="t('common.loading')" />
    </view>
    <view v-else-if="errorMessage && !profile" class="profile-shell__state">
      <text class="profile-shell__text">{{ errorMessage }}</text>
      <view v-if="props.retryable" class="profile-shell__retry" @tap="emit('retry')">
        <text class="profile-shell__retry-text">{{ t("common.retry") }}</text>
      </view>
    </view>

    <PublicProfile
      v-else-if="mode === 'public' && profile"
      :profile="profile"
      :loading="loading"
      :error-message="errorMessage"
      :posts="props.posts"
      :following="props.following"
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
      @open-post="emit('openPost', $event)"
    />

    <MyProfile
      v-else-if="mode === 'mine' && profile"
      :profile="profile"
      :posts="props.posts"
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
      @add-story="emit('addStory')"
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
  background: #EEF7F2;
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
  color: #6B7571;
}

.profile-shell__retry {
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: #E8FBF3;
}

.profile-shell__retry-text {
  font-size: 26rpx;
  color: #36C99A;
  font-weight: 700;
}
</style>
