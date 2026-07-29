// 修复 no-duplicate-imports：合并 vue-router 的重复 import
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

/**
 * Admin 后台路由表（Task 14 路由权限守卫）。
 *
 * 改造点：
 * - 每条路由（除 /login 与 /403）显式声明 meta.requiresAuth = true
 * - 每条受保护路由声明 meta.roles = ['admin', 'super_admin']，
 *   由 main.ts 中的 router.beforeEach 统一校验角色（大小写不敏感）
 * - /login 与 /403 标记 requiresAuth = false，允许匿名访问
 * - 守卫逻辑迁至 main.ts，确保在 pinia 初始化后注册，避免 store 未就绪
 *
 * 角色约定：
 * - 后端 AdminStatsController 等使用 hasRole('ADMIN')，Spring Security 会去掉 ROLE_ 前缀返回大写
 * - 前端 localStorage.admin_user.role 存储为 "ADMIN"（大写），守卫比较时统一转小写
 * - meta.roles 数组使用小写，与比较逻辑一致
 */

/** 受保护路由允许的角色（小写形式，与守卫比较逻辑一致） */
const ADMIN_ROLES = ["admin", "super_admin"] as const;

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/403",
    name: "Forbidden",
    component: () => import("../views/Forbidden.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/",
    name: "Layout",
    component: () => import("../views/Layout.vue"),
    meta: { requiresAuth: true, roles: [...ADMIN_ROLES] },
    children: [
      {
        path: "",
        name: "Dashboard",
        component: () => import("../views/Dashboard.vue"),
        meta: { requiresAuth: true, roles: [...ADMIN_ROLES] },
      },
      {
        path: "users",
        name: "Users",
        component: () => import("../views/Users.vue"),
        meta: { requiresAuth: true, roles: [...ADMIN_ROLES] },
      },
      {
        path: "posts",
        name: "Posts",
        component: () => import("../views/Posts.vue"),
        meta: { requiresAuth: true, roles: [...ADMIN_ROLES] },
      },
      {
        path: "feedback",
        name: "Feedback",
        component: () => import("../views/Feedback.vue"),
        meta: { requiresAuth: true, roles: [...ADMIN_ROLES] },
      },
      {
        path: "audit-logs",
        name: "AuditLogs",
        component: () => import("../views/AuditLogs.vue"),
        meta: { requiresAuth: true, roles: [...ADMIN_ROLES] },
      },
      {
        // 举报管理页面路由
        path: "reports",
        name: "Reports",
        component: () => import("../views/Reports.vue"),
        meta: { requiresAuth: true, roles: [...ADMIN_ROLES] },
      },
      {
        path: "notify-config",
        name: "NotifyConfig",
        component: () => import("../views/NotifyConfig.vue"),
        meta: { requiresAuth: true, roles: [...ADMIN_ROLES] },
      },
      {
        path: "sensitive-words",
        name: "SensitiveWords",
        component: () => import("../views/SensitiveWords.vue"),
        meta: { requiresAuth: true, roles: [...ADMIN_ROLES] },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Task 14：路由守卫迁移至 main.ts，确保 pinia 初始化后注册。
// 此处仅导出 router 实例，不在 router/index.ts 中注册 beforeEach，
// 避免 pinia/store 未就绪时调用 useSessionStore() 抛错。

export default router;
