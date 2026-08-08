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
  MOCK_MATCH_PROBABILITY,
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
  DiscoverCard,
  ViewedCardRecord,
} from "../types";
import type { DiscoverStoreThis } from "../store-type";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";

/**
 * 左滑（不感兴趣）
 * @param cardId - 卡片 ID
 */
export async function swipeLeft(this: DiscoverStoreThis, cardId: string): Promise<void> {
  this.errorMessage = null;

  try {
    // 参数校验
    if (!cardId || cardId.trim().length === 0) {
      this.errorMessage = t("storeErrors.discover.cardIdInvalid");
      throw new Error(t("storeErrors.discover.cardIdInvalid"));
    }

    // 修复（R4-00177）：同一卡片在右滑防抖窗口内又左滑（手势冲突），
    // 以最后手势为准——从幂等队列中移除该卡片的待执行右滑并以「已取消」
    // 语义 settle 其调用方，避免延迟的 like 与本次左滑互相矛盾。
    if (timers.swipeRightQueue) {
      const pendingIdx = timers.swipeRightQueue.findIndex((item) => item.cardId === cardId);
      if (pendingIdx >= 0) {
        const [pending] = timers.swipeRightQueue.splice(pendingIdx, 1);
        if (pending) {
          pending.resolvers.forEach((r) => r());
        }
      }
    }

    // 卡片存在检查
    const card = this.cards.find((c) => c.id === cardId);
    if (!card) {
      this.errorMessage = t("storeErrors.discover.cardNotFound");
      throw new Error(t("storeErrors.discover.cardNotFound"));
    }

    if (this.isLimitReached) {
      this.errorMessage = t("storeErrors.discover.recommendQuotaExhausted");
      throw new Error(t("storeErrors.discover.recommendQuotaExhausted"));
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
 * 修复（P1 BUG + R4-00177）：300ms 防抖窗口内的「幂等队列」而非「最后一击」防抖。
 * 原实现的缺陷：
 * 1. 快速「右滑 A→右滑 B」时只执行最后一次，前次右滑被静默丢弃（喜欢操作丢失）；
 * 2. 快速「右滑 A→左滑 B」时，A 的 like 延迟 300ms 后执行，而卡片已被左滑/刷新
 *    移除，报「卡片不存在」误错。
 * 现行为：
 * - 同一卡片窗口内重复触发 → 合并到同一队列项（幂等，不重复请求后端），
 *   全部调用方 await 同一个执行结果；
 * - 不同卡片窗口内触发 → 各自入队，flush 时逐张执行（不再丢弃早先的喜欢）；
 * - 入队时快照卡片，执行时卡片已移除则按快照兜底（不再误报「卡片不存在」）。
 *
 * @param cardId - 卡片 ID
 * @param isSuperLike - 是否超级喜欢
 */
export async function swipeRight(
  this: DiscoverStoreThis,
  cardId: string,
  isSuperLike = false
): Promise<void> {
  // 参数校验提前（与 _doSwipeRight 保持一致，避免无效参数进入队列）
  if (!cardId || cardId.trim().length === 0) {
    this.errorMessage = t("storeErrors.discover.cardIdInvalid");
    throw new Error(t("storeErrors.discover.cardIdInvalid"));
  }

  return new Promise<void>((resolve, reject) => {
    const queue = timers.swipeRightQueue ?? [];

    // 同一卡片已在窗口内排队（重复触发）：合并到已有项，等待同一执行结果
    const existing = queue.find((item) => item.cardId === cardId);
    if (existing) {
      existing.resolvers.push(resolve);
      existing.rejecters.push(reject);
      return;
    }

    // 防抖窗口内快照卡片（修复 R4-00177：执行时卡片可能已被左滑/刷新移除）
    const card = this.cards.find((c) => c.id === cardId) ?? null;
    queue.push({
      cardId,
      isSuperLike,
      card,
      resolvers: [resolve],
      rejecters: [reject],
    });
    timers.swipeRightQueue = queue;

    // 重置防抖定时器：窗口内新卡片入队则重新计时，窗口结束统一逐张 flush
    if (timers.swipeRightDebounceTimer) {
      clearTimeout(timers.swipeRightDebounceTimer);
    }
    timers.swipeRightDebounceTimer = setTimeout(() => {
      timers.swipeRightDebounceTimer = null;
      const batch = timers.swipeRightQueue;
      timers.swipeRightQueue = null;
      if (!batch || batch.length === 0) return;
      void this._flushSwipeRightQueue(batch);
    }, SWIPE_RIGHT_DEBOUNCE_MS);
  });
}

/**
 * 逐张执行防抖窗口内排队的右滑（串行，避免并发状态竞争）。
 */
export async function _flushSwipeRightQueue(
  this: DiscoverStoreThis,
  batch: Array<{
    cardId: string;
    isSuperLike: boolean;
    card: DiscoverCard | null;
    resolvers: Array<() => void>;
    rejecters: Array<(reason?: unknown) => void>;
  }>
): Promise<void> {
  for (const item of batch) {
    try {
      await this._doSwipeRight(item.cardId, item.isSuperLike, item.card);
      item.resolvers.forEach((r) => r());
    } catch (error) {
      item.rejecters.forEach((r) => r(error));
    }
  }
}

/**
 * swipeRight 的实际执行逻辑（由防抖窗口的幂等队列 flush 调用）。
 *
 * @param cardId - 卡片 ID
 * @param isSuperLike - 是否超级喜欢
 * @param cardSnapshot - 入队时的卡片快照（可选；卡片已被移除时按快照执行）
 */
export async function _doSwipeRight(
  this: DiscoverStoreThis,
  cardId: string,
  isSuperLike = false,
  cardSnapshot?: DiscoverCard | null
): Promise<void> {
  this.errorMessage = null;
  // 重置上次结果
  this.lastSwipeResult = null;

  try {
    // 参数校验
    if (!cardId || cardId.trim().length === 0) {
      this.errorMessage = t("storeErrors.discover.cardIdInvalid");
      throw new Error(t("storeErrors.discover.cardIdInvalid"));
    }

    // 卡片存在检查：优先取快照（修复 R4-00177：防抖窗口内卡片可能已被
    // 左滑/刷新移除，此时按快照继续执行，不再误报「卡片不存在」）
    const card = cardSnapshot ?? this.cards.find((c) => c.id === cardId) ?? null;
    if (!card) {
      this.errorMessage = t("storeErrors.discover.cardNotFound");
      throw new Error(t("storeErrors.discover.cardNotFound"));
    }

    if (this.isLimitReached) {
      this.errorMessage = t("storeErrors.discover.recommendQuotaExhausted");
      throw new Error(t("storeErrors.discover.recommendQuotaExhausted"));
    }

    if (useMock()) {
      // SubTask 5.1.4：Mock 匹配概率配置化，默认关闭（MOCK_MATCH_PROBABILITY=0）。
      // 如需在 mock 模式下模拟匹配，可在 .env 中设置 VITE_MOCK_MATCH_PROBABILITY=0.3
      const matched = Math.random() < MOCK_MATCH_PROBABILITY;
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

    // SubTask 5.1.1：移除 Mock fallback，API 失败向上抛异常。
    //
    // 历史 BUG：原实现使用 `.catch(() => Math.random() < 0.3)` 兜底返回 mock
    // 匹配结果，掩盖了真实接口故障（网络异常/服务端 5xx/超时等），导致：
    // 1. 用户在弱网或后端故障时仍看到"匹配成功"的虚假反馈，引发后续聊天链路错乱；
    // 2. 监控系统无法捕获真实失败率，无法触发告警；
    // 3. 违反商业化项目"真实链路"要求（spec.md P5 Task 5.1.1）。
    //
    // 修复：直接 await likeUserApi，失败时异常向上抛出，
    // 由调用方（页面/组件）展示错误提示并保留卡片在栈顶供用户重试。
    const result = await likeUserApi(
      currentUserId,
      card.userId,
      isSuperLike
    );

    // 保存匹配结果供页面使用
    // 修复（P0-11）：partnerName 以卡片数据为准——后端 HeartSignalView.fromUserName
    // 是信号发起方（userA）昵称，本端右滑后可能是自己，不能作为「对方昵称」展示
    this.lastSwipeResult = {
      matched: result.matched,
      matchId: result.matchId,
      partnerName: result.matched ? card.name : undefined,
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
    // 修复（P1 BUG）：原固定文案覆盖了具体错误信息（超时/5xx/参数错误无法区分）。
    // 现优先透传具体错误 message，仅在无法提取时使用兜底文案。
    this.errorMessage = error instanceof Error && error.message
      ? error.message
      : isSuperLike
        ? "超级喜欢失败，请重试"
        : "喜欢操作失败，请重试";
    console.error("swipeRight error:", error);
    throw error;
  }
}
