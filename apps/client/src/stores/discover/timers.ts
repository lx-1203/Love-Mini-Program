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

/**
 * 模块级定时器与请求控制器集合（单例）。
 *
 * 包含：
 * - saveTimer：防抖存储定时器
 * - searchDebounceTimer：搜索防抖定时器
 * - swipeRightDebounceTimer：右滑防抖定时器（修复 P1 BUG：防止快速连续右滑）
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
  /** 当前 fetchCards 请求的 AbortController */
  fetchCardsController: AbortController | null;
} = {
  saveTimer: null,
  searchDebounceTimer: null,
  swipeRightDebounceTimer: null,
  fetchCardsController: null,
};
