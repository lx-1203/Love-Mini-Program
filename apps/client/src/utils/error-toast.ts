/**
 * 统一错误提示工具
 *
 * 目的：
 * - 将 catch 块中的 unknown 错误转换为用户友好的 toast 提示
 * - 区分网络错误 / 权限错误 / 业务错误 / 未知错误，给出针对性文案
 * - 避免每个页面重复编写「error instanceof Error ? error.message : 兜底」模板
 *
 * mp-weixin 兼容性：
 * - 不使用 optional catch binding
 * - 不使用 import.meta.env
 *
 * 用法：
 * ```ts
 * try {
 *   await api.submit();
 * } catch (error) {
 *   showErrorToast(error, "提交失败");
 * }
 * ```
 */
import { EnhancedApiError } from "../services/http";
import { AppApiError } from "../services/api-error";
// 修复（R4-00215）：分类默认文案 i18n 化（不随 locale 切换的硬编码中文已移除）
import { t } from "@/i18n";

/**
 * 错误分类，与 services/http.ts 的 ErrorCategory 对齐。
 * 新增 unknown 用于无法识别的错误类型。
 */
export type ToastErrorCategory = "network" | "auth" | "business" | "unknown";

/**
 * 分类默认文案（修复 R4-00215：i18n 化）。
 *
 * 每个分类提供一句「友好 + 可操作」的提示，避免暴露技术细节；
 * 文案经 t() 在调用时解析，随当前 locale 切换（zh-CN / en-US）。
 * 注意：不能在模块加载期一次性求值（locale 可能运行期切换），
 * 故改为按需调用的 defaultMessageFor()。
 */
const DEFAULT_MESSAGES: Record<ToastErrorCategory, string> = {
  // auth 复用 apiErrors.unauthorized（「登录已过期，请重新登录」）
  network: "errorToast.network",
  auth: "apiErrors.unauthorized",
  business: "errorToast.business",
  unknown: "errorToast.unknown",
};

/** 按分类解析默认文案（调用时求值，跟随当前 locale） */
function defaultMessageFor(category: ToastErrorCategory): string {
  return t(DEFAULT_MESSAGES[category]);
}

/**
 * 从 unknown 错误对象中提取分类。
 *
 * 识别顺序：
 * 1. EnhancedApiError → 使用其 category 字段
 * 2. AppApiError → 根据状态码推断（401/403 → auth；0 → network；其他 → business）
 * 3. 网络/超时关键词（"timeout" / "network" / "abort"）→ network
 * 4. 兜底 → unknown
 *
 * @param error - catch 块中的 unknown 错误
 * @returns 错误分类
 */
export function categorizeError(error: unknown): ToastErrorCategory {
  // 1. EnhancedApiError 优先（携带 category 字段）
  if (error instanceof EnhancedApiError) {
    return error.category as ToastErrorCategory;
  }

  // 2. AppApiError 按状态码推断
  if (error instanceof AppApiError) {
    if (error.status === 401 || error.status === 403) return "auth";
    if (error.status === 0) return "network";
    return "business";
  }

  // 3. 字符串/普通错误：检查关键词
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  const lower = message.toLowerCase();
  if (
    lower.includes("timeout") ||
    lower.includes("network") ||
    lower.includes("abort")
    // 修复：原实现末尾还有 `|| lower.includes("fail") && lower.includes("timeout")`，
    // 该条件是死代码——`includes("timeout")` 已在上方覆盖（且由于 && 优先级，
    // 该表达式在 timeout 不包含时永远为 false），删除冗余判断。
  ) {
    return "network";
  }

  // 4. 兜底
  return "unknown";
}

/**
 * 从 unknown 错误对象中提取 message 文案。
 *
 * 优先级：
 * 1. AppApiError / EnhancedApiError 的 message（已由后端格式化）
 * 2. Error 的 message
 * 3. 字符串本身
 * 4. 空串（由调用方提供 fallback）
 *
 * @param error - catch 块中的 unknown 错误
 * @returns 错误 message，可能为空串
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof AppApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
}

/**
 * 计算最终展示给用户的错误文案。
 *
 * 优先级：
 * 1. error 自身的 message（如果是 AppApiError，且 message 非空且非默认兜底）
 * 2. fallback（调用方提供的上下文化文案）
 * 3. 按 category 的默认文案
 *
 * @param error - catch 块中的 unknown 错误
 * @param fallback - 调用方提供的兜底文案（如 "提交失败"）
 * @returns 最终展示文案
 */
export function resolveErrorMessage(error: unknown, fallback?: string): string {
  const category = categorizeError(error);
  const message = extractErrorMessage(error);

  // 网络错误：优先使用分类默认文案，避免后端返回的"timeout"等技术词汇暴露给用户
  if (category === "network") {
    return defaultMessageFor(category);
  }

  // 权限错误：优先使用分类默认文案，避免暴露 token / 401 等细节
  if (category === "auth") {
    return defaultMessageFor(category);
  }

  // 业务错误：优先使用后端返回的 message（已格式化为用户可读文案）
  if (message && message.trim().length > 0) {
    return message;
  }

  // 兜底：调用方提供的文案 > 分类默认文案
  return fallback || defaultMessageFor(category);
}

/**
 * 显示错误 toast，自动按错误分类选择文案。
 *
 * @param error - catch 块中的 unknown 错误
 * @param fallback - 调用方提供的兜底文案（如 "提交失败"、"登录失败"）
 * @param duration - toast 显示时长（毫秒），默认 2000ms
 */
export function showErrorToast(error: unknown, fallback?: string, duration = 2000): void {
  const message = resolveErrorMessage(error, fallback);
  try {
    uni.showToast({
      title: message,
      icon: "none",
      duration,
    });
  } catch (_e) {
    // uni.showToast 在极端环境可能不可用，静默忽略
  }
}

/**
 * 显示成功 toast 的便捷封装。
 *
 * @param message - 成功文案
 * @param duration - 显示时长（毫秒），默认 1500ms
 */
export function showSuccessToast(message: string, duration = 1500): void {
  try {
    uni.showToast({
      title: message,
      icon: "success",
      duration,
    });
  } catch (_e) {
    // 静默忽略
  }
}
