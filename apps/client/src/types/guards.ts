/**
 * 类型守卫集合
 *
 * 集中维护项目中对运行时外部数据（API 响应、localStorage、JSON.parse 等）
 * 进行类型守卫的函数，避免使用 `as Xxx` 强制断言导致的类型不安全。
 *
 * 设计原则：
 * - 每个守卫函数返回 `data is T` 形式的类型谓词
 * - 守卫需进行必要的运行时字段检查（typeof / in instanceof）
 * - 守卫命名统一为 `isXxx` 形式
 *
 * 使用示例：
 * ```ts
 * const data: unknown = JSON.parse(raw);
 * if (isMessageItem(data)) {
 *   // 此处 data 收敛为 MessageItem
 * }
 * ```
 */

import type { MessageItem, MessageHeartSignal, SystemNotification } from "../stores/messages";
import type { HeartSignal, HeartSignalStatus } from "../stores/likes";
import type { CampusTopicCategory } from "../stores/campus";
import type { MessageDeliveryStatus, MessageDeliveryStatusMap } from "../stores/chat/types";
import type { SessionPersistedFields } from "../stores/session";
import type { DailyRecord } from "../stores/discover/utils";
import type { QuoteContext } from "../pages/chat-session/types";

/* ========== 基础类型守卫 ========== */

/**
 * 判断数据是否为非 null 的对象
 * @param data - 待校验的数据
 */
export function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}

/**
 * 判断数据是否为字符串
 * @param data - 待校验的数据
 */
export function isString(data: unknown): data is string {
  return typeof data === "string";
}

/**
 * 判断数据是否为有限数字（排除 NaN / Infinity）
 * @param data - 待校验的数据
 */
export function isFiniteNumber(data: unknown): data is number {
  return typeof data === "number" && Number.isFinite(data);
}

/**
 * 判断数据是否为布尔值
 * @param data - 待校验的数据
 */
export function isBoolean(data: unknown): data is boolean {
  return typeof data === "boolean";
}

/* ========== 业务类型守卫 ========== */

/**
 * 判断数据是否符合 MessageItem 接口
 *
 * MessageItem 是私信消息项，必需字段：id / sessionId / sender / kind / body / sentAt。
 * sender 与 kind 均为字面量联合类型，需校验具体值。
 *
 * @param data - 待校验的数据（通常来自 WebSocket 推送的 JSON.parse）
 */
export function isMessageItem(data: unknown): data is MessageItem {
  if (!isRecord(data)) return false;
  const { id, sessionId, sender, kind, body, sentAt } = data;
  return (
    isString(id) &&
    isString(sessionId) &&
    (sender === "self" || sender === "peer" || sender === "system") &&
    // 2026-08-09 未读修复：kind 补 activity（与 MessageItem 类型定义对齐，
    // 原守卫遗漏该字面量，WS 转换层产出 activity 消息会被误拒）
    (kind === "text" || kind === "voice" || kind === "emoji" || kind === "system" || kind === "activity") &&
    isString(body) &&
    isString(sentAt)
  );
}

/**
 * 判断数据是否符合 HeartSignal 接口
 *
 * HeartSignal 是心动信号，必需字段：id / fromUserId / fromUserName / fromUserAvatar / toUserId / status / sentAt / expiresAt。
 * status 为字面量联合类型，需校验具体值。
 *
 * @param data - 待校验的数据（通常来自 WebSocket 推送的 JSON.parse）
 */
export function isHeartSignal(data: unknown): data is HeartSignal {
  if (!isRecord(data)) return false;
  const { id, fromUserId, fromUserName, fromUserAvatar, toUserId, status, sentAt, expiresAt } = data;
  return (
    isString(id) &&
    isString(fromUserId) &&
    isString(fromUserName) &&
    isString(fromUserAvatar) &&
    isString(toUserId) &&
    isHeartSignalStatus(status) &&
    isString(sentAt) &&
    isString(expiresAt)
  );
}

/**
 * 判断值是否为 HeartSignalStatus 字面量联合类型
 * @param value - 待校验的值
 */
export function isHeartSignalStatus(value: unknown): value is HeartSignalStatus {
  return value === "pending" || value === "accepted" || value === "expired";
}

/**
 * 判断数据是否符合 MessageHeartSignal 接口
 *
 * MessageHeartSignal 是消息列表中的心动信号条目，
 * 必需字段：id / fromUserId / fromUserName / fromUserAvatar / status / sentAt / expiresAt。
 *
 * @param data - 待校验的数据
 */
export function isMessageHeartSignal(data: unknown): data is MessageHeartSignal {
  if (!isRecord(data)) return false;
  const { id, fromUserId, fromUserName, fromUserAvatar, status, sentAt, expiresAt } = data;
  return (
    isString(id) &&
    isString(fromUserId) &&
    isString(fromUserName) &&
    isString(fromUserAvatar) &&
    isHeartSignalStatus(status) &&
    isString(sentAt) &&
    isString(expiresAt)
  );
}

/**
 * 判断数据是否符合 SystemNotification 接口
 *
 * SystemNotification 是系统通知，必需字段：id / type / title / content / isRead / createdAt / signalType。
 * type 与 signalType 均为字面量联合类型。
 *
 * @param data - 待校验的数据
 */
export function isSystemNotification(data: unknown): data is SystemNotification {
  if (!isRecord(data)) return false;
  const { id, type, title, content, isRead, createdAt, signalType } = data;
  return (
    isString(id) &&
    isSystemNotificationType(type) &&
    isString(title) &&
    isString(content) &&
    isBoolean(isRead) &&
    isString(createdAt) &&
    (signalType === "SOCIAL" || signalType === "CONTENT")
  );
}

/**
 * 判断值是否为 SystemNotification["type"] 字面量联合类型
 * @param value - 待校验的值
 */
export function isSystemNotificationType(value: unknown): value is SystemNotification["type"] {
  return (
    value === "system" ||
    value === "match" ||
    value === "like" ||
    value === "activity" ||
    value === "follow" ||
    value === "interaction_like" ||
    value === "comment" ||
    value === "visitor" ||
    value === "interaction_match"
  );
}

/**
 * 判断值是否为 MessageDeliveryStatus 字面量联合类型
 * @param value - 待校验的值
 */
export function isMessageDeliveryStatus(value: unknown): value is MessageDeliveryStatus {
  return (
    value === "sending" ||
    value === "sent" ||
    value === "delivered" ||
    value === "read" ||
    value === "failed"
  );
}

/**
 * 判断数据是否符合 MessageDeliveryStatusMap 类型
 *
 * MessageDeliveryStatusMap 是 sendId -> status 的映射表，
 * 校验每个 value 必须为合法的 MessageDeliveryStatus。
 *
 * @param data - 待校验的数据（通常来自 localStorage 的 JSON.parse）
 */
export function isMessageDeliveryStatusMap(data: unknown): data is MessageDeliveryStatusMap {
  if (!isRecord(data)) return false;
  for (const value of Object.values(data)) {
    if (!isMessageDeliveryStatus(value)) return false;
  }
  return true;
}

/**
 * 判断数据是否符合 SessionPersistedFields（部分类型）
 *
 * 用于校验从 localStorage 读取的 session 持久化字段。
 *
 * @param data - 待校验的数据
 */
export function isSessionPersistedFields(data: unknown): data is Partial<SessionPersistedFields> {
  if (!isRecord(data)) return false;
  // profileBackgroundUrl 为可选字段，存在时必须为 string
  const { profileBackgroundUrl } = data;
  if (profileBackgroundUrl !== undefined && !isString(profileBackgroundUrl)) {
    return false;
  }
  return true;
}

/**
 * 判断数据是否符合 DailyRecord 接口
 *
 * DailyRecord 是寻觅页本地存储的每日记录结构，
 * 必需字段：date / viewedCards / hasRewoundToday / lastRefreshTime。
 *
 * @param data - 待校验的数据
 */
export function isDailyRecord(data: unknown): data is DailyRecord {
  if (!isRecord(data)) return false;
  const { date, viewedCards, hasRewoundToday, lastRefreshTime } = data;
  return (
    isString(date) &&
    Array.isArray(viewedCards) &&
    isBoolean(hasRewoundToday) &&
    (lastRefreshTime === null || isString(lastRefreshTime))
  );
}

/**
 * 判断数据是否符合 QuoteContext 接口
 *
 * QuoteContext 是聊天引用上下文，必需字段：
 * topicTitle / topicId / replyId / replyContent / replyAuthorName。
 *
 * @param data - 待校验的数据
 */
export function isQuoteContext(data: unknown): data is QuoteContext {
  if (!isRecord(data)) return false;
  const { topicTitle, topicId, replyId, replyContent, replyAuthorName } = data;
  return (
    isString(topicTitle) &&
    isString(topicId) &&
    isString(replyId) &&
    isString(replyContent) &&
    isString(replyAuthorName)
  );
}

/**
 * 判断值是否为 CampusTopicCategory 字面量联合类型
 * @param value - 待校验的值
 */
export function isCampusTopicCategory(value: unknown): value is CampusTopicCategory {
  return (
    value === "course_exchange" ||
    value === "club_recruitment" ||
    value === "campus_activity" ||
    value === "study_help" ||
    value === "life_service" ||
    value === "alumni_news"
  );
}

/**
 * 判断值是否为合法的 SignalType（"SOCIAL" | "CONTENT"）
 * @param value - 待校验的值
 */
export function isSignalType(value: unknown): value is "SOCIAL" | "CONTENT" {
  return value === "SOCIAL" || value === "CONTENT";
}
