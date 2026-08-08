import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { get, unwrapApiData } from "../api/http";
import { logger } from "../utils/logger";
import { env } from "../config/env";

/**
 * 后端菜单节点类型（对齐 eladmin 菜单模型）。
 * - DIR：目录（仅作为分组展示，不注册路由）
 * - MENU：菜单（注册为 Layout 子路由，component 需在 router componentMap 中）
 * - BUTTON：按钮级权限（不参与路由与侧边栏渲染）
 */
export type AdminMenuType = "DIR" | "MENU" | "BUTTON";

/**
 * 后端菜单节点。
 *
 * 字段约定（与 GET /api/v1/admin/menus/current 返回结构对齐）：
 * - title：菜单名称（直接展示或作为 layout.navXxx 的 i18n 兜底）
 * - name：路由 name（唯一，用于 addRoute 与面包屑定位）
 * - path：路由 path（根级以 / 开头；子级可为相对路径，注册时拼接父级前缀）
 * - component：组件路径（如 "views/Dashboard.vue"，需存在于 router componentMap）
 */
export interface AdminMenuNode {
  id: number;
  parentId: number | null;
  title: string;
  name: string;
  path: string;
  component?: string;
  /**
   * 后端原始菜单类型字段（接口返回 menuType，如 "DIR"/"MENU"/"BUTTON"）。
   * 解析时由 normalizeMenuType 归一化为 type，业务代码统一使用 type。
   */
  menuType?: AdminMenuType;
  type: AdminMenuType;
  icon?: string;
  order?: number;
  /**
   * 仅超级管理员可见（本地兜底菜单标记）。
   * 真实环境后端菜单树已按角色过滤（ADMIN 不关联系统管理菜单），
   * 前端仅在本地静态兜底（mock/fallback）场景按此标记过滤，
   * 新增 SUPER_ADMIN 专属菜单时只需在 staticFallbackMenus 标记一处。
   */
  superAdminOnly?: boolean;
  children?: AdminMenuNode[];
}

/**
 * 归一化后端菜单字段：接口返回 menuType（DIR/MENU/BUTTON），
 * 前端渲染与动态路由统一使用 type。递归处理 children。
 *
 * @param nodes 后端返回的菜单节点（原始形态）
 * @returns 归一化后的节点（menuType 已复制到 type，children 已递归归一化）
 */
function normalizeMenuType(nodes: AdminMenuNode[]): AdminMenuNode[] {
  return nodes.map((node) => ({
    ...node,
    type: (node.menuType ?? node.type) as AdminMenuType,
    children: node.children?.length ? normalizeMenuType(node.children) : node.children,
  }));
}

/** 判断后端返回的节点是否已包含 children 子数组（已树化形态） */
function hasNestedChildren(nodes: AdminMenuNode[]): boolean {
  return nodes.some((node) => Array.isArray(node.children));
}

/**
 * 拼接菜单节点完整 path（子级相对 path 拼接父级目录前缀）。
 * 与 Layout.vue resolvePath 逻辑保持一致，供登录回跳/兜底跳转复用。
 */
export function resolveMenuPath(node: Pick<AdminMenuNode, "path">, parentPath = ""): string {
  const raw = node.path.startsWith("/")
    ? node.path
    : parentPath
      ? `${parentPath}/${node.path}`
      : `/${node.path}`;
  const normalized = raw.replace(/\/+/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

/**
 * 查找菜单树中第一个可跳转的 MENU 节点完整 path。
 *
 * 用途：校区管理员等无 Dashboard 权限的账号登录后的默认落点，
 * 以及已登录访问未注册路径时的兜底跳转（替代硬编码 Dashboard）。
 *
 * @param menus      菜单树
 * @param parentPath 父级目录 path 前缀（内部递归使用）
 * @returns 首个 MENU 的完整 path；菜单树为空或无可跳转菜单时返回 null
 */
export function findFirstMenuPath(menus: AdminMenuNode[], parentPath = ""): string | null {
  for (const node of menus) {
    const fullPath = resolveMenuPath(node, parentPath);
    if (node.type === "MENU") {
      return fullPath;
    }
    if (node.children && node.children.length > 0) {
      const child = findFirstMenuPath(node.children, fullPath);
      if (child) return child;
    }
  }
  return null;
}

/**
 * 判断目标路径是否为菜单树中的已知节点（含 DIR 目录）完整 path。
 *
 * 用途：路由守卫区分「菜单已授权但路由未注册」（如 component 未命中
 * componentMap / 动态路由被移除）与「未知路径」——前者回跳首个可跳转菜单，
 * 后者保留 404 页。
 *
 * @param menus       菜单树
 * @param targetPath  目标路径（如 /system/admins）
 * @param parentPath  父级目录 path 前缀（内部递归使用）
 * @returns 目标路径与任一节点完整 path（忽略末尾斜杠）一致时返回 true
 */
export function isKnownMenuPath(menus: AdminMenuNode[], targetPath: string, parentPath = ""): boolean {
  const normalizedTarget = targetPath.replace(/\/+$/, "") || "/";
  for (const node of menus) {
    const fullPath = resolveMenuPath(node, parentPath).replace(/\/+$/, "") || "/";
    if (fullPath === normalizedTarget) return true;
    if (node.children && node.children.length > 0) {
      if (isKnownMenuPath(node.children, targetPath, fullPath)) return true;
    }
  }
  return false;
}

/**
 * 将后端菜单列表组装为树（含 children）。
 *
 * 兼容两种后端返回形态：
 * 1. 已树化（节点自带 children）——直接返回并补齐缺失的 children 空数组；
 * 2. 平铺列表（节点含 parentId）——按 parentId 组装为多级树，
 *    根节点定义为 parentId 为 null/0 或未被任何节点引用的节点。
 *
 * @param nodes 后端返回的菜单节点列表
 * @returns 组装后的菜单树（每个节点均含 children 数组）
 */
function buildMenuTree(nodes: AdminMenuNode[]): AdminMenuNode[] {
  if (hasNestedChildren(nodes)) {
    return nodes.map((node) => ({
      ...node,
      children: node.children ?? [],
    }));
  }

  // 平铺形态：先建立 id → node 映射，再按 parentId 挂载子节点
  const byId = new Map<number, AdminMenuNode>();
  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] });
  }
  const referencedParentIds = new Set<number>();
  const roots: AdminMenuNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId !== null && node.parentId !== 0 && byId.has(node.parentId)) {
      const parent = byId.get(node.parentId);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(node);
        referencedParentIds.add(node.parentId);
        continue;
      }
    }
    roots.push(node);
  }
  // 兜底：仍以未被引用的节点为根（防止后端 parentId 语义不一致导致整树丢失）
  if (roots.length === 0) {
    for (const node of byId.values()) {
      if (!referencedParentIds.has(node.id)) {
        roots.push(node);
      }
    }
  }
  return roots;
}

/**
 * 动态菜单 Store（eladmin 风格核心）。
 *
 * 职责：
 * - 调用 GET /api/v1/admin/menus/current 拉取当前管理员可见菜单树；
 * - 暴露 menuTree（含 children 的多级树）供 Layout 侧边栏渲染；
 * - 提供 reset() 在登出/会话失效时清空，避免残留上一账号的菜单。
 *
 * 路由注册不在本 store 内完成：由 router/addDynamicRoutes 消费
 * menuTree 逐节点调用 router.addRoute（见 router/index.ts）。
 */
export const useMenuStore = defineStore("menu", () => {
  /** 菜单树（含 children），由 loadMenus 填充 */
  const menus = ref<AdminMenuNode[]>([]);
  /** 是否已成功加载过菜单（守卫据此避免重复拉取） */
  const loaded = ref(false);

  /** 含 children 的菜单树（直接供侧边栏渲染与动态路由注册） */
  const menuTree = computed<AdminMenuNode[]>(() => menus.value);

  /**
   * 本地 mock 模式兜底菜单树。
   *
   * 当后端 /v1/admin/menus/current 不可用（如 mock profile 未实现该端点）时，
   * 使用此静态菜单树完成动态路由注册与侧边栏渲染，保证管理后台页面可逐页验证。
   * 组件路径须与 src/router/index.ts 中的 componentMap 保持一致。
   */
  const staticFallbackMenus: AdminMenuNode[] = [
    {
      id: 1, parentId: null, title: "layout.navDashboard", name: "Dashboard", path: "/dashboard",
      component: "views/Dashboard.vue", menuType: "MENU", type: "MENU",
      children: [],
    },
    {
      id: 10, parentId: null, title: "layout.groupContent", name: "Content", path: "/content",
      menuType: "DIR", type: "DIR",
      children: [
        { id: 11, parentId: 10, title: "layout.navUsers", name: "Users", path: "users", component: "views/content/Users.vue", menuType: "MENU", type: "MENU" },
        { id: 12, parentId: 10, title: "layout.navVillagePosts", name: "VillagePosts", path: "posts", component: "views/forum/VillagePosts.vue", menuType: "MENU", type: "MENU" },
        { id: 13, parentId: 10, title: "layout.navComments", name: "Comments", path: "comments", component: "views/forum/Comments.vue", menuType: "MENU", type: "MENU" },
        { id: 14, parentId: 10, title: "layout.navReports", name: "Reports", path: "reports", component: "views/content/Reports.vue", menuType: "MENU", type: "MENU" },
        { id: 15, parentId: 10, title: "layout.navFeedback", name: "Feedback", path: "feedback", component: "views/content/Feedback.vue", menuType: "MENU", type: "MENU" },
        { id: 16, parentId: 10, title: "layout.navSensitiveWords", name: "SensitiveWords", path: "sensitive-words", component: "views/content/SensitiveWords.vue", menuType: "MENU", type: "MENU" },
        { id: 17, parentId: 10, title: "layout.navCertifications", name: "Certifications", path: "certifications", component: "views/content/Certifications.vue", menuType: "MENU", type: "MENU" },
      ],
    },
    {
      id: 20, parentId: null, title: "layout.groupSystem", name: "System", path: "/system",
      menuType: "DIR", type: "DIR",
      children: [
        { id: 21, parentId: 20, title: "layout.navAuditLogs", name: "AuditLogs", path: "audit-logs", component: "views/system/AuditLogs.vue", menuType: "MENU", type: "MENU", superAdminOnly: true },
        { id: 22, parentId: 20, title: "layout.navOnlineUsers", name: "OnlineUsers", path: "online-users", component: "views/system/OnlineUsers.vue", menuType: "MENU", type: "MENU", superAdminOnly: true },
        { id: 23, parentId: 20, title: "layout.navAdmins", name: "Admins", path: "admins", component: "views/system/Admins.vue", menuType: "MENU", type: "MENU", superAdminOnly: true },
      ],
    },
    {
      id: 30, parentId: null, title: "layout.groupConfigs", name: "ConfigCenter", path: "/config",
      menuType: "DIR", type: "DIR",
      children: [
        { id: 31, parentId: 30, title: "layout.navConfig", name: "Config", path: "app", component: "views/config/Config.vue", menuType: "MENU", type: "MENU" },
        { id: 32, parentId: 30, title: "layout.navNotifyConfig", name: "NotifyConfig", path: "notify", component: "views/config/NotifyConfig.vue", menuType: "MENU", type: "MENU" },
        { id: 33, parentId: 30, title: "layout.navMatchConfig", name: "MatchConfig", path: "match", component: "views/config/MatchConfig.vue", menuType: "MENU", type: "MENU" },
        { id: 34, parentId: 30, title: "layout.navOfficialAccounts", name: "OfficialAccounts", path: "official-accounts", component: "views/config/OfficialAccounts.vue", menuType: "MENU", type: "MENU" },
      ],
    },
  ];

  /**
   * 拉取当前管理员可见菜单树并存储。
   *
   * 仅开发/mock 模式下若后端菜单端点未实现（404），自动回退到 staticFallbackMenus
   * 支撑本地页面走查；生产环境 404 一律抛出（与其他错误一致），
   * 避免后端菜单数据异常/误删时全量菜单入口（含 SUPER_ADMIN 专属）被展示，
   * 导致权限展示绕过与 staticFallbackMenus 双份维护漂移。
   *
   * @throws ApiError 后端不可达/401/403/404（生产）时抛出，由调用方（守卫/登录页）决定兜底行为
   */
  async function loadMenus(): Promise<void> {
    try {
      const body = await get<unknown>("/v1/admin/menus/current");
      // 兼容 ApiResponse 包装与直出数组两种形态
      const raw = unwrapApiData<AdminMenuNode[]>(body);
      const list = Array.isArray(raw) ? raw : [];
      // 后端字段 menuType → 前端 type 归一化后再组树，保证侧边栏/动态路由正常
      menus.value = buildMenuTree(normalizeMenuType(list));
      loaded.value = true;
      logger.info("[AdminV2 Menu] 菜单加载完成", { count: list.length });
    } catch (error) {
      // mock profile 未实现菜单端点时，仅开发环境使用本地静态菜单兜底，支撑页面走查
      if (
        env.isDev
        && error && typeof error === "object" && (error as { status?: number }).status === 404
      ) {
        logger.warn("[AdminV2 Menu] 后端菜单端点 404（dev），使用本地静态菜单兜底");
        menus.value = staticFallbackMenus;
        loaded.value = true;
        return;
      }
      throw error;
    }
  }

  /** 清空菜单状态（登出 / 会话失效时调用） */
  function reset(): void {
    menus.value = [];
    loaded.value = false;
  }

  return {
    menus,
    menuTree,
    loaded,
    loadMenus,
    reset,
  };
});
