/**
 * WebSocket 模块常量定义
 *
 * 集中维护 WebSocket 客户端的所有协议常量：
 * - STOMP 帧分隔符：FRAME_NULL_CHAR / LINE_BREAK
 * - 重连参数：MAX_RECONNECT_ATTEMPTS / RECONNECT_INTERVAL_MS
 * - 心跳参数：HEARTBEAT_INTERVAL_MS / HEARTBEAT_TIMEOUT_MS / ping/pong 负载
 * - 协议版本：STOMP_VERSION
 * - 订阅 ID 前缀：SUBSCRIPTION_ID_PREFIX
 */

/** STOMP 帧结束标记（NULL 字符） */
export const FRAME_NULL_CHAR = "\x00";

/** STOMP 换行符 */
export const LINE_BREAK = "\n";

/** 最大重连次数 */
export const MAX_RECONNECT_ATTEMPTS = 5;

/** 重连间隔（毫秒），固定 3 秒 */
export const RECONNECT_INTERVAL_MS = 3000;

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
