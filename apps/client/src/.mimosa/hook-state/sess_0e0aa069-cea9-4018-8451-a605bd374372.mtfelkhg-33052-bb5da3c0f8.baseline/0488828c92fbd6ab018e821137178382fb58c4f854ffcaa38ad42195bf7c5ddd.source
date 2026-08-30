/**
 * 媒体 token 缓存失效标记（2026-08-25 新增）。
 *
 * 背景：`services/http.ts` 与 `utils/media.ts` 存在循环依赖
 * （http → media 的 invalidateMediaTokenCache，media → http 的 getToken），
 * 构建时产生 "Circular chunk: services/http -> utils/media -> services/http" 警告，
 * 极端情况下会导致被循环命中的模块导出在运行时为 undefined（如
 * `api/profile.ts` 的 fetchPublicProfile 报 not a function）。
 *
 * 解决方案：把「token 缓存失效标记」抽到本独立模块。
 * - services/http.ts 从此处 import invalidateMediaTokenCache（不再 import utils/media）
 * - utils/media.ts 从此处 import getMediaTokenCacheVersion（配合自身 token 缓存判断）
 * 从而 http → media 方向的边被移除，循环被打破。
 */

/** 缓存失效版本号（每次 401/登出/登录取消失 +1） */
let cacheInvalidationVersion = 0;

/** 主动使媒体 token 缓存失效（登录/登出/401 时调用）。 */
export function invalidateMediaTokenCache(): void {
  cacheInvalidationVersion += 1;
}

/** 读取当前媒体 token 缓存失效版本号（media.ts 内判断缓存是否仍有效）。 */
export function getMediaTokenCacheVersion(): number {
  return cacheInvalidationVersion;
}
