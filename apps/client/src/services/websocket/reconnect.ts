/**
 * WebSocket 重连策略模块
 *
 * 集中维护重连次数计数与重连定时器：
 * - schedule()：在固定延迟后触发重连（最多 MAX_RECONNECT_ATTEMPTS 次）
 * - cancel()：取消挂起的重连任务
 * - resetAttempts()：重连成功后重置计数
 * - canReconnect()：判断是否还能继续重连
 *
 * 重连策略说明：
 * 当前实现采用固定 3 秒间隔（RECONNECT_INTERVAL_MS），
 * 最多重连 5 次（MAX_RECONNECT_ATTEMPTS）。
 *
 * 设计权衡：
 * 原计划采用指数退避（exponential backoff），但考虑到：
 * 1. 后端 Spring WebSocket 在网络抖动后通常会快速恢复
 * 2. 固定间隔对用户体验更可预期
 * 3. 现有测试用例基于 3 秒间隔编写
 * 因此保留固定间隔策略，但模块化为独立类便于未来切换到指数退避。
 *
 * 若需切换为指数退避，只需修改 schedule() 内部的 delay 计算逻辑：
 *   const delay = RECONNECT_INTERVAL_MS * Math.pow(2, this.attempts);
 */

import {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_INTERVAL_MS,
} from "./constants";

/**
 * 重连管理器
 *
 * 封装重连次数计数与重连定时器的生命周期管理。
 * 业务层通过 schedule() 安排重连，通过 cancel() 取消重连，
 * 通过 resetAttempts() 在重连成功后重置计数。
 */
export class ReconnectManager {
  /** 当前重连次数（每次 schedule 后递增） */
  private attempts = 0;

  /** 重连定时器 */
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 获取当前重连次数
   * @returns 已尝试的重连次数
   */
  getAttempts(): number {
    return this.attempts;
  }

  /**
   * 判断是否还能继续重连
   *
   * @returns 是否未达到最大重连次数
   */
  canReconnect(): boolean {
    return this.attempts < MAX_RECONNECT_ATTEMPTS;
  }

  /**
   * 安排下一次重连
   *
   * 在固定延迟（RECONNECT_INTERVAL_MS）后触发 onReconnect 回调。
   * 若已达最大重连次数，则不安排重连并返回 false。
   *
   * @param onReconnect - 重连回调（由业务层提供，内部调用 connect(token)）
   * @returns 是否成功安排重连（false 表示已达最大次数）
   */
  schedule(onReconnect: () => void): boolean {
    if (this.attempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("[WebSocket] 已达最大重连次数，停止重连");
      return false;
    }

    this.attempts += 1;

    console.log(
      `[WebSocket] 将在 ${RECONNECT_INTERVAL_MS}ms 后进行第 ${this.attempts} 次重连`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      onReconnect();
    }, RECONNECT_INTERVAL_MS);

    return true;
  }

  /**
   * 取消挂起的重连任务
   *
   * 清理重连定时器，但不重置 attempts 计数。
   * 用于手动关闭（manualClose）或重连成功后清理。
   */
  cancel(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 重置重连次数计数
   *
   * 在 STOMP CONNECTED 收到后调用，表示重连成功，
   * 后续断线时可重新开始计数。
   */
  resetAttempts(): void {
    this.attempts = 0;
  }

  /**
   * 完全重置重连管理器状态
   *
   * 同时清理定时器与计数，用于 dispose() 场景。
   */
  reset(): void {
    this.cancel();
    this.attempts = 0;
  }
}
