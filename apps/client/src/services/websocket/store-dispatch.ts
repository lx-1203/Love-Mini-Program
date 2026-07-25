/**
 * WebSocket 消息分发到 Pinia Store
 *
 * 集中维护 STOMP 消息到 Pinia Store 的分发逻辑：
 * - dispatchToStore：根据目标路径匹配队列类型并分发
 * - handleNewMessage：私信消息 → useMessagesStore
 * - handleNewHeartSignal：心动信号 → useLikesStore + useMessagesStore
 * - handleNewNotification：通知 → useMessagesStore
 *
 * 这些函数均为纯逻辑（无 WebSocket 状态），由 index.ts 中的
 * WebSocketClient 在收到 STOMP MESSAGE 帧时调用。
 *
 * 后端推送路径：
 * - /user/{userId}/queue/messages    私信消息
 * - /user/{userId}/queue/signals     心动信号
 * - /user/{userId}/queue/notifications 通知
 */

import { useMessagesStore } from "../../stores/messages";
import { useLikesStore } from "../../stores/likes";
import type {
  MessageItem,
  MessageHeartSignal,
  SystemNotification,
} from "../../stores/messages";
import type { HeartSignal } from "../../stores/likes";

/**
 * 将消息分发到对应的 Pinia Store
 *
 * 根据目标路径判断消息类型，调用对应 Store 的回调方法：
 * - /user/queue/messages    -> handleNewMessage
 * - /user/queue/signals     -> handleNewHeartSignal
 * - /user/queue/notifications -> handleNewNotification
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
  const queueMatch = destination.match(/\/queue\/(\w+)$/);
  if (!queueMatch) return;

  const queueType = queueMatch[1];

  try {
    switch (queueType) {
      case "messages":
        handleNewMessage(data);
        break;

      case "signals":
        handleNewHeartSignal(data);
        break;

      case "notifications":
        handleNewNotification(data);
        break;

      default:
        console.warn(`[WebSocket] 未知队列类型: ${queueType}`);
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
 * @param data - 解析后的消息数据
 */
export function handleNewMessage(data: unknown): void {
  try {
    const messagesStore = useMessagesStore();
    const message = data as MessageItem;

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

    console.log("[WebSocket] 收到新私信:", message.id);
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
 * @param data - 解析后的消息数据
 */
export function handleNewHeartSignal(data: unknown): void {
  try {
    const likesStore = useLikesStore();
    const signal = data as HeartSignal;

    // 尝试调用 Store 的 onNewHeartSignal 方法
    const storeAny = likesStore as unknown as Record<string, unknown>;
    if (typeof storeAny.onNewHeartSignal === "function") {
      (storeAny.onNewHeartSignal as (signal: HeartSignal) => void)(signal);
    } else {
      // Store 没有 onNewHeartSignal 方法，直接追加
      likesStore.heartSignals.push(signal);
    }

    // 同时更新 messagesStore 中的心动信号（如果存在）
    try {
      const messagesStore = useMessagesStore();
      const msgSignal = data as MessageHeartSignal;
      if (
        !messagesStore.heartSignals.find(
          (s) => s.id === msgSignal.id
        )
      ) {
        messagesStore.heartSignals.push(msgSignal);
      }
    } catch (_e) {
      // 静默处理
    }

    console.log("[WebSocket] 收到新心动信号:", signal.id);
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
 * @param data - 解析后的消息数据
 */
export function handleNewNotification(data: unknown): void {
  try {
    const messagesStore = useMessagesStore();
    const notification = data as SystemNotification;

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

    console.log("[WebSocket] 收到新通知:", notification.id);
  } catch (error) {
    console.error("[WebSocket] 处理新通知异常:", error);
  }
}
