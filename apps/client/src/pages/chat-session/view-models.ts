/**
 * 聊天会话页 - 视图模型（纯逻辑）
 *
 * 抽取 chat-session/index.vue 中的纯计算逻辑，便于单元测试与复用：
 * - resolvePeerUserId：从会话信息解析对方用户 ID（数字）
 * - formatTempCountdown：将剩余毫秒格式化为 HH:mm:ss
 * - computeIdleIcebreakerVisible：判断空闲破冰提示是否展示
 * - parseQuoteContext：解析页面跳转参数中的引用上下文
 * - buildLongPressMenuState：构建长按菜单初始状态
 *
 * 硬约束：本文件仅包含纯函数，不涉及页面转场逻辑、生命周期钩子或副作用。
 */

import type {
  LongPressMenuState,
  MessageDeliveryStatus,
  QuoteContext,
} from "./types";
// R4-00078：时间条文案走全局 i18n t（非组件场景约定，见 src/i18n/index.ts）
import { t } from "../../i18n";

/**
 * ChatBubble 组件 deliveryStatus prop 接受的窄类型
 *
 * 来源：components/chat/ChatBubble.vue 的 props 定义。
 * 不包含 "sending" / "failed"，因为 ChatBubble 不渲染这两种状态的图标。
 */
export type ChatBubbleDeliveryStatus = "sent" | "delivered" | "read";

/**
 * 将内部 MessageDeliveryStatus 转换为 ChatBubble 兼容的窄类型
 *
 * - "sent" / "delivered" / "read" 原样透传
 * - "sending" / "failed" / undefined 统一回退为 undefined（ChatBubble 不渲染图标）
 *
 * @param status - 内部消息投递状态
 * @returns ChatBubble 兼容的投递状态
 */
export function toChatBubbleDeliveryStatus(
  status: MessageDeliveryStatus | undefined
): ChatBubbleDeliveryStatus | undefined {
  if (status === "sent" || status === "delivered" || status === "read") {
    return status;
  }
  return undefined;
}

/**
 * 解析对方用户 ID 为数字，用于 API 调用
 *
 * 优先级：
 * 1. currentSession.partnerId（私信会话有 partnerId）
 * 2. sessionId 中的数字部分（例如 "session-123" -> 123）
 * 3. targetUserId（页面跳转参数）
 *
 * @param partnerId - 当前会话的对方用户 ID（字符串）
 * @param sessionId - 当前会话 ID
 * @param targetUserId - 页面跳转参数中的目标用户 ID
 * @returns 数字用户 ID，解析失败返回 null
 */
export function resolvePeerUserId(
  partnerId?: string,
  sessionId?: string | null,
  targetUserId?: string | null
): number | null {
  // 优先从 partnerId 解析
  if (partnerId) {
    const num = Number(partnerId);
    if (!Number.isNaN(num)) return num;
  }

  // 从 sessionId 中尝试解析（例如 "session-123"）
  if (sessionId) {
    const match = sessionId.match(/\d+/);
    if (match) return Number(match[0]);
  }

  // 兜底从 targetUserId 解析
  if (targetUserId) {
    const num = Number(targetUserId);
    if (!Number.isNaN(num)) return num;
  }

  return null;
}

/**
 * 将剩余毫秒数格式化为 HH:mm:ss
 *
 * 用于临时会话倒计时显示。
 * - diff <= 0 时返回 null（已结束，由调用方按 i18n 文案处理，R4-00077）
 * - diff > 0 时返回 "HH:mm:ss"
 *
 * @param diffMs - 剩余毫秒数（closesAt - now）
 * @returns 格式化后的倒计时文本；已结束时返回 null
 */
export function formatTempCountdown(diffMs: number): string | null {
  if (diffMs <= 0) {
    return null;
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * 计算两个时间戳之间的剩余毫秒数
 *
 * @param closesAt - 会话关闭时间（ISO 字符串）
 * @param now - 当前时间戳，默认 Date.now()
 * @returns 剩余毫秒数（closesAt 早于 now 时返回负数）
 */
export function computeRemainingMs(
  closesAt: string,
  now: number = Date.now()
): number {
  return Date.parse(closesAt) - now;
}

/**
 * 判断空闲破冰话题提示是否应该展示
 *
 * 触发条件：
 * - 输入框已聚焦
 * - 草稿为空（用户未输入内容）
 * - 已停留超过 5 秒（由调用方控制计时）
 *
 * @param inputFocused - 输入框是否聚焦
 * @param draft - 当前草稿内容
 * @returns 是否展示空闲提示
 */
export function computeIdleIcebreakerVisible(
  inputFocused: boolean,
  draft: string
): boolean {
  return inputFocused && draft.trim().length === 0;
}

/**
 * 解析页面跳转参数中的引用上下文
 *
 * @param raw - URL 编码后的 JSON 字符串
 * @returns 解析成功返回 QuoteContext，失败返回 null
 */
export function parseQuoteContext(raw: string): QuoteContext | null {
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as QuoteContext;
    // 简单字段校验：必须有 topicTitle 和 replyId
    if (!parsed.topicTitle || !parsed.replyId) {
      return null;
    }
    return parsed;
  } catch (_e) {
    // 解析失败时静默忽略
    return null;
  }
}

/**
 * 解析页面跳转参数中的预填消息
 *
 * @param raw - URL 编码后的预填消息字符串
 * @returns 解码后的消息文本，空字符串表示无预填
 */
export function parsePrefillMessage(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch (_e) {
    return "";
  }
}

/**
 * 构建长按菜单的初始状态
 *
 * @returns 隐藏状态的长按菜单对象
 */
export function buildInitialLongPressMenu(): LongPressMenuState {
  return {
    visible: false,
    messageId: "",
    isSelf: false,
    x: 0,
    y: 0,
  };
}

/**
 * 构建长按菜单的可见状态
 *
 * @param messageId - 触发长按的消息 ID
 * @param isSelf - 是否为本人发送的消息
 * @returns 可见状态的长按菜单对象
 */
export function buildVisibleLongPressMenu(
  messageId: string,
  isSelf: boolean
): LongPressMenuState {
  return {
    visible: true,
    messageId,
    isSelf,
    x: 0,
    y: 0,
  };
}

/**
 * 判断消息是否为本人发送
 *
 * @param sender - 消息发送方标识
 * @returns 是否为本人发送
 */
export function isMessageSelf(sender: string): boolean {
  return sender === "self";
}

/**
 * 计算用户消息数量（排除 system 类型消息）
 *
 * 用于判断是否展示破冰话题建议。
 *
 * @param messages - 消息列表
 * @returns 非系统消息数量
 */
export function countUserMessages(
  messages: Array<{ sender?: string; kind?: string }>
): number {
  return messages.filter(
    (m) => m.sender !== "system" && m.kind !== "system"
  ).length;
}

/**
 * 判断是否应该展示破冰话题
 *
 * 触发条件：
 * - 用户消息数量 <= 1
 * - 无错误消息
 *
 * @param userMessageCount - 用户消息数量
 * @param errorMessage - 当前错误消息
 * @returns 是否展示破冰话题
 */
export function shouldShowIcebreakers(
  userMessageCount: number,
  errorMessage: string | null
): boolean {
  return userMessageCount <= 1 && !errorMessage;
}

/* ========== 微信式时间分隔条（2026-08-08 聊天页微信化重构） ========== */

/**
 * 微信时间戳规则：连续消息 5 分钟内只显示一次时间。
 *
 * 首条消息恒显示；跨天或与前一条间隔 > 5 分钟 → 显示时间条。
 *
 * @param prevSentAt - 前一条消息时间（ISO 字符串），null 表示首条
 * @param currSentAt - 当前消息时间（ISO 字符串）
 * @returns 是否应显示时间分隔条
 */
export function shouldShowTimeBar(
  prevSentAt: string | null,
  currSentAt: string
): boolean {
  if (!prevSentAt) return true;
  const prev = Date.parse(prevSentAt);
  const curr = Date.parse(currSentAt);
  if (Number.isNaN(prev) || Number.isNaN(curr)) return true;
  const d1 = new Date(prev);
  const d2 = new Date(curr);
  const sameDay =
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  if (!sameDay) return true;
  return curr - prev > 5 * 60 * 1000;
}

/**
 * 微信时间条格式：今天 HH:mm / 昨天 HH:mm / 星期X HH:mm / YYYY年M月D日 HH:mm。
 * 时/分补零，月/日不补位；天数按「日历天」差计算（跨午夜判断用日期边界而非毫秒差）。
 * R4-00078：文案全部走 i18n（chat.timeBar.*），en-US 下不再显示中文。
 *
 * @param iso - 消息时间（ISO 字符串）
 * @param now - 当前时间戳，默认 Date.now()
 * @returns 格式化后的时间条文本
 */
export function formatChatTimeBar(iso: string, now: number = Date.now()): string {
  const d = new Date(iso);
  const n = new Date(now);
  if (Number.isNaN(d.getTime())) return iso;
  const pad2 = (x: number) => String(x).padStart(2, "0");
  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const dayDiff = Math.round(
    (Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) -
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
      86400000
  );
  if (dayDiff <= 0) return hhmm;
  if (dayDiff === 1) return t("chat.timeBar.yesterday", { time: hhmm });
  if (dayDiff <= 7) {
    const names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
    const weekdayKey = names[d.getDay()] ?? "sun";
    return t("chat.timeBar.weekday", { weekday: t(`chat.timeBar.weekdayNames.${weekdayKey}`), time: hhmm });
  }
  return t("chat.timeBar.date", {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    time: hhmm,
  });
}

/**
 * 聊天消息行模型：在消息流中插入时间分隔条。
 *
 * @param messages - 按时间升序排列的消息数组
 * @returns 扁平行列表（timebar / message 交替）
 */
export function buildChatMessageRows<T extends { id: string; sentAt: string }>(
  messages: T[]
): Array<{ key: string; type: "timebar" | "message"; text?: string; message?: T }> {
  const rows: Array<{ key: string; type: "timebar" | "message"; text?: string; message?: T }> = [];
  let prev: string | null = null;
  for (const m of messages) {
    if (shouldShowTimeBar(prev, m.sentAt)) {
      rows.push({ key: `time-${m.id}`, type: "timebar", text: formatChatTimeBar(m.sentAt) });
    }
    rows.push({ key: `msg-${m.id}`, type: "message", message: m });
    prev = m.sentAt;
  }
  return rows;
}
