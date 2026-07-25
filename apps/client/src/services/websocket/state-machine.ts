/**
 * WebSocket 连接状态机
 *
 * 集中管理 WebSocket 连接状态与状态变更回调分发：
 * - 当前状态：disconnected / connecting / connected / reconnecting
 * - 状态变更回调注册与移除
 * - 仅在状态实际变更时通知监听者，避免重复触发
 *
 * 设计说明：
 * 状态机本身不持有业务逻辑，仅负责状态存储与回调分发。
 * 业务层（WebSocketClient）通过 setState() 推动状态流转，
 * 通过 onStateChange / offStateChange 注册外部监听者。
 *
 * 修复（P1 BUG）：原实现连接错误时未同步 connectionState，
 * 导致外部通过 getConnectionState() 读到不一致的状态。
 * 现所有状态流转都通过本状态机统一处理，确保一致性。
 */

import type { ConnectionStateCallback, WsConnectionState } from "./types";

/**
 * 连接状态机
 *
 * 封装状态字段与回调列表，提供线程安全（单线程 JS 下顺序安全）的
 * 状态变更与回调分发能力。
 */
export class ConnectionStateMachine {
  /** 当前连接状态 */
  private currentState: WsConnectionState = "disconnected";

  /** 状态变更回调列表 */
  private callbacks: ConnectionStateCallback[] = [];

  /**
   * 获取当前连接状态
   * @returns 当前状态枚举值
   */
  getState(): WsConnectionState {
    return this.currentState;
  }

  /**
   * 设置连接状态并通知监听者
   *
   * 仅在状态实际变更时通知，避免重复触发回调。
   * 回调执行异常会被捕获并记录日志，不影响后续回调执行。
   *
   * @param state - 新的连接状态
   */
  setState(state: WsConnectionState): void {
    const prevState = this.currentState;
    this.currentState = state;

    // 仅在状态实际变更时通知
    if (prevState !== state) {
      for (const callback of this.callbacks) {
        try {
          callback(state);
        } catch (error) {
          console.error("[WebSocket] 状态变更回调异常:", error);
        }
      }
    }
  }

  /**
   * 注册连接状态变更回调
   * @param callback - 状态变更回调函数
   */
  onStateChange(callback: ConnectionStateCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 移除连接状态变更回调
   * @param callback - 要移除的回调函数
   */
  offStateChange(callback: ConnectionStateCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 判断当前是否处于「已连接且 STOMP 会话就绪」状态。
   *
   * 注意：STOMP 会话就绪状态由业务层（WebSocketClient）维护，
   * 此方法仅判断底层 connectionState 是否为 connected。
   * 业务层应在调用时同时检查 stompSessionReady 标志。
   *
   * @returns 是否处于 connected 状态
   */
  isConnected(): boolean {
    return this.currentState === "connected";
  }

  /**
   * 判断当前是否处于「未连接或重连中」状态。
   *
   * 用于错误处理时判断是否需要将状态置为 disconnected 再触发重连。
   *
   * @returns 是否处于 disconnected 或 reconnecting 状态
   */
  isDisconnectedOrReconnecting(): boolean {
    return (
      this.currentState === "disconnected" ||
      this.currentState === "reconnecting"
    );
  }

  /**
   * 重置状态机到初始状态（disconnected）。
   *
   * 不清空回调列表：回调由外部业务层管理生命周期，
   * 状态机实例本身在 WebSocketClient 单例中长期存活。
   */
  reset(): void {
    this.currentState = "disconnected";
  }
}
