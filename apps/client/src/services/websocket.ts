/**
 * WebSocket 前端客户端（STOMP 简化版）
 *
 * 基于 uni.connectSocket() 实现的 WebSocket 管理器，
 * 支持简化的 STOMP 协议帧格式，与后端 Spring WebSocket + STOMP 通信。
 *
 * 由于 uni-app（微信小程序）不支持 SockJS 和原生 STOMP 库，
 * 本模块手动构建 STOMP 帧，通过原始 WebSocket 文本帧发送/接收。
 *
 * 后端配置参考:
 * - 端点: /ws (WebSocketConfig.java)
 * - 消息代理前缀: /topic, /queue
 * - 应用目标前缀: /app
 * - 用户目标前缀: /user
 * - 推送路径:
 *   - 私信: /user/{userId}/queue/messages
 *   - 心动信号: /user/{userId}/queue/signals
 *   - 通知: /user/{userId}/queue/notifications
 */
import { appEnv } from "./env";
import { getToken } from "./http";
import { useMessagesStore } from "../stores/messages";
import { useLikesStore } from "../stores/likes";
import type {
  MessageItem,
  MessageHeartSignal,
  SystemNotification,
} from "../stores/messages";
import type { HeartSignal } from "../stores/likes";

/* ========== STOMP 帧格式工具 ========== */

/** STOMP 帧结束标记 */
const FRAME_NULL_CHAR = "\x00";

/** STOMP 换行符 */
const LINE_BREAK = "\n";

/**
 * 构建 STOMP 帧
 *
 * STOMP 帧格式:
 * COMMAND\n
 * header1:value1\n
 * header2:value2\n
 * \n
 * body\x00
 *
 * @param command - STOMP 命令（CONNECT, SUBSCRIBE, SEND, DISCONNECT 等）
 * @param headers - 帧头键值对
 * @param body - 帧体内容
 * @returns 完整的 STOMP 帧字符串
 */
function buildFrame(
  command: string,
  headers: Record<string, string> = {},
  body: string = ""
): string {
  let frame = command + LINE_BREAK;

  for (const [key, value] of Object.entries(headers)) {
    // STOMP 帧头中需要转义的反义字符
    const escapedKey = key
      .replace(/\\/g, "\\\\")
      .replace(/:/g, "\\c")
      .replace(/\n/g, "\\n");
    const escapedValue = value
      .replace(/\\/g, "\\\\")
      .replace(/:/g, "\\c")
      .replace(/\n/g, "\\n");
    frame += `${escapedKey}:${escapedValue}${LINE_BREAK}`;
  }

  frame += LINE_BREAK; // 空行分隔头部和体
  frame += body;
  frame += FRAME_NULL_CHAR;

  return frame;
}

/**
 * 解析 STOMP 帧
 *
 * 将后端返回的 STOMP 帧文本解析为结构化对象。
 * 支持一次接收多个帧（以 NULL 字符分隔）。
 *
 * @param raw - 原始 STOMP 帧文本
 * @returns 解析后的帧数组
 */
function parseFrames(raw: string): StompFrame[] {
  const frames: StompFrame[] = [];

  // STOMP 帧以 NULL 字符 (\x00) 分隔
  const segments = raw.split(FRAME_NULL_CHAR);

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    try {
      const lines = trimmed.split(LINE_BREAK);
      if (lines.length === 0) continue;

      const command = lines[0].trim();
      const headers: Record<string, string> = {};
      let bodyStartIndex = 1;

      // 解析头部：以空行作为头部与体的分隔
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === "") {
          bodyStartIndex = i + 1;
          break;
        }

        const colonIndex = line.indexOf(":");
        if (colonIndex > -1) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          headers[key] = value;
        }
      }

      // 解析体
      const bodyLines = lines.slice(bodyStartIndex);
      const body = bodyLines.join(LINE_BREAK);

      frames.push({ command, headers, body });
    } catch (error) {
      console.warn("[STOMP] 帧解析异常:", error, "原始数据:", trimmed);
    }
  }

  return frames;
}

/**
 * STOMP 帧结构
 */
interface StompFrame {
  /** STOMP 命令 */
  command: string;
  /** 帧头 */
  headers: Record<string, string>;
  /** 帧体 */
  body: string;
}

/* ========== 连接配置 ========== */

/** 最大重连次数 */
const MAX_RECONNECT_ATTEMPTS = 5;

/** 重连间隔（毫秒），固定 3 秒 */
const RECONNECT_INTERVAL_MS = 3000;

/** 心跳间隔（毫秒） */
const HEARTBEAT_INTERVAL_MS = 30000;

/** 心跳超时（毫秒） */
const HEARTBEAT_TIMEOUT_MS = 10000;

/** STOMP 协议版本 */
const STOMP_VERSION = "1.2";

/** 订阅 ID 前缀 */
const SUBSCRIPTION_ID_PREFIX = "sub-";

/** 自动递增的订阅计数器 */
let subscriptionCounter = 0;

/* ========== 消息类型定义 ========== */

/**
 * WebSocket 连接状态
 */
export type WsConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

/**
 * 连接状态变更回调
 */
export type ConnectionStateCallback = (state: WsConnectionState) => void;

/**
 * 通用消息回调
 */
export type MessageCallback = (data: unknown) => void;

/* ========== WebSocket 客户端类 ========== */

/**
 * WebSocket 客户端（STOMP 简化版）
 *
 * 封装 uni.connectSocket()，实现简化的 STOMP 协议通信，
 * 提供自动重连、心跳检测、频道订阅和消息分发功能。
 *
 * 使用方式:
 * ```ts
 * import { wsClient } from "@/services/websocket";
 *
 * // 登录成功后连接
 * wsClient.connect(token);
 *
 * // 登出时断开
 * wsClient.disconnect();
 *
 * // 检查连接状态
 * if (wsClient.isConnected()) { ... }
 * ```
 */
class WebSocketClient {
  /** WebSocket 连接实例 */
  private socketTask: UniApp.SocketTask | null = null;

  /** 连接状态 */
  private connectionState: WsConnectionState = "disconnected";

  /** 重连次数 */
  private reconnectAttempts = 0;

  /** 重连定时器 */
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** 心跳定时器 */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /** 心跳超时定时器 */
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  /** 是否手动关闭（手动关闭不触发自动重连） */
  private manualClose = false;

  /** 当前认证 token */
  private currentToken = "";

  /** 当前订阅映射：订阅 ID -> 目标路径 */
  private subscriptions: Map<string, string> = new Map();

  /** 频道消息回调映射：目标路径 -> 回调列表 */
  private channelCallbacks: Map<string, MessageCallback[]> = new Map();

  /** 连接状态变更回调列表 */
  private stateChangeCallbacks: ConnectionStateCallback[] = [];

  /** STOMP 会话是否已建立（收到 CONNECTED 帧后为 true） */
  private stompSessionReady = false;

  /** 待重播的订阅（重连后自动重新订阅） */
  private pendingSubscriptions: Map<string, string> = new Map();

  /* ========== 公共方法 ========== */

  /**
   * 连接 WebSocket
   *
   * 建立 WebSocket 连接，成功后发送 STOMP CONNECT 帧，
   * 收到 CONNECTED 响应后自动订阅用户私有频道。
   *
   * @param token - 认证 token（JWT），用于在连接 URL 中传递认证信息
   */
  connect(token: string): void {
    if (this.connectionState === "connected" || this.connectionState === "connecting") {
      console.warn("[WebSocket] 已存在活跃连接或正在连接中，跳过重复连接");
      return;
    }

    if (!token || token.trim().length === 0) {
      console.error("[WebSocket] token 为空，无法建立连接");
      return;
    }

    this.currentToken = token;
    this.manualClose = false;
    this.stompSessionReady = false;
    this.setConnectionState("connecting");

    // 构建 WebSocket URL
    // 后端 WebSocketConfig 注册的端点是 /ws，支持 SockJS 降级
    // uni-app 不支持 SockJS，直接使用原生 WebSocket 连接
    // Spring 在 /ws 端点也支持原生 WebSocket（通过 /ws/websocket 路径）
    const baseUrl = appEnv.apiBaseUrl.replace(/^http/, "ws");
    const wsUrl = `${baseUrl}/ws/websocket?token=${encodeURIComponent(token)}`;

    console.log("[WebSocket] 正在连接:", wsUrl);

    try {
      this.socketTask = uni.connectSocket({
        url: wsUrl,
        success: () => {
          console.log("[WebSocket] 连接请求已发送");
        },
        fail: (err) => {
          console.error("[WebSocket] 连接请求失败:", err);
          this.handleReconnect();
        },
      });

      // 注册事件监听
      this.socketTask.onOpen(() => {
        this.onSocketOpen();
      });

      this.socketTask.onMessage((res) => {
        this.onSocketMessage(res);
      });

      this.socketTask.onClose((res) => {
        this.onSocketClose(res);
      });

      this.socketTask.onError((err) => {
        this.onSocketError(err);
      });
    } catch (error) {
      console.error("[WebSocket] 创建连接异常:", error);
      this.handleReconnect();
    }
  }

  /**
   * 断开连接
   *
   * 发送 STOMP DISCONNECT 帧后关闭 WebSocket 连接，
   * 清理所有定时器和订阅状态。
   */
  disconnect(): void {
    this.manualClose = true;

    // 如果 STOMP 会话已建立，先发送 DISCONNECT 帧
    if (this.stompSessionReady && this.socketTask) {
      try {
        const receiptId = `disconnect-${Date.now()}`;
        const disconnectFrame = buildFrame(
          "DISCONNECT",
          { receipt: receiptId },
          ""
        );
        this.socketTask.send({
          data: disconnectFrame,
          fail: () => {
            // 发送失败时静默处理，继续关闭连接
          },
        });
      } catch {
        // DISCONNECT 帧发送失败，继续关闭
      }
    }

    this.cleanup();
    this.closeSocket();

    this.stompSessionReady = false;
    this.setConnectionState("disconnected");
    console.log("[WebSocket] 已断开连接");
  }

  /**
   * 获取当前连接状态
   * @returns 是否已连接
   */
  isConnected(): boolean {
    return this.connectionState === "connected" && this.stompSessionReady;
  }

  /**
   * 获取详细连接状态
   * @returns 连接状态枚举值
   */
  getConnectionState(): WsConnectionState {
    return this.connectionState;
  }

  /**
   * 注册连接状态变更回调
   * @param callback - 状态变更回调函数
   */
  onStateChange(callback: ConnectionStateCallback): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * 移除连接状态变更回调
   * @param callback - 要移除的回调函数
   */
  offStateChange(callback: ConnectionStateCallback): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * 订阅指定频道
   *
   * 发送 STOMP SUBSCRIBE 帧，订阅后端消息队列。
   * 订阅信息会被保存，重连后自动重新订阅。
   *
   * @param destination - 目标路径（如 /user/queue/messages）
   * @param callback - 消息回调函数
   * @returns 订阅 ID，可用于取消订阅
   */
  subscribe(destination: string, callback: MessageCallback): string {
    const subId = `${SUBSCRIPTION_ID_PREFIX}${++subscriptionCounter}`;

    // 保存订阅信息（用于重连后重新订阅）
    this.pendingSubscriptions.set(subId, destination);
    this.subscriptions.set(subId, destination);

    // 注册频道回调
    if (!this.channelCallbacks.has(destination)) {
      this.channelCallbacks.set(destination, []);
    }
    this.channelCallbacks.get(destination)!.push(callback);

    // 如果已连接，立即发送 SUBSCRIBE 帧
    if (this.isConnected()) {
      this.sendSubscribeFrame(subId, destination);
    }

    console.log(`[WebSocket] 订阅频道: ${destination}, subId: ${subId}`);
    return subId;
  }

  /**
   * 取消订阅
   *
   * 发送 STOMP UNSUBSCRIBE 帧，取消指定订阅。
   *
   * @param subId - 订阅 ID（由 subscribe 方法返回）
   */
  unsubscribe(subId: string): void {
    const destination = this.subscriptions.get(subId);
    if (!destination) {
      console.warn(`[WebSocket] 未找到订阅: ${subId}`);
      return;
    }

    // 从映射中移除
    this.subscriptions.delete(subId);
    this.pendingSubscriptions.delete(subId);

    // 移除频道回调
    const callbacks = this.channelCallbacks.get(destination);
    if (callbacks) {
      // 由于同一个 destination 可能有多个订阅，只移除对应的回调
      // 这里简化处理：如果该 destination 没有更多订阅，清除所有回调
      const hasOtherSubscription = Array.from(this.subscriptions.values()).includes(destination);
      if (!hasOtherSubscription) {
        this.channelCallbacks.delete(destination);
      }
    }

    // 如果已连接，发送 UNSUBSCRIBE 帧
    if (this.isConnected() && this.socketTask) {
      try {
        const unsubFrame = buildFrame("UNSUBSCRIBE", { id: subId }, "");
        this.socketTask.send({
          data: unsubFrame,
          fail: () => {
            // 发送失败时静默处理
          },
        });
      } catch {
        // 静默处理
      }
    }

    console.log(`[WebSocket] 取消订阅: ${destination}, subId: ${subId}`);
  }

  /**
   * 发送消息到指定目标
   *
   * 发送 STOMP SEND 帧，将消息推送到后端指定路径。
   *
   * @param destination - 目标路径（如 /app/chat/send）
   * @param body - 消息体（对象，会自动序列化为 JSON）
   */
  send(destination: string, body: Record<string, unknown> = {}): void {
    if (!this.isConnected() || !this.socketTask) {
      console.warn("[WebSocket] 未连接，无法发送消息");
      return;
    }

    try {
      const bodyStr = JSON.stringify(body);
      const sendFrame = buildFrame(
        "SEND",
        {
          destination,
          "content-type": "application/json",
        },
        bodyStr
      );

      this.socketTask.send({
        data: sendFrame,
        success: () => {
          // 发送成功
        },
        fail: (err) => {
          console.error("[WebSocket] 发送消息失败:", err);
        },
      });
    } catch (error) {
      console.error("[WebSocket] 发送消息异常:", error);
    }
  }

  /* ========== 内部方法：WebSocket 事件处理 ========== */

  /**
   * WebSocket 连接打开回调
   *
   * 连接建立后，发送 STOMP CONNECT 帧进行握手。
   */
  private onSocketOpen(): void {
    console.log("[WebSocket] TCP 连接已建立，发送 STOMP CONNECT 帧");

    // 发送 STOMP CONNECT 帧
    const connectFrame = buildFrame(
      "CONNECT",
      {
        "accept-version": STOMP_VERSION,
        "heart-beat": `${HEARTBEAT_INTERVAL_MS},${HEARTBEAT_INTERVAL_MS}`,
        // 通过 header 传递 token（部分 Spring 配置支持）
        Authorization: `Bearer ${this.currentToken}`,
      },
      ""
    );

    if (this.socketTask) {
      this.socketTask.send({
        data: connectFrame,
        success: () => {
          console.log("[WebSocket] STOMP CONNECT 帧已发送");
        },
        fail: (err) => {
          console.error("[WebSocket] STOMP CONNECT 帧发送失败:", err);
          this.handleReconnect();
        },
      });
    }
  }

  /**
   * WebSocket 收到消息回调
   *
   * 解析 STOMP 帧，根据命令类型分发处理。
   */
  private onSocketMessage(res: UniApp.OnSocketMessageCallbackResult): void {
    try {
      const rawData = res.data as string;
      const frames = parseFrames(rawData);

      for (const frame of frames) {
        this.handleStompFrame(frame);
      }
    } catch (error) {
      console.warn("[WebSocket] 消息处理异常:", error, res.data);
    }
  }

  /**
   * WebSocket 连接关闭回调
   */
  private onSocketClose(res: { code: number; reason: string }): void {
    console.log("[WebSocket] 连接已关闭:", res.code, res.reason);
    this.stompSessionReady = false;
    this.setConnectionState("disconnected");
    this.cleanup();

    if (!this.manualClose) {
      this.handleReconnect();
    }
  }

  /**
   * WebSocket 连接错误回调
   */
  private onSocketError(err: UniApp.GeneralCallbackResult): void {
    console.error("[WebSocket] 连接错误:", err);
    this.stompSessionReady = false;

    if (!this.manualClose) {
      this.handleReconnect();
    }
  }

  /* ========== 内部方法：STOMP 帧处理 ========== */

  /**
   * 处理单个 STOMP 帧
   *
   * 根据帧命令类型执行对应逻辑：
   * - CONNECTED: STOMP 握手成功，启动心跳，订阅频道
   * - MESSAGE: 收到消息，分发到对应频道回调
   * - RECEIPT: 服务器确认收到
   * - ERROR: 服务器错误
   * - HEARTBEAT: 心跳帧
   *
   * @param frame - 解析后的 STOMP 帧
   */
  private handleStompFrame(frame: StompFrame): void {
    switch (frame.command) {
      case "CONNECTED":
        this.onStompConnected(frame);
        break;

      case "MESSAGE":
        this.onStompMessage(frame);
        break;

      case "RECEIPT":
        this.onStompReceipt(frame);
        break;

      case "ERROR":
        this.onStompError(frame);
        break;

      default:
        // 心跳帧（空行或 \n）或其他未知帧，忽略
        break;
    }
  }

  /**
   * STOMP CONNECTED 帧处理
   *
   * 握手成功后：
   * 1. 标记会话就绪
   * 2. 重置重连计数
   * 3. 启动心跳
   * 4. 订阅用户私有频道
   * 5. 集成 Pinia Store
   */
  private onStompConnected(frame: StompFrame): void {
    console.log("[WebSocket] STOMP 会话已建立:", frame.headers);
    this.stompSessionReady = true;
    this.reconnectAttempts = 0;
    this.setConnectionState("connected");

    // 启动心跳
    this.startHeartbeat();

    // 重新订阅所有待重播的频道
    this.resubscribeAll();

    // 订阅用户私有频道并集成 Pinia Store
    this.setupUserSubscriptions();
  }

  /**
   * STOMP MESSAGE 帧处理
   *
   * 解析消息体，根据目标路径分发到对应回调。
   */
  private onStompMessage(frame: StompFrame): void {
    const destination = frame.headers["destination"] || "";

    try {
      // 尝试解析 JSON 消息体
      const data = frame.body ? JSON.parse(frame.body) : null;

      // 分发到频道回调
      const callbacks = this.channelCallbacks.get(destination);
      if (callbacks) {
        for (const callback of callbacks) {
          try {
            callback(data);
          } catch (error) {
            console.error(
              `[WebSocket] 频道回调执行异常 [${destination}]:`,
              error
            );
          }
        }
      }

      // 同时检查带用户前缀的路径匹配
      // 后端推送路径格式: /user/{userId}/queue/xxx
      // 但 STOMP MESSAGE 帧的 destination 可能是 /user/queue/xxx（Spring 简化格式）
      this.dispatchToStore(destination, data);
    } catch (error) {
      console.warn(
        `[WebSocket] 消息解析失败 [${destination}]:`,
        error,
        frame.body
      );
    }
  }

  /**
   * STOMP RECEIPT 帧处理
   *
   * 服务器确认收到客户端的请求（如 SUBSCRIBE, UNSUBSCRIBE, DISCONNECT）。
   */
  private onStompReceipt(frame: StompFrame): void {
    const receiptId = frame.headers["receipt-id"] || "";
    console.log(`[WebSocket] 收到 RECEIPT: ${receiptId}`);
  }

  /**
   * STOMP ERROR 帧处理
   *
   * 服务器返回错误，记录日志并可能触发重连。
   */
  private onStompError(frame: StompFrame): void {
    const message = frame.headers["message"] || "未知错误";
    const body = frame.body || "";
    console.error(`[WebSocket] STOMP ERROR: ${message}`, body);

    // 认证类错误，不重连
    if (message.includes("Unauthorized") || message.includes("401")) {
      console.error("[WebSocket] 认证失败，停止重连");
      this.manualClose = true;
      this.disconnect();
      return;
    }

    // 其他错误，尝试重连
    if (!this.manualClose) {
      this.stompSessionReady = false;
      this.handleReconnect();
    }
  }

  /* ========== 内部方法：订阅管理 ========== */

  /**
   * 发送 STOMP SUBSCRIBE 帧
   *
   * @param subId - 订阅 ID
   * @param destination - 目标路径
   */
  private sendSubscribeFrame(subId: string, destination: string): void {
    if (!this.socketTask) return;

    try {
      const subFrame = buildFrame(
        "SUBSCRIBE",
        {
          id: subId,
          destination,
        },
        ""
      );

      this.socketTask.send({
        data: subFrame,
        success: () => {
          console.log(`[WebSocket] SUBSCRIBE 帧已发送: ${destination}`);
        },
        fail: (err) => {
          console.error(`[WebSocket] SUBSCRIBE 帧发送失败: ${destination}`, err);
        },
      });
    } catch (error) {
      console.error(`[WebSocket] SUBSCRIBE 帧发送异常: ${destination}`, error);
    }
  }

  /**
   * 重连后重新订阅所有频道
   */
  private resubscribeAll(): void {
    for (const [subId, destination] of this.pendingSubscriptions.entries()) {
      this.sendSubscribeFrame(subId, destination);
    }
  }

  /**
   * 订阅用户私有频道并集成 Pinia Store
   *
   * 订阅三个用户频道：
   * - /user/queue/messages: 接收私信
   * - /user/queue/signals: 接收心动信号
   * - /user/queue/notifications: 接收通知
   *
   * 收到消息后自动调用对应 Store 的方法更新状态。
   */
  private setupUserSubscriptions(): void {
    // 订阅私信频道
    this.subscribe("/user/queue/messages", (data) => {
      this.dispatchToStore("/user/queue/messages", data);
    });

    // 订阅心动信号频道
    this.subscribe("/user/queue/signals", (data) => {
      this.dispatchToStore("/user/queue/signals", data);
    });

    // 订阅通知频道
    this.subscribe("/user/queue/notifications", (data) => {
      this.dispatchToStore("/user/queue/notifications", data);
    });
  }

  /**
   * 将消息分发到对应的 Pinia Store
   *
   * 根据目标路径判断消息类型，调用对应 Store 的回调方法：
   * - /user/queue/messages -> useMessagesStore().onNewMessage()
   * - /user/queue/signals -> useLikesStore().onNewHeartSignal()
   * - /user/queue/notifications -> useMessagesStore().onNewNotification()
   *
   * @param destination - STOMP 消息的目标路径
   * @param data - 解析后的消息数据
   */
  private dispatchToStore(destination: string, data: unknown): void {
    // 匹配路径：Spring 可能发送 /user/queue/xxx 或 /user/{userId}/queue/xxx
    // 统一匹配 queue/ 后面的部分
    const queueMatch = destination.match(/\/queue\/(\w+)$/);
    if (!queueMatch) return;

    const queueType = queueMatch[1];

    try {
      switch (queueType) {
        case "messages":
          this.handleNewMessage(data);
          break;

        case "signals":
          this.handleNewHeartSignal(data);
          break;

        case "notifications":
          this.handleNewNotification(data);
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
   */
  private handleNewMessage(data: unknown): void {
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
   */
  private handleNewHeartSignal(data: unknown): void {
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
      } catch {
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
   */
  private handleNewNotification(data: unknown): void {
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

  /* ========== 内部方法：重连机制 ========== */

  /**
   * 处理自动重连
   *
   * 固定 3 秒间隔重连，最多 5 次。
   * 重连时使用当前保存的 token，如果 token 无效则跳过。
   */
  private handleReconnect(): void {
    if (this.manualClose) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("[WebSocket] 已达最大重连次数，停止重连");
      this.setConnectionState("disconnected");
      return;
    }

    this.reconnectAttempts += 1;
    this.setConnectionState("reconnecting");

    console.log(
      `[WebSocket] 将在 ${RECONNECT_INTERVAL_MS}ms 后进行第 ${this.reconnectAttempts} 次重连`
    );

    this.reconnectTimer = setTimeout(() => {
      // 重新获取最新 token
      const token = this.currentToken || getToken();
      if (token) {
        this.connect(token);
      } else {
        console.warn("[WebSocket] 无有效 token，跳过重连");
        this.setConnectionState("disconnected");
      }
    }, RECONNECT_INTERVAL_MS);
  }

  /* ========== 内部方法：心跳机制 ========== */

  /**
   * 启动心跳
   *
   * 定期发送 STOMP 心跳帧（空行 \n），
   * 如果在超时时间内未收到服务器响应，则触发重连。
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected() || !this.socketTask) return;

      try {
        // STOMP 心跳帧：发送换行符
        this.socketTask.send({
          data: LINE_BREAK,
          fail: (err) => {
            console.warn("[WebSocket] 心跳发送失败:", err);
          },
        });
      } catch {
        // 心跳发送异常，静默处理
      }

      // 设置心跳超时检测
      this.heartbeatTimeoutTimer = setTimeout(() => {
        console.warn("[WebSocket] 心跳超时，将重连");
        this.stompSessionReady = false;
        this.cleanup();
        this.handleReconnect();
      }, HEARTBEAT_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.resetHeartbeatTimeout();
  }

  /**
   * 重置心跳超时（收到服务器消息时调用）
   */
  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /* ========== 内部方法：状态和清理 ========== */

  /**
   * 设置连接状态并通知监听者
   *
   * @param state - 新的连接状态
   */
  private setConnectionState(state: WsConnectionState): void {
    const prevState = this.connectionState;
    this.connectionState = state;

    // 仅在状态实际变更时通知
    if (prevState !== state) {
      for (const callback of this.stateChangeCallbacks) {
        try {
          callback(state);
        } catch (error) {
          console.error("[WebSocket] 状态变更回调异常:", error);
        }
      }
    }
  }

  /**
   * 清理定时器和内部状态（不断开 WebSocket 连接）
   */
  private cleanup(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 关闭 WebSocket 连接
   */
  private closeSocket(): void {
    if (this.socketTask) {
      try {
        this.socketTask.close({
          code: 1000,
          reason: "客户端主动关闭",
        });
      } catch {
        // 关闭失败时静默处理
      }
      this.socketTask = null;
    }
  }
}

/* ========== 导出单例 ========== */

/**
 * WebSocket 客户端单例实例
 *
 * 全局共享的 WebSocket 连接管理器，支持 STOMP 简化协议。
 *
 * 使用示例:
 * ```ts
 * import { wsClient } from "@/services/websocket";
 *
 * // 登录成功后连接
 * wsClient.connect(token);
 *
 * // 发送消息
 * wsClient.send("/app/chat/send", { content: "你好" });
 *
 * // 登出时断开
 * wsClient.disconnect();
 * ```
 */
export const wsClient = new WebSocketClient();
