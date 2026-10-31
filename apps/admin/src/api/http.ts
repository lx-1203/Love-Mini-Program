/**
 * Admin v2 API 请求工具（复制自旧后台 apps/admin，token key 改为 admin_v2_token）。
 *
 * 封装 fetch，统一处理：
 *  - API base URL（来自 VITE_API_BASE_URL 环境变量，回退到 /api，由 vite proxy 转发到后端）
 *  - JWT token（从 localStorage.admin_v2_token 读取，与旧后台 admin_token 隔离）
 *  - JSON 序列化/反序列化
 *  - 查询参数序列化
 *  - 401 自动登出并跳转登录页（携带 redirect 参数便于回跳）；
 *    凭据已被别处更新时用新 token 原地重发一次（幂等键沿用，见 request 注释）
 *  - 写请求（POST/PUT/DELETE）按「一次逻辑调用」附带 Idempotency-Key
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
import { persistedSessionRole, roleCanWrite } from "../utils/write-policy";

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
 * 逻辑操作序号：模块内单调递增。
 *
 * 与时间戳/随机段组合后，保证「同一毫秒内并发发起的两次调用」也拿到不同幂等键——
 * {@code Date.now()} 与 {@code Math.random()} 单独都不保证唯一，序号是防撞的底线。
 * （与 apps/client/src/services/http.ts 的 operationSeq 同款）
 */
let operationSeq = 0;

/**
 * 读取平台 UUID：浏览器 / Node 提供 {@code crypto.randomUUID}，
 * 其余环境返回空串，由调用方走兜底。
 */
function readRandomUuid(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof g.crypto?.randomUUID !== "function") {
    return "";
  }
  try {
    return g.crypto.randomUUID();
  } catch {
    // 个别运行时暴露了 randomUUID 但实现不完整：按不可用处理
    return "";
  }
}

/** 非加密兜底随机段（完全无 WebCrypto 的环境使用；唯一性由序号 + 时间戳兜住）。 */
function randomBase36(charCount: number): string {
  let out = "";
  while (out.length < charCount) {
    out += Math.random().toString(36).slice(2);
  }
  return out.slice(0, charCount);
}

/**
 * 生成一把标识「一次逻辑调用」的幂等键（语义对齐 apps/client/src/services/http.ts:239-283）。
 *
 * 键格式：{@code idem-{METHOD}-{operationId}}，operationId 优先取平台 UUID，
 * 无 WebCrypto 时退化为 {@code 时间戳36进制-单调序号36进制-随机段}。
 * 总长度远小于后端 IdempotentInterceptor 的 MAX_KEY_LENGTH（128）。
 *
 * @param method 请求方法（大写），保留在键内便于服务端按端点排查 Redis 幂等键
 */
export function generateIdempotencyKey(method: string): string {
  operationSeq += 1;
  const uuid = readRandomUuid();
  const operationId = uuid || `${Date.now().toString(36)}-${operationSeq.toString(36)}-${randomBase36(10)}`;
  return `idem-${method}-${operationId}`;
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
export function getToken(): string {
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
 * 写请求的调用选项（一次逻辑调用的语义扩展）。
 *
 * readOnlySafe（2026-10-26）：
 * 默认所有 POST 在本地就按「写请求」预检（只读角色 AUDITOR 直接 403，省一次
 * 注定失败的往返）。个别 POST 端点本质是「读凭据签发」——如
 * POST /api/v1/media/sign（媒体签名 URL）：只读审核员必须能调用，否则媒体
 * 审核页看不到待审图片。带此标记的请求跳过本地写权限预检；后端仍按自身
 * 授权规则细粒度放行（/media/sign 对无权路径静默省略）。
 *
 * idempotencyKey：调用方**确实持有业务键**时才传（如客户端生成的订单号/请求号、
 * 「同一用户当日签到固定键」这类按业务语义去重的场景）。传了它，本层原样使用、
 * 不再生成随机键——去重范围由业务语义决定（同款规则见
 * apps/client/src/services/http.ts:259-263「已有手动设置的幂等键不覆盖」）。
 * 不传时每次调用生成一把新键，这是默认形态（缺陷修复：以前同签名的两次合法
 * 操作会共用一把键）。
 *
 * retry：网络层失败（超时 / 断网）后的**原地重试次数**，默认 0 = 现有行为（发一次）。
 * 与幂等键的关系是这条存在的唯一理由：一次逻辑调用的多次投递必须共用同一把键，
 * 否则「重试」会变成后端眼中的「重复操作」。当前后台没有默认开启重试的调用方
 * （ErrorState 的「重试」按钮是操作人重新发起 = 新的逻辑操作，本就该换一把键），
 * 该选项留给确需弱网重试的写调用（如批量导入）。
 */
export interface RequestCallOptions {
  readOnlySafe?: boolean;
  idempotencyKey?: string;
  retry?: number;
}

/** 旧名保留（只承载 readOnlySafe 语义的历史引用），避免调用方因改名而误改。 */
export type ReadOnlySafePostOptions = RequestCallOptions;

/**
 * 发起 POST 请求。
 * @param path     接口路径
 * @param body     请求体对象
 * @param timeout  超时（毫秒）
 * @param options  readOnlySafe=跳过本地只读写权限预检；idempotencyKey=显式业务幂等键；retry=网络失败原地重试次数
 */
export async function post<T>(
  path: string,
  body?: unknown,
  timeout?: number,
  options?: RequestCallOptions
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, timeout, options);
}

/**
 * 发起 PUT 请求。
 * @param path     接口路径
 * @param body     请求体对象（将被 JSON.stringify）
 * @param timeout  超时（毫秒）
 * @param options  见 RequestCallOptions（显式业务幂等键 / 原地重试）
 */
export async function put<T>(
  path: string,
  body?: unknown,
  timeout?: number,
  options?: RequestCallOptions
): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, timeout, options);
}

/**
 * 发起 DELETE 请求。
 * @param path    接口路径
 * @param timeout 超时（毫秒）
 * @param options 见 RequestCallOptions（显式业务幂等键 / 原地重试）
 */
export async function del<T>(
  path: string,
  timeout?: number,
  options?: RequestCallOptions
): Promise<T> {
  return request<T>(path, { method: "DELETE" }, timeout, options);
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
 * 底层请求实现：**一次 request 调用 = 一次逻辑操作 = 一把幂等键**。
 *
 * 幂等键语义（对齐 apps/client/src/services/http.ts:239-283 的 P1-1 修复）：
 * 键标识「这一次操作」，不是「这个端点 + 这份 body」。旧实现按
 * `method + path + String(body)` 做签名缓存在 60s 内复用同一把键，而后台大量
 * 写端点是**无请求体的状态开关**（POST /v1/admin/users/{id}/disable|enable、
 * 帖子 publish/unpublish、置顶/取消置顶）——两次**相反**的合法操作签名完全相同，
 * 第二次会被后端 IdempotentInterceptor（Redis `idempotent:{key}:{userId}`）当成
 * 重复投递拦成 409「重复请求」，或让后一次动作静默不生效而 UI 仍报成功
 * （封禁 → 解封 → 再封禁，一分钟内的第三刀就废了）。
 * 「双击防连点」也不再由幂等键兜底：那是页面的 submitting/禁用态职责，
 * 与客户端同一取舍（apps/client/src/services/http.ts:265-267）。
 *
 * 键在投递循环**之外**生成一次，循环内的所有投递（网络重试、401 换 token 重发）
 * 复用同一个 headers 对象——这才是不变式的意义所在：
 * **切勿把键生成下沉到单次投递里**，那样每次投递换一把键，幂等保护归零
 * （一次操作被送达两次正是 @Idempotent 要防的，也是被误删的旧签名缓存本来想做的事）。
 *
 * 401 处理：本地凭据已被别处更新（另一页签重新登录）时，用新 token 原地重发
 * 一次（只覆盖 Authorization，幂等键原样继承，同客户端 http.ts:819-825）；
 * 凭据没变则维持原行为——清理本地凭据并跳转登录页。
 *
 * @param timeout 可选超时（毫秒），批量导入/导出等慢操作可传 LONG_REQUEST_TIMEOUT_MS
 *                超时按**每次投递**计（开启 retry 时总耗时上限为 timeout ×(1+retry)）
 * @param options readOnlySafe 跳过只读角色本地写预检；idempotencyKey 显式业务幂等键；
 *                retry 网络失败原地重试次数（默认 0）
 */
async function request<T>(
  path: string,
  init: RequestInit,
  timeout: number = REQUEST_TIMEOUT_MS,
  options?: RequestCallOptions
): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const isWrite = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";

  const headers = new Headers(init.headers);
  let tokenUsed = getToken();
  if (tokenUsed) {
    headers.set("Authorization", `Bearer ${tokenUsed}`);
  }

  // 写请求统一注入 Idempotency-Key（API-CONTRACT.md:139 约定）
  if (isWrite) {
    // 只读角色（AUDITOR 及任何未知角色）在请求发出前就被拦下。
    // 后端 URL 层本会回 403，但把「这个账号是只读的」说在调用方一侧有两点好处：
    // 少一次注定失败的往返，且尚未接 v-if="canWrite" 的写控件也不会再让
    // 审核员看到一句没头没尾的「权限不足」。本地无会话记录时不拦截（登录/登出走后端 401）。
    // 例外：readOnlySafe 的读语义端点（如 /media/sign 签名）不拦，见 post 注释。
    const sessionRole = persistedSessionRole();
    if (
      !options?.readOnlySafe &&
      sessionRole !== null &&
      !roleCanWrite(sessionRole)
    ) {
      throw new ApiError(403, t("errors.readOnlyRole"));
    }
    // 一次逻辑调用一把键：调用方显式给了业务幂等键就原样透传，
    // 否则现生成（同一方法+路径+请求体的两次独立调用必须拿到不同的键，
    // 这是本轮修掉的缺陷——旧的「签名 60s 缓存」会把两次真实操作合成一次）。
    headers.set(
      "Idempotency-Key",
      options?.idempotencyKey?.trim() || generateIdempotencyKey(method),
    );
  }

  // 网络层原地重试次数由调用方按操作语义决定，默认 0 = 单次投递；
  // 重试沿用同一 headers ⇒ 幂等键不变，后端据此识别重复投递。
  const maxRetries = options?.retry ?? 0;
  let retriesLeft = maxRetries;
  // 401 原地重发最多一次：只有「本地凭据已被别处刷新」才会走到，
  // 重发只换 Authorization、幂等键继承，因此不会重复扣款/重复建单。
  let refreshResendsLeft = 1;

  for (;;) {
    // 超时控制：每次投递各自一个 AbortController，超过 timeout 未响应则中止
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
      // 同一次逻辑调用的重试：headers 未变 ⇒ 幂等键不变，后端据此认出这是重复投递
      if (retriesLeft > 0) {
        retriesLeft -= 1;
        continue;
      }
      // 区分超时中止与其他网络错误（文案走 i18n）
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError(408, t("errors.network"));
      }
      throw new ApiError(0, t("errors.network"));
    } finally {
      clearTimeout(timeoutId);
    }

    // 401 未授权
    if (response.status === 401) {
      const currentToken = getToken();
      if (refreshResendsLeft > 0 && currentToken && currentToken !== tokenUsed) {
        // 凭据已被别处刷新：沿用本次逻辑调用的幂等键，只换 Authorization 重发
        refreshResendsLeft -= 1;
        tokenUsed = currentToken;
        headers.set("Authorization", `Bearer ${currentToken}`);
        continue;
      }
      // 统一清理凭据并跳转登录页（收敛并发 401 为一次跳转）
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
}
