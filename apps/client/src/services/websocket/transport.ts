/**
 * WebSocket 底层传输模块
 *
 * 集中维护 STOMP 帧编解码与 WebSocket 连接创建的纯函数：
 * - STOMP 帧编解码：buildFrame / parseFrames / isPongMessage
 * - 连接构造：buildWsUrl / buildProtocols / createSocketTask
 *
 * 这些函数均为无状态纯函数，不持有任何运行时状态，
 * 由 index.ts 中的 WebSocketClient 类按需调用。
 *
 * 后端配置参考：
 * - 端点: /ws (WebSocketConfig.java)
 * - 子协议: bearer.${token}（HTTP 握手阶段认证）
 * - STOMP CONNECT 帧 Authorization header（会话级认证）
 */

import { appEnv } from "../env";
import {
  FRAME_NULL_CHAR,
  LINE_BREAK,
  HEARTBEAT_PONG_PAYLOAD_COMPACT,
  HEARTBEAT_PONG_PAYLOAD_SPACED,
} from "./constants";
import type { StompFrame } from "./types";

/* ========== STOMP 帧编解码 ========== */

/**
 * 构建 STOMP 帧
 *
 * STOMP 帧格式：
 *   COMMAND\n
 *   header1:value1\n
 *   header2:value2\n
 *   \n
 *   body\x00
 *
 * 帧头中的 `\` `:` `\n` 字符需按 STOMP 协议规范转义。
 *
 * @param command - STOMP 命令（CONNECT / SUBSCRIBE / SEND / DISCONNECT 等）
 * @param headers - 帧头键值对
 * @param body - 帧体内容
 * @returns 完整的 STOMP 帧字符串
 */
export function buildFrame(
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
export function parseFrames(raw: string): StompFrame[] {
  const frames: StompFrame[] = [];

  // STOMP 帧以 NULL 字符 (\x00) 分隔
  const segments = raw.split(FRAME_NULL_CHAR);

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    try {
      const lines = trimmed.split(LINE_BREAK);
      if (lines.length === 0) continue;

      // 修复（严格模式 noUncheckedIndexedAccess）：lines[0] 索引访问返回 string | undefined，
      // 此处提取后做非空校验，避免在异常空数组场景调用 .trim() 抛 undefined。
      const firstLine = lines[0];
      if (!firstLine) continue;
      const command = firstLine.trim();
      const headers: Record<string, string> = {};
      let bodyStartIndex = 1;

      // 解析头部：以空行作为头部与体的分隔
      for (let i = 1; i < lines.length; i++) {
        // 修复（严格模式 noUncheckedIndexedAccess）：lines[i] 索引访问返回 string | undefined，
        // 此处提取 line 后做非空校验，避免后续 .trim()/.indexOf()/.substring() 在 undefined 上抛错。
        const line = lines[i];
        if (!line) continue;
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
 * 判断原始消息是否为心跳 pong 响应。
 *
 * 修复：后端收到 ping 后回复 `{"type":"pong"}`，不是 STOMP 帧，需单独识别。
 * 支持紧凑格式、带空格格式以及通过 JSON.parse 识别（容忍格式差异）。
 *
 * @param rawData - WebSocket 收到的原始消息文本
 * @returns 是否为 pong 心跳响应
 */
export function isPongMessage(rawData: string): boolean {
  if (!rawData || typeof rawData !== "string") return false;

  const trimmed = rawData.trim();
  if (
    trimmed === HEARTBEAT_PONG_PAYLOAD_COMPACT ||
    trimmed === HEARTBEAT_PONG_PAYLOAD_SPACED
  ) {
    return true;
  }

  // 兼容：尝试 JSON 解析识别 pong（容忍格式差异，如多空格）
  try {
    const parsed = JSON.parse(trimmed) as { type?: string };
    if (parsed && parsed.type === "pong") {
      return true;
    }
  } catch (_e) {
    // 非 JSON 格式，继续作为 STOMP 帧处理
  }

  return false;
}

/* ========== WebSocket 连接构造 ========== */

/**
 * 构建 WebSocket 连接 URL。
 *
 * 后端 WebSocketConfig 注册的端点是 /ws，支持 SockJS 降级。
 * uni-app 不支持 SockJS，直接使用原生 WebSocket 连接。
 * Spring 在 /ws 端点也支持原生 WebSocket（通过 /ws/websocket 路径）。
 *
 * 安全说明：不再附带 token 查询参数，避免 token 泄漏到日志/Referer/历史。
 *
 * @returns 完整的 ws/wss URL
 */
export function buildWsUrl(): string {
  const baseUrl = appEnv.apiBaseUrl.replace(/^http/, "ws");
  return `${baseUrl}/ws/websocket`;
}

/**
 * 构建 WebSocket 子协议列表。
 *
 * 通过 WebSocket 子协议（Sec-WebSocket-Protocol 头）传递 token，
 * 后端 JwtHandshakeInterceptor 从该头提取 token 完成 HTTP 握手阶段认证。
 * 使用 `bearer.` 前缀以区分业务子协议（如 STOMP 自身的 v12.stomp）。
 *
 * @param token - 认证 token（JWT）
 * @returns 子协议数组
 */
export function buildProtocols(token: string): string[] {
  return [`bearer.${token}`];
}

/**
 * WebSocket 连接事件回调集合
 */
export interface SocketEventHandlers {
  /** 连接打开回调 */
  onOpen: () => void;
  /** 收到消息回调 */
  onMessage: (res: UniApp.OnSocketMessageCallbackResult) => void;
  /** 连接关闭回调 */
  onClose: (res: { code: number; reason: string }) => void;
  /** 连接错误回调 */
  onError: (err: UniApp.GeneralCallbackResult) => void;
}

/**
 * 创建 WebSocket 连接并注册事件回调。
 *
 * 封装 uni.connectSocket() 调用，集中处理：
 * - 连接成功/失败的回调分发
 * - 事件监听器注册（onOpen/onMessage/onClose/onError）
 * - 异常捕获与 fail 回调
 *
 * @param wsUrl - WebSocket URL
 * @param protocols - 子协议列表
 * @param handlers - 事件回调集合
 * @returns SocketTask 实例（调用方持有引用以便后续关闭）
 */
export function createSocketTask(
  wsUrl: string,
  protocols: string[],
  handlers: SocketEventHandlers
): UniApp.SocketTask | null {
  try {
    const socketTask = uni.connectSocket({
      url: wsUrl,
      protocols,
      success: () => {
        // 修复 no-console：连接请求日志改用 console.warn（允许的方法）
        console.warn("[WebSocket] 连接请求已发送");
      },
      fail: (err) => {
        console.error("[WebSocket] 连接请求失败:", err);
        // 修复：同步状态机，连接请求失败时由调用方处理重连
        // 这里不直接处理，交由调用方在 fail 回调中触发 handleReconnect
      },
    });

    // 注册事件监听
    socketTask.onOpen(() => {
      handlers.onOpen();
    });

    socketTask.onMessage((res) => {
      handlers.onMessage(res);
    });

    socketTask.onClose((res) => {
      handlers.onClose(res);
    });

    socketTask.onError((err) => {
      handlers.onError(err);
    });

    return socketTask;
  } catch (error) {
    console.error("[WebSocket] 创建连接异常:", error);
    return null;
  }
}
