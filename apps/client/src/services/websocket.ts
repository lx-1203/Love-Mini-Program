/**
 * WebSocket 服务入口（向后兼容 re-export）
 *
 * 本文件为兼容旧 import 路径而保留：
 *   import { wsClient } from "@/services/websocket";
 *
 * 实际实现已拆分到 services/websocket/ 目录：
 * - ./websocket/types.ts          类型定义（StompFrame / WsConnectionState 等）
 * - ./websocket/constants.ts      协议常量（心跳间隔 / 重连参数 / 帧分隔符等）
 * - ./websocket/transport.ts      STOMP 帧编解码 + WebSocket 连接构造
 * - ./websocket/state-machine.ts  连接状态机（状态存储与回调分发）
 * - ./websocket/heartbeat.ts      心跳管理器（ping/pong 与超时检测）
 * - ./websocket/reconnect.ts      重连管理器（次数计数与定时器）
 * - ./websocket/store-dispatch.ts Pinia Store 消息分发
 * - ./websocket/index.ts          WebSocketClient 主体实现 + 重新导出全部子模块
 *
 * 任何外部代码无需修改 import 路径即可继续工作。
 */
export * from "./websocket/index";
