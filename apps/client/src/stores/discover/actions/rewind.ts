/**
 * Discover Store 反悔与结果重置相关 Actions
 *
 * 集中维护寻觅页反悔上一张卡片（rewind）、清除上次滑动结果等行为。
 *
 * 拆分目的：原 actions/cards.ts 单文件 501 行，仍超过 500 行限制。
 * 进一步按业务关注点拆分，本文件仅负责反悔与结果重置相关 action。
 *
 * 注意：本文件中所有 action 函数均使用 `this: DiscoverStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import { useSessionStore } from "../../session";
import {
  MAX_UNDO_COUNT_PER_SESSION,
} from "../constants";
import {
  useMock,
} from "../utils";
import {
  rewindCardApi,
} from "../api";
import type { DiscoverStoreThis } from "../store-type";

/**
 * 清除上次滑动结果
 */
export function resetLastResult(this: DiscoverStoreThis): void {
  this.lastSwipeResult = null;
}

/**
 * 反悔上一张卡片（rewind）
 *
 * Phase C 重构：mock 模式原通过 mockCards.find 查找卡片数据，
 * 现改为从 viewedCards 末尾的 card 快照恢复，避免依赖本地 mockCards 数组
 * （fetchCards 已切换到 clientApi.getRecommendations，mockCards 已移除）。
 *
 * 修复（P1 BUG）：新增 undoCount 客户端计数器，限制单次会话最多 3 次 rewind。
 * 原实现 real 模式无客户端次数限制，完全依赖后端，
 * 用户可能通过反复 rewind 刷卡片影响推荐算法。
 *
 * @param cardId - 要反悔的卡片 ID
 */
export async function rewindCard(this: DiscoverStoreThis, cardId: string): Promise<void> {
  this.errorMessage = null;

  try {
    // 修复（P1 BUG）：客户端 rewind 次数限制（最多 3 次/会话）
    if (this.undoCount >= MAX_UNDO_COUNT_PER_SESSION) {
      this.errorMessage = `本次会话挽回次数已用完（最多${MAX_UNDO_COUNT_PER_SESSION}次）`;
      throw new Error(this.errorMessage);
    }

    if (useMock()) {
      if (this.hasRewoundToday) {
        throw new Error("每日只能挽回一次");
      }

      const lastViewed = this.viewedCards[this.viewedCards.length - 1];
      if (!lastViewed || lastViewed.cardId !== cardId) {
        throw new Error("只能挽回最后一张卡片");
      }

      // 从 viewedCards 末尾的快照恢复卡片数据
      const card = lastViewed.card;
      if (!card) {
        throw new Error("卡片不存在");
      }

      this.viewedCards.pop();
      this.cards.unshift(card);
      this.hasMore = true;
      this.hasRewoundToday = true;
      // 修复（P1 BUG）：rewind 次数计数器累加
      this.undoCount += 1;

      this.syncHistoryCards();
      // 存储同步由 watch 自动触发（监听 viewedCards/hasRewoundToday 变更）
      return;
    }

    // 反悔操作：调用后端 rewind 端点
    // POST /api/matches/rewind
    const sessionStore = useSessionStore();
    const currentUserId = sessionStore.userSession?.userId ?? "";
    await rewindCardApi(currentUserId);

    // 从已查看列表中移除最后一条记录，并取出卡片快照
    const lastViewed = this.viewedCards[this.viewedCards.length - 1];
    if (lastViewed && lastViewed.cardId === cardId) {
      this.viewedCards.pop();
    }

    // 优先使用 viewedCards 中的卡片快照恢复到列表头部
    if (lastViewed?.card) {
      this.cards.unshift(lastViewed.card);
    } else {
      // 快照缺失时（旧数据兼容），尝试在当前 cards 列表中查找
      const card = this.cards.find((c) => c.id === cardId);
      if (!card) {
        // 如果卡片不在当前列表中，需要重新获取
        await this.fetchCards();
      }
    }

    this.hasMore = true;
    this.hasRewoundToday = true;
    // 修复（P1 BUG）：rewind 次数计数器累加（后端成功后）
    this.undoCount += 1;
    this.syncHistoryCards();
    // 存储同步由 watch 自动触发（监听 viewedCards/hasRewoundToday 变更）
  } catch (error) {
    this.errorMessage = error instanceof Error ? error.message : "挽回失败";
    throw error;
  }
}
