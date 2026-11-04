/**
 * Admin v2 路由守卫（复制自旧后台 apps/admin 并扩展动态菜单逻辑）。
 *
 * 守卫职责（eladmin 风格）：
 *   1. 按 admin_v2_user 会话标记粗判登录态（R14-5：JWT 已迁入 HttpOnly Cookie，
 *      前端不可读也不再解析 exp；会话真实有效期由后端每次请求鉴权兜底，401
 *      时 api/http.ts 统一跳登录）；
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
import { useMenuStore, findFirstMenuPath, isKnownMenuPath } from "../stores/menu";
import { addDynamicRoutes, notFoundRoute } from "./index";
import { logger } from "../utils/logger";

/**
 * 会话标记存在性校验（R14-5，audit-r14 批5，2026-11-05）。
 *
 * 约定：
 * - JWT 由后端签发为 admin_session HttpOnly Cookie（JS 不可读），路由层的登录态
 *   只能以 admin_v2_user 会话标记粗判——仅用于决定「放行/跳登录」，真正的鉴权
 *   由后端在每次 API 请求时执行（401 → api/http.ts 统一清理标记并跳登录）；
 * - 标记损坏（非 JSON）按未登录处理（fail-closed），与 write-policy 同口径。
 *
 * @returns true 表示本地存在可解析的会话标记；false 表示需要重新登录
 */
export function hasSessionMarker(): boolean {
  const raw = localStorage.getItem("admin_v2_user");
  if (!raw) return false;
  try {
    JSON.parse(raw);
    return true;
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
 * 从 localStorage 读取当前登录管理员主体 id（字符串），未登录/解析失败返回空串。
 *
 * 用途（第五轮 B-FINDING 15）：与 menuStore.loadedFor 比对，判断「按需加载」是否需要为
 * 换账号重拉菜单树。localStorage 可被前端篡改，但此处只用于决定「要不要再发一次 GET 菜单」，
 * 真正的越权仍由后端 403 兜住；与 getCurrentRole 属同一「展示层粗粒度控制」范畴。
 */
export function getCurrentAdminUserId(): string {
  const raw = localStorage.getItem("admin_v2_user");
  if (!raw) return "";
  try {
    const user = JSON.parse(raw) as { id?: unknown };
    return user.id === undefined || user.id === null ? "" : String(user.id);
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
  if (
    /[\r\n]/.test(redirect)
    || Array.from(redirect).some((ch) => ch.charCodeAt(0) < 0x20)
  ) {
    return "";
  }
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
    // R14-5（audit-r14 批5，2026-11-05）：JWT 迁入 HttpOnly Cookie 后前端不可读，
    // 登录态改按 admin_v2_user 会话标记粗判（真实会话有效期由后端逐请求鉴权兜底）
    const authenticated = hasSessionMarker();

    // 已登录访问登录页 → 加载动态菜单后跳转首页（避免 Dashboard 动态路由未注册导致 router 启动失败）
    if (to.name === "Login" && authenticated) {
      const menuStore = useMenuStore();
      const currentUserId = getCurrentAdminUserId();
      if (!menuStore.loaded || menuStore.loadedFor !== currentUserId) {
        try {
          await menuStore.loadMenus(currentUserId);
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
      const currentUserId = getCurrentAdminUserId();
      // 首次进入或换了登录主体：按需加载动态菜单并注册 Layout 子路由。
      // loadedFor 与当前用户 id 不一致时（SPA 软跳转换账号）即使 loaded 为真也必须重拉，
      // 否则上一角色的动态路由会残留（第五轮 B-FINDING 15）。
      if (!menuStore.loaded || menuStore.loadedFor !== currentUserId) {
        try {
          await menuStore.loadMenus(currentUserId);
          addDynamicRoutes(menuStore.menuTree);
          // 动态路由注册完成后再追加 404 兜底，避免通配符优先于业务路由
          if (!router.hasRoute(notFoundRoute.name!)) {
            router.addRoute(notFoundRoute);
          }
          // 动态路由注册完成后重入当前导航，确保路径匹配到新注册的路由。
          // ⚠ 不能用 { ...to } 展开：to.name 此时是 "NotFound"，vue-router 对
          // 同时含 name 与 path 的 location 按 name 优先解析，会再次命中
          // catch-all 并退化到首页回退；必须仅按 path/query/hash 重入。
          return { path: to.path, query: to.query, hash: to.hash, replace: true };
        } catch (err) {
          // 已登录但菜单拉取失败（后端异常/无菜单权限）→ 403，避免空白页
          logger.error("[AdminV2 Guards] 动态菜单加载失败", err);
          return { name: "Forbidden" };
        }
      }
      // 菜单已加载仍命中 catch-all：区分「菜单已授权但路由未注册」与「未知路径」
      if (to.name === "NotFound") {
        // 路径属于菜单树已知节点（含 DIR 目录）：菜单已授权但路由未注册
        // （如 component 未命中映射表/动态路由被移除）→ 回跳首个可跳转菜单，
        // 避免校区管理员无 Dashboard 时落入 403
        if (isKnownMenuPath(menuStore.menuTree, to.path)) {
          const fallback = findFirstMenuPath(menuStore.menuTree);
          return fallback ? { path: fallback } : { name: "Forbidden" };
        }
        // 未知路径：保留 404 页（与 NotFound.vue 展示逻辑一致），
        // 用户可区分「路径不存在」与「权限不足」，运营排查错误链接更直观
        return true;
      }
    }

    return true;
  });
}
