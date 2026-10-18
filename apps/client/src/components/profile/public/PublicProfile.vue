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
import LoadingSpinner from "../../common/LoadingSpinner.vue";

const props = withDefaults(defineProps<{
  profile: UserProfileDTO | null;
  loading?: boolean;
  errorMessage?: string;
  posts?: UserProfilePost[];
  /** 2026-09-05 R18：他人主页关注状态 */
  following?: boolean;
}>(), {
  loading: false,
  errorMessage: "",
  posts: () => [],
  following: false,
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
  /** 2026-09-05 R18：最近动态帖子卡点击（转发 PublicMoment.openPost） */
  (e: "openPost", postId: string): void;
}>();

const governanceVisible = ref(false);

function closeGovernance() {
  governanceVisible.value = false;
}
</script>

<template>
  <view class="public-profile">
    <view v-if="loading && !profile" class="public-profile__state">
      <LoadingSpinner text="加载中..." />
    </view>

    <view v-else-if="errorMessage && !profile" class="public-profile__state">
      <text class="public-profile__state-text">{{ errorMessage }}</text>
      <view class="public-profile__retry" @tap="emit('retry')">
        <text class="public-profile__retry-text">重试</text>
      </view>
    </view>

    <template v-else-if="profile">
      <PublicHero :profile="profile" @tap-avatar="emit('tapAvatar')" />
      <PublicIdentity
        :profile="profile"
        @like="emit('like')"
        @message="emit('message')"
        @whisper="emit('whisper')"
      />
      <!-- R2b-L06-D18：简介卡不再按数据有无整块开关（空态文案在 PublicBio 内部），
           兴趣 / 共同点 / 生活瞬间三节同样恒定渲染标题 + 空态或骨架，
           保证他人主页有真实可滚动高度（原 bottom 帧与 top 帧 sha16 相同 = 页面根本滚不动）。 -->
      <PublicBio :bio="profile.intro.bio" />
      <PublicInterest :tags="profile.intro.tags" />
      <PublicCommon :common-interests="profile.relation.commonInterests" />
      <PublicGallery :photos="profile.media.photos" @tap-photo="emit('tapPhoto', $event)" />
      <PublicMoment
        :posts="props.posts"
        :author-name="profile.basic.name"
        :author-avatar="profile.basic.avatar"
        @open-post="emit('openPost', $event)"
      />

      <RelationshipCTA
        :liked="profile.relation.liked"
        :matched="profile.relation.matched"
        :following="props.following"
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
  /* R2b-L06-D15/D18：理想图的页面底是浅灰绿（卡片亮、页面暗），原实现是纯白
     → 白卡与白底糊成一片、灰绿简介卡反而像禁用态。改走 --c-bg-page 档。 */
  background: var(--c-bg-page, #EEF7F2);
  /* 2026-10-19 R1-B19：底栏预留只留这一处来源（原「流内 spacer 220rpx + 本 padding」双算，合计约 500rpx 空带）。
     固定底栏 RelationshipCTA 实测高 ≈133rpx（padding 20+20rpx + 按钮 92rpx）+ safe-area，此处 280rpx + safe-area 已含呼吸位。 */
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom) + 60rpx);
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
</style>
