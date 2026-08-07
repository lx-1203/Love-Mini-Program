/**
 * Admin v2 路由守卫（复制自旧后台 apps/admin 并扩展动态菜单逻辑）。
 *
 * 守卫职责（eladmin 风格）：
 *   1. 校验 localStorage.admin_v2_token 存在且未过期（解析 JWT exp）；
 *   2. 未登录访问受保护路由 → 跳转 /login?redirect=<fullPath>；
 *   3. 已登录访问 /login → 跳转首页，避免重复登录；
 *   4. 首次进入受保护路由时按需加载动态菜单（menuStore.loadMenus）
 *      + addDynamicRoutes 注册 Layout 子路由，再重入当前导航；
 *   5. 已登录但命中 catch-all（静态/动态路由均未注册该路径）→
 *      重定向 Dashboard（首页），Dashboard 未注册时兜底 403。
 *
 * 从 main.ts 抽出，便于单元测试直接导入 setupRouterGuards 应用到测试用 router。
 */
import type { Router } from "vue-router";
import { useMenuStore, findFirstMenuPath } from "../stores/menu";
import { addDynamicRoutes, notFoundRoute } from "./index";
import { logger } from "../utils/logger";

/**
 * JWT token 解析与过期校验工具。
 *
 * 约定：
 * - localStorage.admin_v2_token 在生产环境为后端签发的 JWT（三段式，点号分隔）
 * - 开发环境 dev 登录签发 "dev-admin-token-..." 前缀的非 JWT token，视为永不过期
 * - JWT payload 中的 exp 字段为 Unix 秒时间戳：
 *   - 缺少 exp 字段视为无效（安全修复：无过期时间的 token 不可信，拒绝放行）
 *   - exp 已过当前时间则视为未认证
 *
 * @param token localStorage 中的 admin_v2_token
 * @returns true 表示 token 有效（存在 + 未过期）；false 表示需要重新登录
 */
export function isTokenValid(token: string): boolean {
  if (!token) return false;
  // dev / mock 前缀 token 也做基础校验（长度 ≥16），避免空串/极短伪造串被无条件放行
  if (token.startsWith("dev-admin-token-") || token.startsWith("mock-admin-token-")) {
    return token.length >= 16;
  }
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  // noUncheckedIndexedAccess 模式下 parts[1] 类型为 string | undefined，需显式校验
  const payloadSegment = parts[1];
  if (!payloadSegment) return false;
  try {
    // JWT payload 使用 URL-safe base64，atob 前补齐 padding
    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson) as { exp?: number };
    // 安全修复：JWT 无 exp 字段时拒绝（视为过期），避免"永不过期"的隐患
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * 从 localStorage 读取当前用户角色并归一化为小写。
 *
 * 说明（安全边界）：
 * - localStorage.admin_v2_user 可被前端篡改，因此本函数仅用于前端路由展示层的
 *   粗粒度控制，真正的权限校验由后端在每次 API 请求时执行。
 *
 * @returns 当前用户角色（小写），未登录或解析失败返回空串
 */
export function getCurrentRole(): string {
  const raw = localStorage.getItem("admin_v2_user");
  if (!raw) return "";
  try {
    const user = JSON.parse(raw) as { role?: string };
    return (user.role || "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * 校验登录回跳 redirect 参数：仅允许站内相对路径。
 *
 * 防开放重定向：拒绝 //evil.com、https://evil.com、javascript: 等外部/伪协议地址，
 * 仅接受以单个 "/" 开头、不以 "//" 开头、且不含换行/控制字符的站内相对路径。
 *
 * @param redirect 路由 query 中的 redirect 原始值（可能为 string | string[] | null）
 * @returns 合法的站内相对路径；非法时返回空串（调用方回退到默认首页）
 */
export function sanitizeRedirect(redirect: unknown): string {
  if (typeof redirect !== "string" || redirect.length === 0) return "";
  if (!redirect.startsWith("/")) return "";
  if (redirect.startsWith("//")) return "";
  // 排除含换行/控制字符的伪装地址（如 "/\nhttps://evil.com"）
  if (/[\r\n\u0000-\u001f]/.test(redirect)) return "";
  return redirect;
}

/**
 * 在指定 router 实例上注册全局前置守卫。
 *
 * main.ts 调用此函数完成守卫装配；单元测试可创建独立 router 实例
 * 并调用此函数，验证守卫行为（如未登录访问受保护路径跳转登录页）。
 *
 * @param router 要装配守卫的 router 实例
 */
export function setupRouterGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const token = localStorage.getItem("admin_v2_token") || "";
    const authenticated = isTokenValid(token);

    // 已登录访问登录页 → 加载动态菜单后跳转首页（避免 Dashboard 动态路由未注册导致 router 启动失败）
    if (to.name === "Login" && authenticated) {
      const menuStore = useMenuStore();
      if (!menuStore.loaded) {
        try {
          await menuStore.loadMenus();
          addDynamicRoutes(menuStore.menuTree);
          // notFoundRoute 为常量路由（name 恒为 "NotFound"），此处显式断言非空
          if (!router.hasRoute(notFoundRoute.name!)) {
            router.addRoute(notFoundRoute);
          }
        } catch (err) {
          logger.error("[AdminV2 Guards] 动态菜单加载失败", err);
          return { name: "Forbidden" };
        }
      }
      const fallback = findFirstMenuPath(menuStore.menuTree);
      return fallback ? { path: fallback } : { name: "Dashboard" };
    }

    // catch-all 也视为受保护：未登录访问未知路径同样需要先登录
    const protectedRoute = to.meta.requiresAuth === true || to.name === "NotFound";
    if (protectedRoute && !authenticated) {
      return { path: "/login", query: { redirect: to.fullPath } };
    }

    if (authenticated && protectedRoute) {
      const menuStore = useMenuStore();
      // 首次进入：按需加载动态菜单并注册 Layout 子路由
      if (!menuStore.loaded) {
        try {
          await menuStore.loadMenus();
          addDynamicRoutes(menuStore.menuTree);
          // 动态路由注册完成后再追加 404 兜底，避免通配符优先于业务路由
          if (!router.hasRoute(notFoundRoute.name!)) {
            router.addRoute(notFoundRoute);
          }
          // 动态路由注册完成后重入当前导航，确保路径匹配到新注册的路由
          return { ...to, replace: true };
        } catch (err) {
          // 已登录但菜单拉取失败（后端异常/无菜单权限）→ 403，避免空白页
          logger.error("[AdminV2 Guards] 动态菜单加载失败", err);
          return { name: "Forbidden" };
        }
      }
      // 菜单已加载仍命中 catch-all：说明该路径未注册（静态+动态均无）
      // → 回跳当前角色菜单树中第一个可跳转菜单（避免校区管理员无 Dashboard 时落入 403）
      if (to.name === "NotFound") {
        const fallback = findFirstMenuPath(menuStore.menuTree);
        return fallback ? { path: fallback } : { name: "Forbidden" };
      }
    }

    return true;
  });
}
