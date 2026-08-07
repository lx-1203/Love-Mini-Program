// 路由表与动态路由注册（eladmin 风格：后端菜单驱动）
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type RouteComponent,
} from "vue-router";
import type { AdminMenuNode } from "../stores/menu";

/**
 * Admin v2 后台路由（eladmin 动态菜单架构）。
 *
 * 静态路由仅保留：/login、/403、/（Layout 容器）、catch-all NotFound；
 * 业务页面（Dashboard / Menus / Roles ... 共 31 个）全部由后端菜单驱动，
 * 通过 addDynamicRoutes() 注册为 Layout 的子路由。
 *
 * 页面文件（src/views/**）由并行页面任务创建，本文件只负责在 componentMap
 * 中写好懒加载引用；后端菜单节点 component 字段（如 "views/Dashboard.vue"）
 * 命中映射表时才会注册路由。
 */

/** 懒加载组件加载器：返回 .vue 模块（含 default 导出） */
type ComponentLoader = () => Promise<{ default: unknown }>;

/**
 * 后端菜单 component 字段 → 懒加载组件映射表。
 *
 * key 与后端菜单数据保持一致（如 "views/Dashboard.vue"），
 * value 为 Vite 动态 import，实现路由级代码分割（按需加载）。
 * 新增页面时需同步在 i18n（layout.navXxx）与后端菜单数据中登记。
 */
const componentMap: Record<string, ComponentLoader> = {
  "views/Dashboard.vue": () => import("../views/Dashboard.vue"),
  /* —— 系统管理（system） —— */
  "views/system/Menus.vue": () => import("../views/system/Menus.vue"),
  "views/system/Roles.vue": () => import("../views/system/Roles.vue"),
  "views/system/Schools.vue": () => import("../views/system/Schools.vue"),
  "views/system/Dicts.vue": () => import("../views/system/Dicts.vue"),
  "views/system/Admins.vue": () => import("../views/system/Admins.vue"),
  "views/system/AuditLogs.vue": () => import("../views/system/AuditLogs.vue"),
  "views/system/OnlineUsers.vue": () => import("../views/system/OnlineUsers.vue"),
  /* —— 内容管理（content） —— */
  "views/content/Users.vue": () => import("../views/content/Users.vue"),
  "views/content/Certifications.vue": () => import("../views/content/Certifications.vue"),
  "views/content/Reports.vue": () => import("../views/content/Reports.vue"),
  "views/content/Feedback.vue": () => import("../views/content/Feedback.vue"),
  "views/content/SensitiveWords.vue": () => import("../views/content/SensitiveWords.vue"),
  /* —— 社区论坛（forum） —— */
  "views/forum/VillagePosts.vue": () => import("../views/forum/VillagePosts.vue"),
  "views/forum/InterestCircles.vue": () => import("../views/forum/InterestCircles.vue"),
  "views/forum/CircleTopics.vue": () => import("../views/forum/CircleTopics.vue"),
  "views/forum/CampusTopics.vue": () => import("../views/forum/CampusTopics.vue"),
  "views/forum/Comments.vue": () => import("../views/forum/Comments.vue"),
  /* —— 活动运营（activity） —— */
  "views/activity/Activities.vue": () => import("../views/activity/Activities.vue"),
  "views/activity/Enrollments.vue": () => import("../views/activity/Enrollments.vue"),
  /* —— 商业运营（business） —— */
  "views/business/VipPlans.vue": () => import("../views/business/VipPlans.vue"),
  "views/business/VipBills.vue": () => import("../views/business/VipBills.vue"),
  "views/business/PromoCodes.vue": () => import("../views/business/PromoCodes.vue"),
  "views/business/Wallets.vue": () => import("../views/business/Wallets.vue"),
  "views/business/Coins.vue": () => import("../views/business/Coins.vue"),
  "views/business/RedPackets.vue": () => import("../views/business/RedPackets.vue"),
  "views/business/Shop.vue": () => import("../views/business/Shop.vue"),
  /* —— 配置中心（config） —— */
  "views/config/NotifyConfig.vue": () => import("../views/config/NotifyConfig.vue"),
  "views/config/MatchConfig.vue": () => import("../views/config/MatchConfig.vue"),
  "views/config/Config.vue": () => import("../views/config/Config.vue"),
  "views/config/OfficialAccounts.vue": () => import("../views/config/OfficialAccounts.vue"),
};

/** 静态路由表：仅登录/403/布局容器/404 兜底，业务路由全部动态注册 */
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
    meta: { requiresAuth: true },
    // children 由 addDynamicRoutes 在菜单加载后动态注册
    children: [],
  },
];

/** 404 catch-all 兜底路由定义（需在动态路由注册后再加入，否则通配符会优先匹配）。 */
export const notFoundRoute: RouteRecordRaw = {
  path: "/:pathMatch(.*)*",
  name: "NotFound",
  component: () => import("../views/NotFound.vue"),
  meta: { requiresAuth: false },
};

const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * 规范化菜单 path：确保以 / 开头（根级路由要求）。
 */
function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * 拼接父级目录前缀与子菜单 path。
 *
 * - 子菜单 path 以 / 开头（绝对路径）→ 直接使用；
 * - 否则拼接父级前缀（父级目录 path + 子 path），连续斜杠收敛为单个。
 */
function joinPath(parentPath: string, childPath: string): string {
  if (childPath.startsWith("/")) {
    return childPath;
  }
  const joined = `${parentPath}/${childPath}`.replace(/\/+/g, "/");
  return normalizePath(joined);
}

/**
 * 将菜单树注册为 Layout 子路由（eladmin 动态路由核心）。
 *
 * 规则：
 * - 仅 type=MENU 且 component 命中 componentMap 的节点注册路由；
 * - 目录（DIR）与按钮（BUTTON）不注册路由，仅用于侧边栏渲染；
 * - 父级为目录时，子菜单 path 自动拼接目录前缀；
 * - 重复注册同名路由（如二次登录）会先移除旧记录，避免 addRoute 警告。
 *
 * @param menus     菜单树（含 children）
 * @param parentPath 父级目录 path 前缀（内部递归使用，默认空串）
 */
export function addDynamicRoutes(menus: AdminMenuNode[], parentPath = ""): void {
  for (const menu of menus) {
    // 菜单节点：命中 componentMap 才注册
    if (menu.type === "MENU" && menu.component) {
      const loader = componentMap[menu.component];
      if (loader) {
        const fullPath = joinPath(parentPath, menu.path);
        // 防止重复注册（dev 热更新/二次加载场景）
        if (router.hasRoute(menu.name)) {
          router.removeRoute(menu.name);
        }
        router.addRoute("Layout", {
          path: fullPath,
          name: menu.name,
          // 懒加载组件加载器（返回 .vue 模块），双重断言以兼容 vue-router 组件类型
          component: loader as unknown as RouteComponent,
          meta: { requiresAuth: true, title: menu.title },
        });
      }
    }
    // 递归子节点：父级前缀继承当前节点 path（目录贡献前缀，菜单继承前缀）
    if (menu.children && menu.children.length > 0) {
      addDynamicRoutes(menu.children, joinPath(parentPath, menu.path));
    }
  }
}

export default router;
