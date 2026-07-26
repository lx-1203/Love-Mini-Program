/**
 * Chat Store 工具函数
 *
 * 集中维护聊天 store 用到的纯工具函数：模式判断、本地存储读写、重试执行器。
 *
 * 拆分目的：原 chat.ts 单文件 944 行，违反单一职责原则。
 * 拆分后工具函数独立成文件，被 higher-order / index 复用。
 */

import { isMockMode } from "../../services/env";
import {
  MAX_SEND_RETRIES,
  MESSAGE_STATUS_STORAGE_KEY,
  SEND_RETRY_DELAY_MS,
} from "./constants";
import type { MessageDeliveryStatusMap } from "./types";

/** 判断当前是否为 Mock 模式 */
export function useMock() {
  return isMockMode();
}

/**
 * 从本地存储加载消息投递状态映射表。
 *
 * 修复（P1 BUG）：原 sendText 无状态持久化，页面刷新或切换会话后，
 * 用户无法感知上一条消息是否发送成功。
 * 现将消息投递状态持久化到本地存储，确保跨会话/刷新后仍可恢复展示。
 */
export function loadMessageStatus(): MessageDeliveryStatusMap {
  try {
    const raw = uni.getStorageSync(MESSAGE_STATUS_STORAGE_KEY);
    if (typeof raw === "string" && raw.length > 0) {
      const parsed = JSON.parse(raw) as MessageDeliveryStatusMap;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (_e) {
    // 读取失败忽略，使用空对象
  }
  return {};
}

/**
 * 将消息投递状态映射表写入本地存储。
 */
export function saveMessageStatus(status: MessageDeliveryStatusMap): void {
  try {
    uni.setStorageSync(MESSAGE_STATUS_STORAGE_KEY, JSON.stringify(status));
  } catch (_e) {
    // 写入失败忽略，避免阻塞业务流程
  }
}

/**
 * 带重试的异步执行器（仅对网络层错误重试，不对业务错误重试）。
 *
 * 修复（P1 BUG）：原 sendText 无重试机制，网络抖动时直接失败，
 * 用户体验不佳。现新增 1 次自动重试，仅对网络层错误（category === "network"）重试。
 *
 * @param fn - 要执行的异步函数
 * @param maxRetries - 最大重试次数
 * @param delayMs - 重试延迟毫秒数
 */
export async function withSendRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_SEND_RETRIES,
  delayMs = SEND_RETRY_DELAY_MS
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // 仅对网络层错误重试（EnhancedApiError.category === "network"）
      const isNetworkError =
        error !== null &&
        typeof error === "object" &&
        "category" in error &&
        (error as { category: string }).category === "network";
      if (!isNetworkError || attempt >= maxRetries) {
        break;
      }
      // 延迟后重试
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("发送失败");
}
