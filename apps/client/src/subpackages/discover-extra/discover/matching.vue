<script setup lang="ts">
import { useStatusBarHeight } from "@/composables/useStatusBarHeight";

/** 状态栏高度：注入根节点 CSS 变量，供 MatchLoading 跳过按钮避让胶囊 */
const statusBarHeight = useStatusBarHeight();
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
import { ROUTES } from "../../../constants/routes";

import MatchLoading from "../../../components/match/MatchLoading.vue";

const { t } = useI18n();
const matchStore = useMatchStore();
const profileStore = useProfileStore();

const animationDone = ref(false);
const checked = ref(false);
const previewMode = ref(false);
/** 2026-08-31 修复「喜欢/超赞后返回仍停留原卡」：记录本次匹配消费的卡片，成功后从卡组移除 */
const consumedCardId = ref("");

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
      void profileStore.load().catch(() => {});
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
      consumedCardId.value = cardId;
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
  consumedCardId.value = consumedCardId.value || matchStore.pendingCardId || cardId;

  if (!profileStore.avatarUrl) {
    void profileStore.load().catch(() => {});
  }

  void matchStore.runMatchCheck().finally(() => {
    checked.value = true;
  });
});

/** 2026-08-31：喜欢/超赞成功后从寻觅卡组移除该卡，返回后即看到下一张（修复「喜欢完不切卡」） */
function consumeCardFromDeck() {
  const id = consumedCardId.value;
  if (!id) return;
  try {
    void useDiscoverStore().swipeRight(id);
  } catch (err) {
    // 卡组不存在该卡时忽略（重复消费/预览模式）
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
  animationDone.value = true;
  matchStore.markAnimationDone();
}

/**
 * 2026-08-31 待办：匹配动画阶段可点击跳过。
 * 动画未播完时点「跳过」= 快进动画（立即触发 finish，由 watch 按匹配结果跳转）；
 * 动画已播完再点「跳过」= 返回上一页（保留原语义）。
 */
function handleSkip() {
  if (!animationDone.value) {
    onAnimationFinished();
    return;
  }
  goBack();
}

onUnload(() => {
  if (matchStore.status === "idle" || matchStore.status === "failed") {
    matchStore.reset();
  }
});
</script>

<template>
  <view class="matching-page" :style="{ '--statusbar': statusBarHeight + 'px' }">
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
  top: calc(env(safe-area-inset-top) + 24rpx);
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
  color: #333A37;
  line-height: 1;
  font-weight: 500;
}
</style>