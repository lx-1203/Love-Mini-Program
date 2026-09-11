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
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import { resolveMediaUrl } from "../../../utils/media";
import { clientApi } from "../../../services/api";
import { ROUTES } from "../../../constants/routes";
import { useSessionStore } from "../../../stores/session";
import { useReportStore } from "../../../stores/report";
import { ensureCertified } from "../../../guards/campus-gate";
import WhisperComposeSheet from "../../../components/discover/WhisperComposeSheet.vue";
import ProfileShell from "../../../components/profile/ProfileShell.vue";
import BottomSheet from "../../../components/common/BottomSheet.vue";
import { fetchPublicProfile } from "../../../api/profile";
import type { UserProfileDTO } from "../../../types/profile";
import { lightHaptic, successHaptic, errorHaptic } from "../../../utils/haptic";

const { t } = useI18n();
// R4：注入 --statusbar/--capsule-right（顶部返回钮避让状态栏）
const { styleVars: menuStyleVars } = useMenuButtonRect();
const likesStore = useLikesStore();
const sessionStore = useSessionStore();
const reportStore = useReportStore();

const targetUserId = ref("");
const profile = ref<UserProfileDTO | null>(null);
const loading = ref(false);
const errorMessage = ref("");
/** 深链缺 userId 参数：错误不可重试（2026-09-03 参数校验加固） */
const missingParam = ref(false);
const liking = ref(false);
const whisperVisible = ref(false);
/** 2026-09-02 R5：底部「更多操作」弹窗（通用 BottomSheet 演示：举报 / 拉黑 / 分享） */
const moreSheetVisible = ref(false);

function handleMoreShare() {
  moreSheetVisible.value = false;
  uni.showToast({ title: "分享入口待接入", icon: "none" });
}
function handleMoreReport() {
  moreSheetVisible.value = false;
  // 复用既有 handleReportUser（已实现举报流）
  handleReportUser();
}
function handleMoreBlock() {
  moreSheetVisible.value = false;
  // 复用既有 handleBlockUser（拉黑二次确认 → store action）
  handleBlockUser();
}

const alreadyLiked = computed(() =>
  likesStore.likes.some((item) => item.userId === targetUserId.value),
);

const isMatched = computed(() =>
  likesStore.mutualLikes.some((item) => item.userId === targetUserId.value),
);

/** 2026-09-05 R18：关注状态（后端暂无"是否已关注"查询字段，本地维护 + follow/unfollow 真实写入） */
const following = ref(false);
const followBusy = ref(false);

/** 2026-09-05 R18：最近动态帖子卡 → 村口帖子详情 */
function goPostDetail(postId: string) {
  if (!postId) return;
  lightHaptic();
  openAppPath(`${ROUTES.VILLAGE.DETAIL}?id=${encodeURIComponent(postId)}`);
}

/** 2026-09-05 R18：生活瞬间照片点击 → 自定义全屏查看层。
 *  不用 uni.previewImage：微信预览器不支持包内 /static 路径（永久加载转圈），
 *  生活瞬间多为包内装饰图，自定义层用 <image> 渲染与页面同源可靠。 */
const photoViewerVisible = ref(false);
const photoViewerSrc = ref("");

function previewPhoto(index: number) {
  const photos = profileForRender.value?.media.photos ?? [];
  const src = photos[Math.min(Math.max(index, 0), photos.length - 1)];
  if (!src) return;
  photoViewerSrc.value = resolveMediaUrl(src);
  photoViewerVisible.value = true;
}

function closePhotoViewer() {
  photoViewerVisible.value = false;
  photoViewerSrc.value = "";
}

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

/** 2026-09-05 R18：关注/取消关注切换（真实 API 写入 + 本地状态即时反馈） */
async function handleFollowToggle() {
  if (!targetUserId.value || followBusy.value) return;
  lightHaptic();
  followBusy.value = true;
  try {
    if (following.value) {
      await clientApi.unfollowUser(targetUserId.value);
      following.value = false;
      uni.showToast({ title: "已取消关注", icon: "none" });
    } else {
      await clientApi.followUser(targetUserId.value);
      following.value = true;
      successHaptic();
      uni.showToast({ title: "已关注", icon: "success" });
    }
  } catch (_e) {
    uni.showToast({ title: t("profile.otherFollowFailed"), icon: "none" });
  } finally {
    followBusy.value = false;
  }
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
    itemList: [t("chat.nav.report"), t("chat.nav.block"), following.value ? "取消关注" : t("profile.otherFollow")],
    success: (res) => {
      if (res.tapIndex === 0) {
        handleReportUser();
      } else if (res.tapIndex === 1) {
        handleBlockUser();
      } else if (res.tapIndex === 2 && targetUserId.value) {
        void handleFollowToggle();
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
    // 2026-09-03 参数校验加固：深链缺 userId 时给出明确指引（此前为笼统「暂无数据」+无效重试）
    errorMessage.value = t("profile.missingUserParam");
    missingParam.value = true;
  }
});
</script>

<template>
  <view class="other-page" :style="menuStyleVars">
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
      :retryable="!missingParam"
      :posts="profileForRender?.posts ?? []"
      :following="following"
      @retry="loadProfile"
      @like="handleLike"
      @message="handleMessage"
      @whisper="openWhisperSheet"
      @report="handleReportUser"
      @block="handleBlockUser"
      @unmatch="handleUnmatch"
      @follow="handleFollowToggle"
      @open-post="goPostDetail"
      @tap-photo="previewPhoto"
    />

    <WhisperComposeSheet
      :visible="whisperVisible"
      :user-id="targetUserId"
      :user-name="profileForRender?.basic.name ?? ''"
      @close="whisperVisible = false"
      @sent="whisperVisible = false"
    />

    <!-- 2026-09-02 R5：底部固定「更多操作」触发按钮 + BottomSheet 弹窗（演示通用组件） -->
    <view class="other-more-fab press-feedback" hover-class="press-feedback--active" role="button" aria-label="更多操作" @tap="moreSheetVisible = true">
      <text class="other-more-fab-icon">⋯</text>
    </view>

    <!-- 2026-09-05 R18：生活瞬间全屏查看层（点击遮罩关闭） -->
    <view
      v-if="photoViewerVisible"
      class="photo-viewer"
      role="button"
      aria-label="关闭大图"
      @tap="closePhotoViewer"
    >
      <image class="photo-viewer__img" :src="photoViewerSrc" mode="aspectFit" alt="" />
    </view>

    <BottomSheet
      :visible="moreSheetVisible"
      title="更多操作"
      @close="moreSheetVisible = false"
    >
      <view class="other-more-list">
        <view class="other-more-item press-feedback" hover-class="press-feedback--active" role="button" @tap="handleMoreShare">
          <text class="other-more-item-text">分享给好友</text>
        </view>
        <view class="other-more-item press-feedback" hover-class="press-feedback--active" role="button" @tap="handleMoreReport">
          <text class="other-more-item-text">举报用户</text>
        </view>
        <view class="other-more-item other-more-item--danger press-feedback" hover-class="press-feedback--active" role="button" @tap="handleMoreBlock">
          <text class="other-more-item-text other-more-item-text--danger">拉黑用户</text>
        </view>
      </view>
    </BottomSheet>
  </view>
</template>

<style scoped lang="scss">
.other-page {
  min-height: 100vh;
  background: #ffffff;
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
  /* R4：返回钮原 24rpx 起排侵入状态栏与系统文字叠印，接入 --statusbar 下移 */
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 24rpx) 28rpx 24rpx;
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

/* ========== 2026-09-02 R5：底部「更多操作」触发按钮 + BottomSheet 菜单 ========== */
.other-more-fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(env(safe-area-inset-bottom) + 200rpx);
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #36C99A;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(54, 201, 154, 0.32);
  z-index: 100;
}

.other-more-fab-icon {
  color: #ffffff;
  font-size: 48rpx;
  font-weight: 800;
  line-height: 1;
}

.other-more-list {
  padding: 8rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
}

.other-more-item {
  padding: 32rpx 16rpx;
  border-bottom: 1rpx solid #F2F5F3;
  display: flex;
  align-items: center;
}

.other-more-item:last-child {
  border-bottom: none;
}

.other-more-item-text {
  font-size: 30rpx;
  color: #1A1E1C;
}

.other-more-item-text--danger {
  color: #FF6B81;
}

/* ========== 2026-09-05 R18：生活瞬间全屏查看层 ========== */
.photo-viewer {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-viewer__img {
  width: 100%;
  height: 80vh;
}
</style>

