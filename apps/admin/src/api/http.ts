/**
 * Admin v2 API 请求工具（复制自旧后台 apps/admin，token key 改为 admin_v2_token）。
 *
 * 封装 fetch，统一处理：
 *  - API base URL（来自 VITE_API_BASE_URL 环境变量，回退到 /api，由 vite proxy 转发到后端）
 *  - JWT token（从 localStorage.admin_v2_token 读取，与旧后台 admin_token 隔离）
 *  - JSON 序列化/反序列化
 *  - 查询参数序列化
 *  - 401 自动登出并跳转登录页（携带 redirect 参数便于回跳）
 *  - 错误响应处理
 *
 * 安全说明（infra R2-00300）：
 * JWT 目前明文存储于 localStorage（admin_v2_token），任何 XSS 均可窃取管理员令牌。
 * 改进方向（需后端协同）：
 *   1. 迁移 HttpOnly Cookie + CSRF 防护；
 *   2. 或缩短 token 有效期并引入刷新机制；
 *   3. 至少应限制 token 作用域（audience）与来源站点（sameSite）。
 */

import { env } from "../config/env";
import { t } from "../i18n";

/** 后端通用分页响应结构（对应 com.campuslove.api.admin.AdminPageView） */
export interface AdminPageView<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 解包后端响应：兼容「ApiResponse 包装」与「直出数据」两种形态。
 *
 * <p>部分端点（如 admin 登录、改密、新增用户、在线用户）返回
 * ApiResponse 包装 {@code {code, message, data, traceId}}（见
 * {@code com.campuslove.api.common.ApiResponse}），其余管理端点直接返回视图对象。
 * 识别规则：body 含 code 字段（数字或字符串，兼容 API-CONTRACT.md 声明的 string code）且含 data 字段
 * → 取 data，否则原样返回。</p>
 *
 * @param body 后端响应体
 * @returns 解包后的业务数据；直出形态原样返回；无法解包时返回 null
 */
export function unwrapApiData<T>(body: unknown): T | null {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const codeType = typeof record.code;
    if ((codeType === "number" || codeType === "string") && "data" in record) {
      return (record.data as T) ?? null;
    }
  }
  return (body as T) ?? null;
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

/** API 基础 URL：统一通过 config/env.ts 封装读取 */
export const API_BASE_URL = env.apiBaseUrl;

/**
 * Idempotency-Key 缓存有效期（毫秒）。
 * API-CONTRACT.md:139 约定「所有写接口必须携带 Idempotency-Key」：
 * 弱网重试/双击等场景下，同一操作签名（方法+路径+请求体）在 TTL 内复用同一
 * 幂等键，供后端去重，避免重复扣款/重复建单等资金类操作被重复执行。
 * TTL 取 60s：覆盖网络层重试与双击场景，同时避免长时间内两次相同业务操作被误判为重复。
 */
const IDEMPOTENCY_TTL_MS = 60_000;

/** 幂等键缓存上限（超过后先清理过期条目，防止无限增长） */
const IDEMPOTENCY_CACHE_MAX = 200;

/** 方法 + 路径 + 请求体 → { key, 生成时间 } 的幂等键缓存 */
const idempotencyCache = new Map<string, { key: string; at: number }>();

/** 生成幂等键：优先 crypto.randomUUID，不可用时回退到时间戳 + 随机串 */
function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `admin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * 获取写请求的 Idempotency-Key：相同操作签名（方法+路径+请求体）在 TTL 内复用同一 key。
 * @param method  HTTP 方法（POST/PUT/DELETE）
 * @param path    接口路径
 * @param body    请求体（JSON 字符串）
 */
function getIdempotencyKey(method: string, path: string, body: unknown): string {
  const signature = `${method} ${path} ${body === undefined ? "" : String(body)}`;
  const now = Date.now();
  const cached = idempotencyCache.get(signature);
  if (cached && now - cached.at < IDEMPOTENCY_TTL_MS) {
    return cached.key;
  }
  const key = createIdempotencyKey();
  // 缓存达到上限时先清理过期条目，仍超限则整体清空（保守策略，避免无限增长）
  if (idempotencyCache.size >= IDEMPOTENCY_CACHE_MAX) {
    for (const [k, v] of idempotencyCache) {
      if (now - v.at >= IDEMPOTENCY_TTL_MS) idempotencyCache.delete(k);
    }
    if (idempotencyCache.size >= IDEMPOTENCY_CACHE_MAX) idempotencyCache.clear();
  }
  idempotencyCache.set(signature, { key, at: now });
  return key;
}

/**
 * 常规请求超时时间（毫秒）。
 * 所有 API 模块共用此超时，通过 AbortController 中止慢请求，避免页面长时间挂起。
 */
export const REQUEST_TIMEOUT_MS = 15000;

/**
 * 长耗时操作（批量导入/导出类）超时时间（毫秒）。
 * 默认 15s 对批量导入/导出类慢操作偏短，
 * 需要长超时的调用方显式传入该值（见 request 的 timeout 参数）。
 */
export const LONG_REQUEST_TIMEOUT_MS = 120000;

/**
 * 获取当前管理员 token。
 * @returns JWT token 字符串，未登录时返回空字符串
 */
function getToken(): string {
  return localStorage.getItem("admin_v2_token") || "";
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
  query?: Record<string, unknown>,
  timeout?: number
): Promise<T> {
  const qs = query ? buildQueryString(query) : "";
  return request<T>(`${path}${qs}`, { method: "GET" }, timeout);
}

/**
 * 发起 DELETE 请求。
 * @param path 接口路径
 * @returns 响应 JSON 数据
 */
export async function del<T>(path: string, timeout?: number): Promise<T> {
  return request<T>(path, { method: "DELETE" }, timeout);
}

/**
 * 发起 PUT 请求。
 * @param path 接口路径
 * @param body 请求体对象（将被 JSON.stringify）
 * @returns 响应 JSON 数据
 */
export async function put<T>(path: string, body?: unknown, timeout?: number): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, timeout);
}

/**
 * 发起 POST 请求。
 * @param path 接口路径
 * @param body 请求体对象
 */
export async function post<T>(path: string, body?: unknown, timeout?: number): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, timeout);
}

/**
 * 401 跳转收敛标志。
 * 并发多个请求同时收到 401 时，只触发一次整页跳转。
 */
let redirecting = false;

/**
 * 401 未授权统一处理：清除本地凭据并跳转登录页。
 * 与 session.ts 中的 localStorage key 保持一致：admin_v2_token / admin_v2_user；
 * 携带 redirect 参数，便于登录后回跳到当前被拦截的页面；
 * 通过模块级 redirecting 标志收敛并发 401 为一次跳转（1s 窗口内只跳一次）。
 */
function handleUnauthorized(): void {
  localStorage.removeItem("admin_v2_token");
  localStorage.removeItem("admin_v2_user");
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    if (!redirecting) {
      redirecting = true;
      // 重置标志，避免后续真正的会话过期无法再次跳转
      setTimeout(() => {
        redirecting = false;
      }, 1000);
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirect}`;
    }
  }
}

/**
 * 从错误响应提取可读 message 与原始 body：
 * - message：优先后端返回的 message 字段（null/空串时兜底），
 *   否则按 HTTP 状态码映射为用户可读文案；
 * - body：原始响应体（供调用方读取后端附加错误字段，如 InterestCircles 的 409 error 字段）。
 */
async function extractErrorMessage(response: Response): Promise<{ message: string; body?: unknown }> {
  let message = "";
  let body: unknown;
  try {
    body = await response.json();
    if (body && typeof body === "object" && "message" in body) {
      // 后端 message 为 null/空串时兜底，避免展示 "null" 脏文案
      const raw = (body as { message: unknown }).message;
      message = raw == null || String(raw).trim() === "" ? "" : String(raw);
    }
  } catch {
    // 非 JSON 错误响应，message 保持空串，走下方状态码映射
  }
  // 错误码映射：后端未返回可读 message 时，按 HTTP 状态码翻译为用户可读文案
  if (!message) {
    if (response.status >= 500) {
      message = t("errors.server");
    } else if (response.status === 403) {
      message = t("errors.permission");
    } else if (response.status === 404) {
      message = t("errors.notFound");
    } else if (response.status === 429) {
      message = t("errors.rateLimited");
    } else if (response.status === 409) {
      message = t("errors.resourceConflict");
    } else {
      message = t("errors.unknown");
    }
  }
  return { message, body };
}

/**
 * 下载文件（Blob 流端点，如 CSV 导出）。
 *
 * 复用 request 管线的鉴权 / 超时 / 401 跳转 / 错误映射（单点维护），
 * 但响应不按 JSON 解析，而是以 Blob 形式通过临时 <a> 标签触发浏览器下载。
 *
 * @param path     接口路径（相对于 API_BASE_URL，以 / 开头）
 * @param filename 下载文件名（浏览器下载时使用）
 * @param timeout  超时（毫秒），导出类慢操作建议传 LONG_REQUEST_TIMEOUT_MS
 * @throws ApiError 网络错误 / 非 2xx / 401 时抛出
 */
export async function downloadFile(
  path: string,
  filename: string,
  timeout: number = LONG_REQUEST_TIMEOUT_MS,
): Promise<void> {
  const token = getToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    // 区分超时中止与其他网络错误（文案与 request 一致）
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, t("errors.network"));
    }
    throw new ApiError(0, t("errors.network"));
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, t("errors.auth"));
  }

  if (!response.ok) {
    const { message } = await extractErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  // 拿到 Blob 后通过临时 <a> 标签触发浏览器下载（a.download 指定文件名）
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 底层请求实现。
 * 401 响应自动清除 token 并跳转登录页。
 *
 * @param timeout 可选超时（毫秒），批量导入/导出等慢操作可传 LONG_REQUEST_TIMEOUT_MS
 */
async function request<T>(path: string, init: RequestInit, timeout: number = REQUEST_TIMEOUT_MS): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // 写请求统一注入 Idempotency-Key（API-CONTRACT.md:139 约定），
  // 弱网重试/双击时后端可据幂等键去重
  const method = (init.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    headers.set("Idempotency-Key", getIdempotencyKey(method, path, init.body));
  }

  // 超时控制：超过 timeout 未响应则中止请求并抛 ApiError
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    // 区分超时中止与其他网络错误（文案走 i18n）
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, t("errors.network"));
    }
    throw new ApiError(0, t("errors.network"));
  } finally {
    clearTimeout(timeoutId);
  }

  // 401 未授权：统一清理凭据并跳转登录页（收敛并发 401 为一次跳转）
  if (response.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, t("errors.auth"));
  }

  if (!response.ok) {
    const { message, body } = await extractErrorMessage(response);
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
  // JSON.parse 包 try/catch，后端返回非 JSON 内容时给出可读错误而非抛出 SyntaxError
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, t("errors.unknown"), text);
  }
}
