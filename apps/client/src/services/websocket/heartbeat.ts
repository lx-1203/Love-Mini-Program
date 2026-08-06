/**
 * WebSocket 心跳管理模块
 *
 * 集中维护心跳定时器与超时检测：
 * - start()：启动周期性 ping 发送 + 超时检测
 * - stop()：停止心跳，清理所有定时器
 * - resetTimeout()：收到服务器消息时重置超时定时器
 *
 * 修复（P0 BUG）：原实现发送 STOMP 心跳帧（空行 \n），后端无法识别为心跳，
 * 导致连接被判定为空闲而断开。现改为发送标准 JSON ping 帧 `{"type":"ping"}`，
 * 后端回复 `{"type":"pong"}`，transport.ts 的 isPongMessage 识别 pong 后
 * 由本模块的 resetTimeout 重置心跳超时定时器。
 *
 * 若在 HEARTBEAT_TIMEOUT_MS 内未收到任何服务器消息，则判定为超时重连。
 */

import {
  HEARTBEAT_CONSECUTIVE_TIMEOUT_LIMIT,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_PING_PAYLOAD,
  HEARTBEAT_TIMEOUT_MS,
} from "./constants";

/**
 * 心跳管理器
 *
 * 封装 ping 定时器与超时定时器的生命周期管理。
 * 业务层通过 start() 启动心跳，通过 stop() 停止心跳，
 * 通过 resetTimeout() 在收到服务器消息时重置超时检测。
 */
export class HeartbeatManager {
  /** 心跳 ping 定时器（周期性发送 ping） */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /** 心跳超时定时器（超时后触发重连） */
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 连续心跳超时计数。
   * infra R2-00126: 收到任何服务器消息（含 pong）时由 resetTimeout() 清零；
   * 连续 HEARTBEAT_CONSECUTIVE_TIMEOUT_LIMIT 次超时才判定断线，
   * 弱网单次丢包/延迟不再立即断开重连。
   */
  private consecutiveTimeouts = 0;

  /**
   * 启动心跳
   *
   * 周期性发送 ping 帧，并设置超时检测：
   * - 每 HEARTBEAT_INTERVAL_MS 发送一次 ping
   * - 每次发送 ping 后设置 HEARTBEAT_TIMEOUT_MS 超时检测
   * - 若在超时窗口内未收到任何服务器消息（含 pong），触发 onTimeout 回调
   *
   * @param sendPing - 发送 ping 帧的回调（由业务层提供，内部调用 socketTask.send）
   * @param onTimeout - 心跳超时的回调（由业务层提供，内部触发重连）
   */
  start(
    sendPing: () => void,
    onTimeout: () => void
  ): void {
    // 启动前先停止现有心跳，避免定时器泄漏
    this.stop();

    this.heartbeatTimer = setInterval(() => {
      try {
        sendPing();
      } catch (_e) {
        // 心跳发送异常，静默处理
      }

      // 设置心跳超时检测：若 HEARTBEAT_TIMEOUT_MS 内未收到任何服务器消息，
      // 连续超时达到容错上限后判定为断线重连；
      // 注意：onSocketMessage 收到消息（含 pong）时会通过 resetTimeout 重置此定时器。
      this.armTimeout(onTimeout);
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * 启动一轮心跳超时检测。
   *
   * infra R2-00126: 超时后不立即断线——连续超时计数达到
   * HEARTBEAT_CONSECUTIVE_TIMEOUT_LIMIT 才触发 onTimeout（断线重连），
   * 单次超时仅输出告警并等待下一轮，兼容弱网抖动。
   */
  private armTimeout(onTimeout: () => void): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
    this.heartbeatTimeoutTimer = setTimeout(() => {
      this.heartbeatTimeoutTimer = null;
      this.consecutiveTimeouts += 1;
      if (this.consecutiveTimeouts >= HEARTBEAT_CONSECUTIVE_TIMEOUT_LIMIT) {
        this.consecutiveTimeouts = 0;
        console.warn("[WebSocket] 心跳连续超时，将重连");
        onTimeout();
      } else {
        console.warn(
          `[WebSocket] 心跳超时（${this.consecutiveTimeouts}/${HEARTBEAT_CONSECUTIVE_TIMEOUT_LIMIT}），等待下一轮`
        );
      }
    }, HEARTBEAT_TIMEOUT_MS);
  }

  /**
   * 停止心跳
   *
   * 清理 ping 定时器与超时定时器，停止心跳检测。
   * 在 disconnect() / cleanup() / 重连场景下调用。
   */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    // 清除心跳超时定时器（停止心跳时不再需要超时检测）
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
    // infra R2-00126: 停止心跳时清零连续超时计数，避免下次启动沿用旧计数
    this.consecutiveTimeouts = 0;
  }

  /**
   * 重置心跳超时定时器
   *
   * 每次收到服务器消息时调用，清除当前的超时定时器并重新计时。
   * 避免服务器正常推送消息时仍触发心跳超时误判。
   *
   * @param onTimeout - 心跳超时的回调（由业务层提供，内部触发重连）
   */
  resetTimeout(onTimeout: () => void): void {
    // infra R2-00126: 收到消息说明连接正常，清零连续超时计数
    this.consecutiveTimeouts = 0;
    this.armTimeout(onTimeout);
  }
}

/**
 * 构建心跳 ping 帧的便捷函数。
 *
 * 由业务层在 sendPing 回调中调用，发送 `{"type":"ping"}` 文本。
 *
 * @returns 心跳 ping 帧的 JSON 文本
 */
export function buildPingPayload(): string {
  return HEARTBEAT_PING_PAYLOAD;
}
