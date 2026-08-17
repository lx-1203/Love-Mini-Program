<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useMatchStore } from "../../stores/match";
import { useProfileStore } from "../../stores/profile";
import { IMAGE_PATHS } from "../../config/images";
import { ROUTES } from "../../constants/routes";

import MatchLoading from "../../components/match/MatchLoading.vue";

const { t } = useI18n();
const matchStore = useMatchStore();
const profileStore = useProfileStore();

const animationDone = ref(false);
const checked = ref(false);

const partner = computed(() => matchStore.matchedUser);
const myAvatar = computed(() => profileStore.avatarUrl || IMAGE_PATHS.DEFAULT_AVATAR);
const partnerAvatar = computed(() => partner.value?.avatar || partner.value?.photo || IMAGE_PATHS.DEFAULT_AVATAR);

function redirectToSuccess() {
  const userId = partner.value?.userId ?? "";
  uni.redirectTo({
    url: `${ROUTES.DISCOVER.MATCH_SUCCESS}?userId=${encodeURIComponent(userId)}`,
  });
}

function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: ROUTES.TAB.DISCOVER });
  }
}

watch(
  () => [matchStore.status, animationDone.value] as const,
  ([status, animated]) => {
    if (!checked.value || !animated) return;
    if (status === "matched") {
      redirectToSuccess();
    } else if (status === "idle") {
      uni.showToast({ title: t("discover.likeSent"), icon: "success" });
      setTimeout(() => goBack(), 400);
    } else if (status === "failed") {
      uni.showToast({
        title: matchStore.lastError || t("matching.likeFailed"),
        icon: "none",
      });
      setTimeout(() => goBack(), 600);
    }
  }
);

onLoad(() => {
  if (!matchStore.pendingCardId || !matchStore.pendingAction) {
    // 页面刷新兜底：直接回退，避免死页。
    setTimeout(() => goBack(), 200);
    return;
  }

  if (!profileStore.avatarUrl) {
    void profileStore.load().catch(() => {});
  }

  void matchStore.runMatchCheck().finally(() => {
    checked.value = true;
  });
});

function onAnimationFinished() {
  animationDone.value = true;
  matchStore.markAnimationDone();
}

onUnload(() => {
  if (matchStore.status === "idle" || matchStore.status === "failed") {
    matchStore.reset();
  }
});
</script>

<template>
  <view class="matching-page">
    <MatchLoading
      :my-avatar="myAvatar"
      :partner-avatar="partnerAvatar"
      :partner-name="partner?.name ?? ''"
      @finished="onAnimationFinished"
      @skip="goBack"
    />
  </view>
</template>

<style scoped lang="scss">
.matching-page {
  min-height: 100%;
  background: #f4fbf8;
}
</style>