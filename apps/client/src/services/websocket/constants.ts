/**
 * WebSocket 模块常量定义
 *
 * 集中维护 WebSocket 客户端的所有协议常量：
 * - STOMP 帧分隔符：FRAME_NULL_CHAR / LINE_BREAK
 * - 重连参数：MAX_RECONNECT_ATTEMPTS / RECONNECT_INTERVAL_MS / RECONNECT_BACKOFF_MS / RECONNECT_MAX_INTERVAL_MS
 * - 心跳参数：HEARTBEAT_INTERVAL_MS / HEARTBEAT_TIMEOUT_MS / ping/pong 负载
 * - 协议版本：STOMP_VERSION
 * - 订阅 ID 前缀：SUBSCRIPTION_ID_PREFIX
 *
 * SubTask 5.4.1：重连策略由固定 3s 间隔改为指数退避（1s/2s/4s/8s/16s/30s 上限），
 * 避免弱网环境下频繁重连浪费电量与服务器资源，同时保证后端恢复后能快速重连。
 */

/** STOMP 帧结束标记（NULL 字符） */
export const FRAME_NULL_CHAR = "\x00";

/** STOMP 换行符 */
export const LINE_BREAK = "\n";

/**
 * 最大重连次数
 *
 * SubTask 5.4.1：保留 6 次（与指数退避阶梯 1s/2s/4s/8s/16s/30s 一致），
 * 第 6 次仍失败则停止重连，等待用户主动操作或网络状态变化触发重连。
 */
export const MAX_RECONNECT_ATTEMPTS = 6;

/**
 * 重连基础间隔（毫秒），SubTask 5.4.1 指数退避的初始值
 *
 * @deprecated SubTask 5.4.1 起改用 RECONNECT_BACKOFF_MS 与 RECONNECT_MAX_INTERVAL_MS，
 * 仅保留供旧代码兼容，新代码请使用 calculateReconnectDelay(attempt)。
 */
export const RECONNECT_INTERVAL_MS = 3000;

/**
 * SubTask 5.4.1：指数退避基础间隔（毫秒），第 1 次重连使用此值
 *
 * 退避序列：1s → 2s → 4s → 8s → 16s → 30s（达到上限后保持 30s）
 */
export const RECONNECT_BACKOFF_MS = 1000;

/**
 * SubTask 5.4.1：重连间隔上限（毫秒），指数退避到达此值后保持不变
 *
 * 工程约束：WebSocket 重连上限 30s，避免过于频繁
 */
export const RECONNECT_MAX_INTERVAL_MS = 30000;

/** 心跳间隔（毫秒） */
export const HEARTBEAT_INTERVAL_MS = 30000;

/** 心跳超时（毫秒） */
export const HEARTBEAT_TIMEOUT_MS = 10000;

/** STOMP 协议版本 */
export const STOMP_VERSION = "1.2";

/** 订阅 ID 前缀 */
export const SUBSCRIPTION_ID_PREFIX = "sub-";

/** 心跳 ping 帧的 JSON 文本 */
export const HEARTBEAT_PING_PAYLOAD = JSON.stringify({ type: "ping" });

/** 心跳 pong 响应的 JSON 文本（紧凑格式） */
export const HEARTBEAT_PONG_PAYLOAD_COMPACT = '{"type":"pong"}';

/** 心跳 pong 响应的 JSON 文本（带空格格式） */
export const HEARTBEAT_PONG_PAYLOAD_SPACED = '{"type": "pong"}';
