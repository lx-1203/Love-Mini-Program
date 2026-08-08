/**
 * Discover Store 卡片获取相关 Actions
 *
 * 集中维护寻觅页卡片获取与历史同步行为。
 *
 * 拆分目的：原 actions/cards.ts 单文件 501 行，仍超过 500 行限制。
 * 进一步按业务关注点拆分为：
 * - fetch.ts     卡片获取与历史同步（fetchCards / syncHistoryCards）
 * - swipe.ts     左滑 / 右滑操作（swipeLeft / swipeRight / _doSwipeRight）
 * - rewind.ts    反悔与结果重置（resetLastResult / rewindCard）
 *
 * 注意：本文件中所有 action 函数均使用 `this: DiscoverStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import { useSessionStore } from "../../session";
import type { RecommendationFilter } from "../../../services/generated/api-types-supplement";
import {
  MAX_RETRIES,
  RETRY_DELAY_MS,
} from "../constants";
import {
  filterNearby,
  mapToDiscoverCard,
  sortCards,
  useMock,
  withRetry,
} from "../utils";
import {
  fetchRecommendationsApi,
} from "../api";
import { timers } from "../timers";
import type {
  DiscoverCard,
} from "../types";
import type { DiscoverStoreThis } from "../store-type";

/**
 * 获取推荐卡片列表（带重试机制，最多2次）
 *
 * Phase C 重构：原实现区分 mock / real 两条分支（mock 用本地 mockCards 数组过滤，
 * real 调 /recommendations/people?userId=xxx）。现统一通过 clientApi.getRecommendations
 * 调度（clientApi 内部根据 appEnv.apiMode 自动分发 mock/real，mock 模式下走
 * mockFixtures.getRecommendations，real 模式下走 /recommendations?xxx query string）。
 *
 * 透传参数：recommendationFilter（筛选抽屉应用的条件对象）+ searchKeyword（搜索框输入）。
 * keyword 优先取 searchKeyword（用户输入），其次取 recommendationFilter.keyword（兜底）。
 */
export async function fetchCards(this: DiscoverStoreThis): Promise<void> {
  // 修复（P1 BUG）：取消在途的旧请求，避免竞态条件
  // 旧请求返回后会覆盖新请求的结果，导致展示错误的卡片
  if (timers.fetchCardsController) {
    try {
      timers.fetchCardsController.abort();
    } catch (_e) {
      // abort 失败时忽略
    }
    timers.fetchCardsController = null;
  }
  const controller = new AbortController();
  timers.fetchCardsController = controller;

  this.loading = true;
  this.errorMessage = null;

  try {
    // 修复（P1 BUG）：将 resetDailyLimit 移出 fetchCards。
    // 原实现 fetchCards 内部调用 resetDailyLimit 修改状态（viewedCards、hasRewoundToday 等），
    // 这违反了 fetchCards 作为「纯查询」action 的语义，
    // 也可能导致调用方在不期望的情况下触发状态重置。
    // 现由调用方（页面 onShow / 显式调用）负责 resetDailyLimit。

    await withRetry(
      async () => {
        // 修复：每次重试前检查是否已取消，避免在 abort 后继续发请求
        if (controller.signal.aborted) {
          return;
        }

        // 统一通过 clientApi.getRecommendations 获取推荐数据
        // clientApi 内部根据 appEnv.apiMode 自动分发 mock / real 模式
        const filter: RecommendationFilter = {
          ...this.recommendationFilter,
          // keyword 优先使用 searchKeyword（用户在搜索框输入的实时值），
          // 兜底使用 recommendationFilter.keyword（drawer 中预设的关键字）
          keyword: this.searchKeyword || this.recommendationFilter.keyword,
        };
        const rawData = await fetchRecommendationsApi(filter);

        // 修复：请求返回后若已被取消，跳过状态修改，避免覆盖新请求结果
        if (controller.signal.aborted) {
          return;
        }

        // 过滤掉已查看的卡片（避免重复推荐）
        const viewedIds = new Set(this.viewedCards.map((v) => v.cardId));
        let availableCards = rawData
          .map((item) => mapToDiscoverCard(item))
          .filter((card) => !viewedIds.has(card.id));

        // Mock / 本地测试兜底：如果所有卡片都被看过了，清空今日记录重新展示，
        // 避免首次体验或刷新后页面空白。生产环境（real 模式）保持业务规则不变。
        if (availableCards.length === 0 && this.viewedCards.length > 0 && useMock()) {
          this.viewedCards = [];
          this.historyCards = [];
          this.passedCards = [];
          availableCards = rawData.map((item) => mapToDiscoverCard(item));
        }

        // 匹配范围（设计需求）：附近 = 过滤距离 ≤20km；不限 = 不过滤
        if (this.matchScope === "nearby") {
          availableCards = filterNearby(availableCards);
        }

        // 同校加权：优先展示同校用户
        try {
          const sessionStore = useSessionStore();
          const myCampus = sessionStore.userSession?.campusName ?? "";
          if (myCampus) {
            const sameCampus: DiscoverCard[] = [];
            const otherCampus: DiscoverCard[] = [];
            for (const card of availableCards) {
              if (card.campusName === myCampus) {
                sameCampus.push(card);
              } else {
                otherCampus.push(card);
              }
            }
            availableCards = [...sameCampus, ...otherCampus];
          }
        } catch (_e) {
          // session store 不可用时忽略，不影响正常流程
        }

        // 排序规则（设计需求）：匹配度优先/最新注册/最活跃
        availableCards = sortCards(availableCards, this.sortBy);

        // 修复：写入前再次检查是否已取消
        if (controller.signal.aborted) {
          return;
        }

        this.cards = availableCards;
        this.hasMore = availableCards.length > 0 && !this.isLimitReached;

        // P0-31 修复：空列表时查询后端配额，区分「今日次数已用完」与「暂无推荐」。
        // 后端 recommend-quota Redis 计数与前端本地 viewedCards 不同源（前端计数仅
        // 反映本次会话滑动量，后端按拉取次数扣减），必须以服务端为准，避免配额耗尽
        // 后页面显示误导性的"暂无推荐+刷新"（刷新永远无效）。
        if (availableCards.length === 0) {
          try {
            const { clientApi } = await import("../../../services/api");
            const quota = await clientApi.getRecommendationQuota();
            this.quotaExhausted = quota.remaining !== -1 && quota.remaining <= 0;
          } catch (_e) {
            // 配额查询失败不影响主流程，保留默认 false（按"暂无推荐"展示）
            this.quotaExhausted = false;
          }
        } else {
          this.quotaExhausted = false;
        }

        // 同步更新历史记录和已拒绝记录
        this.syncHistoryCards();
      },
      MAX_RETRIES,
      RETRY_DELAY_MS
    );
  } catch (error) {
    // 修复：被取消的请求不视为错误，不更新 errorMessage
    if (controller.signal.aborted) {
      return;
    }
    this.errorMessage = error instanceof Error ? error.message : "加载推荐失败，请稍后重试";
  } finally {
    // 修复：仅当当前 controller 仍是全局 controller 时才清 loading
    // 避免新请求已发起时被旧请求的 finally 误清 loading
    if (timers.fetchCardsController === controller) {
      this.loading = false;
      timers.fetchCardsController = null;
    }
  }
}

/**
 * 同步历史记录与已拒绝记录
 */
export function syncHistoryCards(this: DiscoverStoreThis): void {
  this.historyCards = [...this.viewedCards];
  this.passedCards = this.viewedCards.filter((v) => v.direction === "left");
}
