/**
 * Discover Store 存储相关 Actions
 *
 * 集中维护寻觅页本地存储、每日限量重置、防抖存储同步、资源释放等行为。
 *
 * 拆分目的：原 discover/index.ts 单文件 1021 行，违反单一职责原则。
 * 拆分后存储相关 action 独立成文件，便于维护与测试。
 *
 * 注意：本文件中所有 action 函数均使用 `this: DiscoverStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import {
  DAILY_LIMIT_TOTAL,
  SAVE_DEBOUNCE_MS,
} from "../constants";

/** 本地存储中保留的 viewedCards 最大条数（超出部分在写入前截断） */
const MAX_VIEWED_CARDS = 200;
import {
  getNextNoonString,
  loadDailyRecord,
  saveDailyRecord,
} from "../utils";
import { timers } from "../timers";
import type { DiscoverStoreThis } from "../store-type";

/**
 * 重置每日限量（检查是否跨天）
 *
 * 通过对比本地存储中的日期与当前日期，判断是否跨天。
 * 若跨天，清空 viewedCards / historyCards / passedCards / hasRewoundToday
 * 等状态，并刷新 nextRefreshTime 为明天中午 12 点。
 */
export function resetDailyLimit(this: DiscoverStoreThis): void {
  const record = loadDailyRecord();
  // 注：record 仅用于判断是否跨天，无返回值时表示跨天
  // getTodayString 仅用于工具函数内部，此处无需调用

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
}

/**
 * 防抖存储：延迟 300ms 执行存储同步
 *
 * 重构目的：在 watch 回调中调用此方法，合并短时间内多次状态变更为一次存储写入。
 * 若在防抖窗口内再次触发，会重置定时器，确保只保留最后一次变更的存储结果，
 * 有效避免快速滑动卡片或连续刷新导致的频繁 IO 操作。
 */
export function debouncedSave(this: DiscoverStoreThis): void {
  if (timers.saveTimer) {
    clearTimeout(timers.saveTimer);
  }
  timers.saveTimer = setTimeout(() => {
    this.saveToStorage();
    timers.saveTimer = null;
  }, SAVE_DEBOUNCE_MS);
}

/**
 * 保存当前状态到本地存储
 *
 * 重构增强：添加 try-catch 错误处理，捕获存储异常并记录日志，
 * 避免存储失败（如空间不足、存储被禁用）影响主业务流程。
 * 该方法由 debouncedSave 自动调用，业务代码无需手动调用。
 */
export function saveToStorage(this: DiscoverStoreThis): void {
  try {
    // 修复（P1 BUG）：viewedCards 全量快照写入 storage 会无限增长
    // （每条含完整卡片快照，一天滑动数百张后可能撑爆小程序存储上限）。
    // 现仅保留最近 MAX_VIEWED_CARDS=200 条，超出部分丢弃
    // （反悔仅对近期卡片有意义，旧记录无恢复价值）。
    const capped = this.viewedCards.length > MAX_VIEWED_CARDS
      ? this.viewedCards.slice(this.viewedCards.length - MAX_VIEWED_CARDS)
      : this.viewedCards;
    saveDailyRecord(
      capped,
      this.hasRewoundToday,
      this.lastRefreshTime
    );
  } catch (error) {
    console.error("[DiscoverStore] 存储同步失败:", error);
  }
}

/**
 * 强制重置每日限量（用于测试）
 *
 * 与 resetDailyLimit 不同，不判断是否跨天，直接清空所有状态。
 * 仅供测试场景使用，业务代码不应调用。
 */
export function forceResetDailyLimit(this: DiscoverStoreThis): void {
  this.dailyLimit = DAILY_LIMIT_TOTAL;
  this.viewedCards = [];
  this.historyCards = [];
  this.passedCards = [];
  this.hasRewoundToday = false;
  this.lastRefreshTime = new Date().toISOString();
  this.nextRefreshTime = getNextNoonString();
  this.hasMore = true;
  // 存储同步由 watch 自动触发（监听 viewedCards/hasRewoundToday/lastRefreshTime 变更）
}

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
 *
 * TODO(dispose-接线)：引用页面为 pages/discover/index.vue（主使用页）及
 * pages/discover/history.vue、pages/home/index.vue、pages/profile/index.vue。
 * 本子任务受目录权限限制无法修改 pages/ 目录，需在后续任务中于页面
 * onUnload/onUnmounted 调用 discoverStore.dispose()。
 */
export function dispose(this: DiscoverStoreThis): void {
  // infra R2-00095: 清理前先强制 flush 一次防抖存储，避免页面销毁时最后操作丢失
  if (timers.saveTimer) {
    clearTimeout(timers.saveTimer);
    timers.saveTimer = null;
    try {
      this.saveToStorage();
    } catch (_e) {
      // 存储失败忽略，不阻塞销毁
    }
  }
  // 清理搜索防抖定时器
  if (timers.searchDebounceTimer) {
    clearTimeout(timers.searchDebounceTimer);
    timers.searchDebounceTimer = null;
  }
  // 清理右滑防抖定时器与幂等队列（R4-00177：settle 全部排队项的调用方，避免挂起）
  if (timers.swipeRightDebounceTimer) {
    clearTimeout(timers.swipeRightDebounceTimer);
    timers.swipeRightDebounceTimer = null;
  }
  if (timers.swipeRightQueue) {
    for (const item of timers.swipeRightQueue) {
      item.resolvers.forEach((r) => r());
    }
    timers.swipeRightQueue = null;
  }
  // 清理 fetchCards 请求控制器，取消在途请求
  if (timers.fetchCardsController) {
    try {
      timers.fetchCardsController.abort();
    } catch (_e) {
      // abort 失败时忽略，避免阻塞 dispose
    }
    timers.fetchCardsController = null;
  }
}
