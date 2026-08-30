/**
 * Discover Store 实例类型定义
 *
 * 用于在拆分的 action 文件中显式声明 this 类型，避免 noImplicitThis 错误。
 *
 * 背景：Pinia Option API 中 actions 的 this 类型由 defineStore 自动推断，
 * 但当 actions 拆分到独立文件时，TypeScript 无法自动推断 this 类型，
 * 需要通过显式声明确保类型安全。
 *
 * 该接口包含 state + getters + actions 三部分，与 store 实例的公开 API 一致。
 * 当 store 结构变更时，需同步更新此接口。
 */

import type { RecommendationFilter } from "../../services/generated/api-types-supplement";
import type { PendingSwipeRightItem } from "./timers";
import type { DiscoverCard, DiscoverState } from "./types";

/**
 * Discover Store 实例类型（state + getters + actions）
 */
export interface DiscoverStoreThis extends DiscoverState {
  // === Getters ===
  /** 当前展示的卡片（未查看的第一张） */
  readonly currentCard: DiscoverCard | null;
  /** 今日已使用数量 */
  readonly usedCount: number;
  /** 今日剩余数量（含签到额外配额） */
  readonly remainingCount: number;
  /** 是否达到每日上限 */
  readonly isLimitReached: boolean;
  /** 已喜欢的用户 ID 集合 */
  readonly likedUserIds: Set<string>;
  /** 距离下次刷新的剩余秒数 */
  readonly countdownSeconds: number;
  /** 格式化倒计时文本（HH:mm:ss） */
  readonly countdownText: string;

  // === Actions ===
  /** 获取推荐卡片列表（带重试机制，最多2次） */
  fetchCards: () => Promise<void>;
  /** 同步历史记录与已拒绝记录 */
  syncHistoryCards: () => void;
  /** 左滑（不感兴趣） */
  swipeLeft: (cardId: string) => Promise<void>;
  /** 右滑（喜欢） */
  swipeRight: (cardId: string, isSuperLike?: boolean) => Promise<void>;
  /** swipeRight 的实际执行逻辑（由防抖窗口的幂等队列 flush 调用，R4-00177） */
  _doSwipeRight: (
    cardId: string,
    isSuperLike?: boolean,
    cardSnapshot?: DiscoverCard | null
  ) => Promise<void>;
  /** 逐张执行防抖窗口内排队的右滑（串行，R4-00177） */
  _flushSwipeRightQueue: (batch: PendingSwipeRightItem[]) => Promise<void>;
  /** 清除上次滑动结果 */
  resetLastResult: () => void;
  /** 反悔上一张卡片（rewind） */
  rewindCard: (cardId: string) => Promise<void>;
  /** 重置每日限量（检查是否跨天） */
  resetDailyLimit: () => void;
  /** 防抖存储：延迟 300ms 执行存储同步 */
  debouncedSave: () => void;
  /** 保存当前状态到本地存储 */
  saveToStorage: () => void;
  /** 强制重置每日限量（用于测试） */
  forceResetDailyLimit: () => void;
  /** 从后端获取推荐历史 */
  loadHistory: () => Promise<void>;
  /** 查询在线状态 */
  fetchOnlineStatus: () => Promise<void>;
  /** 设置签到额外配额 */
  setExtraQuota: (quota: number) => void;
  /** 设置筛选条件并刷新推荐列表 */
  setFilter: (filterId: string) => void;
  /** 设置推荐筛选条件对象 */
  setRecommendationFilter: (filter: RecommendationFilter) => void;
  /** 重置所有筛选字段 */
  resetFilter: () => void;
  /** 设置高级筛选条件 */
  setAdvancedFilter: (filter: RecommendationFilter) => void;
  /** 重置高级筛选条件 */
  resetAdvancedFilter: () => void;
  /** 打开筛选抽屉 */
  openFilterDrawer: () => void;
  /** 关闭筛选抽屉 */
  closeFilterDrawer: () => void;
  /** 设置搜索关键字（带 300ms 防抖） */
  setSearchKeyword: (keyword: string) => void;
  /** 清理 store 持有的所有定时器与请求资源 */
  dispose: () => void;
}

/**
 * 兼容性别名：DiscoverStoreInstance 与 DiscoverStoreThis 等价。
 * 保留此别名便于未来切换到 ReturnType<typeof useDiscoverStore> 推断。
 */
export type DiscoverStoreInstance = DiscoverStoreThis;
