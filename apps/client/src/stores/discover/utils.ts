/**
 * Discover Store 工具函数
 *
 * 集中维护寻觅页相关的纯工具函数：
 * - 数据转换：mapToDiscoverCard
 * - 重试执行器：withRetry
 * - 模式判断：useMock
 * - 日期工具：getTodayString / getNextNoonString
 * - 本地存储：loadDailyRecord / saveDailyRecord / DailyRecord
 */

import { useMock } from "../helpers/use-mock";
import type { RecommendedPerson } from "../../services/generated/api-types-supplement";
import { STORAGE_KEY } from "./constants";
import type { DiscoverCard, ViewedCardRecord } from "./types";

/**
 * 将后端 RecommendedPerson 映射为前端 DiscoverCard
 *
 * Phase C 重构：参数类型从 RecommendedPersonView 改为 RecommendedPerson。
 * RecommendedPerson 是 RecommendedPersonView 的超集（额外包含 height、
 * educationLevel、photoGallery、halfBodyPhotoUrl、personalVideoUrl、
 * profileBackgroundUrl、verificationBadgeLevel 等扩展字段），
 * 视图层映射逻辑保持不变，扩展字段由消费方按需读取。
 *
 * @param raw - 后端返回的推荐人物（含扩展字段）
 * @param onlineStatus - 在线状态（可选，由 fetchOnlineStatus 单独查询后回填）
 * @returns 前端 DiscoverCard 对象
 */
export function mapToDiscoverCard(
  raw: RecommendedPerson,
  onlineStatus?: "online" | "away" | "offline"
): DiscoverCard {
  return {
    id: String(raw.id),
    userId: String(raw.id),
    name: raw.name,
    avatar: raw.avatarUrl || "",
    headline: raw.headline,
    bio: raw.bio || "",
    tags: raw.tags,
    commonGround: raw.commonGround,
    availability: raw.availability,
    images: raw.images || [],
    campusName: raw.campusName,
    onlineStatus,
    isSameSchool: raw.isSameSchool ?? false,
    isSameMajor: raw.isSameMajor ?? false,
    commonCircleCount: raw.commonCircleCount ?? 0,
    halfBodyPhotoUrl: raw.halfBodyPhotoUrl,
    photoGallery: raw.photoGallery,
    personalVideoUrl: raw.personalVideoUrl,
    profileBackgroundUrl: raw.profileBackgroundUrl,
    height: raw.height,
    educationLevel: raw.educationLevel,
    verificationBadgeLevel: raw.verificationBadgeLevel,
    // Phase Feedback1：寻觅页改版新增字段透传
    displayId: raw.displayId,
    distanceText: raw.distanceText,
    activeStatusText: raw.activeStatusText,
    machineVerified: raw.machineVerified,
    humanVerified: raw.humanVerified,
    personality: raw.personality,
    mbti: raw.mbti,
    whisper: raw.whisper,
    whisperSent: raw.whisperSent,
    recentPosts: raw.recentPosts,
    expectedPartner: raw.expectedPartner,
    allowMessage: raw.allowMessage,
  };
}

/**
 * 判断当前是否为 mock 模式
 *
 * 注意：本模块对外导出的 `useMock` 来自 `stores/helpers/use-mock`，
 * 是 store 层共享的单一真相源。此处保留 re-export 仅为兼容既有
 * `import { useMock } from "./utils"` 的引用方式，避免破坏现有调用点。
 *
 * @returns 是否为 mock 模式
 */
export { useMock };

/**
 * 带重试机制的异步执行器
 *
 * 在请求失败时自动重试，最多重试 maxRetries 次，每次重试之间延迟 delayMs。
 * 适用于网络抖动等临时性故障场景。
 *
 * @param fn - 要执行的异步函数
 * @param maxRetries - 最大重试次数
 * @param delayMs - 重试之间的延迟毫秒数
 * @returns 异步函数的返回值
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delayMs: number
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(
          `[DiscoverStore] 第${attempt + 1}次尝试失败，将进行第${attempt + 2}次重试:`,
          lastError.message
        );
      }
    }
  }

  throw lastError ?? new Error("操作失败");
}

/**
 * 获取今日日期字符串（YYYY-MM-DD）
 * @returns 今日日期字符串
 */
export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * 计算明天中午12点的时间字符串
 * @returns 明天中午12点的 ISO 时间字符串
 */
export function getNextNoonString(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
  return next.toISOString();
}

/**
 * 本地存储中的每日记录结构
 */
export interface DailyRecord {
  /** 记录日期（YYYY-MM-DD） */
  date: string;
  /** 已查看卡片记录 */
  viewedCards: ViewedCardRecord[];
  /** 今日是否已使用挽回 */
  hasRewoundToday: boolean;
  /** 上次刷新时间 */
  lastRefreshTime: string | null;
}

/**
 * 从本地存储加载今日记录
 *
 * 仅返回与今日日期匹配的记录，跨天记录视为过期忽略。
 * 本地存储读取失败时返回 null，调用方按需处理。
 *
 * @returns 今日记录（不含 date 字段），若无有效记录则返回 null
 */
export function loadDailyRecord(): Omit<DailyRecord, "date"> | null {
  try {
    const record = uni.getStorageSync(STORAGE_KEY);
    if (record) {
      const data = JSON.parse(record) as DailyRecord;
      const today = getTodayString();
      if (data.date === today) {
        return {
          viewedCards: data.viewedCards || [],
          hasRewoundToday: data.hasRewoundToday || false,
          lastRefreshTime: data.lastRefreshTime || null,
        };
      }
    }
  } catch (_e) {
    // 本地存储读取失败时忽略
  }
  return null;
}

/**
 * 保存今日记录到本地存储
 *
 * 将 viewedCards / hasRewoundToday / lastRefreshTime 序列化为 JSON 并写入本地存储。
 * 写入失败时静默忽略，不影响主业务流程。
 *
 * @param viewedCards - 已查看卡片记录
 * @param hasRewoundToday - 今日是否已使用挽回
 * @param lastRefreshTime - 上次刷新时间
 */
export function saveDailyRecord(
  viewedCards: ViewedCardRecord[],
  hasRewoundToday: boolean,
  lastRefreshTime: string | null
): void {
  try {
    const data: DailyRecord = {
      date: getTodayString(),
      viewedCards,
      hasRewoundToday,
      lastRefreshTime,
    };
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(data));
  } catch (_e) {
    // 本地存储写入失败时忽略
  }
}
