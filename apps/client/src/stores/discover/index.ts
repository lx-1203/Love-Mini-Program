/**
 * Discover Store 实现入口
 *
 * 寻觅页 Store 主体实现：管理推荐卡片、滑动操作、每日限量、时间门控和回看功能。
 *
 * 模块拆分结构：
 * - ./types                类型定义
 * - ./constants            常量（DAILY_LIMIT_TOTAL / SAVE_DEBOUNCE_MS 等）
 * - ./utils                工具函数（mapToDiscoverCard / withRetry / 本地存储）
 * - ./api                  API 调用函数（passUserApi / likeUserApi 等）
 * - ./timers               模块级定时器与请求控制器（共享单例）
 * - ./store-type           Store 实例类型定义（用于拆分 action 的 this 类型）
 * - ./actions/fetch        卡片获取 Actions（fetchCards / syncHistoryCards）
 * - ./actions/swipe        滑动操作 Actions（swipeLeft / swipeRight / _doSwipeRight）
 * - ./actions/rewind       反悔与重置 Actions（resetLastResult / rewindCard）
 * - ./actions/storage      存储相关 Actions（resetDailyLimit / debouncedSave / dispose）
 * - ./actions/filter       筛选相关 Actions（setFilter / setRecommendationFilter / setSearchKeyword）
 * - ./actions/history      历史与在线状态 Actions（loadHistory / fetchOnlineStatus / setExtraQuota）
 * - ./index.ts             本文件：store 主体实现（state + getters + actions 装配）
 *
 * 通过 stores/discover.ts re-export，保持外部 import 路径完全兼容：
 *   import { useDiscoverStore } from "@/stores/discover";
 *
 * 拆分目的：原 index.ts 单文件 1021 行，违反单一职责原则。
 * 拆分后各 action 按业务关注点独立成文件，本文件仅负责 state/getters/装配。
 */

import { defineStore } from "pinia";
import { watch } from "vue";
import { useSessionStore } from "../session";
import {
  DAILY_LIMIT_TOTAL,
  EMPTY_RECOMMENDATION_FILTER,
} from "./constants";
import {
  getNextNoonString,
  loadDailyRecord,
} from "./utils";
import type { DiscoverCard, DiscoverState } from "./types";

// 引入拆分后的 actions
import {
  fetchCards,
  syncHistoryCards,
} from "./actions/fetch";
import {
  swipeLeft,
  swipeRight,
  _doSwipeRight,
} from "./actions/swipe";
import {
  resetLastResult,
  rewindCard,
} from "./actions/rewind";
import {
  resetDailyLimit,
  debouncedSave,
  saveToStorage,
  forceResetDailyLimit,
  dispose,
} from "./actions/storage";
import {
  setFilter,
  setRecommendationFilter,
  setSortBy,
  setMatchScope,
  setNearbyScope,
  resetFilter,
  setAdvancedFilter,
  resetAdvancedFilter,
  openFilterDrawer,
  closeFilterDrawer,
  setSearchKeyword,
  applyQuickFilter,
} from "./actions/filter";
import {
  loadHistory,
  fetchOnlineStatus,
  setExtraQuota,
} from "./actions/history";

// 保留 re-export 以便外部旧 import 路径仍能从 "@/stores/discover" 取到这些符号
export * from "./types";
export * from "./constants";
export * from "./utils";
export * from "./api";

/**
 * 寻觅页 Store
 *
 * 管理推荐卡片、滑动操作、每日限量、时间门控和回看功能。
 *
 * Actions 装配说明：
 * 由于 actions 已拆分到 ./actions/* 文件，且这些函数使用 `this: DiscoverStoreThis`
 * 显式声明 this 类型，本文件通过 method shorthand 形式将函数引用挂载到 actions 对象。
 * Pinia 会自动将 this 绑定到 store 实例，因此拆分后的函数能正确访问 state/getters。
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
      // 设计需求默认值：匹配度优先 + 不限范围
      sortBy: "match",
      matchScope: "all",
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
      // 2026-08-07 超级测试账号：匹配次数无限（本地联调放行）
      const sessionStore = useSessionStore();
      if (sessionStore.isSuperTestAccount) return 999;
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
    // === 卡片获取 Actions（来自 ./actions/fetch） ===
    fetchCards,
    syncHistoryCards,
    // === 滑动操作 Actions（来自 ./actions/swipe） ===
    swipeLeft,
    swipeRight,
    _doSwipeRight,
    // === 反悔与重置 Actions（来自 ./actions/rewind） ===
    resetLastResult,
    rewindCard,

    // === 存储相关 Actions（来自 ./actions/storage） ===
    resetDailyLimit,
    debouncedSave,
    saveToStorage,
    forceResetDailyLimit,
    dispose,

    // === 筛选相关 Actions（来自 ./actions/filter） ===
    setFilter,
    setRecommendationFilter,
    setSortBy,
    setMatchScope,
    setNearbyScope,
    applyQuickFilter,
    resetFilter,
    setAdvancedFilter,
    resetAdvancedFilter,
    openFilterDrawer,
    closeFilterDrawer,
    setSearchKeyword,

    // === 历史与在线状态 Actions（来自 ./actions/history） ===
    loadHistory,
    fetchOnlineStatus,
    setExtraQuota,
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
