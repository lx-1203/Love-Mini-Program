/**
 * Discover Store 实现入口
 *
 * 寻觅页 Store 主体实现：管理推荐卡片、滑动操作、每日限量、时间门控和回看功能。
 *
 * 模块拆分结构：
 * - ./types        类型定义
 * - ./constants    常量（DAILY_LIMIT_TOTAL / SAVE_DEBOUNCE_MS 等）
 * - ./utils        工具函数（mapToDiscoverCard / withRetry / 本地存储）
 * - ./api          API 调用函数（passUserApi / likeUserApi 等）
 * - ./index.ts     本文件：store 主体实现
 *
 * 通过 stores/discover.ts re-export，保持外部 import 路径完全兼容：
 *   import { useDiscoverStore } from "@/stores/discover";
 */

import { defineStore } from "pinia";
import { watch } from "vue";
import { useSessionStore } from "../session";
import { useLikesStore } from "../likes";
import type { RecommendationFilter } from "../../services/generated/api-types-supplement";
import {
  DAILY_LIMIT_TOTAL,
  EMPTY_RECOMMENDATION_FILTER,
  MAX_RETRIES,
  MAX_UNDO_COUNT_PER_SESSION,
  RETRY_DELAY_MS,
  SAVE_DEBOUNCE_MS,
  SEARCH_DEBOUNCE_MS,
  SWIPE_RIGHT_DEBOUNCE_MS,
} from "./constants";
import {
  getNextNoonString,
  getTodayString,
  loadDailyRecord,
  mapToDiscoverCard,
  saveDailyRecord,
  useMock,
  withRetry,
} from "./utils";
import {
  fetchOnlineStatusApi,
  fetchRecommendationHistoryApi,
  fetchRecommendationsApi,
  likeUserApi,
  passUserApi,
  rewindCardApi,
} from "./api";
import type {
  DiscoverCard,
  DiscoverState,
  SwipeDirection,
  ViewedCardRecord,
} from "./types";

// 保留 re-export 以便外部旧 import 路径仍能从 "@/stores/discover" 取到这些符号
export * from "./types";
export * from "./constants";
export * from "./utils";
export * from "./api";

/**
 * 防抖存储定时器（模块级单例）
 * 重构说明：采用模块级变量而非 state 字段，原因：
 * 1. 定时器句柄不属于业务状态，不应被响应式追踪
 * 2. 避免被序列化到本地存储造成污染
 * 3. Pinia store 为单例，模块级变量可保证全局唯一性
 */
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 搜索防抖定时器（模块级单例）
 * 与 saveTimer 同理，避免被响应式追踪和序列化污染。
 */
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 右滑防抖定时器（模块级单例）。
 *
 * 修复（P1 BUG）：用于 swipeRight 300ms 防抖，避免快速连续右滑。
 * 模块级单例保证全局唯一，dispose 时清理。
 */
let swipeRightDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 当前 fetchCards 请求的 AbortController。
 *
 * 修复（P1 BUG）：原 fetchCards 未处理 abort，新请求发起时旧请求仍在途，
 * 旧请求返回后可能覆盖新请求的结果（竞态条件）。
 * 现保存当前请求的 controller，新请求发起前 abort 旧请求，
 * 旧请求的 catch 分支通过 signal.aborted 判断跳过状态修改。
 */
let fetchCardsController: AbortController | null = null;

/**
 * 寻觅页 Store
 *
 * 管理推荐卡片、滑动操作、每日限量、时间门控和回看功能。
 */
const _useDiscoverStore = defineStore("discover", {
  state: (): DiscoverState => {
    const record = loadDailyRecord();
    return {
      cards: [],
      dailyLimit: DAILY_LIMIT_TOTAL,
      extraQuota: 0,
      viewedCards: record?.viewedCards ?? [],
      historyCards: [],
      passedCards: [],
      lastRefreshTime: record?.lastRefreshTime ?? null,
      nextRefreshTime: getNextNoonString(),
      hasRewoundToday: record?.hasRewoundToday ?? false,
      hasMore: true,
      loading: false,
      errorMessage: null,
      onlineStatusMap: {},
      lastSwipeResult: null,
      activeFilter: "nearby",
      recommendationFilter: { ...EMPTY_RECOMMENDATION_FILTER },
      isFilterDrawerOpen: false,
      searchKeyword: "",
      // 修复（P1 BUG）：rewind 次数计数器，初始化为 0
      undoCount: 0,
      // 功能6：高级筛选状态，初始化为空（所有高级字段均为 undefined）
      advancedFilter: { ...EMPTY_RECOMMENDATION_FILTER },
    };
  },

  getters: {
    /** 当前展示的卡片（未查看的第一张） */
    currentCard: (state): DiscoverCard | null => {
      return state.cards[0] ?? null;
    },
    /** 今日已使用数量 */
    usedCount: (state): number => {
      return state.viewedCards.length;
    },
    /** 今日剩余数量（含签到额外配额） */
    remainingCount: (state): number => {
      return Math.max(0, state.dailyLimit + state.extraQuota - state.viewedCards.length);
    },
    /** 是否达到每日上限 */
    isLimitReached: (state): boolean => {
      return state.viewedCards.length >= state.dailyLimit + state.extraQuota;
    },
    /** 已喜欢的用户 ID 集合 */
    likedUserIds: (state): Set<string> => {
      return new Set(
        state.viewedCards
          .filter((v) => v.direction === "right")
          .map((v) => v.userId)
      );
    },
    /** 距离下次刷新的剩余秒数 */
    countdownSeconds: (state): number => {
      if (!state.nextRefreshTime) return 0;
      const diff = Date.parse(state.nextRefreshTime) - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    },
    /** 格式化倒计时文本（HH:mm:ss） */
    countdownText: (state): string => {
      if (!state.nextRefreshTime) return "";
      const diff = Date.parse(state.nextRefreshTime) - Date.now();
      const totalSeconds = Math.max(0, Math.floor(diff / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    },
  },

  actions: {
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
    async fetchCards() {
      // 修复（P1 BUG）：取消在途的旧请求，避免竞态条件
      // 旧请求返回后会覆盖新请求的结果，导致展示错误的卡片
      if (fetchCardsController) {
        try {
          fetchCardsController.abort();
        } catch (_e) {
          // abort 失败时忽略
        }
        fetchCardsController = null;
      }
      const controller = new AbortController();
      fetchCardsController = controller;

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

            // 修复：写入前再次检查是否已取消
            if (controller.signal.aborted) {
              return;
            }

            this.cards = availableCards;
            this.hasMore = availableCards.length > 0 && !this.isLimitReached;

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
        if (fetchCardsController === controller) {
          this.loading = false;
          fetchCardsController = null;
        }
      }
    },

    /**
     * 同步历史记录与已拒绝记录
     */
    syncHistoryCards() {
      this.historyCards = [...this.viewedCards];
      this.passedCards = this.viewedCards.filter((v) => v.direction === "left");
    },

    /**
     * 左滑（不感兴趣）
     * @param cardId - 卡片 ID
     */
    async swipeLeft(cardId: string) {
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
    },

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
    async swipeRight(cardId: string, isSuperLike = false): Promise<void> {
      // 修复（P1 BUG）：300ms 防抖，防止快速连续右滑
      return new Promise<void>((resolve, reject) => {
        // 清理上一次防抖定时器，合并为最后一次调用
        if (swipeRightDebounceTimer) {
          clearTimeout(swipeRightDebounceTimer);
          swipeRightDebounceTimer = null;
        }
        swipeRightDebounceTimer = setTimeout(() => {
          swipeRightDebounceTimer = null;
          this._doSwipeRight(cardId, isSuperLike).then(resolve).catch(reject);
        }, SWIPE_RIGHT_DEBOUNCE_MS);
      });
    },

    /**
     * swipeRight 的实际执行逻辑（由防抖 wrapper 调用）。
     */
    async _doSwipeRight(cardId: string, isSuperLike = false) {
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
    },

    /**
     * 清除上次滑动结果
     */
    resetLastResult() {
      this.lastSwipeResult = null;
    },

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
    async rewindCard(cardId: string) {
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
    },

    /**
     * 重置每日限量（检查是否跨天）
     */
    resetDailyLimit() {
      const record = loadDailyRecord();
      const today = getTodayString();

      if (!record) {
        // 跨天了，重置状态
        this.viewedCards = [];
        this.historyCards = [];
        this.passedCards = [];
        this.hasRewoundToday = false;
        this.lastRefreshTime = new Date().toISOString();
        this.nextRefreshTime = getNextNoonString();
        this.hasMore = true;
        this.extraQuota = 0;
        // 存储同步由 watch 自动触发（监听 viewedCards/hasRewoundToday/lastRefreshTime 变更）
      }
    },

    /**
     * 防抖存储：延迟 300ms 执行存储同步
     *
     * 重构目的：在 watch 回调中调用此方法，合并短时间内多次状态变更为一次存储写入。
     * 若在防抖窗口内再次触发，会重置定时器，确保只保留最后一次变更的存储结果，
     * 有效避免快速滑动卡片或连续刷新导致的频繁 IO 操作。
     */
    debouncedSave() {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      saveTimer = setTimeout(() => {
        this.saveToStorage();
        saveTimer = null;
      }, SAVE_DEBOUNCE_MS);
    },

    /**
     * 保存当前状态到本地存储
     *
     * 重构增强：添加 try-catch 错误处理，捕获存储异常并记录日志，
     * 避免存储失败（如空间不足、存储被禁用）影响主业务流程。
     * 该方法由 debouncedSave 自动调用，业务代码无需手动调用。
     */
    saveToStorage() {
      try {
        saveDailyRecord(this.viewedCards, this.hasRewoundToday, this.lastRefreshTime);
      } catch (error) {
        console.error("[DiscoverStore] 存储同步失败:", error);
      }
    },

    /**
     * 强制重置每日限量（用于测试）
     */
    forceResetDailyLimit() {
      this.dailyLimit = DAILY_LIMIT_TOTAL;
      this.viewedCards = [];
      this.historyCards = [];
      this.passedCards = [];
      this.hasRewoundToday = false;
      this.lastRefreshTime = new Date().toISOString();
      this.nextRefreshTime = getNextNoonString();
      this.hasMore = true;
      // 存储同步由 watch 自动触发（监听 viewedCards/hasRewoundToday/lastRefreshTime 变更）
    },

    /**
     * 从后端获取推荐历史
     * Real 模式调用 GET /api/recommendations/history?userId={userId}
     */
    async loadHistory() {
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 模式下使用本地记录
          this.syncHistoryCards();
          return;
        }

        // 调用后端 API: GET /api/recommendations/history?userId={userId}
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        const rawData = await fetchRecommendationHistoryApi(userId);

        // 将后端数据映射为 ViewedCardRecord（方向统一为 right，表示历史记录）
        this.historyCards = rawData.map((item) => ({
          cardId: String(item.id),
          userId: String(item.id),
          direction: "right" as SwipeDirection,
          viewedAt: new Date().toISOString(),
        }));
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载推荐历史失败";
      }
    },

    /**
     * 查询在线状态
     * 根据推荐卡片中的用户 ID 列表，批量查询在线状态并更新到卡片数据中
     * Mock 模式提供本地测试数据，Real 模式调用 GET /api/online-status?userIds=xxx
     */
    async fetchOnlineStatus() {
      this.errorMessage = null;

      try {
        // 收集当前卡片中所有用户 ID
        const userIds = this.cards.map((c) => c.userId);
        if (userIds.length === 0) return;

        if (useMock()) {
          // Mock 模式：从本地卡片数据中提取已有的 onlineStatus，构建映射表
          const statusMap: Record<string, "online" | "away" | "offline"> = {};
          for (const card of this.cards) {
            if (card.onlineStatus) {
              statusMap[card.userId] = card.onlineStatus;
            }
          }
          this.onlineStatusMap = statusMap;
          return;
        }

        // 调用后端 API: GET /api/online-status?userIds=xxx,xxx
        const data = await fetchOnlineStatusApi(userIds);

        // 构建在线状态映射表
        const statusMap: Record<string, "online" | "away" | "offline"> = {};
        for (const item of data) {
          statusMap[String(item.userId)] = (item.status as "online" | "away" | "offline") ?? "offline";
        }
        this.onlineStatusMap = statusMap;

        // 同步更新卡片中的 onlineStatus 字段
        for (const card of this.cards) {
          card.onlineStatus = statusMap[card.userId] ?? "offline";
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "查询在线状态失败";
      }
    },

    /**
     * 设置签到额外配额
     * 由签到成功后调用，增加今日推荐次数
     */
    setExtraQuota(quota: number) {
      this.extraQuota = quota;
    },

    /**
     * 设置筛选条件并刷新推荐列表
     *
     * Phase C 说明：此方法仅更新 activeFilter（chip ID）用于 UI 高亮，
     * 不直接修改 recommendationFilter 对象。chip 与 recommendationFilter 解耦：
     * chip 是快捷预设，recommendationFilter 是抽屉中的详细筛选。
     *
     * @param filterId - 筛选 ID（nearby/all/age18-25/match-priority）
     */
    setFilter(filterId: string) {
      this.activeFilter = filterId;
      // 切换筛选后重新加载推荐卡片
      void this.fetchCards();
    },

    /**
     * 设置推荐筛选条件对象（Phase C 新增）。
     *
     * 由筛选抽屉组件（H-07 + M-16）调用：用户在抽屉中调整筛选项后，
     * 点击「应用筛选」按钮，将完整的 RecommendationFilter 对象传入。
     * 调用后立即刷新推荐列表（fetchCards 会读取 recommendationFilter 透传给 API）。
     *
     * 设计权衡：使用整体替换而非逐字段更新，确保调用方对状态有完整控制，
     * 避免部分字段残留导致筛选逻辑混乱。
     *
     * 功能6：同步更新 advancedFilter state，保持两者一致性。
     *
     * @param filter - 完整的推荐筛选条件对象
     */
    setRecommendationFilter(filter: RecommendationFilter) {
      // 浅拷贝避免外部引用变更污染 store 状态
      this.recommendationFilter = { ...filter };
      // 功能6：同步更新 advancedFilter state（仅提取高级字段）
      this.advancedFilter = {
        gender: filter.gender,
        ageMin: filter.ageMin,
        ageMax: filter.ageMax,
        schools: filter.schools ? [...filter.schools] : undefined,
        distanceMax: filter.distanceMax,
        interests: filter.interests ? [...filter.interests] : undefined,
        onlineOnly: filter.onlineOnly,
      };
      void this.fetchCards();
    },

    /**
     * 重置所有筛选字段为 undefined/空（Phase C 新增）。
     *
     * 清空 recommendationFilter 的所有字段（身高范围、学历、感情状态、
     * 籍贯省市、未来城市、关键字），等价于「不限」状态。
     * 调用后立即刷新推荐列表。
     *
     * 注意：仅重置 recommendationFilter，不影响 activeFilter（chip 高亮），
     * chip 状态由页面层单独管理（与抽屉筛选语义解耦）。
     */
    resetFilter() {
      this.recommendationFilter = { ...EMPTY_RECOMMENDATION_FILTER };
      // 功能6：同步重置高级筛选状态
      this.advancedFilter = { ...EMPTY_RECOMMENDATION_FILTER };
      void this.fetchCards();
    },

    /**
     * 功能6：设置高级筛选条件（仅更新高级字段）。
     *
     * 由 AdvancedFilter 组件通过 emit "update:modelValue" 调用，
     * 用户在抽屉中调整高级筛选项（性别/年龄/学校/距离/兴趣/在线状态）后，
     * 将完整的高级筛选对象传入。
     *
     * 设计说明：
     * - 仅更新 recommendationFilter 中的高级字段（gender/ageMin/ageMax/
     *   schools/distanceMax/interests/onlineOnly），保留基础筛选字段不变
     * - 同步更新 advancedFilter state，供组件双向绑定
     * - 调用后立即刷新推荐列表（fetchCards 会读取 recommendationFilter
     *   透传给 API）
     *
     * 错误处理：参数为空对象时直接返回，避免清空已有筛选。
     *
     * @param filter - 高级筛选条件对象（仅含高级字段）
     */
    setAdvancedFilter(filter: RecommendationFilter) {
      // 参数校验：filter 必须为对象
      if (!filter || typeof filter !== "object") {
        console.warn("[DiscoverStore] setAdvancedFilter: 无效的 filter 参数");
        return;
      }

      // 提取高级筛选字段（仅这些字段属于高级筛选范畴）
      const advancedFields: RecommendationFilter = {
        gender: filter.gender,
        ageMin: filter.ageMin,
        ageMax: filter.ageMax,
        schools: filter.schools ? [...filter.schools] : undefined,
        distanceMax: filter.distanceMax,
        interests: filter.interests ? [...filter.interests] : undefined,
        onlineOnly: filter.onlineOnly,
      };

      // 同步更新 advancedFilter state（独立 slice）
      this.advancedFilter = { ...advancedFields };

      // 合并到 recommendationFilter（保留基础筛选字段，覆盖高级字段）
      this.recommendationFilter = {
        ...this.recommendationFilter,
        ...advancedFields,
      };

      // 触发推荐列表刷新
      void this.fetchCards();
    },

    /**
     * 功能6：重置高级筛选条件（仅清空高级字段）。
     *
     * 由 AdvancedFilter 组件通过 emit "reset" 调用，
     * 清空所有高级筛选字段（性别/年龄/学校/距离/兴趣/在线状态），
     * 保留基础筛选字段不变。
     *
     * 设计说明：
     * - 仅重置 recommendationFilter 中的高级字段
     * - 同步重置 advancedFilter state
     * - 调用后立即刷新推荐列表
     */
    resetAdvancedFilter() {
      // 重置 advancedFilter state 为空对象（所有高级字段为 undefined）
      this.advancedFilter = { ...EMPTY_RECOMMENDATION_FILTER };

      // 从 recommendationFilter 中移除高级字段（保留基础筛选字段）
      this.recommendationFilter = {
        ...this.recommendationFilter,
        gender: undefined,
        ageMin: undefined,
        ageMax: undefined,
        schools: undefined,
        distanceMax: undefined,
        interests: undefined,
        onlineOnly: undefined,
      };

      // 触发推荐列表刷新
      void this.fetchCards();
    },

    /**
     * 打开筛选抽屉（Phase C 新增）。
     *
     * 设置 isFilterDrawerOpen = true，驱动筛选抽屉组件（H-07）渲染。
     * 抽屉内部通过 v-model 或 @close 监听关闭事件。
     */
    openFilterDrawer() {
      this.isFilterDrawerOpen = true;
    },

    /**
     * 关闭筛选抽屉（Phase C 新增）。
     *
     * 设置 isFilterDrawerOpen = false，触发抽屉的 leave transition。
     * 不自动应用筛选：用户若取消选择，已修改的 recommendationFilter
     * 不会生效（需调用 setRecommendationFilter 才会更新）。
     */
    closeFilterDrawer() {
      this.isFilterDrawerOpen = false;
    },

    /**
     * 设置搜索关键字（带 300ms 防抖，避免快速输入触发频繁刷新）
     * @param keyword - 搜索关键字（用户昵称/标签/学校）
     */
    setSearchKeyword(keyword: string) {
      this.searchKeyword = keyword;
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
      searchDebounceTimer = setTimeout(() => {
        searchDebounceTimer = null;
        void this.fetchCards();
      }, SEARCH_DEBOUNCE_MS);
    },

    /**
     * 清理 store 持有的所有定时器与请求资源。
     *
     * 修复（P1 BUG）：模块级定时器在 HMR 热更新或页面切换时未清理，
     * 可能导致：
     * 1. 内存泄漏（定时器持有 store 引用无法 GC）
     * 2. 已卸载组件的状态被修改（如 successAnimationTimer 触发后修改 showSuccessAnimation）
     * 3. 旧请求返回后覆盖新请求结果（fetchCardsController）
     *
     * 调用时机：
     * - 页面 onUnmounted（通过 useDiscoverStore().dispose() 调用）
     * - HMR 热更新时（由 Vite 自动调用 dispose）
     * - 应用退出 / 切换账号时
     */
    dispose() {
      // 清理存储防抖定时器
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      // 清理搜索防抖定时器
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
      }
      // 清理右滑防抖定时器
      if (swipeRightDebounceTimer) {
        clearTimeout(swipeRightDebounceTimer);
        swipeRightDebounceTimer = null;
      }
      // 清理 fetchCards 请求控制器，取消在途请求
      if (fetchCardsController) {
        try {
          fetchCardsController.abort();
        } catch (_e) {
          // abort 失败时忽略，避免阻塞 dispose
        }
        fetchCardsController = null;
      }
    },
  },
});

/**
 * 状态变更监听：自动触发防抖存储同步
 *
 * 重构核心：通过 watch 机制将"状态变更"与"存储同步"解耦，
 * 业务 action 只需修改状态，存储同步由 watch 自动触发，
 * 消除了手动调用 saveToStorage 的遗漏风险，也避免了重复调用。
 *
 * 监听三个关键状态：
 * - viewedCards：已查看卡片记录（深监听，捕获数组 push/pop/splice 等内部变更）
 * - hasRewoundToday：今日是否已使用挽回
 * - lastRefreshTime：上次刷新时间
 *
 * 任一状态变更都会触发 debouncedSave（300ms 防抖），合并为一次存储写入。
 *
 * 实现说明：Pinia Options API 的 defineStore 类型定义中不包含 watch 选项，
 * 因此通过包装 useDiscoverStore，在 store 首次实例化时使用 Vue 的 watch
 * 注册监听器，确保全局只初始化一次（模块级 _watchInitialized 标志控制）。
 */
let _watchInitialized = false;

/**
 * 寻觅页 Store 工厂函数
 *
 * 包装内部 _useDiscoverStore，在首次调用时注册状态监听器，
 * 后续调用直接返回缓存的 store 实例（Pinia 单例特性）。
 */
export function useDiscoverStore() {
  const store = _useDiscoverStore();

  if (!_watchInitialized) {
    _watchInitialized = true;

    // 监听已查看卡片记录变更（深监听，捕获数组 push/pop/splice 等内部变更）
    watch(
      () => store.viewedCards,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          store.debouncedSave();
        }
      },
      { deep: true }
    );

    // 监听今日挽回状态变更
    watch(
      () => store.hasRewoundToday,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          store.debouncedSave();
        }
      }
    );

    // 监听上次刷新时间变更
    watch(
      () => store.lastRefreshTime,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          store.debouncedSave();
        }
      }
    );
  }

  return store;
}
