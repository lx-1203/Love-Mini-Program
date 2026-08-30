/**
 * Discover Store 模块级定时器与请求控制器
 *
 * 集中管理 store 持有的所有定时器与请求资源，便于多文件共享与统一清理。
 *
 * 设计说明：
 * - 定时器句柄不属于业务状态，不应被响应式追踪
 * - 避免被序列化到本地存储造成污染
 * - Pinia store 为单例，模块级变量可保证全局唯一性
 * - 使用可变对象封装，便于在拆分的 action 文件中读写
 */

import type { DiscoverCard } from "./types";

/**
 * 右滑防抖窗口内待执行的幂等队列项（修复 R4-00177）。
 *
 * 说明：
 * - 同一卡片在窗口内重复触发 → 合并到同一项（resolvers/rejecters 追加），
 *   全部调用方 await 同一个执行结果（幂等，不重复请求后端）；
 * - 不同卡片在窗口内触发 → 各自入队，flush 时逐张执行，
 *   不再像原「最后一击防抖」那样把早先的喜欢静默丢弃；
 * - card 为入队时的卡片快照：防抖窗口内卡片可能被左滑/刷新移除，
 *   执行时按快照兜底，避免「卡片不存在」误报（如「右滑 A→左滑 B」竞态）。
 */
export interface PendingSwipeRightItem {
  cardId: string;
  isSuperLike: boolean;
  /** 入队时的卡片快照（执行时卡片已不在列表中则用快照兜底） */
  card: DiscoverCard | null;
  /** 等待同一执行结果的全部调用方 resolve */
  resolvers: Array<() => void>;
  /** 等待同一执行结果的全部调用方 reject */
  rejecters: Array<(reason?: unknown) => void>;
}

/**
 * 模块级定时器与请求控制器集合（单例）。
 *
 * 包含：
 * - saveTimer：防抖存储定时器
 * - searchDebounceTimer：搜索防抖定时器
 * - swipeRightDebounceTimer：右滑防抖定时器（窗口结束统一 flush 幂等队列）
 * - swipeRightQueue：右滑幂等队列（替代原 swipeRightPendingResolve 单槽位）
 * - fetchCardsController：当前 fetchCards 请求的 AbortController
 *   （修复 P1 BUG：取消在途的旧请求，避免竞态条件）
 */
export const timers: {
  /** 防抖存储定时器 */
  saveTimer: ReturnType<typeof setTimeout> | null;
  /** 搜索防抖定时器 */
  searchDebounceTimer: ReturnType<typeof setTimeout> | null;
  /** 右滑防抖定时器 */
  swipeRightDebounceTimer: ReturnType<typeof setTimeout> | null;
  /** 右滑防抖窗口内待执行的幂等队列（null 表示无排队项） */
  swipeRightQueue: PendingSwipeRightItem[] | null;
  /** 当前 fetchCards 请求的 AbortController */
  fetchCardsController: AbortController | null;
} = {
  saveTimer: null,
  searchDebounceTimer: null,
  swipeRightDebounceTimer: null,
  swipeRightQueue: null,
  fetchCardsController: null,
};
