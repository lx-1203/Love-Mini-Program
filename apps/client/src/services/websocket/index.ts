/**
 * WebSocket 客户端主体实现（STOMP 简化版）
 *
 * 基于 uni.connectSocket() 实现的 WebSocket 管理器，
 * 支持简化的 STOMP 协议帧格式，与后端 Spring WebSocket + STOMP 通信。
 *
 * 由于 uni-app（微信小程序）不支持 SockJS 和原生 STOMP 库，
 * 本模块手动构建 STOMP 帧，通过原始 WebSocket 文本帧发送/接收。
 *
 * 模块拆分结构：
 * - ./types            类型定义（StompFrame / WsConnectionState 等）
 * - ./constants        协议常量（心跳间隔 / 重连参数 / 帧分隔符等）
 * - ./transport        STOMP 帧编解码 + WebSocket 连接构造
 * - ./state-machine    连接状态机（状态存储与回调分发）
 * - ./heartbeat        心跳管理器（ping/pong 与超时检测）
 * - ./reconnect        重连管理器（次数计数与定时器）
 * - ./store-dispatch   Pinia Store 消息分发
 * - ./index.ts         本文件：WebSocketClient 主体实现
 *
 * 通过 services/websocket.ts re-export，保持外部 import 路径完全兼容：
 *   import { wsClient } from "@/services/websocket";
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
 *
 * Token 传递方式（Phase 3 任务 15）:
 * - HTTP 握手阶段: 通过 WebSocket 子协议（Sec-WebSocket-Protocol 头）传递 `bearer.${token}`
 * - STOMP 会话阶段: 通过 CONNECT 帧 Authorization header 传递 `Bearer ${token}`
 * - 不再使用 URL 查询参数 `?token=xxx`，避免 token 泄漏到日志/Referer/浏览器历史
 */

import { getToken } from "../http";
import { isDev } from "../env";
import {
  HEARTBEAT_INTERVAL_MS,
  STOMP_VERSION,
  SUBSCRIPTION_ID_PREFIX,
} from "./constants";
import {
  buildFrame,
  buildProtocols,
  buildWsUrl,
  createSocketTask,
  isPongMessage,
  parseFrames,
} from "./transport";
import { ConnectionStateMachine } from "./state-machine";
import { HeartbeatManager, buildPingPayload } from "./heartbeat";
import { ReconnectManager } from "./reconnect";
import { dispatchToStore } from "./store-dispatch";
import type {
  ConnectionStateCallback,
  MessageCallback,
  StompFrame,
  WsConnectionState,
} from "./types";

/**
 * DISCONNECT 帧发出后延迟关闭底层连接的毫秒数。
 * 修复（P1 BUG）：立即 closeSocket 会截断 DISCONNECT 帧的发送，
 * 服务端无法感知正常下线；延迟 300ms 给帧留出发送窗口。
 */
const DISCONNECT_CLOSE_DELAY_MS = 300;

/**
 * WebSocket 状态/信息日志出口。
 *
 * infra R2-00123: 连接/断开/订阅等状态日志原直接 console.warn 输出，
 * 生产环境亦可见（信息类噪音，且可能暴露目标地址等细节）。统一收敛到 wsTrace()：
 * - 仅开发环境输出，生产环境静默；
 * - 错误类日志（console.error）保持全环境输出，便于问题排查。
 */
function wsTrace(...args: unknown[]): void {
  if (!isDev) return;
  console.warn("[WebSocket]", ...args);
}

/** 自动递增的订阅计数器（模块级单例） */
let subscriptionCounter = 0;

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

  /** 连接状态机 */
  private stateMachine = new ConnectionStateMachine();

  /** 重连管理器 */
  private reconnectManager = new ReconnectManager({
    // infra R2-00125: 重连次数耗尽时输出降级提示并保持 disconnected 状态，
    // 业务方可监听 onStateChange 感知“已停止自动重连”，再手动 connect(token) 重试。
    onExhausted: () => {
      wsTrace("已达最大重连次数，已停止自动重连；可手动调用 connect(token) 重试");
    },
  });

  /** 心跳管理器 */
  private heartbeatManager = new HeartbeatManager();

  /** 是否手动关闭（手动关闭不触发自动重连） */
  private manualClose = false;

  /** 当前认证 token */
  private currentToken = "";

  /** 当前订阅映射：订阅 ID -> 目标路径 */
  private subscriptions: Map<string, string> = new Map();

  /** 频道消息回调映射：目标路径 -> 回调列表 */
  private channelCallbacks: Map<string, MessageCallback[]> = new Map();

  /** STOMP 会话是否已建立（收到 CONNECTED 帧后为 true） */
  private stompSessionReady = false;

  /** 待重播的订阅（重连后自动重新订阅） */
  private pendingSubscriptions: Map<string, string> = new Map();

  /** 订阅 ID -> 回调 映射（修复：unsubscribe 时按 subId 精确移除回调，避免回调泄漏） */
  private subIdCallbacks: Map<string, MessageCallback> = new Map();

  /**
   * 重连防重入标志。
   * 修复（P1 BUG）：error 与 close 事件在部分平台会先后触发（error→close），
   * 原实现两处都调用 handleReconnect，attempts 被双倍消耗（退避进度翻倍、
   * 最大重连次数提前耗尽）。置位后重复触发直接忽略，定时器回调执行时复位。
   */
  private reconnectScheduled = false;

  /** CONNECT 握手超时定时器（修复：握手无响应时避免状态机永久卡 connecting） */
  private connectHandshakeTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 延迟关闭底层连接的定时器引用。
   * infra R2-00124: 原 disconnect 内 setTimeout 未保存引用，快速重连/再次 disconnect
   * 时旧定时器可能把新建立的连接关掉；现保存引用并在 cleanup() 中统一取消。
   */
  private disconnectCloseTimer: ReturnType<typeof setTimeout> | null = null;

  /** CONNECT 握手超时时间（毫秒）：TCP 建立后 10s 内未收到 CONNECTED 帧即判定失败 */
  private static readonly CONNECT_HANDSHAKE_TIMEOUT_MS = 10000;

  /* ========== 公共方法 ========== */

  /**
   * 连接 WebSocket
   *
   * 建立 WebSocket 连接，成功后发送 STOMP CONNECT 帧，
   * 收到 CONNECTED 响应后自动订阅用户私有频道。
   *
   * token 传递方式（Phase 3 任务 15 重构）:
   * 1. WebSocket 子协议（Sec-WebSocket-Protocol 头）: `bearer.${token}`，用于 HTTP 握手阶段校验
   * 2. STOMP CONNECT 帧 Authorization header: `Bearer ${token}`，用于 STOMP 会话认证
   *
   * 安全说明:
   * - 不再通过 URL 查询参数 `?token=xxx` 传递，避免 token 出现在日志、Referer、浏览器历史中
   * - 子协议方案兼容小程序（uni.connectSocket）和 H5 环境
   *
   * @param token - 认证 token（JWT）
   */
  connect(token: string): void {
    if (
      this.stateMachine.getState() === "connected" ||
      this.stateMachine.getState() === "connecting"
    ) {
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
    this.stateMachine.setState("connecting");

    // 构建 WebSocket URL（不再附带 token 查询参数，避免 token 泄漏到日志/Referer/历史）
    const wsUrl = buildWsUrl();
    const protocols = buildProtocols(token);

    // infra R2-00123: 连接过程日志收敛到 wsTrace（仅 dev 输出）
    wsTrace("正在连接:", wsUrl);

    this.socketTask = createSocketTask(wsUrl, protocols, {
      onOpen: () => {
        this.onSocketOpen();
      },
      onMessage: (res) => {
        this.onSocketMessage(res);
      },
      onClose: (res) => {
        this.onSocketClose(res);
      },
      onError: (err) => {
        this.onSocketError(err);
      },
    });

    // createSocketTask 返回 null 表示创建异常，触发重连
    if (!this.socketTask) {
      // 修复：同步状态机，连接创建异常时置为 disconnected 再尝试重连
      this.stateMachine.setState("disconnected");
      this.handleReconnect();
    }
  }

  /**
   * 断开连接
   *
   * 发送 STOMP DISCONNECT 帧后延迟关闭 WebSocket 连接，
   * 清理所有定时器和订阅状态。
   *
   * 修复（P1 BUG）：原实现发完 DISCONNECT 帧立即 closeSocket，
   * 帧大概率未发出（TCP 直接断开），服务端无法感知正常下线。
   * 现延迟 300ms 再关闭，给 DISCONNECT 帧留出发送窗口。
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
      } catch (_e) {
        // DISCONNECT 帧发送失败，继续关闭
      }
    }

    this.cleanup();

    this.stompSessionReady = false;
    this.stateMachine.setState("disconnected");
    wsTrace("已断开连接");

    // 延迟关闭底层连接：给 DISCONNECT 帧留出发送窗口（300ms）
    // infra R2-00124: 定时器引用保存到 disconnectCloseTimer，
    // 快速重连/再次 disconnect 时先取消旧定时器，避免旧 close 关掉新连接。
    if (this.disconnectCloseTimer !== null) {
      clearTimeout(this.disconnectCloseTimer);
      this.disconnectCloseTimer = null;
    }
    this.disconnectCloseTimer = setTimeout(() => {
      this.disconnectCloseTimer = null;
      this.closeSocket();
    }, DISCONNECT_CLOSE_DELAY_MS);
  }

  /**
   * 获取当前连接状态
   *
   * 同时检查底层连接状态与 STOMP 会话就绪状态，
   * 仅当两者都满足时返回 true。
   *
   * @returns 是否已连接且 STOMP 会话就绪
   */
  isConnected(): boolean {
    return this.stateMachine.getState() === "connected" && this.stompSessionReady;
  }

  /**
   * 获取详细连接状态
   * @returns 连接状态枚举值
   */
  getConnectionState(): WsConnectionState {
    return this.stateMachine.getState();
  }

  /**
   * 注册连接状态变更回调
   * @param callback - 状态变更回调函数
   */
  onStateChange(callback: ConnectionStateCallback): void {
    this.stateMachine.onStateChange(callback);
  }

  /**
   * 移除连接状态变更回调
   * @param callback - 要移除的回调函数
   */
  offStateChange(callback: ConnectionStateCallback): void {
    this.stateMachine.offStateChange(callback);
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

    // 注册频道回调（同时记录 subId→callback，供 unsubscribe 精确移除）
    if (!this.channelCallbacks.has(destination)) {
      this.channelCallbacks.set(destination, []);
    }
    this.channelCallbacks.get(destination)!.push(callback);
    this.subIdCallbacks.set(subId, callback);

    // 如果已连接，立即发送 SUBSCRIBE 帧
    if (this.isConnected()) {
      this.sendSubscribeFrame(subId, destination);
    }

    wsTrace("订阅频道:", destination, "subId:", subId);
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

    // 移除频道回调（修复：原实现仅按 destination 判断“是否还有其他订阅”，
    // 同一 destination 多个订阅时旧回调仍残留在 channelCallbacks 中——回调泄漏。
    // 现按 subIdCallbacks 精确移除本次订阅的回调，回调列表为空时删除该频道键）
    const cb = this.subIdCallbacks.get(subId);
    const callbacks = this.channelCallbacks.get(destination);
    if (callbacks && cb) {
      const cbIndex = callbacks.indexOf(cb);
      if (cbIndex >= 0) {
        callbacks.splice(cbIndex, 1);
      }
      if (callbacks.length === 0) {
        this.channelCallbacks.delete(destination);
      }
    }
    this.subIdCallbacks.delete(subId);

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
      } catch (_e) {
        // 静默处理
      }
    }

    wsTrace("取消订阅:", destination, "subId:", subId);
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
   * token 通过 STOMP CONNECT 帧的 Authorization header 传递，
   * 后端 JwtChannelInterceptor 在 CONNECT 阶段提取并校验。
   */
  private onSocketOpen(): void {
    wsTrace("TCP 连接已建立，发送 STOMP CONNECT 帧");

    // 发送 STOMP CONNECT 帧
    // Authorization header 用于 STOMP 会话级认证（JwtChannelInterceptor 提取）
    const connectFrame = buildFrame(
      "CONNECT",
      {
        "accept-version": STOMP_VERSION,
        "heart-beat": `${HEARTBEAT_INTERVAL_MS},${HEARTBEAT_INTERVAL_MS}`,
        Authorization: `Bearer ${this.currentToken}`,
      },
      ""
    );

    if (this.socketTask) {
      this.socketTask.send({
        data: connectFrame,
        success: () => {
          wsTrace("STOMP CONNECT 帧已发送");
        },
        fail: (err) => {
          console.error("[WebSocket] STOMP CONNECT 帧发送失败:", err);
          this.handleReconnect();
        },
      });

      // 修复（P1 BUG）：CONNECT 握手超时——TCP 已建立但服务端未在 10s 内
      // 回复 CONNECTED 帧时，状态机会永久卡在 connecting（心跳未启动、
      // 无任何超时路径）。现启动 10s 定时器，超时则清理并触发重连；
      // 收到 CONNECTED 帧时由 onStompConnected 清除。
      this.clearConnectHandshakeTimer();
      this.connectHandshakeTimer = setTimeout(() => {
        this.connectHandshakeTimer = null;
        wsTrace(
          `CONNECT 握手超时（${WebSocketClient.CONNECT_HANDSHAKE_TIMEOUT_MS}ms 未收到 CONNECTED 帧），触发重连`
        );
        this.stompSessionReady = false;
        this.cleanup();
        this.handleReconnect();
      }, WebSocketClient.CONNECT_HANDSHAKE_TIMEOUT_MS);
    }
  }

  /**
   * WebSocket 收到消息回调
   *
   * 解析 STOMP 帧，根据命令类型分发处理。
   * 修复：优先识别 pong 心跳响应（JSON 格式 {"type":"pong"}），避免误当作 STOMP 帧解析。
   */
  private onSocketMessage(res: UniApp.OnSocketMessageCallbackResult): void {
    // 修复：收到任何消息都说明连接正常，重置心跳超时定时器，避免误判重连
    this.heartbeatManager.resetTimeout(() => {
      this.stompSessionReady = false;
      this.cleanup();
      this.handleReconnect();
    });

    try {
      const rawData = res.data as string;

      // 修复：优先处理 pong 心跳响应（标准 JSON 帧）
      // 后端收到 ping 后回复 {"type":"pong"}，不是 STOMP 帧，需单独识别
      if (rawData && typeof rawData === "string" && isPongMessage(rawData)) {
        // pong 响应已通过 resetHeartbeatTimeout 重置超时，无需进一步处理
        return;
      }

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
   *
   * 修复：显式同步 connectionState 状态机，确保从任何状态转到 disconnected，
   * 后续 handleReconnect 会再将其转为 reconnecting。
   */
  private onSocketClose(res: { code: number; reason: string }): void {
    wsTrace("连接已关闭:", res.code, res.reason);
    this.stompSessionReady = false;
    // 显式同步状态机：连接已断开
    this.stateMachine.setState("disconnected");
    this.cleanup();

    if (!this.manualClose) {
      this.handleReconnect();
    }
  }

  /**
   * WebSocket 连接错误回调
   *
   * 修复（P1 BUG）：原实现未同步 connectionState，导致错误后状态仍停留在
   * connecting/connected，外部通过 getConnectionState() 读到不一致的状态。
   * 现显式将状态置为 disconnected，再由 handleReconnect 转为 reconnecting。
   */
  private onSocketError(err: UniApp.GeneralCallbackResult): void {
    console.error("[WebSocket] 连接错误:", err);
    this.stompSessionReady = false;
    // 显式同步状态机：错误发生时连接已不可用
    if (!this.stateMachine.isDisconnectedOrReconnecting()) {
      this.stateMachine.setState("disconnected");
    }

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
   * 4. 重新订阅所有活跃订阅（修复：保留 pendingSubscriptions，重连后自动重订阅）
   * 5. 订阅用户私有频道（修复：去重，避免重复订阅）
   * 6. 集成 Pinia Store
   */
  private onStompConnected(frame: StompFrame): void {
    wsTrace("STOMP 会话已建立:", frame.headers);
    this.stompSessionReady = true;
    this.reconnectManager.resetAttempts();
    this.stateMachine.setState("connected");

    // 握手成功：清除 CONNECT 握手超时定时器
    this.clearConnectHandshakeTimer();

    // 启动心跳
    this.heartbeatManager.start(
      () => this.sendPing(),
      () => {
        this.stompSessionReady = false;
        this.cleanup();
        this.handleReconnect();
      }
    );

    // 修复（P0 BUG）：原 clearAllSubscriptions 会清空 pendingSubscriptions，
    // 导致 resubscribeAll 无任何订阅可重播，重连后用户订阅全部丢失。
    // 现仅清理本地 subId 映射与回调列表的"脏状态"（实际不再清空 pendingSubscriptions），
    // 保留活跃订阅信息以便重连后自动重新订阅。
    // 注意：channelCallbacks 也需保留，否则重订阅后消息无回调可分发。

    // 重新订阅所有活跃订阅（重连后自动恢复）
    this.resubscribeAll();

    // 订阅用户私有频道并集成 Pinia Store（内部已做去重，不会重复订阅）
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
      dispatchToStore(destination, data);
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
    wsTrace("收到 RECEIPT:", receiptId);
  }

  /**
   * STOMP ERROR 帧处理
   *
   * 服务器返回错误，记录日志并可能触发重连。
   * 修复：同步 connectionState，确保 STOMP 层错误也正确反映到状态机。
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
      // 显式同步状态机：STOMP 层错误，会话已不可用
      if (!this.stateMachine.isDisconnectedOrReconnecting()) {
        this.stateMachine.setState("disconnected");
      }
      // 修复（P1 BUG）：先清理心跳/重连定时器再触发重连，
      // 避免旧 heartbeat 继续运行（重复 ping/超时回调叠加）。
      this.cleanup();
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
          wsTrace("SUBSCRIBE 帧已发送:", destination);
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
   * 修复（P0 BUG）：原实现每次重连都调用 subscribe()，会在 pendingSubscriptions 中
   * 累积重复的订阅条目（subId 不断递增），导致单条消息被多次分发。
   * 现通过 isDestinationSubscribed 去重：若目标频道已在 pendingSubscriptions 中，
   * 仅重新注册回调（channelCallbacks 已保留则跳过），不新增订阅条目。
   */
  private setupUserSubscriptions(): void {
    // 用户私有频道及其回调
    // 修复（R4-00175）：补订后端实际推送的 6 类队列中的 matches / temp-chat /
    // temp-chat/messages / checkin（原实现仅订阅 messages/signals/notifications，
    // 匹配成功、临时会话新消息、签到事件实时推送全部丢失）。
    // 队列名与后端对齐：/queue/matches（MatchRecorder）、/queue/temp-chat 与
    // /queue/temp-chat/messages（TempChatSessionService/TempChatMessageService）、
    // /queue/checkin（CheckInEventConsumer）。
    const userQueues: Array<{ dest: string; cb: MessageCallback }> = [
      {
        dest: "/user/queue/messages",
        cb: (data) => dispatchToStore("/user/queue/messages", data),
      },
      {
        dest: "/user/queue/signals",
        cb: (data) => dispatchToStore("/user/queue/signals", data),
      },
      {
        dest: "/user/queue/notifications",
        cb: (data) => dispatchToStore("/user/queue/notifications", data),
      },
      {
        dest: "/user/queue/matches",
        cb: (data) => dispatchToStore("/user/queue/matches", data),
      },
      {
        dest: "/user/queue/temp-chat",
        cb: (data) => dispatchToStore("/user/queue/temp-chat", data),
      },
      {
        dest: "/user/queue/temp-chat/messages",
        cb: (data) => dispatchToStore("/user/queue/temp-chat/messages", data),
      },
      {
        dest: "/user/queue/checkin",
        cb: (data) => dispatchToStore("/user/queue/checkin", data),
      },
    ];

    for (const { dest, cb } of userQueues) {
      // 修复：去重——若该频道已在 pendingSubscriptions 中（重连场景），跳过避免重复订阅
      if (this.isDestinationSubscribed(dest)) {
        // 重连场景：订阅帧已由 resubscribeAll 发送，回调已在 channelCallbacks 中保留
        // 仅在回调丢失的极端情况下补注册（防御性处理）
        if (!this.channelCallbacks.has(dest)) {
          this.channelCallbacks.set(dest, [cb]);
        }
        continue;
      }
      // 首次连接：正常订阅
      this.subscribe(dest, cb);
    }
  }

  /**
   * 检查指定目标频道是否已在 pendingSubscriptions 中（按 value 匹配）。
   * 用于 setupUserSubscriptions 去重，避免重连后重复订阅同一频道。
   *
   * @param destination - 目标频道路径
   * @returns 是否已存在订阅
   */
  private isDestinationSubscribed(destination: string): boolean {
    for (const dest of this.pendingSubscriptions.values()) {
      if (dest === destination) return true;
    }
    return false;
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

    // 修复（P1 BUG）：防重入——error 与 close 事件可能先后触发（error→close），
    // 原实现两次调用 handleReconnect 会双倍消耗 attempts（指数退避进度翻倍、
    // 最大重连次数提前耗尽）。置位后重复触发直接忽略，定时器回调执行时复位。
    if (this.reconnectScheduled) return;

    if (!this.reconnectManager.canReconnect()) {
      this.stateMachine.setState("disconnected");
      return;
    }

    this.reconnectScheduled = true;
    this.stateMachine.setState("reconnecting");

    const scheduled = this.reconnectManager.schedule(() => {
      // 复位防重入标志：允许下一次断线触发新的重连流程
      this.reconnectScheduled = false;
      // 重新获取最新 token
      const token = this.currentToken || getToken();
      if (token) {
        this.connect(token);
      } else {
        wsTrace("无有效 token，跳过重连");
        this.stateMachine.setState("disconnected");
      }
    });

    if (!scheduled) {
      // schedule 返回 false 表示已达最大次数，状态置为 disconnected
      this.reconnectScheduled = false;
      this.stateMachine.setState("disconnected");
    }
  }

  /* ========== 内部方法：心跳发送 ========== */

  /**
   * 发送心跳 ping 帧
   *
   * 由 HeartbeatManager.start 的 sendPing 回调调用，
   * 通过 socketTask.send 发送 `{"type":"ping"}` 文本。
   */
  private sendPing(): void {
    if (!this.isConnected() || !this.socketTask) return;

    try {
      // 修复：发送标准 JSON ping 帧，后端识别后回复 {"type":"pong"}
      const pingFrame = buildPingPayload();
      this.socketTask.send({
        data: pingFrame,
        fail: (err) => {
          console.warn("[WebSocket] 心跳发送失败:", err);
        },
      });
    } catch (_e) {
      // 心跳发送异常，静默处理
    }
  }

  /* ========== 内部方法：状态和清理 ========== */

  /**
   * 清除 CONNECT 握手超时定时器（握手成功/连接关闭/清理时调用）。
   */
  private clearConnectHandshakeTimer(): void {
    if (this.connectHandshakeTimer) {
      clearTimeout(this.connectHandshakeTimer);
      this.connectHandshakeTimer = null;
    }
  }

  /**
   * 清理定时器和内部状态（不断开 WebSocket 连接）
   */
  private cleanup(): void {
    this.heartbeatManager.stop();
    this.reconnectManager.cancel();
    this.clearConnectHandshakeTimer();
    // infra R2-00124: 一并取消延迟关闭定时器，避免残留回调在重连后关闭新连接
    if (this.disconnectCloseTimer !== null) {
      clearTimeout(this.disconnectCloseTimer);
      this.disconnectCloseTimer = null;
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
      } catch (_e) {
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

// 重新导出类型与常量，保持外部 import 路径兼容
export type {
  WsConnectionState,
  ConnectionStateCallback,
  MessageCallback,
  StompFrame,
} from "./types";
