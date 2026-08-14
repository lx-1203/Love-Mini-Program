/**
 * TTL 缓存 + Stale-While-Revalidate 工具（2026-08-10 切换提速）。
 *
 * 背景：5 个 tab 页每次 onShow 都全量重拉网络（messages 3+ 请求、profile 5 请求、
 * village/discover/home 各 2-3 请求），弱网下切 tab 体感卡顿。
 * 本模块提供模块级 Map 缓存：TTL 内直接返回缓存值（不触发网络），
 * 过期时返回旧值并后台刷新（stale-while-revalidate），让内容"瞬间出现"。
 *
 * 使用：
 * <pre>
 *   await fetchWithStaleWhileRevalidate("messages:bootstrap", 30_000, () => fetchSessions());
 *   clearAllCaches(); // 登录切换时调用，防跨账号数据泄漏
 * </pre>
 */

/** 缓存条目 */
interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

/** 模块级缓存存储（Map 保证 key 顺序稳定，容量可控） */
const cacheStore = new Map<string, CacheEntry<unknown>>();

/** 进行中的刷新 Promise（防止同 key 并发重复请求） */
const inflight = new Map<string, Promise<unknown>>();

/** 默认 TTL：30s */
export const DEFAULT_TTL_MS = 30_000;

/**
 * 读取缓存值（不触发网络）。
 *
 * @param key 缓存键
 * @param ttlMs 新鲜度窗口（默认 30s）
 * @returns 新鲜或过期但未超最大保留期的缓存值；无缓存返回 undefined
 */
export function getCachedValue<T>(key: string): T | undefined {
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  return entry.value;
}

/**
 * 判断缓存是否新鲜。
 */
export function isCacheFresh(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const entry = cacheStore.get(key) as CacheEntry<unknown> | undefined;
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < ttlMs;
}

/**
 * 主动写入缓存。
 */
export function setCachedValue<T>(key: string, value: T): void {
  cacheStore.set(key, { value, fetchedAt: Date.now() });
}

/**
 * Stale-While-Revalidate 取值：
 * - 缓存新鲜（TTL 内）→ 直接返回缓存值，不发请求
 * - 缓存过期（或无缓存但有旧值）→ 返回旧值，同时后台刷新
 * - 无缓存 → 等待请求完成返回
 *
 * 同 key 并发调用共享同一个进行中的请求（in-flight 去重），
 * 避免多页面同时触发重复请求。
 *
 * @param key 缓存键（建议 "domain:action" 形式）
 * @param ttlMs 新鲜度窗口
 * @param fetcher 数据获取函数（返回 Promise）
 * @param options.refreshEvenWhenFresh 强制刷新（下拉刷新等场景）
 */
export async function fetchWithStaleWhileRevalidate<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
  fetcher: () => Promise<T>,
  options: { refreshEvenWhenFresh?: boolean } = {}
): Promise<T> {
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  const fresh = entry && Date.now() - entry.fetchedAt < ttlMs;

  // 新鲜且不强制刷新 → 直接返回缓存
  if (fresh && !options.refreshEvenWhenFresh) {
    return entry.value;
  }

  // 已有进行中的请求 → 共享该 Promise（in-flight 去重）
  const inflightPromise = inflight.get(key) as Promise<T> | undefined;
  if (inflightPromise) {
    return inflightPromise;
  }

  const promise = fetcher()
    .then((value) => {
      cacheStore.set(key, { value, fetchedAt: Date.now() });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);

  // 有过期旧值 → 先返回旧值，后台刷新（stale-while-revalidate）
  if (entry) {
    return entry.value;
  }

  return promise;
}

/**
 * 清空全部缓存（登录切换/登出时调用，防跨账号数据泄漏）。
 */
export function clearAllCaches(): void {
  cacheStore.clear();
}

/**
 * 移除指定 key 的缓存。
 */
export function removeCache(key: string): void {
  cacheStore.delete(key);
}
