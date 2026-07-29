/**
 * WebSocket 重连策略模块
 *
 * SubTask 5.4.1：重连策略改为指数退避算法
 *
 * 集中维护重连次数计数与重连定时器：
 * - schedule()：在指数退避延迟后触发重连（最多 MAX_RECONNECT_ATTEMPTS 次）
 * - cancel()：取消挂起的重连任务
 * - resetAttempts()：重连成功后重置计数
 * - canReconnect()：判断是否还能继续重连
 *
 * 指数退避策略（SubTask 5.4.1）：
 * 重连延迟按 2 的幂次递增，达到 RECONNECT_MAX_INTERVAL_MS 后保持不变：
 *   第 1 次：1000ms  (1s)
 *   第 2 次：2000ms  (2s)
 *   第 3 次：4000ms  (4s)
 *   第 4 次：8000ms  (8s)
 *   第 5 次：16000ms (16s)
 *   第 6 次：30000ms (30s, 上限)
 *
 * 设计权衡：
 * 1. 弱网环境下固定 3s 间隔会浪费电量与服务器资源
 * 2. 指数退避能在网络恢复后快速重连（1s），网络持续不可用时逐步降频
 * 3. 上限 30s 避免长时间不重连导致用户感知断线
 * 4. 工程约束：WebSocket 重连上限 30s，避免过于频繁
 */

import {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BACKOFF_MS,
  RECONNECT_MAX_INTERVAL_MS,
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
   * SubTask 5.4.1：计算指数退避延迟
   *
   * 退避公式：delay = min(RECONNECT_BACKOFF_MS * 2^(attempt-1), RECONNECT_MAX_INTERVAL_MS)
   *
   * 退避序列：
   *   attempt=1 → 1000ms
   *   attempt=2 → 2000ms
   *   attempt=3 → 4000ms
   *   attempt=4 → 8000ms
   *   attempt=5 → 16000ms
   *   attempt=6 → 30000ms (达到上限)
   *   attempt=7+ → 30000ms (保持上限)
   *
   * @param attempt - 重连次数（从 1 开始）
   * @returns 延迟毫秒数
   */
  private calculateDelay(attempt: number): number {
    // Math.pow(2, attempt-1)：attempt=1 时为 1，attempt=2 时为 2 ...
    const exponent = Math.max(0, attempt - 1);
    const rawDelay = RECONNECT_BACKOFF_MS * Math.pow(2, exponent);
    return Math.min(rawDelay, RECONNECT_MAX_INTERVAL_MS);
  }

  /**
   * 安排下一次重连
   *
   * SubTask 5.4.1：在指数退避延迟后触发 onReconnect 回调。
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
    const delay = this.calculateDelay(this.attempts);

    // 修复 no-console：重连日志改用 console.warn（允许的方法）
    console.warn(
      `[WebSocket] 将在 ${delay}ms 后进行第 ${this.attempts} 次重连（指数退避）`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      onReconnect();
    }, delay);

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
