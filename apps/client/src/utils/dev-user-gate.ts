import { isDev, isMockMode } from "../config/env";

/**
 * dev-user=1 前端演示会话的唯一边界判断。
 *
 * 只允许开发环境或 mock API 模式注入；real/生产包必须彻底忽略该参数，
 * 避免带 `?dev-user=1` 的验收链接在生产端绕过页面锁并污染真实数据观感。
 * 注意：这只是前端演示态，不会伪造后端 JWT 或提升服务端权限。
 */
export function isDevUserEntryAllowed(): boolean {
  return isDev || isMockMode();
}
