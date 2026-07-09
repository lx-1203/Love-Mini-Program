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
 */
export function setToken(token: string): void {
  try {
    uni.setStorageSync(TOKEN_STORAGE_KEY, token);
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

/* ========== 401 处理：并发刷新队列 ========== */

/** 是否正在刷新 Token */
let isRefreshing = false;

/** Token 刷新失败后的重定向锁，避免多次跳转 */
let hasRedirectedToLogin = false;

/**
 * 等待 Token 刷新的请求队列项。
 * - resolve: 刷新成功后以新 token 唤醒等待者
 * - reject: 刷新失败后以错误通知等待者
 */
type PendingRequest = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
};

/**
 * 等待 Token 刷新的请求队列。
 * 当首个 401 请求触发刷新时，后续并发的 401 请求会被加入此队列，
 * 刷新完成后统一唤醒，避免并发重复刷新 Token。
 */
let pendingRequests: PendingRequest[] = [];

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
 * 处理 401 响应，使用并发队列避免多个请求同时触发 Token 刷新。
 *
 * 行为说明：
 * - 首个 401 请求：设置 isRefreshing=true 并调用 tryRefreshToken()，
 *   成功则唤醒队列中所有等待者并返回新 token；失败则通知所有等待者并跳转登录页。
 * - 并发的 401 请求：加入等待队列，等首个请求完成后统一处理。
 * - 已经在跳转登录时：直接抛错，避免重复处理。
 *
 * @returns Promise<string> 解析为新 Token；刷新失败时 reject。
 */
async function handle401(): Promise<string> {
  // 已经在跳转登录，直接抛错避免重复处理
  if (hasRedirectedToLogin) {
    throw new Error("already redirected to login");
  }

  // 如果正在刷新，加入等待队列，等首个刷新完成后统一唤醒
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      pendingRequests.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = getToken();
      // 唤醒所有等待者
      pendingRequests.forEach((p) => p.resolve(newToken));
      pendingRequests = [];
      isRefreshing = false;
      return newToken;
    }
    // 刷新失败：说明 refresh token 也已失效，登录态确实失效
    // 通知所有等待者并跳转登录
    pendingRequests.forEach((p) => p.reject(new Error("token refresh failed")));
    pendingRequests = [];
    isRefreshing = false;
    clearTokens();
    hasRedirectedToLogin = true;
    // 延迟重置跳转锁，避免短时间内多次跳转
    setTimeout(() => {
      hasRedirectedToLogin = false;
    }, 3000);
    // 友好提示，避免静默登出（仅当确实 token 失效时才清空并跳转）
    uni.showToast({ title: "登录已过期，请重新登录", icon: "none", duration: 2000 });
    // 延迟跳转，让用户看到提示
    setTimeout(() => {
      uni.reLaunch({
        url: "/pages/login/index",
      });
    }, 500);
    throw new Error("token refresh failed");
  } catch (err) {
    // 异常分支：确保所有等待者都被通知，并复位刷新状态
    // strict 模式下 err 为 unknown，需包装为 Error 后再传给 reject
    const wrappedErr = err instanceof Error ? err : new Error(String(err));
    pendingRequests.forEach((p) => p.reject(wrappedErr));
    pendingRequests = [];
    isRefreshing = false;
    throw err;
  }
}

/* ========== 请求配置 ========== */

/** 默认超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 10000;

/** 默认重试次数（仅对网络错误重试，不对业务错误重试） */
const DEFAULT_RETRY_COUNT = 1;

/** 默认重试延迟（毫秒），指数退避起始值 */
const DEFAULT_RETRY_DELAY_MS = 500;

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
 *    - 其他：reject(buildError(...))
 * 3. fail：reject(buildNetworkError(...))
 *
 * @param options 调用方传入的请求配置（用于读取 skipAuth 等元信息）
 * @param requestConfig 经过请求拦截器处理后的 uni.request 配置
 * @returns Promise<TResponse> 解析为响应数据
 */
function doRequest<TResponse, TBody>(
  options: RequestOptions<TBody>,
  requestConfig: UniApp.RequestOptions
): Promise<TResponse> {
  return new Promise<TResponse>((resolve, reject) => {
    uni.request({
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
          handle401()
            .then((newToken) => {
              // 用新 token 重试一次原请求
              const retryConfig: UniApp.RequestOptions = {
                ...requestConfig,
                header: {
                  ...requestConfig.header,
                  Authorization: `Bearer ${newToken}`,
                } as Record<string, string>,
              };
              doRequest<TResponse, TBody>(options, retryConfig).then(resolve).catch(reject);
            })
            .catch(() => {
              reject(buildError(401, { error: "unauthorized", message: "登录已过期，请重新登录" }));
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
