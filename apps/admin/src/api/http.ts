/**
 * 管理后台 API 请求工具。
 * 封装 fetch，统一处理：
 *  - API base URL（来自 VITE_API_BASE_URL 环境变量，回退到 /api，由 vite proxy 转发到后端）
 *  - JWT token（从 localStorage.admin_token 读取）
 *  - JSON 序列化/反序列化
 *  - 查询参数序列化
 *  - 401 自动登出
 *  - 错误响应处理
 */

/** 后端通用分页响应结构（对应 com.campuslove.api.admin.AdminPageView） */
export interface AdminPageView<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 后端通用错误结构 */
export class ApiError extends Error {
  /** HTTP 状态码 */
  readonly status: number;
  /** 后端响应体（可能含错误码等附加字段） */
  readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** API 基础 URL：优先使用环境变量，回退到 /api（由 vite proxy 转发到 http://localhost:8080） */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * 获取当前管理员 token。
 * @returns JWT token 字符串，未登录时返回空字符串
 */
function getToken(): string {
  return localStorage.getItem("admin_token") || "";
}

/**
 * 将查询参数对象序列化为 URL query string。
 * - 忽略 null/undefined/空字符串
 * - 数组按重复 key 序列化（如 a=1&a=2）
 * @returns 以 ? 开头的字符串，无参数时返回空串
 */
function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== null && v !== undefined && v !== "") {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
        }
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * 发起 GET 请求。
 * @param path  接口路径（相对于 API_BASE_URL，以 / 开头）
 * @param query 查询参数（可选）
 * @returns 响应 JSON 数据；HTTP 204 或空 body 返回 null
 * @throws ApiError 当响应非 2xx 时抛出
 */
export async function get<T>(
  path: string,
  query?: Record<string, unknown>
): Promise<T> {
  const qs = query ? buildQueryString(query) : "";
  return request<T>(`${path}${qs}`, { method: "GET" });
}

/**
 * 发起 DELETE 请求。
 * @param path 接口路径
 * @returns 响应 JSON 数据
 */
export async function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

/**
 * 发起 PUT 请求。
 * @param path 接口路径
 * @param body 请求体对象（将被 JSON.stringify）
 * @returns 响应 JSON 数据
 */
export async function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * 发起 POST 请求。
 * @param path 接口路径
 * @param body 请求体对象
 */
export async function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * 底层请求实现。
 * 401 响应自动清除 token 并跳转登录页。
 */
async function request<T>(path: string, init: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  // 401 未授权：清除本地凭据并跳转登录页
  // 与 session.ts 中的 localStorage key 保持一致：admin_token / admin_user
  if (response.status === 401) {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "未授权，请重新登录");
  }

  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    let body: unknown;
    try {
      body = await response.json();
      if (body && typeof body === "object" && "message" in body) {
        message = String((body as { message: unknown }).message);
      }
    } catch {
      // 非 JSON 错误响应，使用默认 message
    }
    throw new ApiError(response.status, message, body);
  }

  // 处理 204 No Content 或空 body
  if (response.status === 204) {
    return null as T;
  }
  const text = await response.text();
  if (!text) {
    return null as T;
  }
  return JSON.parse(text) as T;
}
