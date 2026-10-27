/**
 * Admin v2 - 媒体能力型 URL 的签名缓存（2026-10-26）。
 *
 * 背景：管理台 `<img>` 无法携带 Authorization 头，旧 withMediaToken 实现把**完整
 * 管理员会话 JWT** 拼进 `?token=`。后端 P0-2 收口后
 * app.security.media-query-token-strict 默认 true
 * （apps/api JwtAuthenticationFilter：查询参数仅接受 scope=media 短期令牌），
 * 完整会话 JWT 走查询参数一律 401 —— 真后端媒体资产页实测 20/20 裂图
 * （reports/audit/goal-2026-10-26/admin-sync/01-admin-browser-verify.log：
 * 同路径 header-token 200 image/jpeg 32088B，裂的只是查询参数通道）。
 *
 * 方案对齐小程序端既有先例（apps/client/src/utils/media-sign-cache.ts）：
 * 批量 `POST /api/v1/media/sign` 签发能力型 URL（`?exp=&sig=`，逐路径绑定、
 * 15 分钟过期，签发时后端穿过与 GET 同一套归属/档位判定），会话凭据不再
 * 进入图片地址（不进浏览器历史 / 上游代理日志 / 开发者工具）。
 *
 * 响应式：模板里 `:src="withMediaToken(url)"` 在渲染时经 mediaSignVersion()
 * 登记对本模块版本号的依赖，签名异步到达后 version +1 触发重渲染补图。
 */
import { ref } from "vue";
import { getToken, post } from "./http";

interface SignedEntry {
  /** 带 ?exp=&sig= 的完整路径（不含站点前缀） */
  url: string;
  /** 过期时刻（epoch 秒） */
  expiresAt: number;
}

/** 距过期不足这个秒数即视为该重新签发（避免边界上刚拿到就 401） */
const RENEW_MARGIN_SECONDS = 60;
/** 单批签发上限（与后端 MediaAccessController.SIGN_BATCH_MAX 对齐） */
const BATCH_MAX = 100;
/** 某路径签发失败后的退避窗口（毫秒），防止每帧重发 */
const FAILURE_BACKOFF_MS = 15_000;

const signed = new Map<string, SignedEntry>();
const pending = new Set<string>();
const failedAt = new Map<string, number>();
let flushScheduled = false;

/**
 * 签名版本号：任何签名的到达/失效都会 +1。
 * withMediaToken 拼 URL 时读一次 `.value` 建立响应式依赖，
 * 签名异步回来后模板自动重算，图片补上。
 */
const signVersion = ref(0);

/** 供 URL 拼接处读取以建立响应式依赖（约定与客户端 media-sign-cache 一致）。 */
export function mediaSignVersion(): number {
  return signVersion.value;
}

/**
 * 会话指纹：签名 URL 是「上一个账号能读这些文件」的能力凭据，换账号/登出后不能
 * 继续用。与客户端同款自愈方案：每次访问时比对指纹，不一致即整缓存作废。
 * 指纹只取 JWT 末段，不把令牌本身留在内存结构里。
 */
let sessionFingerprint = "";

function currentFingerprint(): string {
  const token = getToken();
  return token.length > 12 ? token.slice(-12) : token;
}

function assertSameSession(): void {
  const now = currentFingerprint();
  if (now !== sessionFingerprint) {
    sessionFingerprint = now;
    signed.clear();
    failedAt.clear();
    signVersion.value += 1;
  }
}

function isFresh(entry: SignedEntry | undefined): entry is SignedEntry {
  if (!entry) return false;
  return entry.expiresAt - Math.floor(Date.now() / 1000) > RENEW_MARGIN_SECONDS;
}

/**
 * 取某媒体路径的已签名 URL。
 *
 * @param path 与后端签发时**逐字一致**的路径（如 `/api/v1/media/7/202610/a.jpg`）
 * @returns 已签名 URL；尚未签出时返回 null（调用方按无凭据 URL 渲染，401 走占位）
 */
export function signedMediaUrl(path: string): string | null {
  assertSameSession();
  const entry = signed.get(path);
  if (isFresh(entry)) {
    return entry.url;
  }
  scheduleSign(path);
  return null;
}

function scheduleSign(path: string): void {
  if (pending.has(path)) return;
  const failed = failedAt.get(path);
  if (failed !== undefined && Date.now() - failed < FAILURE_BACKOFF_MS) return;
  pending.add(path);
  if (flushScheduled) return;
  flushScheduled = true;
  // 微任务后合并：同一帧内多张缩略图会并成一次 POST
  setTimeout(() => {
    void flushPending();
  }, 0);
}

async function flushPending(): Promise<void> {
  flushScheduled = false;
  const batch = [...pending].slice(0, BATCH_MAX);
  for (const path of batch) pending.delete(path);
  if (batch.length === 0) return;

  try {
    // /v1/media/sign 是「读凭据签发」端点（不写业务状态），只读审核员（AUDITOR）
    // 也必须能签（否则看不到待审图），故 readOnlySafe 绕过本地写权限预检；
    // 后端仍按归属/档位细粒度放行（无权路径静默省略）。
    const response = await post<{ items?: Array<{ path: string; url: string; expiresAt: number }> }>(
      "/v1/media/sign",
      { paths: batch },
      undefined,
      { readOnlySafe: true }
    );
    let touched = false;
    for (const item of response?.items ?? []) {
      if (!item || typeof item.path !== "string" || typeof item.url !== "string") continue;
      signed.set(item.path, { url: item.url, expiresAt: Number(item.expiresAt) || 0 });
      failedAt.delete(item.path);
      touched = true;
    }
    // 后端对无权读的路径是**静默省略**（不泄露存在性），记退避避免反复请求
    for (const path of batch) {
      if (!signed.has(path)) failedAt.set(path, Date.now());
    }
    if (touched) signVersion.value += 1;
  } catch (_e) {
    for (const path of batch) failedAt.set(path, Date.now());
  }
}
