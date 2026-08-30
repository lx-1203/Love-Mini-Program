<script setup lang="ts">
/**
 * 他人主页详情页（薄页面）。
 * 页面只保留业务逻辑（取 userId、访客记录、喜欢/打招呼/心动卡/举报拉黑），
 * 视觉结构交给 components/profile/public/PublicProfile.vue。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { getToken, request } from "../../../services/http";
import { useLikesStore } from "../../../stores/likes";
import { useMock } from "../../../stores/helpers/use-mock";
import type { HeartSignalView } from "../../../stores/discover/api";
import { openAppPath } from "../../../utils/navigation";
import { clientApi } from "../../../services/api";
import { ROUTES } from "../../../constants/routes";
import { useSessionStore } from "../../../stores/session";
import { useReportStore } from "../../../stores/report";
import { ensureCertified } from "../../../guards/campus-gate";
import WhisperComposeSheet from "../../../components/discover/WhisperComposeSheet.vue";
import ProfileShell from "../../../components/profile/ProfileShell.vue";
import { fetchPublicProfile } from "../../../api/profile";
import type { UserProfileDTO } from "../../../types/profile";
import { lightHaptic, successHaptic, errorHaptic } from "../../../utils/haptic";

const { t } = useI18n();
const likesStore = useLikesStore();
const sessionStore = useSessionStore();
const reportStore = useReportStore();

const targetUserId = ref("");
const profile = ref<UserProfileDTO | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const liking = ref(false);
const whisperVisible = ref(false);

const alreadyLiked = computed(() =>
  likesStore.likes.some((item) => item.userId === targetUserId.value),
);

const isMatched = computed(() =>
  likesStore.mutualLikes.some((item) => item.userId === targetUserId.value),
);

/** 渲染视图：把本地喜欢/匹配状态同步到统一 DTO 的 relation 字段 */
const profileForRender = computed<UserProfileDTO | null>(() => {
  const p = profile.value;
  if (!p) return null;
  return {
    ...p,
    relation: {
      ...p.relation,
      liked: alreadyLiked.value,
      matched: isMatched.value,
    },
  };
});

function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: ROUTES.TAB.HOME });
  }
}

async function loadProfile(): Promise<void> {
  if (!targetUserId.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    profile.value = await fetchPublicProfile(targetUserId.value);
    if (likesStore.likes.length === 0 && likesStore.likedBy.length === 0) {
      void likesStore.fetchLikes().catch(() => {});
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("common.networkError");
  } finally {
    loading.value = false;
  }
}

function recordVisit(): void {
  if (!targetUserId.value || useMock()) return;
  if (!getToken()) return;
  request<void>({
    url: "/matches/visit",
    method: "POST",
    data: { visitedUserId: Number(targetUserId.value) },
  }).catch(() => {
    // 访客记录失败不影响浏览
  });
}

async function handleLike(): Promise<void> {
  if (liking.value || !targetUserId.value) return;
  lightHaptic();
  liking.value = true;
  try {
    if (useMock()) {
      await likesStore.likeUser(targetUserId.value);
      if (isMatched.value) {
        successHaptic();
        uni.showModal({
          title: t("profile.other.matchTitle"),
          content: t("profile.other.matchContent"),
          confirmText: t("profile.other.matchGoChat"),
          cancelText: t("profile.other.matchKeepBrowsing"),
          success: (res) => {
            if (res.confirm) {
              openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(targetUserId.value)}`);
            }
          },
        });
      } else {
        uni.showToast({ title: t("profile.other.likeWaiting"), icon: "success" });
      }
      return;
    }

    const signal = await request<HeartSignalView | null>({
      url: "/matches/like",
      method: "POST",
      data: { targetUserId: targetUserId.value },
    });
    void likesStore.fetchLikes().catch(() => {});
    if (signal && signal.id) {
      successHaptic();
      uni.showModal({
        title: "匹配成功",
        content: "你们互相喜欢了，快去打个招呼吧",
        confirmText: "去聊天",
        cancelText: "再看看",
        success: (res) => {
          if (res.confirm) {
            openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(targetUserId.value)}`);
          }
        },
      });
      return;
    }
    uni.showToast({ title: "已喜欢，等待回应", icon: "success" });
  } catch (error) {
    errorHaptic();
    uni.showToast({
      title: error instanceof Error ? error.message : t("common.operationFailed"),
      icon: "none",
    });
  } finally {
    liking.value = false;
  }
}

function handleMessage(): void {
  if (!targetUserId.value) return;
  if (!ensureCertified("realname")) return;
  lightHaptic();
  openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(targetUserId.value)}`);
}

function openWhisperSheet() {
  if (!targetUserId.value) return;
  if (!sessionStore.isLoggedIn) {
    uni.showToast({ title: t("apiErrors.loginRequired"), icon: "none" });
    return;
  }
  if (!ensureCertified("realname")) return;
  whisperVisible.value = true;
}

function handleFollow() {
  if (!targetUserId.value) return;
  void clientApi.followUser(targetUserId.value).then(() => {
    uni.showToast({ title: t("profile.otherFollowed"), icon: "success" });
  }).catch(() => {
    uni.showToast({ title: t("profile.otherFollowFailed"), icon: "none" });
  });
}

function handleUnmatch() {
  if (!targetUserId.value) return;
  uni.showModal({
    title: "取消匹配",
    content: "取消后你们将不再互为匹配，确定取消吗？",
    confirmText: "取消匹配",
    cancelText: "再想想",
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await likesStore.unlikeUser(targetUserId.value);
        uni.showToast({ title: "已取消匹配", icon: "success" });
        void loadProfile();
      } catch (_e) {
        uni.showToast({ title: "操作失败，请稍后再试", icon: "none" });
      }
    },
  });
}

function openGovernanceMenu() {
  if (!targetUserId.value) return;
  uni.showActionSheet({
    itemList: [t("chat.nav.report"), t("chat.nav.block"), t("profile.otherFollow")],
    success: (res) => {
      if (res.tapIndex === 0) {
        handleReportUser();
      } else if (res.tapIndex === 1) {
        handleBlockUser();
      } else if (res.tapIndex === 2 && targetUserId.value) {
        void clientApi.followUser(targetUserId.value).then(() => {
          uni.showToast({ title: t("profile.otherFollowed"), icon: "success" });
        }).catch(() => {
          uni.showToast({ title: t("profile.otherFollowFailed"), icon: "none" });
        });
      }
    },
  });
}

function handleReportUser() {
  const uid = targetUserId.value;
  if (!uid) return;
  const reasons = [
    t("chat.nav.reportReasonHarass"),
    t("chat.nav.reportReasonAbuse"),
    t("chat.nav.reportReasonSpam"),
    t("chat.nav.reportReasonOther"),
  ];
  uni.showActionSheet({
    itemList: reasons,
    success: async (res) => {
      try {
        const reason = reasons[res.tapIndex] ?? reasons[reasons.length - 1] ?? t("chat.nav.reportReasonOther");
        await reportStore.reportTarget("USER", uid, reason);
        uni.showToast({ title: t("chat.nav.reportDone"), icon: "success" });
      } catch (_e) {
        uni.showToast({ title: t("chat.nav.reportFailed"), icon: "none" });
      }
    },
  });
}

function handleBlockUser() {
  uni.showModal({
    title: t("chat.nav.blockConfirmTitle"),
    content: t("chat.nav.blockConfirmContent"),
    confirmText: t("chat.nav.block"),
    cancelText: t("common.cancel"),
    success: async (res) => {
      if (!res.confirm) return;
      if (useMock()) {
        uni.showToast({ title: t("chat.nav.blockDone"), icon: "none" });
        return;
      }
      try {
        await request({
          url: `/users/${encodeURIComponent(targetUserId.value)}/block`,
          method: "POST",
        });
        uni.showToast({ title: t("chat.nav.blockDone"), icon: "success" });
      } catch (error) {
        const message = error instanceof Error ? error.message : t("chat.nav.blockFailed");
        uni.showToast({ title: message, icon: "none" });
      }
    },
  });
}

onLoad((query) => {
  const qUserId = query?.userId;
  if (typeof qUserId === "string" && qUserId.length > 0) {
    targetUserId.value = qUserId;
    recordVisit();
    void loadProfile();
  } else {
    errorMessage.value = t("common.noData");
  }
});
</script>

<template>
  <view class="other-page">
    <view class="other-header">
      <view
        class="other-header__back"
        hover-class="other-header__back--pressed"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.back')"
        @tap="goBack"
      >
        <text class="other-header__back-arrow">‹</text>
      </view>
      <view
        v-if="targetUserId"
        class="other-header__more"
        hover-class="other-header__more--pressed"
        hover-stay-time="120"
        role="button"
        :aria-label="t('chat.nav.report')"
        @tap="openGovernanceMenu"
      >
        <text class="other-header__more-dots">···</text>
      </view>
      <view v-else class="other-header__placeholder" />
    </view>

    <ProfileShell
      mode="public"
      :profile="profileForRender"
      :loading="loading"
      :error-message="errorMessage"
      :posts="profileForRender?.posts ?? []"
      @retry="loadProfile"
      @like="handleLike"
      @message="handleMessage"
      @whisper="openWhisperSheet"
      @report="handleReportUser"
      @block="handleBlockUser"
      @unmatch="handleUnmatch"
      @follow="handleFollow"
    />

    <WhisperComposeSheet
      :visible="whisperVisible"
      :user-id="targetUserId"
      :user-name="profileForRender?.basic.name ?? ''"
      @close="whisperVisible = false"
      @sent="whisperVisible = false"
    />
  </view>
</template>

<style scoped lang="scss">
.other-page {
  min-height: 100vh;
  background: #F7FAF9;
}

.other-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background: transparent;
}

.other-header__back,
.other-header__more {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
}

.other-header__back--pressed,
.other-header__more--pressed {
  opacity: 0.6;
}

.other-header__back-arrow {
  font-size: 52rpx;
  color: #333A37;
  line-height: 1;
}

.other-header__more-dots {
  font-size: 36rpx;
  color: #333A37;
  line-height: 1;
}

.other-header__placeholder {
  width: 64rpx;
  height: 64rpx;
}
</style>

