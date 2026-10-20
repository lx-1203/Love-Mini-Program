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

/** MP-R1-REQ23-003：Hero 大头像 tapAvatar 全链 emit 此前页面未绑定（死按钮）——
 *  最小合理行为：查看大图（复用 photoViewer，与本人主页头像查看大图同语义） */
function previewAvatar() {
  const avatar = profileForRender.value?.basic.avatar;
  if (!avatar) return;
  photoViewerSrc.value = resolveMediaUrl(avatar);
  photoViewerVisible.value = true;
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
    // R12-IND-PROFILE-OTHER-001：区分鉴权失败与加载失败，避免深链 401 被笼统渲染
    const errStatus =
      error !== null && typeof error === "object"
        ? (error as { status?: unknown; http_status?: unknown }).status ??
          (error as { http_status?: unknown }).http_status
        : undefined;
    errorMessage.value =
      errStatus === 401
        ? t("apiErrors.loginRequired")
        : error instanceof Error
          ? error.message
          : t("common.networkError");
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
  // MP-R1-OTHER-001：已喜欢态去重——重复点喜欢不再发请求、不再反复弹「已喜欢」成功 Toast
  if (alreadyLiked.value) {
    // MP-R2-OTHER-002：matched 态重复点喜欢不再弹「匹配成功」modal/错误 toast
    if (isMatched.value) {
      uni.showToast({ title: t("profile.other.likeWaiting"), icon: "none" });
    }
    return;
  }
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
  // MP-R1-REQ23-002：互喜态在 ActionSheet 追加「取消匹配」——handleUnmatch 完整实现
  // （modal 二次确认 → unlikeUser → 刷新）但 GovernanceMenu 死代码永不渲染、
  // ··· 菜单仅举报/拉黑/关注三项，互喜用户在本页无法解除匹配（PO18 取证确认入口不存在）
  const items: string[] = [t("chat.nav.report"), t("chat.nav.block"), following.value ? "取消关注" : t("profile.otherFollow")];
  const unmatchIndex = isMatched.value ? items.length : -1;
  if (isMatched.value) items.push("取消匹配");
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      if (res.tapIndex === 0) {
        handleReportUser();
      } else if (res.tapIndex === 1) {
        handleBlockUser();
      } else if (res.tapIndex === 2 && targetUserId.value) {
        void handleFollowToggle();
      } else if (unmatchIndex >= 0 && res.tapIndex === unmatchIndex) {
        handleUnmatch();
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
        <view class="other-header__back-circle">
          <text class="other-header__back-arrow">‹</text>
        </view>
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
        <view class="other-header__more-circle">
          <text class="other-header__more-dots">···</text>
        </view>
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
      @tap-avatar="previewAvatar"
    />

    <WhisperComposeSheet
      :visible="whisperVisible"
      :user-id="targetUserId"
      :user-name="profileForRender?.basic.name ?? ''"
      @close="whisperVisible = false"
      @sent="whisperVisible = false"
    />

    <!-- R2b-B30/D23（位置）：此处原有一枚 96rpx 品牌绿实心「⋯」悬浮按钮（FAB），
         压在底栏上方 200rpx 的内容区右下，与页面自有底部动作条（ProfileShell →
         RelationshipCTA fixed bottom:0）叠层，且是顶栏「···」的重复入口——同一页两个
         更多入口。理想图 他人显示主页.png 裁决：全页唯一「···」入口在封面右上角，
         页面右侧与底栏上方不得有悬浮按钮。顶栏避让已在 D17 修好（入口可见可点），
         故按审计建议删除该 FAB，连同仅由它触发的 BottomSheet（举报/拉黑顶栏
         openGovernanceMenu 已覆盖；分享为「入口待接入」空桩，不保留死壳）。 -->

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
  </view>
</template>

<style scoped lang="scss">
/* MP-R1-OTHER-004：整块样式收敛到设计 token（原裸 hex 不随深色主题切换） */
.other-page {
  min-height: 100vh;
  background: var(--c-bg-container, #ffffff);
}

/* R6-B58/D05（可达性 P1，2026-10-20）：原 `position: absolute` 挂在 .other-page 上、
   随整页滚出（帧实测：bottom 帧 x=8..60 / y=46..105 内返回钮亮/暗像素 = 0，只剩状态栏
   字点；两帧 sha16 不同、姓名字形从 y=362 移到 y≈35 ⇒ 实际滚动 ≈320px）⇒ 滚到底后本页
   0 个返回入口，右上「···」（举报/拉黑/关注唯一入口）也一并离屏。
   按 defect 建议改法第一条把整条头改 `position: fixed`，沿用同一条已验证避让配方
   （--statusbar / --capsule-right，同域 pages/messages/index.vue .header、
   campus/campus/hub.vue 头部口径）；z-index 30 已高于 ProfileShell 内容层，
   圆底用 --c-overlay-bg-light 半透明白（滚到白卡上仍可辨，见 D13 同域取值）。 */
.other-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* R4：返回钮原 24rpx 起排侵入状态栏与系统文字叠印，接入 --statusbar 下移。
     R2b-B30/D17（层级遮挡）：右内边距此前只有 28rpx，未给微信右上角原生胶囊预留宽度，
     .other-header__more（64rpx 圆底「···」，举报/拉黑唯一入口）整枚压在胶囊下——首屏
     只见系统胶囊、入口不可见不可点。避让配方直接复用同域 match-success.vue 的
     .success-nav（padding-right: calc(var(--capsule-right, 7px) + 104px)）这一条已验证
     正确的口径，不新造数字：--capsule-right 由本文件顶部 useMenuButtonRect 在根节点
     实测注入（胶囊右缘间隙，H5/非小程序端为 0），7px 是测量前的静态兜底，104px 是胶囊
     本体缓冲；pages/messages/index.vue 的 .header、subpackages/campus/campus/hub.vue
     头部同一条配方。左内边距 28rpx→16rpx：R6-B58/D05 同批把热区撑到 88rpx 后，
     圆底（64rpx）在热区内居中，左右各差 12rpx，减掉这 12rpx 让圆底左缘仍落在 28rpx。 */
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 24rpx) calc(var(--capsule-right, 7px) + 104px) 24rpx 16rpx;
  background: transparent;
}

.other-header__back,
.other-header__more {
  /* R6-B58/D05 同批 + R6-B55/D17 点名的同域顺手项：热区提到 88rpx（仓内口径
     AppShell.vue:334），64rpx 半透明白圆底移进 __circle，视觉尺寸一格不动。 */
  width: 88rpx;
  height: 88rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* R7-L10-D01（可达性 P1，R6-B58/D01 已批未落地，2026-10-21 重做）：头图是深色照片
   （帧实测 y=26..86 lum 69..119），而这两枚控件原为"深灰字形 + 20% 白圆底"——
   ① 箭头 color 取 --c-text-primary(#1A1E1C) 深字压深图，实测热区 x=4..70/y=26..86 内
      连一个 lum<190 的字形像素都没有，对比度≈1:1；
   ② 圆底 --c-overlay-bg-light 真值 rgba(255,255,255,0.2)（design-variables.scss:739），
      实测 x≈232..268/y≈62..96 只比背景亮约 30，「···」（举报/拉黑/关注唯一入口）不可辨。
   上一轮按"提白底浓度"方向没落地：白字 + 半透明白底本身互撞（0.6 白底上的白字仍≈1.6:1）。
   这轮按 defect 建议的反色令牌方向做实：圆底换深色遮罩档 --c-overlay-strong
   （rgba(15,23,42,0.7)，:730）+ --c-overlay-border-stronger（:737）描一圈，字形换
   --c-text-inverse（rgba(255,255,255,0.95)，:749）——深色芯片在任何底色（深头图 /
   头部 position:fixed 滚到白卡上，见 R6-B58/D05）上都能同时保住"圆底可辨 + 字形可辨"。 */
.other-header__back-circle,
.other-header__more-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--c-overlay-strong);
  border: 2rpx solid var(--c-overlay-border-stronger);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.other-header__back--pressed,
.other-header__more--pressed {
  opacity: 0.6;
}

.other-header__back-arrow {
  font-size: 52rpx;
  color: var(--c-text-inverse);
  line-height: 1;
}

.other-header__more-dots {
  font-size: 36rpx;
  color: var(--c-text-inverse);
  line-height: 1;
}

.other-header__placeholder {
  /* 与 .other-header__more 同宽的占位（无 userId 时保持 space-between 几何不跳） */
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
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

