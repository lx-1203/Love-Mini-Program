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
   * 1 = 不在侧边栏展示（对齐 menus.hidden）。
   *
   * ⚠ 后端 GET /v1/admin/menus/current **不按 hidden 过滤**（MenuRepository 的两个查询里
   * 都没有 hidden 条件），hidden 只是随节点一起下发的标记；也就是说「隐藏」这件事最终
   * 由前端渲染层（Layout 的 visibleMenuTree）负责。刻意不能改成后端过滤：
   * addDynamicRoutes() 遍历的就是这份树，节点一旦不下发，路由就不注册，
   * 收藏的 URL 会掉进 404 —— 而 menus.hidden 的语义恰恰是「隐藏但可达」。
   * 侧边栏过滤落地前，这里的值只影响 menus 表/接口的契约完整性。
   */
  hidden?: boolean;
  /**
   * 仅超级管理员可见（本地兜底菜单标记）。
   * 真实环境后端菜单树已按角色过滤（ADMIN / AUDITOR 均不关联系统管理菜单，
   * AUDITOR 的可见菜单在库里由 V2026.10.14.0001 直接复制 ADMIN 的 role_menus），
   * 前端仅在本地静态兜底（mock/fallback）场景按此标记过滤 —— 判定条件是
   * 「非 SUPER_ADMIN 即剔除」，因此新增的只读角色 AUDITOR 与 ADMIN 一样看不到系统管理。
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
   *
   * ── 与真实环境对齐（V2026.10.14.0003 三组收缩）────────────────────────────
   * 这份树刻意逐行照抄迁移后的 menus 表：**id / name / path 全部与库里一致**
   * （库里是绝对 path，这里也用绝对 path），这样 dev 与真实环境的 URL 一模一样，
   * 不会出现「dev 走 /config/app、线上走 /configs/global」这类漂移——
   * 这是本方案点名的坑（旧兜底树是 4 组 17 项的自成一套结构，与库里的 6 组 44 行
   * 早已对不上，改名/换 path 时只改一边，验收时两边结论互相打脸）。
   *
   * 三条不变式：
   * 1) 可见项 = 内容 5 / 运营 5 / 权限 5(+能力总览)，与迁移的 A~D 段一一对应；
   * 2) 未入选项保留在本树里并标 hidden: true —— 因为 addDynamicRoutes() 只认这棵树，
   *    一旦从树里删掉，路由就不注册，直达链接变 404（"隐藏而非删除"的前提就破了）；
   *    侧边栏过滤由 Layout 负责（见 AdminMenuNode.hidden 的注释）。
   * 3) superAdminOnly 严格照抄 role_menus 实测：库里只绑 SUPER_ADMIN 的行才标——
   *    101 数据看板、102/103/106/107、104/105/108、605 圈层管理、700 能力总览。
   *    603 系统配置与 601/602 虽然挂在「权限」目录下，库里却连 ADMIN/AUDITOR 都绑了，
   *    所以**不标**（真实环境里它们对非超管是「父目录不可见 → 被后端挂到根」的孤项，
   *    dev 这边则留在目录里；两处都能打开页面，只是分组观感略有差异）。
   *    Layout 会对非超管剔除 superAdminOnly 节点，并剔除被剔空的 DIR。
   *
   * id=900 是唯一的例外：views/config/ProfileConfig.vue 在 menus 表里**没有行**
   * （componentMap 有、旧兜底树也有），真实环境根本注册不出这个路由。
   * 这里给一个不会与库冲突的本地 id 并把 hidden 置上，仅作 dev 走查用。
   */
  const staticFallbackMenus: AdminMenuNode[] = [
    /* ==================== 内容（看与审）—— 库里 id 200 ==================== */
    {
      id: 200, parentId: null, title: "layout.groupContent", name: "Content", path: "/content",
      menuType: "DIR", type: "DIR",
      children: [
        { id: 101, parentId: 200, title: "layout.navDashboard", name: "Dashboard", path: "/dashboard", component: "views/Dashboard.vue", menuType: "MENU", type: "MENU", order: 1, superAdminOnly: true },
        { id: 301, parentId: 200, title: "layout.navVillagePosts", name: "VillagePosts", path: "/forum/village-posts", component: "views/forum/VillagePosts.vue", menuType: "MENU", type: "MENU", order: 2 },
        { id: 305, parentId: 200, title: "layout.navComments", name: "Comments", path: "/forum/comments", component: "views/forum/Comments.vue", menuType: "MENU", type: "MENU", order: 3 },
        { id: 201, parentId: 200, title: "layout.navUsers", name: "Users", path: "/content/users", component: "views/content/Users.vue", menuType: "MENU", type: "MENU", order: 4 },
        { id: 206, parentId: 200, title: "layout.navMediaAssets", name: "MediaAssets", path: "/content/media-assets", component: "views/content/MediaAssets.vue", menuType: "MENU", type: "MENU", order: 5 },
        /* —— 以下仍在树里（路由可达），只是不进侧边栏 —— */
        { id: 202, parentId: 200, title: "layout.navCertifications", name: "Certifications", path: "/content/certifications", component: "views/content/Certifications.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 203, parentId: 200, title: "layout.navReports", name: "Reports", path: "/content/reports", component: "views/content/Reports.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 204, parentId: 200, title: "layout.navFeedback", name: "Feedback", path: "/content/feedback", component: "views/content/Feedback.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 205, parentId: 200, title: "layout.navSensitiveWords", name: "SensitiveWords", path: "/content/sensitive-words", component: "views/content/SensitiveWords.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 207, parentId: 200, title: "layout.navRealNameCertifications", name: "RealNameCertifications", path: "/content/real-name-certifications", component: "views/content/RealNameCertifications.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 208, parentId: 200, title: "layout.navWhispers", name: "Whispers", path: "/content/whispers", component: "views/content/Whispers.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
      ],
    },
    /* ==================== 运营（发与管）—— 库里 id 400 ==================== */
    {
      id: 400, parentId: null, title: "layout.groupOperations", name: "Activity", path: "/activity",
      menuType: "DIR", type: "DIR",
      children: [
        { id: 308, parentId: 400, title: "layout.navPostCompose", name: "PostCompose", path: "/forum/compose", component: "views/forum/PostCompose.vue", menuType: "MENU", type: "MENU", order: 1 },
        { id: 604, parentId: 400, title: "layout.navOfficialAccounts", name: "OfficialAccounts", path: "/configs/official-accounts", component: "views/config/OfficialAccounts.vue", menuType: "MENU", type: "MENU", order: 2 },
        { id: 209, parentId: 400, title: "layout.navConversations", name: "Conversations", path: "/content/conversations", component: "views/content/Conversations.vue", menuType: "MENU", type: "MENU", order: 3 },
        // 库里 605 的 path 已由相对 'circle-layers' 归一为绝对 '/system/circle-layers'（URL 不变）
        { id: 605, parentId: 400, title: "layout.navCircleLayers", name: "CircleLayers", path: "/system/circle-layers", component: "views/system/CircleLayers.vue", menuType: "MENU", type: "MENU", order: 4, superAdminOnly: true },
        { id: 401, parentId: 400, title: "layout.navActivities", name: "Activities", path: "/activity/activities", component: "views/activity/Activities.vue", menuType: "MENU", type: "MENU", order: 5 },
        { id: 404, parentId: 400, title: "layout.navConsulting", name: "Consulting", path: "/business/consulting", component: "views/business/Consulting.vue", menuType: "MENU", type: "MENU", order: 6 },
        { id: 402, parentId: 400, title: "layout.navEnrollments", name: "Enrollments", path: "/activity/enrollments", component: "views/activity/Enrollments.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
      ],
    },
    /* ==================== 权限（配置与追责）—— 库里 id 100，仅 SUPER_ADMIN ==================== */
    {
      id: 100, parentId: null, title: "layout.groupPermission", name: "System", path: "/system",
      menuType: "DIR", type: "DIR",
      children: [
        { id: 106, parentId: 100, title: "layout.navAdmins", name: "Admins", path: "/system/admins", component: "views/system/Admins.vue", menuType: "MENU", type: "MENU", order: 1, superAdminOnly: true },
        { id: 103, parentId: 100, title: "layout.navRoles", name: "Roles", path: "/system/roles", component: "views/system/Roles.vue", menuType: "MENU", type: "MENU", order: 2, superAdminOnly: true },
        { id: 102, parentId: 100, title: "layout.navMenus", name: "Menus", path: "/system/menus", component: "views/system/Menus.vue", menuType: "MENU", type: "MENU", order: 3, superAdminOnly: true },
        { id: 107, parentId: 100, title: "layout.navAuditLogs", name: "AuditLogs", path: "/system/audit-logs", component: "views/system/AuditLogs.vue", menuType: "MENU", type: "MENU", order: 4, superAdminOnly: true },
        { id: 603, parentId: 100, title: "layout.navConfig", name: "Config", path: "/configs/global", component: "views/config/Config.vue", menuType: "MENU", type: "MENU", order: 5 },
        { id: 701, parentId: 100, title: "layout.navLegal", name: "LegalTexts", path: "/configs/legal", component: "views/config/LegalTexts.vue", menuType: "MENU", type: "MENU", order: 7, superAdminOnly: true },
        { id: 700, parentId: 100, title: "layout.navCapability", name: "CapabilityOverview", path: "/system/capability", component: "views/system/CapabilityOverview.vue", menuType: "MENU", type: "MENU", order: 6, superAdminOnly: true },
        { id: 104, parentId: 100, title: "layout.navSchools", name: "Schools", path: "/system/schools", component: "views/system/Schools.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true, superAdminOnly: true },
        { id: 105, parentId: 100, title: "layout.navDicts", name: "Dicts", path: "/system/dicts", component: "views/system/Dicts.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true, superAdminOnly: true },
        { id: 108, parentId: 100, title: "layout.navOnlineUsers", name: "OnlineUsers", path: "/system/online-users", component: "views/system/OnlineUsers.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true, superAdminOnly: true },
      ],
    },
    /* ==================== 以下三个目录在库里已 hidden=1（退役），仅承载可达路由 ============ */
    {
      id: 300, parentId: null, title: "layout.groupForum", name: "Forum", path: "/forum",
      menuType: "DIR", type: "DIR", hidden: true,
      children: [
        { id: 302, parentId: 300, title: "layout.navInterestCircles", name: "InterestCircles", path: "/forum/interest-circles", component: "views/forum/InterestCircles.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 303, parentId: 300, title: "layout.navCircleTopics", name: "CircleTopics", path: "/forum/circle-topics", component: "views/forum/CircleTopics.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 304, parentId: 300, title: "layout.navCampusTopics", name: "CampusTopics", path: "/forum/campus-topics", component: "views/forum/CampusTopics.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 306, parentId: 300, title: "layout.navHotBoardManage", name: "HotBoardManage", path: "/forum/hot-board-manage", component: "views/forum/HotBoardManage.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 307, parentId: 300, title: "layout.navHotSearchManage", name: "HotSearchManage", path: "/forum/hot-search-manage", component: "views/forum/HotSearchManage.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
      ],
    },
    {
      id: 500, parentId: null, title: "layout.groupBusiness", name: "Business", path: "/business",
      menuType: "DIR", type: "DIR", hidden: true,
      children: [
        { id: 501, parentId: 500, title: "layout.navVipPlans", name: "VipPlans", path: "/business/vip-plans", component: "views/business/VipPlans.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 502, parentId: 500, title: "layout.navVipBills", name: "VipBills", path: "/business/vip-bills", component: "views/business/VipBills.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 503, parentId: 500, title: "layout.navPromoCodes", name: "PromoCodes", path: "/business/promo-codes", component: "views/business/PromoCodes.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 504, parentId: 500, title: "layout.navWallets", name: "Wallets", path: "/business/wallets", component: "views/business/Wallets.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 505, parentId: 500, title: "layout.navCoins", name: "Coins", path: "/business/coins", component: "views/business/Coins.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        // 库里没有 id 506（历史空号），积分商城是 507
        { id: 507, parentId: 500, title: "layout.navShop", name: "Shop", path: "/business/shop", component: "views/business/Shop.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
      ],
    },
    {
      id: 600, parentId: null, title: "layout.groupConfigs", name: "Configs", path: "/configs",
      menuType: "DIR", type: "DIR", hidden: true,
      children: [
        { id: 601, parentId: 600, title: "layout.navNotifyConfig", name: "NotifyConfig", path: "/configs/notify", component: "views/config/NotifyConfig.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        { id: 602, parentId: 600, title: "layout.navMatchConfig", name: "MatchConfig", path: "/configs/match", component: "views/config/MatchConfig.vue", menuType: "MENU", type: "MENU", order: 90, hidden: true },
        // dev-only：库里无此行，见上方注释
        { id: 900, parentId: 600, title: "layout.navProfileConfig", name: "ProfileConfig", path: "/configs/profile", component: "views/config/ProfileConfig.vue", menuType: "MENU", type: "MENU", order: 91, hidden: true },
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
