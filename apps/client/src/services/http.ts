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
  } catch {
    return "";
  }
}

/**
 * 保存 JWT Token 到本地存储。
 */
export function setToken(token: string): void {
  try {
    uni.setStorageSync(TOKEN_STORAGE_KEY, token);
  } catch {
    // 存储失败时静默忽略
  }
}

/**
 * 获取刷新 Token。
 */
export function getRefreshToken(): string {
  try {
    return uni.getStorageSync(REFRESH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * 保存刷新 Token。
 */
export function setRefreshToken(token: string): void {
  try {
    uni.setStorageSync(REFRESH_TOKEN_KEY, token);
  } catch {
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
  } catch {
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

/* ========== 401 处理 ========== */

/** 是否正在刷新 Token */
let isRefreshing = false;

/** Token 刷新失败后的重定向锁，避免多次跳转 */
let hasRedirectedToLogin = false;

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
  } catch {
    // 刷新失败
  }

  return false;
}

/**
 * 处理 401 响应。
 * 尝试刷新 Token，如果失败则跳转到登录页。
 */
async function handle401(): Promise<void> {
  if (hasRedirectedToLogin) {
    return;
  }

  if (!isRefreshing) {
    isRefreshing = true;
    try {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        isRefreshing = false;
        return;
      }
    } catch {
      // 刷新失败
    }
    isRefreshing = false;
  }

  // 刷新失败，清除 Token 并跳转登录页
  clearTokens();
  hasRedirectedToLogin = true;

  // 延迟重置跳转锁，避免短时间内多次跳转
  setTimeout(() => {
    hasRedirectedToLogin = false;
  }, 3000);

  // 跳转到登录页
  uni.reLaunch({
    url: "/pages/login/index",
  });
}

/* ========== 请求配置 ========== */

/** 默认超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 10000;

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
}

/**
 * 增强版 HTTP 请求函数。
 *
 * 功能特性:
 * 1. JWT Token 自动附加：从本地存储读取 token 并添加到 Authorization 头
 * 2. 401 响应处理：尝试刷新 token 或跳转登录页
 * 3. 统一错误分类：将错误分为 network / auth / business 三类
 * 4. 请求超时：默认 10 秒
 * 5. 请求/响应拦截器：支持注册自定义拦截器
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

        // 401 未授权：尝试刷新 token 或跳转登录
        if (statusCode === 401) {
          handle401().catch(() => {
            // 处理 401 失败时静默忽略
          });

          reject(new EnhancedApiError({
            status: statusCode,
            error: "unauthorized",
            message: "登录已过期，请重新登录",
            category: "auth",
          }));
          return;
        }

        // 403 禁止访问
        if (statusCode === 403) {
          reject(new EnhancedApiError({
            status: statusCode,
            error: "forbidden",
            message: "无权访问该资源",
            category: "auth",
          }));
          return;
        }

        // 其他错误：业务错误
        const category = categorizeError(statusCode);
        const apiError = toAppApiError(statusCode, processedResult.data);
        reject(new EnhancedApiError({
          status: apiError.status,
          error: apiError.error,
          message: apiError.message,
          details: apiError.details,
          category,
        }));
      },
      fail: (error) => {
        // 网络层错误
        if (error instanceof Error) {
          reject(new EnhancedApiError({
            status: 0,
            error: "network_error",
            message: error.message || "网络请求失败",
            category: "network",
          }));
          return;
        }

        reject(new EnhancedApiError({
          status: 0,
          error: "network_error",
          message: "网络请求失败",
          details: error,
          category: "network",
        }));
      },
    });
  });
}
