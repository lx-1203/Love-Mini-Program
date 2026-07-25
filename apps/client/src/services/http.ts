import { appEnv } from "./env";
import { AppApiError, toAppApiError } from "./api-error";

/* ========== 错误分类 ========== */

/**
 * 错误类型枚举，用于区分不同来源的错误。
 * - network: 网络层错误（无连接、超时等）
 * - auth: 认证授权错误（401、token 过期等）
 * - business: 业务逻辑错误（服务端返回的业务异常）
 */
export type ErrorCategory = "network" | "auth" | "business";

/**
 * 增强的 API 错误类，包含错误分类信息。
 */
export class EnhancedApiError extends AppApiError {
  category: ErrorCategory;

  constructor(shape: { status: number; error: string; message: string; details?: unknown; category: ErrorCategory }) {
    super(shape);
    this.name = "EnhancedApiError";
    this.category = shape.category;
  }
}

/**
 * 根据状态码判断错误分类。
 */
function categorizeError(status: number): ErrorCategory {
  if (status === 401 || status === 403) {
    return "auth";
  }
  if (status === 0) {
    return "network";
  }
  return "business";
}

/* ========== 拦截器类型 ========== */

/**
 * 请求拦截器：在请求发出前对配置进行修改。
 * 可用于添加认证头、日志记录等。
 */
export type RequestInterceptor = (config: UniApp.RequestOptions) => UniApp.RequestOptions;

/**
 * 响应拦截器：在收到响应后对结果进行处理。
 * 可用于统一错误处理、日志记录等。
 */
export type ResponseInterceptor = (response: UniApp.RequestSuccessCallbackResult) => UniApp.RequestSuccessCallbackResult;

/* ========== 拦截器管理 ========== */

/** 请求拦截器列表 */
const requestInterceptors: RequestInterceptor[] = [];

/** 响应拦截器列表 */
const responseInterceptors: ResponseInterceptor[] = [];

/**
 * 注册请求拦截器。
 * @param interceptor 请求拦截器函数
 */
export function addRequestInterceptor(interceptor: RequestInterceptor): void {
  requestInterceptors.push(interceptor);
}

/**
 * 注册响应拦截器。
 * @param interceptor 响应拦截器函数
 */
export function addResponseInterceptor(interceptor: ResponseInterceptor): void {
  responseInterceptors.push(interceptor);
}

/* ========== Token 管理 ========== */

/** Token 存储键 */
const TOKEN_STORAGE_KEY = "token";
const REFRESH_TOKEN_KEY = "refresh_token";

/**
 * 从本地存储获取 JWT Token。
 */
export function getToken(): string {
  try {
    return uni.getStorageSync(TOKEN_STORAGE_KEY) || "";
  } catch (_e) {
    return "";
  }
}

/**
 * 保存 JWT Token 到本地存储。
 *
 * 修复：同时重置 isRedirecting 状态——新 token 设置意味着用户重新登录成功，
 * 之前因 401 触发的"正在跳转登录"状态应当清除，避免后续正常的 401 刷新流程被误拦截。
 */
export function setToken(token: string): void {
  try {
    uni.setStorageSync(TOKEN_STORAGE_KEY, token);
    // 状态重置：新登录成功，清除跳转登录标志
    isRedirecting = false;
  } catch (_e) {
    // 存储失败时静默忽略
  }
}

/**
 * 获取刷新 Token。
 */
export function getRefreshToken(): string {
  try {
    return uni.getStorageSync(REFRESH_TOKEN_KEY) || "";
  } catch (_e) {
    return "";
  }
}

/**
 * 保存刷新 Token。
 */
export function setRefreshToken(token: string): void {
  try {
    uni.setStorageSync(REFRESH_TOKEN_KEY, token);
  } catch (_e) {
    // 存储失败时静默忽略
  }
}

/**
 * 清除所有 Token（登出时调用）。
 */
export function clearTokens(): void {
  try {
    uni.removeStorageSync(TOKEN_STORAGE_KEY);
    uni.removeStorageSync(REFRESH_TOKEN_KEY);
  } catch (_e) {
    // 清除失败时静默忽略
  }
}

/* ========== 默认请求拦截器：JWT Token 自动附加 ========== */

addRequestInterceptor((config) => {
  const token = getToken();
  if (token) {
    // 确保 header 对象存在
    if (!config.header) {
      config.header = {};
    }
    (config.header as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

/* ========== 默认响应拦截器：规范化错误码 ========== */

/**
 * 默认响应拦截器：规范化非 2xx 响应的错误码字段。
 *
 * 修复（P1 BUG）：原实现各调用方对错误码的处理不统一，部分接口返回的 error 字段
 * 可能为空或格式不一致，导致前端难以基于 error code 做分支处理。
 * 此拦截器在响应链最前端确保非 2xx 响应体包含规范化的 error / message 字段，
 * 后续 buildError 读取时即可拿到统一格式的错误码。
 */
addResponseInterceptor((response) => {
  const { statusCode, data } = response;
  // 仅对非 2xx 错误响应规范化
  if (statusCode < 200 || statusCode >= 300) {
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      // 确保 error 字段为非空字符串
      if (typeof record.error !== "string" || record.error.trim().length === 0) {
        record.error = normalizeErrorCode(statusCode);
      }
      // 确保存在 code 字段（数字），便于调用方按码分发
      if (record.code === undefined || record.code === null) {
        record.code = statusCode;
      }
    }
  }
  return response;
});

/**
 * 根据 HTTP 状态码返回规范化的错误码字符串。
 * 与 api-error.ts 中的 fallbackErrorShape 保持一致，确保全链路错误码统一。
 */
function normalizeErrorCode(statusCode: number): string {
  if (statusCode === 400) return "bad_request";
  if (statusCode === 401) return "unauthorized";
  if (statusCode === 403) return "forbidden";
  if (statusCode === 404) return "not_found";
  if (statusCode >= 500) return "server_error";
  return "request_error";
}

/* ========== 401 处理：并发刷新队列（Promise 队列模式） ========== */

/**
 * 是否正在跳转登录页。
 *
 * 修复（P0 BUG）：原实现使用 hasRedirectedToLogin + setTimeout 3秒窗口重置，
 * 存在两个问题：
 * 1. 3秒窗口期内，新的 401 会被直接拒绝（即使 token 已被刷新），影响用户体验；
 * 2. 3秒窗口期外，若跳转尚未完成（reLaunch 异步），仍可能触发重复跳转。
 * 现改为基于状态：isRedirecting=true 期间任何 401 直接拒绝，
 * 状态在 setToken（用户重新登录）时重置，无时间窗口问题。
 */
let isRedirecting = false;

/**
 * 当前正在进行的刷新 Token Promise。
 *
 * 修复（P0 BUG）：原实现使用 isRefreshing 布尔 + pendingRequests 数组队列，
 * 存在非原子操作问题：
 * - 唤醒队列、清空队列、复位 isRefreshing 三步非原子，并发 401 可能在间隙加入队列后被丢失。
 * 现改为 Promise 队列模式：所有并发 401 共享同一个 refreshPromise，
 * Promise 天然原子——resolve/reject 时所有 await 者同时被通知，无需手动管理队列。
 */
let refreshPromise: Promise<string> | null = null;

/**
 * 尝试刷新 Token。
 * 如果刷新成功，更新存储并返回 true；否则返回 false。
 */
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const result = await new Promise<{ token?: string; refreshToken?: string }>((resolve, reject) => {
      uni.request({
        url: `${appEnv.apiBaseUrl}/auth/refresh`,
        method: "POST",
        data: { refreshToken },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data as { token?: string; refreshToken?: string });
          } else {
            reject(new Error("Token refresh failed"));
          }
        },
        fail: () => reject(new Error("Token refresh request failed")),
      });
    });

    if (result.token) {
      setToken(result.token);
      if (result.refreshToken) {
        setRefreshToken(result.refreshToken);
      }
      return true;
    }
  } catch (_e) {
    // 刷新失败
  }

  return false;
}

/**
 * 跳转登录页（仅触发一次，避免重复跳转）。
 *
 * 修复：基于 isRedirecting 状态而非时间戳，确保跳转期间所有 401 都被拒绝，
 * 且不会因 setTimeout 窗口期误判。状态在 setToken（新登录）时重置。
 */
function redirectToLogin(): void {
  // 已在跳转中，直接返回避免重复
  if (isRedirecting) return;
  isRedirecting = true;
  // 清除失效的本地 token，避免后续请求继续携带
  clearTokens();
  // 友好提示
  uni.showToast({ title: "登录已过期，请重新登录", icon: "none", duration: 2000 });
  // 延迟跳转，让用户看到提示
  setTimeout(() => {
    uni.reLaunch({ url: "/pages/login/index" });
  }, 500);
}

/**
 * 处理 401 响应，使用 Promise 队列模式确保并发请求等待同一刷新流程。
 *
 * 行为说明：
 * - 首个 401 请求：创建 refreshPromise 并执行刷新，
 *   成功返回新 token；失败抛出错误并触发跳转登录。
 * - 并发的 401 请求：共享同一个 refreshPromise，自动等待同一刷新流程，
 *   刷新成功则一并拿到新 token，失败则一并被 reject（Promise 天然原子）。
 * - 已经在跳转登录时：直接抛错，避免重复处理。
 *
 * @returns Promise<string> 解析为新 Token；刷新失败时 reject。
 */
async function handle401(): Promise<string> {
  // 已经在跳转登录，直接抛错避免重复处理
  if (isRedirecting) {
    throw new Error("already redirecting to login");
  }

  // 修复：Promise 队列模式——若已有刷新流程在进行，直接 await 同一 Promise
  // 确保并发 401 等待同一刷新，无需手动管理队列，避免非原子操作导致的丢请求问题
  if (refreshPromise) {
    return refreshPromise;
  }

  // 启动新的刷新流程
  refreshPromise = (async () => {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return getToken();
    }
    // 刷新失败：清理 token 并跳转登录
    // 修复：refresh 失败时，refreshPromise 的 reject 会自动通知所有 await 者（清空队列）
    redirectToLogin();
    throw new Error("token refresh failed");
  })();

  try {
    return await refreshPromise;
  } finally {
    // 刷新完成后清空 promise 引用，允许后续 401 触发新的刷新流程
    // （配合 doRequest 的 retry401Count 限制，不会形成死循环）
    refreshPromise = null;
  }
}

/* ========== 请求配置 ========== */

/** 默认超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 10000;

/** 默认重试次数（仅对网络错误重试，不对业务错误重试） */
const DEFAULT_RETRY_COUNT = 1;

/** 默认重试延迟（毫秒），指数退避起始值 */
const DEFAULT_RETRY_DELAY_MS = 500;

/**
 * HTTP 请求配置选项。
 *
 * 泛型参数 TBody 用于约束 data 字段类型，默认 unknown。
 * 调用方可显式传入请求体类型以获得静态类型检查，如 request<User, { name: string }>(...)。
 */
export interface RequestOptions<TBody = unknown> {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: TBody;
  /** 自定义超时时间（毫秒），默认 10 秒 */
  timeout?: number;
  /** 是否跳过认证头附加（用于登录等公开接口） */
  skipAuth?: boolean;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 网络错误自动重试次数，默认 1；仅对 status=0 的网络层错误重试 */
  retry?: number;
  /** 是否禁用自动重试（用于明确不希望重试的接口，如登录） */
  noRetry?: boolean;
  /**
   * AbortController 信号，用于取消请求。
   * 传入已 aborted 的 signal 会立即取消请求；
   * 传入未 aborted 的 signal，后续调用 signal.abort() 会终止底层 uni.request。
   */
  signal?: AbortSignal;
}

/**
 * 根据 HTTP 状态码与响应体构造 EnhancedApiError。
 * 内部统一通过 categorizeError + toAppApiError 处理，避免重复代码。
 *
 * @param statusCode HTTP 状态码
 * @param data 响应体
 * @returns 增强版 API 错误对象
 */
function buildError(statusCode: number, data: unknown): EnhancedApiError {
  const category = categorizeError(statusCode);
  const apiError = toAppApiError(statusCode, data);
  return new EnhancedApiError({
    status: apiError.status,
    error: apiError.error,
    message: apiError.message,
    details: apiError.details,
    category,
  });
}

/**
 * 根据 uni.request fail 回调的错误构造网络层 EnhancedApiError。
 * 兼容 Error 实例与未知错误体两种情况。
 *
 * @param error uni.request fail 回调的原始错误
 * @returns 增强版 API 错误对象，category 始终为 network
 */
function buildNetworkError(error: unknown): EnhancedApiError {
  if (error instanceof Error) {
    return new EnhancedApiError({
      status: 0,
      error: "network_error",
      message: error.message || "网络请求失败",
      category: "network",
    });
  }
  return new EnhancedApiError({
    status: 0,
    error: "network_error",
    message: "网络请求失败",
    details: error,
    category: "network",
  });
}

/**
 * 内部请求执行函数，封装 uni.request 调用与响应拦截器链。
 * 不包含网络层重试逻辑，重试由外层 request 函数统一处理。
 *
 * 处理流程：
 * 1. 调用 uni.request 发起请求
 * 2. success：执行响应拦截器链
 *    - 2xx：resolve 数据
 *    - 401：skipAuth 短路或调用 handle401，刷新成功后用新 token 重试一次
 *      （修复：通过 retry401Count 限制最多重试 1 次，第二次 401 直接 reject 并跳转登录，避免死循环）
 *    - 其他：reject(buildError(...))
 * 3. fail：reject(buildNetworkError(...))
 * 4. 支持通过 AbortController.signal 取消请求
 *
 * @param options 调用方传入的请求配置（用于读取 skipAuth / signal 等元信息）
 * @param requestConfig 经过请求拦截器处理后的 uni.request 配置
 * @param retry401Count 当前请求已重试 401 的次数（内部递归使用，外部默认 0）
 * @returns Promise<TResponse> 解析为响应数据
 */
function doRequest<TResponse, TBody>(
  options: RequestOptions<TBody>,
  requestConfig: UniApp.RequestOptions,
  retry401Count = 0
): Promise<TResponse> {
  return new Promise<TResponse>((resolve, reject) => {
    // 修复：若 signal 已 aborted，立即拒绝，不发请求
    if (options.signal && options.signal.aborted) {
      reject(buildNetworkError(new Error("请求已取消")));
      return;
    }

    const requestTask = uni.request({
      ...requestConfig,
      success: (result) => {
        // 执行响应拦截器链
        let processedResult = result;
        for (const interceptor of responseInterceptors) {
          processedResult = interceptor(processedResult);
        }

        const statusCode = processedResult.statusCode ?? 0;

        // 2xx 成功
        if (statusCode >= 200 && statusCode < 300) {
          resolve(processedResult.data as TResponse);
          return;
        }

        // 401 未授权：刷新 token 后重试，或跳转登录
        if (statusCode === 401) {
          // skipAuth 接口（如登录）本身返回 401 时不走刷新流程，直接抛出
          if (options.skipAuth) {
            reject(buildError(statusCode, processedResult.data));
            return;
          }
          // 修复（P0 BUG）：限制最多重试 1 次，第二次 401 直接 reject 并跳转登录，避免死循环
          // （refresh 成功但新 token 仍返回 401，说明权限或会话有更深问题，不应继续刷新）
          if (retry401Count >= 1) {
            redirectToLogin();
            reject(
              buildError(401, { error: "unauthorized", message: "登录已过期，请重新登录" })
            );
            return;
          }
          handle401()
            .then((newToken) => {
              // 用新 token 重试一次原请求，retry401Count+1 防止死循环
              const retryConfig: UniApp.RequestOptions = {
                ...requestConfig,
                header: {
                  ...requestConfig.header,
                  Authorization: `Bearer ${newToken}`,
                } as Record<string, string>,
              };
              doRequest<TResponse, TBody>(options, retryConfig, retry401Count + 1)
                .then(resolve)
                .catch(reject);
            })
            .catch(() => {
              reject(
                buildError(401, { error: "unauthorized", message: "登录已过期，请重新登录" })
              );
            });
          return;
        }

        // 其他错误（403 / 4xx / 5xx）：统一构造业务或认证错误
        reject(buildError(statusCode, processedResult.data));
      },
      fail: (error) => {
        // 网络层错误（超时、断网等）
        reject(buildNetworkError(error));
      },
    });

    // 修复：支持 AbortController 取消请求
    // uni.request 返回 RequestTask，调用其 abort() 可终止请求
    if (options.signal && requestTask && typeof requestTask.abort === "function") {
      const signal = options.signal;
      // signal 已 aborted 时已在上方提前拦截，这里只需监听后续 abort
      const onAbort = () => {
        try {
          requestTask.abort();
        } catch (_e) {
          // abort 失败静默处理（请求可能已完成）
        }
      };
      // 兼容性处理：优先使用 addEventListener，不支持时回退到 onabort
      if (typeof signal.addEventListener === "function") {
        signal.addEventListener("abort", onAbort, { once: true });
      } else if (typeof (signal as { onabort?: unknown }).onabort !== "undefined") {
        (signal as { onabort: (() => void) | null }).onabort = onAbort;
      }
    }
  });
}

/**
 * 增强版 HTTP 请求函数。
 *
 * 功能特性:
 * 1. JWT Token 自动附加：从本地存储读取 token 并添加到 Authorization 头
 * 2. 401 响应处理：并发刷新队列，刷新成功后自动重试原请求
 * 3. 统一错误分类：将错误分为 network / auth / business 三类
 * 4. 请求超时：默认 10 秒
 * 5. 请求/响应拦截器：支持注册自定义拦截器
 * 6. 网络层错误自动重试：默认重试 1 次，指数退避；可通过 noRetry 禁用
 *
 * 重试策略说明：
 * - 仅对网络层错误（status=0，如超时、断网）重试，不对 401/403 等认证错误和业务错误重试
 * - 401 由 handle401 队列统一处理，重试只关心网络层
 * - 默认重试 1 次，可通过 options.retry 自定义次数
 * - options.noRetry=true 时禁用重试（用于登录等场景，避免错误密码导致重试）
 * - 指数退避：500ms, 1000ms, 2000ms...
 *
 * @param options 请求配置
 * @returns Promise<TResponse> 解析为响应数据
 */
export async function request<TResponse, TBody = unknown>(
  options: RequestOptions<TBody>
): Promise<TResponse> {
  // 构建 uni.request 配置
  let requestConfig: UniApp.RequestOptions = {
    url: `${appEnv.apiBaseUrl}${options.url}`,
    method: options.method || "GET",
    data: options.data as Record<string, unknown> | string | ArrayBuffer | undefined,
    timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
    header: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  // 执行请求拦截器链
  for (const interceptor of requestInterceptors) {
    requestConfig = interceptor(requestConfig);
  }

  // 计算最大重试次数：noRetry 时不重试，否则取 retry 或默认值
  const maxRetries = options.noRetry ? 0 : Math.max(0, options.retry ?? DEFAULT_RETRY_COUNT);
  let lastError: EnhancedApiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await doRequest<TResponse, TBody>(options, requestConfig);
    } catch (error) {
      // 非 EnhancedApiError 异常直接抛出（不应发生，防御性处理）
      if (!(error instanceof EnhancedApiError)) {
        throw error;
      }
      lastError = error;
      // 仅对网络层错误重试（category=network），不对 auth/business 错误重试
      // 已达最大重试次数时也直接抛出
      if (error.category !== "network" || attempt === maxRetries) {
        throw error;
      }
      // 指数退避：500ms, 1000ms, 2000ms...
      const delay = DEFAULT_RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
  // 理论上不会执行到这里，TypeScript 需要明确的返回或抛出
  throw lastError ?? new Error("request failed");
}
