/**
 * Admin 路由守卫（Task 14）。
 *
 * 从 main.ts 抽出，便于单元测试（guards.spec.ts）直接导入 setupRouterGuards
 * 应用到测试用 router 实例，而不需要启动整个 Vue 应用。
 *
 * 守卫职责：
 *   1. 校验 localStorage.admin_token 存在且未过期（解析 JWT exp）
 *   2. to.meta.requiresAuth 为 true 且未认证 → 跳转 /login?redirect=<fullPath>
 *   3. to.meta.roles 不包含当前用户角色 → 跳转 /403
 *   4. 已登录访问 /login → 跳转首页，避免重复登录
 */
import type { Router } from "vue-router";

/**
 * JWT token 解析与过期校验工具。
 *
 * 约定：
 * - localStorage.admin_token 在生产环境为后端签发的 JWT（三段式，点号分隔）
 * - 开发环境 mock 登录签发 "dev-admin-token-..." 前缀的非 JWT token，视为永不过期
 * - JWT payload 中的 exp 字段为 Unix 秒时间戳，过期则视为未认证
 *
 * @param token localStorage 中的 admin_token
 * @returns true 表示 token 有效（存在 + 未过期）；false 表示需要重新登录
 */
export function isTokenValid(token: string): boolean {
  if (!token) return false;
  if (token.startsWith("dev-admin-token-")) return true;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  // noUncheckedIndexedAccess 模式下 parts[1] 类型为 string | undefined，需显式校验
  const payloadSegment = parts[1];
  if (!payloadSegment) return false;
  try {
    const payloadJson = atob(payloadSegment.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * 从 localStorage 读取当前用户角色并归一化为小写。
 *
 * @returns 当前用户角色（小写），未登录或解析失败返回空串
 */
export function getCurrentRole(): string {
  const raw = localStorage.getItem("admin_user");
  if (!raw) return "";
  try {
    const user = JSON.parse(raw) as { role?: string };
    return (user.role || "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * 在指定 router 实例上注册全局前置守卫。
 *
 * main.ts 调用此函数完成守卫装配；单元测试可创建独立 router 实例
 * 并调用此函数，验证守卫行为（如未登录访问 /users 跳转 /login?redirect=/users）。
 *
 * @param router 要装配守卫的 router 实例
 */
export function setupRouterGuards(router: Router): void {
  router.beforeEach((to, _from, next) => {
    const token = localStorage.getItem("admin_token") || "";
    const authenticated = isTokenValid(token);

    if (to.name === "Login" && authenticated) {
      next({ name: "Dashboard" });
      return;
    }

    if (to.meta.requiresAuth && !authenticated) {
      next({ path: "/login", query: { redirect: to.fullPath } });
      return;
    }

    const requiredRoles = to.meta.roles as string[] | undefined;
    if (authenticated && requiredRoles && requiredRoles.length > 0) {
      const currentRole = getCurrentRole();
      const allowed = requiredRoles.map((r) => r.toLowerCase());
      if (!currentRole || !allowed.includes(currentRole)) {
        next({ name: "Forbidden" });
        return;
      }
    }

    next();
  });
}
