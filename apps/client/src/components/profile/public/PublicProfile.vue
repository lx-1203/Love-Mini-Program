<script setup lang="ts">
import { ref } from "vue";
import type { UserProfileDTO, UserProfilePost } from "../../../types/profile";
import PublicHero from "./PublicHero.vue";
import PublicIdentity from "./PublicIdentity.vue";
import PublicBio from "./PublicBio.vue";
import PublicInterest from "./PublicInterest.vue";
import PublicCommon from "./PublicCommon.vue";
import PublicGallery from "./PublicGallery.vue";
import PublicMoment from "./PublicMoment.vue";
import RelationshipCTA from "./RelationshipCTA.vue";
import GovernanceMenu from "./GovernanceMenu.vue";

const props = withDefaults(defineProps<{
  profile: UserProfileDTO | null;
  loading?: boolean;
  errorMessage?: string;
  posts?: UserProfilePost[];
}>(), {
  loading: false,
  errorMessage: "",
  posts: () => [],
});

const emit = defineEmits<{
  (e: "retry"): void;
  (e: "like"): void;
  (e: "message"): void;
  (e: "whisper"): void;
  (e: "more"): void;
  (e: "follow"): void;
  (e: "report"): void;
  (e: "block"): void;
  (e: "unmatch"): void;
  (e: "tapAvatar"): void;
  (e: "tapPhoto", index: number): void;
}>();

const governanceVisible = ref(false);

function closeGovernance() {
  governanceVisible.value = false;
}
</script>

<template>
  <view class="public-profile">
    <view v-if="loading && !profile" class="public-profile__state">
      <text class="public-profile__state-text">加载中...</text>
    </view>

    <view v-else-if="errorMessage && !profile" class="public-profile__state">
      <text class="public-profile__state-text">{{ errorMessage }}</text>
      <view class="public-profile__retry" @tap="emit('retry')">
        <text class="public-profile__retry-text">重试</text>
      </view>
    </view>

    <template v-else-if="profile">
      <PublicHero :profile="profile" @tap-avatar="emit('tapAvatar')" />
      <PublicIdentity :profile="profile" @like="emit('like')" @message="emit('message')" />
      <PublicBio v-if="profile.intro.bio" :bio="profile.intro.bio" />
      <PublicInterest :tags="profile.intro.tags" />
      <PublicCommon :common-interests="profile.relation.commonInterests" />
      <PublicGallery :photos="profile.media.photos" @tap-photo="emit('tapPhoto', $event)" />
      <PublicMoment :posts="props.posts" />
      <view class="public-profile__spacer" />

      <RelationshipCTA
        :liked="profile.relation.liked"
        :matched="profile.relation.matched"
        @like="emit('like')"
        @message="emit('message')"
        @follow="emit('follow')"
      />
      <GovernanceMenu
        :visible="governanceVisible"
        :matched="profile.relation.matched"
        @close="closeGovernance"
        @report="emit('report')"
        @block="emit('block')"
        @unmatch="emit('unmatch')"
      />
    </template>
  </view>
</template>

<style scoped lang="scss">
.public-profile {
  min-height: 100vh;
  background: #F7FAF9;
  padding-bottom: 200rpx;
}

.public-profile__state {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.public-profile__state-text {
  font-size: 28rpx;
  color: #9AA39F;
}

.public-profile__retry {
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: #E8FBF3;
}

.public-profile__retry-text {
  font-size: 26rpx;
  color: #36C99A;
  font-weight: 700;
}

.public-profile__spacer {
  height: 220rpx;
}
</style>
