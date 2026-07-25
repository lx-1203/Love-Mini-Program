/**
 * Discover Store 常量定义
 *
 * 集中维护寻觅页相关的所有常量：
 * - 筛选条件模板：EMPTY_RECOMMENDATION_FILTER
 * - 每日限量：DAILY_LIMIT_TOTAL
 * - 本地存储键：STORAGE_KEY
 * - 重试参数：MAX_RETRIES / RETRY_DELAY_MS
 * - 防抖参数：SAVE_DEBOUNCE_MS / SEARCH_DEBOUNCE_MS / SWIPE_RIGHT_DEBOUNCE_MS
 * - 会话限制：MAX_UNDO_COUNT_PER_SESSION
 */

import type { RecommendationFilter } from "../../services/generated/api-types-supplement";

/**
 * 空推荐筛选条件（Phase C 新增）。
 *
 * 用于 state 初始化与 resetFilter action。所有字段均为 undefined，
 * 表示不施加任何筛选，等价于「不限」。
 *
 * 使用 Object.freeze 防止意外修改：resetFilter 时直接赋值新对象引用，
 * 避免共享引用导致的状态污染。
 */
export const EMPTY_RECOMMENDATION_FILTER: Readonly<RecommendationFilter> = Object.freeze({
  heightMin: undefined,
  heightMax: undefined,
  educationLevel: undefined,
  relationshipStatus: undefined,
  hometownProvince: undefined,
  hometownCity: undefined,
  futureCity: undefined,
  keyword: undefined,
  // 功能6：高级筛选扩展字段
  gender: undefined,
  ageMin: undefined,
  ageMax: undefined,
  schools: undefined,
  distanceMax: undefined,
  interests: undefined,
  onlineOnly: undefined,
});

/** 每日限量总数 */
export const DAILY_LIMIT_TOTAL = 10;

/** 本地存储键 */
export const STORAGE_KEY = "discover_daily_record";

/** 最大重试次数 */
export const MAX_RETRIES = 2;

/** 重试延迟（毫秒） */
export const RETRY_DELAY_MS = 1000;

/**
 * 存储同步防抖延迟（毫秒）
 * 重构目的：避免快速连续操作（如快速滑动多张卡片）导致频繁写入本地存储，
 * 通过 300ms 防抖窗口合并多次状态变更为一次存储写入，降低 IO 开销。
 */
export const SAVE_DEBOUNCE_MS = 300;

/**
 * 搜索关键字防抖延迟（毫秒）
 * 用户在搜索框快速输入时，避免每次按键都触发推荐列表刷新，
 * 通过 300ms 防抖窗口合并多次输入为一次刷新请求。
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * 右滑（喜欢）防抖延迟（毫秒）。
 *
 * 修复（P1 BUG）：原 swipeRight 无防抖，用户快速连续右滑会触发多次
 * 后端 /matches/like 请求与本地状态变更，可能导致：
 * 1. 同一张卡片被重复计入 viewedCards
 * 2. 后端重复创建 like 记录
 * 3. cards 数组在并发请求中被多次 filter，状态错乱
 * 通过 300ms 防抖窗口合并多次右滑为一次实际执行。
 */
export const SWIPE_RIGHT_DEBOUNCE_MS = 300;

/**
 * 单次会话 rewind（反悔）最大次数。
 *
 * 修复（P1 BUG）：限制单次会话最多 3 次 rewind，
 * 避免用户反复 rewind 刷卡片影响推荐算法。
 */
export const MAX_UNDO_COUNT_PER_SESSION = 3;
