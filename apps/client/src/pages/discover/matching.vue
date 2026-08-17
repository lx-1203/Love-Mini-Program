<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useMatchStore } from "../../stores/match";
import { clientApi } from "../../services/api";
import { mapToDiscoverCard } from "../../stores/discover/utils";
import { toMatchCardUser } from "../../view-models/match";
import type { MatchCardUser } from "../../types/match";
import { useProfileStore } from "../../stores/profile";
import { IMAGE_PATHS } from "../../config/images";
import { ROUTES } from "../../constants/routes";

import MatchLoading from "../../components/match/MatchLoading.vue";

const { t } = useI18n();
const matchStore = useMatchStore();
const profileStore = useProfileStore();

const animationDone = ref(false);
const checked = ref(false);
const previewMode = ref(false);

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
    if (!checked.value || !animated || previewMode.value) return;
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

onLoad((query) => {
  const q = (query || {}) as Record<string, string>;
  const cardId = q.cardId || "";
  const action = q.action || "";
  const userId = q.userId || "";
  // 2026-08-18：preview=1 预览模式（分享/演示）——不调匹配接口，动画结束停留页面
  if (String(q.preview) === "1" && cardId && action && userId) {
    previewMode.value = true;
    matchStore.beginCheck(
      { userId, id: cardId, name: "TA", photo: "", avatar: "" } as MatchCardUser,
      cardId,
      action as "like" | "superLike"
    );
    void loadPartnerProfile(userId).then((user) => {
      if (user) {
        matchStore.matchedUser = user;
      }
    });
    if (!profileStore.avatarUrl) {
      void profileStore.load().catch(() => {});
    }
    return;
  }

  if (!matchStore.pendingCardId || !matchStore.pendingAction) {
    // 2026-08-18：支持 URL query 直达（自动化验收/分享恢复）——
    // 由 userId/cardId/action 初始化匹配上下文，并异步拉取对方资料。
    if (cardId && action && userId) {
      matchStore.beginCheck(
        { userId, id: cardId, name: "TA", photo: "", avatar: "" } as MatchCardUser,
        cardId,
        action as "like" | "superLike"
      );
      void loadPartnerProfile(userId).then((user) => {
        if (user) {
          matchStore.matchedUser = user;
        }
      });
    } else {
      // 页面刷新兜底：直接回退，避免死页。
      setTimeout(() => goBack(), 200);
      return;
    }
  }

  if (!profileStore.avatarUrl) {
    void profileStore.load().catch(() => {});
  }

  void matchStore.runMatchCheck().finally(() => {
    checked.value = true;
  });
});

/** 通过 userId 拉取推荐人资料（URL 直达时兜底填充匹配卡） */
async function loadPartnerProfile(userId: string): Promise<MatchCardUser | null> {
  try {
    const person = await clientApi.getPersonProfile(userId);
    if (!person) return null;
    return toMatchCardUser(mapToDiscoverCard(person));
  } catch (_e) {
    return null;
  }
}

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