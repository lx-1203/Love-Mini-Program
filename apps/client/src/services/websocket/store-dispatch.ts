/**
 * WebSocket 消息分发到 Pinia Store
 *
 * 集中维护 STOMP 消息到 Pinia Store 的分发逻辑：
 * - dispatchToStore：根据目标路径匹配队列类型并分发
 * - handleNewMessage：私信消息 → useMessagesStore
 * - handleNewHeartSignal：心动信号 → useLikesStore + useMessagesStore
 * - handleNewNotification：通知 → useMessagesStore
 * - handleNewMatch：匹配成功（/queue/matches）→ useMessagesStore 通知
 * - handleTempChatEvent：临时会话事件（/queue/temp-chat）→ 刷新会话列表
 * - handleCheckInEvent：签到事件（/queue/checkin）→ 刷新签到状态
 *
 * 这些函数均为纯逻辑（无 WebSocket 状态），由 index.ts 中的
 * WebSocketClient 在收到 STOMP MESSAGE 帧时调用。
 *
 * 后端推送路径（R4-00175 对齐后端实际队列）：
 * - /user/{userId}/queue/messages     私信消息
 * - /user/{userId}/queue/signals      心动信号
 * - /user/{userId}/queue/notifications 通知
 * - /user/{userId}/queue/matches      匹配成功（MatchRecorder）
 * - /user/{userId}/queue/temp-chat    临时会话事件（TempChatSessionService/Cleanup）
 * - /user/{userId}/queue/temp-chat/messages 临时会话私信（TempChatMessageService）
 * - /user/{userId}/queue/checkin      签到事件（CheckInEventConsumer）
 */

// 修复 no-duplicate-imports：将 value 与 type import 合并到单一 import 语句
import { useMessagesStore, type MessageItem, type MessageHeartSignal, type SystemNotification } from "../../stores/messages";
import { useLikesStore, type HeartSignal } from "../../stores/likes";
// R4-00175: 签到事件实时刷新
import { useCheckInStore } from "../../stores/checkin";
// R4-00175: 匹配/临时会话事件通知文案
import { t } from "@/i18n";
import {
  isMessageItem,
  isHeartSignal,
  isMessageHeartSignal,
  isSystemNotification,
} from "../../types/guards";
// 修复（未读红点 BUG 1）：real 模式 WS 载荷（MessageView 形状）→ MessageItem 转换层
import { fromWsPayload } from "./ws-message-adapter";
// infra R2-00127: 未知队列类型/非法数据上报 Sentry（含 mp-weixin 降级通道），
// 替代“仅 console.warn 静默”，便于尽早发现前后端契约漂移。
import { captureException } from "../sentry";
import { isDev } from "../../config/env";

/**
 * 将消息分发到对应的 Pinia Store
 *
 * 根据目标路径判断消息类型，调用对应 Store 的回调方法：
 * - /user/queue/messages    -> handleNewMessage
 * - /user/queue/signals     -> handleNewHeartSignal
 * - /user/queue/notifications -> handleNewNotification
 * - /user/queue/matches     -> handleNewMatch
 * - /user/queue/temp-chat   -> handleTempChatEvent
 * - /user/queue/checkin     -> handleCheckInEvent
 * - /user/queue/temp-chat/messages -> handleNewMessage（路径正则收敛到 messages）
 *
 * 路径匹配规则：Spring 可能发送 /user/queue/xxx 或 /user/{userId}/queue/xxx，
 * 统一匹配 queue/ 后面的部分。
 *
 * @param destination - STOMP 消息的目标路径
 * @param data - 解析后的消息数据
 */
export function dispatchToStore(destination: string, data: unknown): void {
  // 匹配路径：Spring 可能发送 /user/queue/xxx 或 /user/{userId}/queue/xxx
  // 统一匹配 queue/ 后面的部分
  // 修复（未读红点 BUG 2）：原正则 /\/queue\/(\w+)$/ 无法匹配 /queue/temp-chat/messages
  // （队列名含 "-" 与 "/"），导致临时会话新消息实时推送被静默丢弃
  const queueMatch = destination.match(/\/queue\/([\w-]+(?:\/[\w-]+)*)$/);
  if (!queueMatch) return;

  const queueType = queueMatch[1];

  try {
    switch (queueType) {
      case "messages":
        handleNewMessage(data, destination);
        break;

      // 修复（未读红点 BUG 2）：/queue/temp-chat/messages 队列分发到消息处理
      case "temp-chat/messages":
        handleNewMessage(data, destination);
        break;

      case "signals":
        handleNewHeartSignal(data);
        break;

      case "notifications":
        handleNewNotification(data);
        break;

      case "matches":
        handleNewMatch(data);
        break;

      case "temp-chat":
        handleTempChatEvent(data);
        break;

      case "checkin":
        handleCheckInEvent(data);
        break;

      // 2026-08-09 微信 1:1：对方正在输入事件（/user/queue/typing，后端暂无推送，
      // 订阅预留；后端推送 {sessionId, typing} 后自动生效，零风险）
      case "typing":
        handleTypingEvent(data);
        break;

      default:
        if (isDev) {
          console.warn(`[WebSocket] 未知队列类型: ${queueType}`);
        }
        // infra R2-00127: 未知队列类型可能预示后端契约变更或消息丢失，
        // 上报 Sentry 便于尽早发现，避免消息静默丢失。
        captureException(new Error(`[WebSocket] 未知队列类型: ${queueType}`), {
          source: "ws-store-dispatch",
          destination,
        });
    }
  } catch (error) {
    console.error(`[WebSocket] Store 分发异常 [${queueType}]:`, error);
  }
}

/**
 * 处理新私信消息
 *
 * 调用 useMessagesStore 的 onNewMessage 方法更新会话列表和消息。
 * 如果 Store 中没有 onNewMessage 方法，则直接更新 currentMessages。
 *
 * 使用类型守卫 isMessageItem 替代 `as MessageItem` 强制断言，
 * 确保运行时数据形状符合接口契约，避免脏数据污染 store。
 *
 * @param data - 解析后的消息数据
 */
export function handleNewMessage(data: unknown, destination = ""): void {
  try {
    // 修复（未读红点 BUG 1）：外部 WS 载荷先经转换层变为内部 MessageItem 形状
    // （real 私信 MessageView / temp ChatMessageView / mock 三形态），再经守卫校验。
    // 原实现直接对 raw 载荷跑 isMessageItem 守卫，real 载荷（conversationId/senderId/
    // messageKind/createdAt）与内部形状（sessionId/sender/kind/body/sentAt）不匹配，
    // 导致 WS 新消息被丢弃、未读红点不实时 +1。
    const item = fromWsPayload(data, destination);
    if (!item) {
      if (isDev) {
        console.warn("[WebSocket] 收到无法识别的私信消息数据，已忽略:", data);
      }
      // infra R2-00127: 数据形状不符契约时上报，便于发现前后端字段漂移
      captureException(new Error("[WebSocket] 非法私信消息数据"), {
        source: "ws-store-dispatch",
        payload: data,
      });
      return;
    }
    // 临时会话消息无法归因到会话（无 sessionId 且不在会话页）——预期降级，静默忽略；
    // temp 未读以服务端计数为准，进入会话时 loadSession 全量刷新兜底
    if (!item.sessionId) return;
    // 类型守卫：拒绝不符合 MessageItem 接口的数据（防御转换层自身缺陷）
    if (!isMessageItem(item)) {
      if (isDev) {
        console.warn("[WebSocket] 收到非法的私信消息数据，已忽略:", data);
      }
      // infra R2-00127: 数据形状不符契约时上报，便于发现前后端字段漂移
      captureException(new Error("[WebSocket] 非法私信消息数据"), {
        source: "ws-store-dispatch",
        payload: data,
      });
      return;
    }
    const message: MessageItem = item;
    const messagesStore = useMessagesStore();

    // 尝试调用 Store 的 onNewMessage 方法
    const storeAny = messagesStore as unknown as Record<string, unknown>;
    if (typeof storeAny.onNewMessage === "function") {
      (storeAny.onNewMessage as (msg: MessageItem) => void)(message);
    } else {
      // Store 没有 onNewMessage 方法，直接追加到当前消息列表
      messagesStore.currentMessages.push(message);

      // 更新会话的最后消息预览
      const session = messagesStore.sessions.find(
        (s) => s.id === message.sessionId
      );
      if (session) {
        session.lastMessagePreview =
          message.kind === "text"
            ? message.body
            : `[${message.kind}]`;
        session.lastMessageSentAt = message.sentAt;
        session.unreadCount += 1;
      }
    }

    if (isDev) {
      console.warn("[WebSocket] 收到新私信:", message.id);
    }
  } catch (error) {
    console.error("[WebSocket] 处理新私信异常:", error);
  }
}

/**
 * 处理新心动信号
 *
 * 调用 useLikesStore 的 onNewHeartSignal 方法更新心动信号列表。
 * 如果 Store 中没有 onNewHeartSignal 方法，则直接追加到 heartSignals。
 *
 * 使用类型守卫 isHeartSignal / isMessageHeartSignal 替代 `as` 断言，
 * 确保运行时数据形状符合接口契约。
 *
 * @param data - 解析后的消息数据
 */
export function handleNewHeartSignal(data: unknown): void {
  try {
    // 类型守卫：拒绝不符合 HeartSignal 接口的数据
    if (!isHeartSignal(data)) {
      if (isDev) {
        console.warn("[WebSocket] 收到非法的心动信号数据，已忽略:", data);
      }
      // infra R2-00127: 数据形状不符契约时上报
      captureException(new Error("[WebSocket] 非法心动信号数据"), {
        source: "ws-store-dispatch",
        payload: data,
      });
      return;
    }
    const signal: HeartSignal = data;
    const likesStore = useLikesStore();

    // 尝试调用 Store 的 onNewHeartSignal 方法
    const storeAny = likesStore as unknown as Record<string, unknown>;
    if (typeof storeAny.onNewHeartSignal === "function") {
      (storeAny.onNewHeartSignal as (signal: HeartSignal) => void)(signal);
    } else {
      // Store 没有 onNewHeartSignal 方法，直接追加
      likesStore.heartSignals.push(signal);
    }

    // 同时更新 messagesStore 中的心动信号（如果存在）
    // 使用 isMessageHeartSignal 类型守卫收敛，避免脏数据进入 messagesStore.heartSignals
    try {
      if (isMessageHeartSignal(data)) {
        const messagesStore = useMessagesStore();
        const msgSignal: MessageHeartSignal = data;
        if (
          !messagesStore.heartSignals.find(
            (s) => s.id === msgSignal.id
          )
        ) {
          messagesStore.heartSignals.push(msgSignal);
        }
      }
    } catch (_e) {
      // 静默处理
    }

    if (isDev) {
      console.warn("[WebSocket] 收到新心动信号:", signal.id);
    }
  } catch (error) {
    console.error("[WebSocket] 处理新心动信号异常:", error);
  }
}

/**
 * 处理新通知
 *
 * 调用 useMessagesStore 的 onNewNotification 方法更新通知列表。
 * 如果 Store 中没有 onNewNotification 方法，则直接追加到 notifications。
 *
 * 使用类型守卫 isSystemNotification 替代 `as SystemNotification` 断言，
 * 确保运行时数据形状符合接口契约。
 *
 * @param data - 解析后的消息数据
 */
export function handleNewNotification(data: unknown): void {
  try {
    // 类型守卫：拒绝不符合 SystemNotification 接口的数据
    if (!isSystemNotification(data)) {
      if (isDev) {
        console.warn("[WebSocket] 收到非法的通知数据，已忽略:", data);
      }
      // infra R2-00127: 数据形状不符契约时上报
      captureException(new Error("[WebSocket] 非法通知数据"), {
        source: "ws-store-dispatch",
        payload: data,
      });
      return;
    }
    const notification: SystemNotification = data;
    const messagesStore = useMessagesStore();

    // 尝试调用 Store 的 onNewNotification 方法
    const storeAny = messagesStore as unknown as Record<string, unknown>;
    if (typeof storeAny.onNewNotification === "function") {
      (storeAny.onNewNotification as (notif: SystemNotification) => void)(notification);
    } else {
      // Store 没有 onNewNotification 方法，直接追加
      if (
        !messagesStore.notifications.find(
          (n) => n.id === notification.id
        )
      ) {
        messagesStore.notifications.unshift(notification);
      }
    }

    if (isDev) {
      console.warn("[WebSocket] 收到新通知:", notification.id);
    }
  } catch (error) {
    console.error("[WebSocket] 处理新通知异常:", error);
  }
}

/**
 * 处理匹配成功事件（/queue/matches，R4-00175）。
 *
 * 后端 MatchRecorder 推送 {matchId, matchedUserId, type: "match_created"|"match_received"}。
 * 客户端在消息 Store 的通知列表前置一条「新的匹配」通知（按 matchId 去重），
 * 用户进入消息页即可看到匹配结果；列表数据仍以后端为准。
 *
 * @param data - 匹配事件数据（未知形状时忽略并上报）
 */
export function handleNewMatch(data: unknown): void {
  try {
    if (!data || typeof data !== "object") {
      if (isDev) {
        console.warn("[WebSocket] 收到非法的匹配事件数据，已忽略:", data);
      }
      captureException(new Error("[WebSocket] 非法匹配事件数据"), {
        source: "ws-store-dispatch",
        payload: data,
      });
      return;
    }
    const record = data as Record<string, unknown>;
    const matchId = String(record.matchId ?? "");
    if (!matchId) {
      // 契约漂移防御：无 matchId 时不构造通知
      captureException(new Error("[WebSocket] 匹配事件缺少 matchId"), {
        source: "ws-store-dispatch",
        payload: data,
      });
      return;
    }
    const messagesStore = useMessagesStore();
    // 按 matchId 去重，避免重复推送产生重复通知
    if (messagesStore.notifications.some((n) => n.id === matchId)) return;
    messagesStore.notifications.unshift({
      id: matchId,
      type: "match",
      title: t("messages.wsNewMatchTitle"),
      content: t("messages.wsNewMatchContent"),
      isRead: false,
      createdAt: new Date().toISOString(),
      actionUrl: "/pages/messages/index",
      signalType: "SOCIAL",
    });
    if (isDev) {
      console.warn("[WebSocket] 收到新匹配:", matchId);
    }
  } catch (error) {
    console.error("[WebSocket] 处理匹配事件异常:", error);
  }
}

/**
 * 处理临时会话事件（/queue/temp-chat，R4-00175）。
 *
 * 后端 TempChatSessionService/TempChatCleanupService 推送
 * {type: "session_created"|"session_closed", sessionId}。
 * 客户端收到后刷新会话列表（best-effort），确保匿名匹配会话
 * 创建/关闭后列表即时更新，无需手动刷新。
 *
 * @param data - 临时会话事件数据
 */
export function handleTempChatEvent(data: unknown): void {
  try {
    void useMessagesStore().fetchSessions();
    if (isDev) {
      console.warn("[WebSocket] 收到临时会话事件:", data);
    }
  } catch (error) {
    console.error("[WebSocket] 处理临时会话事件异常:", error);
  }
}

/**
 * 处理签到事件（/queue/checkin，R4-00175）。
 *
 * 后端 CheckInEventConsumer 在签到成功后推送，客户端刷新签到状态，
 * 使首页签到卡片即时更新（连签天数/奖励）。
 *
 * @param data - 签到事件数据
 */
export function handleCheckInEvent(data: unknown): void {
  try {
    void useCheckInStore().fetchStatus();
    if (isDev) {
      console.warn("[WebSocket] 收到签到事件:", data);
    }
  } catch (error) {
    console.error("[WebSocket] 处理签到事件异常:", error);
  }
}

/**
 * 处理对方正在输入事件（/queue/typing，2026-08-09 微信 1:1 预留，2026-08-10 B1④ 接通）。
 *
 * 载荷契约：{sessionId: string, typing: boolean}（后端 MessageWebSocketHandler.handleTyping
 * 推送，会话关系校验通过后转发）。会话页通过 messagesStore.typingMap 渲染「对方正在输入...」。
 * typing=true 由 store 侧 3s 自动复位兜底；typing=false 立即复位。
 *
 * @param data - 正在输入事件数据
 */
export function handleTypingEvent(data: unknown): void {
  try {
    if (!data || typeof data !== "object") {
      if (isDev) {
        console.warn("[WebSocket] 收到非法的 typing 事件数据，已忽略:", data);
      }
      captureException(new Error("[WebSocket] 非法 typing 事件数据"), {
        source: "ws-store-dispatch",
        payload: data,
      });
      return;
    }
    const record = data as Record<string, unknown>;
    if (typeof record.sessionId !== "string" || !record.sessionId) return;
    if (typeof record.typing !== "boolean") return;
    // 写入 messagesStore.typingMap，由会话页 watch 渲染「对方正在输入...」
    useMessagesStore().setSessionTyping(record.sessionId, record.typing);
    if (isDev && record.typing) {
      console.warn("[WebSocket] typing 事件:", record);
    }
  } catch (error) {
    console.error("[WebSocket] 处理 typing 事件异常:", error);
  }
}
