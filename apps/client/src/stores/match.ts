import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { useDiscoverStore } from "./discover";
import type {
  MatchActionType,
  MatchCardUser,
  MatchStatus,
} from "../types/match";

/**
 * 寻觅 V1 匹配流程状态机。
 *
 * 页面只消费 status / canProceed / matchedUser；
 * 喜欢/超级喜欢确认接口统一由 runMatchCheck 驱动，
 * 动画完成由 MatchLoading 组件发出 finished 后调用 markAnimationDone。
 */
export const useMatchStore = defineStore("match", () => {
  const status = ref<MatchStatus>("idle");
  const matchedUser = ref<MatchCardUser | null>(null);
  const pendingAction = ref<MatchActionType | null>(null);
  const pendingCardId = ref<string | null>(null);
  const animationDone = ref(false);
  const lastError = ref<string | null>(null);

  const canProceed = computed(
    () => status.value === "matched" && animationDone.value
  );

  function beginCheck(
    user: MatchCardUser,
    cardId: string,
    action: MatchActionType
  ): void {
    matchedUser.value = user;
    pendingCardId.value = cardId;
    pendingAction.value = action;
    animationDone.value = false;
    lastError.value = null;
    status.value = "checking";
  }

  async function runMatchCheck(): Promise<void> {
    if (!pendingCardId.value || !pendingAction.value) {
      lastError.value = "缺少匹配卡片信息";
      status.value = "failed";
      return;
    }

    status.value = "checking";
    lastError.value = null;
    try {
      const discoverStore = useDiscoverStore();
      await discoverStore.swipeRight(
        pendingCardId.value,
        pendingAction.value === "superLike"
      );
      const result = discoverStore.lastSwipeResult;
      // 单向喜欢是正常结果，回到 idle；只有接口异常才 failed。
      status.value = result?.matched ? "matched" : "idle";
    } catch (error) {
      lastError.value =
        error instanceof Error ? error.message : "匹配确认失败";
      status.value = "failed";
    }
  }

  function markAnimationDone(): void {
    animationDone.value = true;
  }

  function markChatReady(): void {
    if (status.value === "matched") {
      status.value = "chat_ready";
    }
  }

  function reset(): void {
    status.value = "idle";
    matchedUser.value = null;
    pendingAction.value = null;
    pendingCardId.value = null;
    animationDone.value = false;
    lastError.value = null;
  }

  return {
    status,
    matchedUser,
    pendingAction,
    pendingCardId,
    animationDone,
    lastError,
    canProceed,
    beginCheck,
    runMatchCheck,
    markAnimationDone,
    markChatReady,
    reset,
  };
});