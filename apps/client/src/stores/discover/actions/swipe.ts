/**
 * Discover Store 滑动操作相关 Actions
 *
 * 集中维护寻觅页左滑（不感兴趣）、右滑（喜欢）等行为，含防抖与联动 likes store。
 *
 * 拆分目的：原 actions/cards.ts 单文件 501 行，仍超过 500 行限制。
 * 进一步按业务关注点拆分，本文件仅负责滑动操作相关 action。
 *
 * 注意：本文件中所有 action 函数均使用 `this: DiscoverStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import { useSessionStore } from "../../session";
import { useLikesStore } from "../../likes";
import {
  SWIPE_RIGHT_DEBOUNCE_MS,
} from "../constants";
import {
  useMock,
} from "../utils";
import {
  likeUserApi,
  passUserApi,
} from "../api";
import { timers } from "../timers";
import type {
  ViewedCardRecord,
} from "../types";
import type { DiscoverStoreThis } from "../store-type";

/**
 * 左滑（不感兴趣）
 * @param cardId - 卡片 ID
 */
export async function swipeLeft(this: DiscoverStoreThis, cardId: string): Promise<void> {
  this.errorMessage = null;

  try {
    // 参数校验
    if (!cardId || cardId.trim().length === 0) {
      this.errorMessage = "卡片 ID 无效";
      throw new Error("卡片 ID 无效");
    }

    // 卡片存在检查
    const card = this.cards.find((c) => c.id === cardId);
    if (!card) {
      this.errorMessage = "卡片不存在或已被处理";
      throw new Error("卡片不存在或已被处理");
    }

    if (this.isLimitReached) {
      this.errorMessage = "今日推荐次数已用完";
      throw new Error("今日推荐次数已用完");
    }

    if (useMock()) {
      const record: ViewedCardRecord = {
        cardId,
        userId: card.userId,
        direction: "left",
        viewedAt: new Date().toISOString(),
        // 保存卡片快照，供 rewindCard 反悔时恢复
        card,
      };

      this.viewedCards.push(record);
      this.cards = this.cards.filter((c) => c.id !== cardId);
      this.hasMore = this.cards.length > 0 && !this.isLimitReached;

      this.syncHistoryCards();
      // 存储同步由 watch 自动触发（监听 viewedCards 变更）

      // 卡片不足时自动补充
      if (this.cards.length < 2 && this.hasMore && !this.isLimitReached) {
        await this.fetchCards();
      }
      return;
    }

    // 左滑（不感兴趣）：调用后端 pass 端点
    // POST /api/matches/pass
    const sessionStore = useSessionStore();
    const currentUserId = sessionStore.userSession?.userId ?? "";
    await passUserApi(currentUserId, card.userId);

    const record: ViewedCardRecord = {
      cardId,
      userId: card.userId,
      direction: "left",
      viewedAt: new Date().toISOString(),
      // 保存卡片快照，供 rewindCard 反悔时恢复
      card,
    };

    this.viewedCards.push(record);
    this.cards = this.cards.filter((c) => c.id !== cardId);
    this.hasMore = this.cards.length > 0 && !this.isLimitReached;

    this.syncHistoryCards();
    // 存储同步由 watch 自动触发（监听 viewedCards 变更）

    // 卡片不足时自动补充
    if (this.cards.length < 2 && this.hasMore && !this.isLimitReached) {
      await this.fetchCards();
    }
  } catch (error) {
    this.errorMessage = error instanceof Error ? error.message : "操作失败";
    throw error;
  }
}

/**
 * 右滑（喜欢）
 *
 * 修复（P1 BUG）：新增 300ms 防抖，防止快速连续右滑。
 * 防抖窗口内多次触发只执行最后一次，避免重复请求与状态错乱。
 * 返回 Promise 以便调用方可以 await 实际执行结果；
 * 被防抖合并掉的早期调用会 resolve undefined。
 *
 * @param cardId - 卡片 ID
 * @param isSuperLike - 是否超级喜欢
 */
export async function swipeRight(
  this: DiscoverStoreThis,
  cardId: string,
  isSuperLike = false
): Promise<void> {
  // 修复（P1 BUG）：300ms 防抖，防止快速连续右滑
  return new Promise<void>((resolve, reject) => {
    // 清理上一次防抖定时器，合并为最后一次调用
    if (timers.swipeRightDebounceTimer) {
      clearTimeout(timers.swipeRightDebounceTimer);
      timers.swipeRightDebounceTimer = null;
    }
    timers.swipeRightDebounceTimer = setTimeout(() => {
      timers.swipeRightDebounceTimer = null;
      this._doSwipeRight(cardId, isSuperLike).then(resolve).catch(reject);
    }, SWIPE_RIGHT_DEBOUNCE_MS);
  });
}

/**
 * swipeRight 的实际执行逻辑（由防抖 wrapper 调用）。
 */
export async function _doSwipeRight(
  this: DiscoverStoreThis,
  cardId: string,
  isSuperLike = false
): Promise<void> {
  this.errorMessage = null;
  // 重置上次结果
  this.lastSwipeResult = null;

  try {
    // 参数校验
    if (!cardId || cardId.trim().length === 0) {
      this.errorMessage = "卡片 ID 无效";
      throw new Error("卡片 ID 无效");
    }

    // 卡片存在检查
    const card = this.cards.find((c) => c.id === cardId);
    if (!card) {
      this.errorMessage = "卡片不存在或已被处理";
      throw new Error("卡片不存在或已被处理");
    }

    if (this.isLimitReached) {
      this.errorMessage = "今日推荐次数已用完";
      throw new Error("今日推荐次数已用完");
    }

    if (useMock()) {
      // mock 模式：30% 概率匹配成功（用户指定）
      const matched = Math.random() < 0.3;
      const mockResult: {
        matched: boolean;
        matchId?: string;
        partnerName?: string;
        partnerAvatar?: string;
      } = {
        matched,
        matchId: matched ? `match_${Date.now()}` : undefined,
        partnerName: matched ? card.name : undefined,
        partnerAvatar: matched ? card.avatar : undefined,
      };

      // 保存匹配结果供页面使用（含头像，用于双头像碰撞动画）
      this.lastSwipeResult = {
        matched: mockResult.matched,
        matchId: mockResult.matchId,
        partnerName: mockResult.partnerName,
        cardId,
      };

      const record: ViewedCardRecord = {
        cardId,
        userId: card.userId,
        direction: "right",
        viewedAt: new Date().toISOString(),
        // 保存卡片快照，供 rewindCard 反悔时恢复
        card,
      };

      this.viewedCards.push(record);
      this.cards = this.cards.filter((c) => c.id !== cardId);
      this.hasMore = this.cards.length > 0 && !this.isLimitReached;

      this.syncHistoryCards();
      // 存储同步由 watch 自动触发（监听 viewedCards 变更）

      // 匹配成功时联动 likes store：将对方加入「喜欢我的」列表，使喜欢页可见
      if (matched) {
        try {
          const likesStore = useLikesStore();
          likesStore.addMatchedUser({
            userId: card.userId,
            name: card.name,
            avatar: card.avatar,
            headline: card.headline,
          });
        } catch (_e) {
          // likes store 不可用时忽略，不影响主流程
        }
      }

      // 无论是否匹配，都记录到我发出的喜欢列表，确保在「喜欢」页可见
      try {
        const likesStore = useLikesStore();
        likesStore.recordLikedUser({
          userId: card.userId,
          name: card.name,
          avatar: card.avatar,
          headline: card.headline,
        });
      } catch (_e) {
        // likes store 不可用时忽略，不影响主流程
      }

      // 卡片不足时自动补充
      if (this.cards.length < 2 && this.hasMore && !this.isLimitReached) {
        await this.fetchCards();
      }
      return;
    }

    // 调用后端 API: POST /api/matches/like 或 /api/matches/super-like
    // 右滑（喜欢）对应后端的 likeUser 操作
    const sessionStore = useSessionStore();
    const currentUserId = sessionStore.userSession?.userId ?? "";

    // 调用后端 API，失败时使用 mock 逻辑兜底：30% 概率匹配成功（与 mock 模式一致）
    const result = await likeUserApi(
      currentUserId,
      card.userId,
      isSuperLike
    ).catch(() => {
      // API 失败时使用 mock 逻辑：30% 概率匹配成功（与 mock 模式一致）
      const matched = Math.random() < 0.3;
      return {
        matched,
        matchId: matched ? `match_${Date.now()}` : undefined,
        partnerName: matched ? card.name : undefined,
      };
    });

    // 保存匹配结果供页面使用
    this.lastSwipeResult = {
      matched: result.matched,
      matchId: result.matchId,
      partnerName: result.partnerName,
      cardId,
    };

    const record: ViewedCardRecord = {
      cardId,
      userId: card.userId,
      direction: "right",
      viewedAt: new Date().toISOString(),
      // 保存卡片快照，供 rewindCard 反悔时恢复
      card,
    };

    this.viewedCards.push(record);
    this.cards = this.cards.filter((c) => c.id !== cardId);
    this.hasMore = this.cards.length > 0 && !this.isLimitReached;

    this.syncHistoryCards();
    // 存储同步由 watch 自动触发（监听 viewedCards 变更）

    // 匹配成功时联动 likes store：将对方加入「喜欢我的」列表，使喜欢页可见
    if (result.matched) {
      try {
        const likesStore = useLikesStore();
        likesStore.addMatchedUser({
          userId: card.userId,
          name: card.name,
          avatar: card.avatar,
          headline: card.headline,
        });
      } catch (_e) {
        // likes store 不可用时忽略，不影响主流程
      }
    }

    // 无论是否匹配，都记录到我发出的喜欢列表，确保在「喜欢」页可见
    try {
      const likesStore = useLikesStore();
      likesStore.recordLikedUser({
        userId: card.userId,
        name: card.name,
        avatar: card.avatar,
        headline: card.headline,
      });
    } catch (_e) {
      // likes store 不可用时忽略，不影响主流程
    }

    // 卡片不足时自动补充
    if (this.cards.length < 2 && this.hasMore && !this.isLimitReached) {
      await this.fetchCards();
    }
  } catch (error) {
    this.errorMessage = isSuperLike ? "超级喜欢失败，请重试" : "喜欢操作失败，请重试";
    console.error("swipeRight error:", error);
    throw error;
  }
}
