<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useMatchStore } from "../../../stores/match";
import { useDiscoverStore } from "../../../stores/discover";
import { clientApi } from "../../../services/api";
import { mapToDiscoverCard } from "../../../stores/discover/utils";
import { toMatchCardUser } from "../../../view-models/match";
import type { MatchCardUser } from "../../../types/match";
import { useProfileStore } from "../../../stores/profile";
import { IMAGE_PATHS } from "../../../config/images";
import { isDev } from "../../../config/env";
// MP-R2-MATCHING-002：统一媒体出口
import { resolveMediaUrl } from "../../../utils/media";
import { ROUTES } from "../../../constants/routes";

import MatchLoading from "../../../components/match/MatchLoading.vue";
// R11-G2：注入 --statusbar（本页样式使用 var(--statusbar, env(...))，DevTools env 恒 0 必须由 JS 注入）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();
const matchStore = useMatchStore();
const profileStore = useProfileStore();

// MP-R2-MATCHING-009：删除本地 animationDone 双真值（原与 store 份靠双写同步）
const checked = ref(false);
const previewMode = ref(false);
/** 2026-08-31 修复「喜欢/超赞后返回仍停留原卡」：记录本次匹配消费的卡片，成功后从卡组移除 */
const consumedCardId = ref("");

const partner = computed(() => matchStore.matchedUser);
// MP-R2-MATCHING-002 (P1)：双头像必须经统一媒体出口 resolveMediaUrl——服务端原始
// 相对路径（/uploads/...）被 mp-weixin 当包内文件且 <image> 无法携带鉴权头，
// real 模式渲染空圆（与 match-success.vue MP-R1-...-002 同机理）
const myAvatar = computed(
  () => resolveMediaUrl(profileStore.avatarUrl) || resolveMediaUrl(IMAGE_PATHS.DEFAULT_AVATAR),
);
const partnerAvatar = computed(
  () =>
    resolveMediaUrl(partner.value?.avatar || partner.value?.photo || "") ||
    resolveMediaUrl(IMAGE_PATHS.DEFAULT_AVATAR),
);

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
  () => [matchStore.status, matchStore.animationDone] as const,
  ([status, animated]) => {
    if (!checked.value || !animated || previewMode.value) return;
    if (status === "matched") {
      consumeCardFromDeck();
      redirectToSuccess();
    } else if (status === "idle") {
      // 发送成功：先消费卡组（返回后自动切到下一张），再提示并返回
      consumeCardFromDeck();
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

  // 2026-08-25 P1：dev-preview=1 直接停在匹配中页（QA 复验入口，规格书 06）
  if (String(q["dev-preview"]) === "1") {
    previewMode.value = true;
    matchStore.beginCheck(
      { userId: "dev-preview", id: "dev-preview", name: "星野", photo: IMAGE_PATHS.AVATARS.AVATAR_1, avatar: IMAGE_PATHS.AVATARS.AVATAR_1 } as MatchCardUser,
      "dev-preview",
      "like"
    );
    if (!profileStore.avatarUrl) {
      void profileStore.load().catch((e) => {
        if (isDev) console.warn("[matching] profile.load 失败:", e);
      });
    }
    return;
  }

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
        matchStore.setMatchedUser(user);
      }
    });
    if (!profileStore.avatarUrl) {
      void profileStore.load().catch((e) => {
        if (isDev) console.warn("[matching] profile.load 失败:", e);
      });
    }
    return;
  }

  if (!matchStore.pendingCardId || !matchStore.pendingAction) {
    // 2026-08-18：支持 URL query 直达（自动化验收/分享恢复）——
    // 由 userId/cardId/action 初始化匹配上下文，并异步拉取对方资料。
    if (cardId && action && userId) {
      consumedCardId.value = cardId;
      matchStore.beginCheck(
        { userId, id: cardId, name: "TA", photo: "", avatar: "" } as MatchCardUser,
        cardId,
        action as "like" | "superLike"
      );
      void loadPartnerProfile(userId).then((user) => {
        if (user) {
          matchStore.setMatchedUser(user);
        }
      });
    } else {
      // 页面刷新兜底：直接回退，避免死页。
      setTimeout(() => goBack(), 200);
      return;
    }
  }
  consumedCardId.value = consumedCardId.value || matchStore.pendingCardId || cardId;

  if (!profileStore.avatarUrl) {
    void profileStore.load().catch((e) => {
        if (isDev) console.warn("[matching] profile.load 失败:", e);
      });
  }

  void matchStore.runMatchCheck().finally(() => {
    checked.value = true;
  });
});

/**
 * 2026-08-31：喜欢/超赞成功后从寻觅卡组移除该卡，返回后即看到下一张（修复「喜欢完不切卡」）。
 * MP-R1-PAGES-DISCOVER-INDEX-001 / MATCHING-001/002（2026-09-20）：
 * 卡片在 runMatchCheck 内已被 swipeRight 消费移除，此前二次 swipeRight
 * 触发「卡片不存在或已被处理」误报横幅 + 未处理 Promise 拒绝。现：
 * ① 先查 discoverStore 中该 id 是否仍存在，不存在直接 return（幂等）；
 * ② swipeRight 改 await + try/catch，竞态期「卡片不存在」按幂等成功处理
 *   （不回填 errorMessage、不上报）。
 */
async function consumeCardFromDeck() {
  const id = consumedCardId.value;
  if (!id) return;
  const discoverStore = useDiscoverStore();
  if (!discoverStore.cards.some((c) => c.id === id)) return;
  try {
    await discoverStore.swipeRight(id);
  } catch (_e) {
    // 卡已被消费/移除（「卡片不存在」）→ 幂等成功：不 set errorMessage、不上报
  }
}

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
  matchStore.markAnimationDone();
}

/**
 * 2026-08-31 待办：匹配动画阶段可点击跳过。
 * 动画未播完时点「跳过」= 快进动画（立即触发 finish，由 watch 按匹配结果跳转）；
 * 动画已播完再点「跳过」= 返回上一页（保留原语义）。
 */
function handleSkip() {
  if (!matchStore.animationDone) {
    onAnimationFinished();
    return;
  }
  goBack();
}

// MP-R2-MATCHING-007：onUnload 无条件复位本页独占的匹配状态机——原仅 idle/failed 复位，
// previewMode 两入口与「check 完成前退出」时 status 停在 checking/matched，
// 残留 pendingCardId 会使下次进入绕过 200ms 兜底 → 对已消费卡 swipeRight → 误报错误
onUnload(() => {
  matchStore.reset();
});
</script>

<template>
  <view class="matching-page" :style="menuStyleVars">
    <!-- 2026-08-25 P0：顶部左上返回箭头（规格书 06.1） -->
    <view class="matching-page__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.back')" @tap="goBack">
      <text class="matching-page__back-icon">‹</text>
    </view>
    <MatchLoading
      :my-avatar="myAvatar"
      :partner-avatar="partnerAvatar"
      :partner-name="partner?.name ?? ''"
      @finished="onAnimationFinished"
      @skip="handleSkip"
    />
  </view>
</template>

<style scoped lang="scss">
.matching-page {
  position: relative;
  min-height: 100%;
  background: #f4fbf8;
}

.matching-page__back {
  position: fixed;
  top: calc(var(--statusbar, env(safe-area-inset-top)) + 24rpx);
  left: 24rpx;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.matching-page__back-icon {
  font-size: 48rpx;
  color: var(--c-text-primary, #333A37);
  line-height: 1;
  font-weight: 500;
}
</style>