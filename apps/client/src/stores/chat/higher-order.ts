/**
 * Chat Store 高阶函数与传输层实例
 *
 * 集中维护：
 * 1. chatTransport 实例（与后端 WebSocket / HTTP 通信的封装）
 * 2. withErrorHandling：统一处理 loading 状态、错误消息的 try-catch-finally 模板
 * 3. withMockMode：统一处理 Mock / Real 模式切换、activeSession 更新、概览刷新
 *
 * 拆分目的：原 chat.ts 单文件 944 行，违反单一职责原则。
 * 拆分后高阶函数独立成文件，被 index.ts 中各 action 复用，消除重复模式。
 */

import { createChatTransport } from "../../features/chat/transport";
import { toChatSessionView } from "../../view-models/chat";
import { useMock } from "./utils";
import type {
  ChatStoreLike,
  LoadingKey,
  TempChatSession,
} from "./types";

/**
 * Chat 传输层实例（模块级单例）
 *
 * 由 createChatTransport 工厂创建，封装与后端聊天相关的 WebSocket / HTTP 通信。
 * 模块级单例保证全局唯一，避免重复创建连接。
 */
export const chatTransport = createChatTransport();

/**
 * 错误处理高阶函数
 * 统一处理 loading 状态设置、错误消息清理、try-catch-finally 结构
 * 消除各 action 方法中重复的错误处理代码模式
 *
 * 重复模式示例（重构前）：
 * ```ts
 * this.loadingXxx = true;
 * this.errorMessage = null;
 * try { ... } catch (error) {
 *   this.errorMessage = error instanceof Error ? error.message : "xxx失败";
 * } finally { this.loadingXxx = false; }
 * ```
 *
 * @param store - ChatStore 实例（传入 this 即可）
 * @param options - 配置选项
 * @param options.loadingKey - loading 状态的键名（可选，不传则不管理 loading 状态）
 * @param options.errorPrefix - 错误消息前缀，用于拼接 "xxx失败"
 * @param options.rethrow - 是否重新抛出错误（默认 false），sendIcebreaker 等需要上层感知错误时设为 true
 * @param fn - 业务逻辑函数
 * @returns 业务逻辑函数的返回值；出错且不重新抛出时返回 undefined
 */
export async function withErrorHandling<T>(
  store: ChatStoreLike,
  options: {
    loadingKey?: LoadingKey;
    errorPrefix: string;
    rethrow?: boolean;
  },
  fn: () => Promise<T>
): Promise<T | undefined> {
  const { loadingKey, errorPrefix, rethrow = false } = options;
  // 设置 loading 状态为 true
  if (loadingKey) {
    store[loadingKey] = true;
  }
  // 清理上一次的错误消息
  store.errorMessage = null;
  try {
    return await fn();
  } catch (error) {
    // 统一设置错误消息：优先使用 Error 实例的 message，否则使用前缀拼接
    store.errorMessage = error instanceof Error ? error.message : `${errorPrefix}失败`;
    if (rethrow) {
      // 重新抛出错误，让调用方决定是否需要处理（如 sendIcebreaker 需要向上抛出）
      throw error;
    }
    return undefined;
  } finally {
    // 无论成功或失败，都重置 loading 状态
    if (loadingKey) {
      store[loadingKey] = false;
    }
  }
}

/**
 * Mock/Real 模式切换高阶函数
 * 统一处理 Mock/Real 模式判断、活跃会话更新、概览刷新
 * 消除各 action 方法中重复的模式切换代码模式
 *
 * 重复模式示例（重构前）：
 * ```ts
 * if (useMock()) {
 *   // 操作 mockSessionMap ...
 *   this.activeSession = toChatSessionView(updatedSession);
 *   await this.loadOverview();
 *   return;
 * }
 * const session = await chatTransport.xxx(...);
 * this.activeSession = toChatSessionView(session);
 * await this.loadOverview();
 * ```
 *
 * @param store - ChatStore 实例（传入 this 即可）
 * @param mockFn - Mock 模式下的处理函数，返回原始数据（TempChatSession 等）
 * @param realFn - Real 模式下的处理函数，返回原始数据
 * @param options - 配置选项
 * @param options.shouldRefreshOverview - 是否在操作后刷新概览（默认 true）
 * @param options.shouldUpdateActiveSession - 是否将结果转换为视图模型并更新 activeSession（默认 true）
 * @returns 处理函数的返回值（原始数据）
 */
export async function withMockMode<T>(
  store: ChatStoreLike,
  mockFn: () => Promise<T> | T,
  realFn: () => Promise<T>,
  options: {
    shouldRefreshOverview?: boolean;
    shouldUpdateActiveSession?: boolean;
  } = {}
): Promise<T> {
  const { shouldRefreshOverview = true, shouldUpdateActiveSession = true } = options;
  let result: T;
  if (useMock()) {
    // Mock 模式：执行 Mock 处理函数，操作本地数据
    result = await mockFn();
  } else {
    // Real 模式：执行 Real 处理函数，调用后端 API
    result = await realFn();
  }
  // 统一处理活跃会话更新：当结果为对象且包含 id 字段时，转换为视图模型并更新 activeSession
  if (shouldUpdateActiveSession && result && typeof result === "object" && "id" in result) {
    // 由于 T 是泛型，无法直接断言为 TempChatSession，需先转 unknown 再转目标类型
    store.activeSession = toChatSessionView(result as unknown as TempChatSession);
  }
  // 统一刷新概览，确保会话列表的最后消息预览等保持最新
  if (shouldRefreshOverview) {
    await store.loadOverview();
  }
  return result;
}
