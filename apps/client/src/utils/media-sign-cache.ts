/**
 * 媒体能力型 URL 的签名缓存（P0-2 收口最后一寸的客户端侧）。
 *
 * 背景：`<image src>` 带不了 Authorization 头，此前 media.ts 直接把**完整 24 小时
 * 会话 JWT** 拼进 `?token=`，于是会话凭据常驻浏览器历史与上游代理/CDN 日志。
 * 后端现已支持逐路径绑定的能力型 URL（`?exp=&sig=`，15 分钟过期，签发时穿过
 * 与 GET 同一套归属/档位判定），本模块负责：
 *
 *  - 按需批量签发（一次网络请求覆盖一屏图片，不是每张一次）；
 *  - 用 Vue `ref` 暴露版本号，让「签名到达」能触发模板里的 computed 重算，
 *    首屏未签出时不会永久空白；
 *  - 失败退避，避免坏路径被无限重签。
 *
 * 依赖方向：media.ts → 本模块 → services/http.ts。
 * services/http.ts 只引 utils/media-token-cache，不引 utils/media，
 * 因此这条链不会重建当年那条 http ↔ media 循环（曾因循环 chunk 导致
 * 运行时导出为 undefined）。
 */
import { ref } from "vue";
import { getToken, request } from "../services/http";

interface SignedEntry {
  /** 带 ?exp=&sig= 的完整路径（不含站点前缀） */
  url: string;
  /** 过期时刻（epoch 秒） */
  expiresAt: number;
}

/** 距过期不足这个秒数即视为该重新签发（避免边界上刚拿到就 401） */
const RENEW_MARGIN_SECONDS = 60;
/** 单批签发上限（与后端 SIGN_BATCH_MAX 对齐） */
const BATCH_MAX = 100;
/** 某路径签发失败后的退避窗口（毫秒），防止每帧重发 */
const FAILURE_BACKOFF_MS = 15_000;

const signed = new Map<string, SignedEntry>();
const pending = new Set<string>();
const failedAt = new Map<string, number>();
let flushScheduled = false;

/**
 * 签名版本号：任何签名的到达/失效都会 +1。
 *
 * media.ts 在拼 URL 时读一次它的 `.value`，于是所有调用 resolveMediaUrl 的
 * computed 都会把它登记成依赖 —— 签名异步回来后模板自动重算，图片补上。
 * 不用事件总线是因为渲染层只认响应式依赖。
 */
const signVersion = ref(0);

/** 供 URL 解析处读取以建立响应式依赖（不消费值则不会重算）。 */
export function mediaSignVersion(): number {
  return signVersion.value;
}

/**
 * 会话指纹：签名 URL 是「上一个账号能读这些文件」的能力凭据，换账号/登出后不能继续用。
 *
 * 为什么不在 services/http.ts 的登出与 401 分支里显式清缓存：那条边会构成
 * http ↔ media-sign-cache 循环（本模块要用 http 的 request 发签发请求），
 * 而本仓已经为同类循环付出过代价（见 utils/media-token-cache.ts 头部说明：
 * 循环 chunk 会让运行时导出为 undefined）。改成每次访问时比对指纹自愈，
 * 依赖方向保持单向。指纹只取 JWT 末段，不把令牌本身留在内存结构里。
 */
let sessionFingerprint = "";

function currentFingerprint(): string {
  const token = getToken() ?? "";
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
  return entry.expiresAt - nowSeconds() > RENEW_MARGIN_SECONDS;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * 取某媒体路径的已签名 URL。
 *
 * @param path 与后端签发时**逐字一致**的路径（如 `/api/v1/media/7/202610/a.jpg`）
 * @returns 已签名 URL；尚未签出时返回 null（调用方决定这一帧渲染什么）
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

/** 批量预热（列表加载完就能把这一屏的图先签掉，减少首屏空白）。 */
export function prefetchMediaSignatures(paths: Array<string | null | undefined>): void {
  assertSameSession();
  for (const path of paths) {
    if (typeof path === "string" && path.length > 0) {
      scheduleSign(path);
    }
  }
}

/** 登出/401/切换账号时清空（签名是能力凭据，不能跨会话复用）。 */
export function clearMediaSignCache(): void {
  signed.clear();
  pending.clear();
  failedAt.clear();
  sessionFingerprint = "";
  signVersion.value += 1;
}

function scheduleSign(path: string): void {
  if (pending.has(path)) return;
  const failed = failedAt.get(path);
  if (failed !== undefined && Date.now() - failed < FAILURE_BACKOFF_MS) return;
  pending.add(path);
  if (flushScheduled) return;
  flushScheduled = true;
  // 微任务后合并：同一帧内多个组件请求的图会并成一次 POST
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
    const response = await request<{ items?: Array<{ path: string; url: string; expiresAt: number }> }>({
      url: "/media/sign",
      method: "POST",
      data: { paths: batch },
    });
    let touched = false;
    for (const item of response?.items ?? []) {
      if (!item || typeof item.path !== "string" || typeof item.url !== "string") continue;
      signed.set(item.path, { url: item.url, expiresAt: Number(item.expiresAt) || 0 });
      failedAt.delete(item.path);
      touched = true;
    }
    // 后端对无权读的路径是**静默省略**（不泄露存在性），这里同样不重试，
    // 但要记退避，否则每帧都会为读不到的路径再发一次请求。
    for (const path of batch) {
      if (!signed.has(path)) failedAt.set(path, Date.now());
    }
    if (touched) signVersion.value += 1;
  } catch {
    for (const path of batch) failedAt.set(path, Date.now());
  }
}
