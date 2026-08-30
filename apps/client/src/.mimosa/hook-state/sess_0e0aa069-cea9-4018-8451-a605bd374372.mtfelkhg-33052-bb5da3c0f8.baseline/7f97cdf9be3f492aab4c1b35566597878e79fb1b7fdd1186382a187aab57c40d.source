/**
 * WebSocket 模块类型定义
 *
 * 集中维护 WebSocket 客户端的所有 TypeScript 类型：
 * - STOMP 帧结构：StompFrame
 * - 连接状态枚举：WsConnectionState
 * - 回调签名：ConnectionStateCallback / MessageCallback
 *
 * 这些类型被 transport.ts / state-machine.ts / heartbeat.ts /
 * reconnect.ts / index.ts 共享，是模块间通信的契约层。
 *
 * 协议常量请见 ./constants.ts。
 */

/* ========== STOMP 帧结构 ========== */

/**
 * STOMP 帧结构
 *
 * STOMP 帧格式：
 *   COMMAND\n
 *   header1:value1\n
 *   header2:value2\n
 *   \n
 *   body\x00
 */
export interface StompFrame {
  /** STOMP 命令（CONNECT / SUBSCRIBE / SEND / DISCONNECT 等） */
  command: string;
  /** 帧头键值对 */
  headers: Record<string, string>;
  /** 帧体内容 */
  body: string;
}

/* ========== 连接状态与回调 ========== */

/**
 * WebSocket 连接状态
 *
 * - disconnected: 未连接
 * - connecting: 正在建立 TCP 连接
 * - connected: STOMP 会话已建立
 * - reconnecting: 重连中（已断开，等待下次重连尝试）
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
