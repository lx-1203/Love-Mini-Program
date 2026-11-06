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
  /** 最近一次命中读取或写入的时刻（epoch 毫秒）——超限淘汰的「在用」判据 */
  usedAt: number;
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
 * R17：signed 缓存条目软上限——超限时按最近使用序（LRU）淘汰闲置条目，防长期会话内存无界增长。
 * Map 保序且命中/写入时都移到末尾，因此头部即最久未用。
 */
const SIGNED_CACHE_MAX_ENTRIES = 500;

/**
 * 「在用」保护窗口（毫秒）：这段时间内被读取过的条目视为仍挂载在页面上，超限也不淘汰。
 *
 * R17 回归修复：原实现按首次插入序硬淘汰，续签也不挪位——在用路径一旦超过上限，
 * 淘汰的正是仍在渲染的条目，版本号重算时它们未命中 → 重签 → 下一次 flush 再淘汰另一批，
 * 形成不收敛的签发风暴（图片 401 闪烁、签发请求自持、叠加按 IP 限流后整批降级）。
 * 现只淘汰窗口外的闲置条目：内存上界为 max(上限, 窗口内在用条目数)。
 */
const SIGNED_CACHE_IN_USE_WINDOW_MS = 60_000;

/**
 * R17 审计（内存面）：signed/failedAt 两个 Map 此前只增不清——同一会话浏览大量
 * 媒体时无限累积（signed 存 15 分钟签名的 URL，failedAt 存失败退避时间戳）。
 * 现在每次 flushPending 顺带清理：
 * - signed 中已过期（15 分钟 TTL 过后本就该重签）的条目整条删除；
 * - failedAt 中退避窗口（15s）已过的条目删除（窗口过后本就允许重签，留着只为白占内存）；
 * - signed 超过 {@link SIGNED_CACHE_MAX_ENTRIES} 时从最久未用端淘汰闲置条目，
 *   遇到 {@link SIGNED_CACHE_IN_USE_WINDOW_MS} 内用过的条目即停（其后条目更近，均视为在用）。
 * 登出/换账号的整体清空仍走 assertSameSession / clearMediaSignCache，不受影响。
 */
function pruneStaleEntries(): void {
  const now = nowSeconds();
  for (const [path, entry] of signed) {
    if (entry.expiresAt <= now) {
      signed.delete(path);
    }
  }
  const backoffCutoff = Date.now() - FAILURE_BACKOFF_MS;
  for (const [path, at] of failedAt) {
    if (at <= backoffCutoff) {
      failedAt.delete(path);
    }
  }
  const idleCutoff = Date.now() - SIGNED_CACHE_IN_USE_WINDOW_MS;
  while (signed.size > SIGNED_CACHE_MAX_ENTRIES) {
    const oldest = signed.entries().next();
    if (oldest.done || oldest.value[1].usedAt > idleCutoff) break;
    signed.delete(oldest.value[0]);
  }
}

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
    // LRU：命中即刷新使用时刻并移到末尾（见 SIGNED_CACHE_IN_USE_WINDOW_MS）
    entry.usedAt = Date.now();
    signed.delete(path);
    signed.set(path, entry);
    return entry.url;
  }
  scheduleSign(path);
  return null;
}

/** 登出/切换账号时清空（签名是能力凭据，不能跨会话复用）。
 * 消费点：stores/session.ts 的 logout 与登录成功两处（与 clearAllCaches 同批）。 */
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
  // R17：签发间隙顺带清理过期/退避已过/超限条目（见 pruneStaleEntries 注释）
  pruneStaleEntries();
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
      // 续签同键先删再写：移到 LRU 末尾（原地 set 不改变 Map 次序，刚续签的在用条目会最先被淘汰）
      signed.delete(item.path);
      signed.set(item.path, { url: item.url, expiresAt: Number(item.expiresAt) || 0, usedAt: Date.now() });
      failedAt.delete(item.path);
      touched = true;
    }
    // 后端对无权读的路径是**静默省略**（不泄露存在性），这里同样不重试，
    // 但要记退避，否则每帧都会为读不到的路径再发一次请求。
    for (const path of batch) {
      if (!signed.has(path)) failedAt.set(path, Date.now());
    }
    if (touched) signVersion.value += 1;
  } catch (_e) {
    for (const path of batch) failedAt.set(path, Date.now());
  }
}
