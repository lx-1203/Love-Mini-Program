<script setup lang="ts">
/**
 * Admin v2 布局视图（eladmin 风格：深色侧边栏 + 动态菜单 + 多标签页）。
 *
 * 结构：
 *   - 左侧深色侧边栏：logo（「校园恋爱管理」）+ 动态菜单（两级：
 *     目录显示为可折叠分组标题，菜单项渲染为路由链接）；
 *   - 右侧主区域：
 *       · 顶部栏：面包屑（按当前路由在菜单树中定位）+ 用户信息 + 退出登录；
 *       · 多标签页（tabs-view）：已访问页面显示为标签，可点击切换/关闭，
 *         关闭当前标签时跳回相邻标签（右侧优先，否则左侧）；Dashboard 固定不可关；
 *       · 主内容区 router-view。
 *
 * 菜单数据源：menuStore.menuTree（由守卫/登录页在进入前 loadMenus 填充）。
 */
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../stores/session";
import { useMenuStore, type AdminMenuNode, resolveMenuPath } from "../stores/menu";
import { logger } from "../utils/logger";
import ConfirmDialog from "../components/ConfirmDialog.vue";

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const menuStore = useMenuStore();
const { t, te } = useI18n();

/* ==================== 菜单标题与路径工具 ==================== */

/**
 * 解析菜单标题：
 * - 后端 title 形如 i18n key（layout.navXxx）时翻译；
 * - 后端 title 为中文时查表翻译（key 为 menu.<中文名>，如 menu.用户管理），
 *   未收录的标题（如新增菜单）回退展示原值；
 * - 其余情况直接展示原标题。
 */
function menuLabel(title: string): string {
  if (title.startsWith("layout.")) {
    return t(title as never);
  }
  const menuKey = `menu.${title}` as never;
  if (te(menuKey)) {
    return t(menuKey);
  }
  return title;
}

/* ==================== 角色可见菜单（SUPER_ADMIN 专属过滤） ==================== */

/**
 * SUPER_ADMIN 专属菜单 name 集合（校区管理员不可见）。
 * 真实环境后端菜单树已按角色过滤（ADMIN 不关联系统管理 100-108 菜单），
 * 此处仅兜底本地静态菜单（mock/fallback）场景，避免校区管理员看到系统管理入口。
 */
const SUPER_ADMIN_ONLY_MENU_NAMES = new Set<string>([
  "Menus", "Roles", "Schools", "Dicts", "Admins", "AuditLogs", "OnlineUsers",
]);

/** 当前登录角色是否全局超级管理员 */
const isSuperAdmin = computed(
  () => String(sessionStore.user?.role || "").toUpperCase() === "SUPER_ADMIN",
);

/**
 * 过滤 SUPER_ADMIN 专属菜单（递归）：删除命中集合的 MENU 节点，
 * 并移除被清空的 DIR 目录（目录下无可见子菜单时整组隐藏）。
 */
function filterSuperAdminOnlyMenus(nodes: AdminMenuNode[]): AdminMenuNode[] {
  const visible: AdminMenuNode[] = [];
  for (const node of nodes) {
    if (node.type === "MENU" && SUPER_ADMIN_ONLY_MENU_NAMES.has(node.name)) {
      continue;
    }
    if (node.children && node.children.length > 0) {
      const children = filterSuperAdminOnlyMenus(node.children);
      if (node.type === "DIR" && children.length === 0) {
        continue; // 空目录不渲染
      }
      visible.push({ ...node, children });
    } else {
      visible.push(node);
    }
  }
  return visible;
}

/** 侧边栏实际渲染的菜单树（校区管理员剔除 SUPER_ADMIN 专属菜单） */
const visibleMenuTree = computed<AdminMenuNode[]>(() =>
  isSuperAdmin.value
    ? menuStore.menuTree
    : filterSuperAdminOnlyMenus(menuStore.menuTree),
);

/**
 * 拼接菜单节点完整 path（子级相对 path 拼接父级目录前缀）。
 *
 * @param node       菜单节点
 * @param parentPath 父级目录的完整 path（相对子路径时用于前缀拼接，默认空串）
 */
function resolvePath(node: AdminMenuNode, parentPath = ""): string {
  const raw = node.path.startsWith("/")
    ? node.path
    : parentPath
      ? `${parentPath}/${node.path}`
      : `/${node.path}`;
  const normalized = raw.replace(/\/+/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

/** 当前菜单项对应的路由跳转目标 */
function toLocation(node: AdminMenuNode, parentPath = ""): string {
  return resolvePath(node, parentPath);
}

/** 目录子菜单的路由跳转目标（先解析目录完整 path，再拼接子菜单 path） */
function childLocation(child: AdminMenuNode, parent: AdminMenuNode): string {
  return resolvePath(child, resolvePath(parent));
}

/**
 * 在菜单树中按路由 name 定位节点完整 path（如 "Dashboard" → "/dashboard"）。
 * 用于首页 tab / 面包屑首页的跳转目标；未找到返回 null。
 */
function findNodePathByName(menus: AdminMenuNode[], name: string, parentPath = ""): string | null {
  for (const node of menus) {
    const fullPath = resolvePath(node, parentPath);
    if (node.type === "MENU" && node.name === name) {
      return fullPath;
    }
    if (node.children && node.children.length > 0) {
      const found = findNodePathByName(node.children, name, fullPath);
      if (found) return found;
    }
  }
  return null;
}

/* ==================== 目录折叠状态 ==================== */

/** 展开的目录 id 集合（默认全部展开，点击目录标题切换） */
const expandedGroups = ref<Set<number>>(new Set());

/** 初始化时展开全部目录（按角色可见菜单树） */
visibleMenuTree.value.forEach((node) => {
  if (node.type === "DIR") {
    expandedGroups.value.add(node.id);
  }
});

function isGroupExpanded(id: number): boolean {
  return expandedGroups.value.has(id);
}

function toggleGroup(id: number): void {
  const next = new Set(expandedGroups.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedGroups.value = next;
}

/* ==================== 面包屑 ==================== */

interface BreadcrumbItem {
  title: string;
  path?: string;
}

/**
 * 在菜单树中按目标 path 定位节点链（目录 → 菜单），用于渲染面包屑。
 * 递归时维护父级 path 前缀；返回 null 表示未命中（页面不在菜单树中，如 403）。
 */
function findBreadcrumbChain(
  menus: AdminMenuNode[],
  targetPath: string,
  parentPath = "",
  chain: BreadcrumbItem[] = [],
): BreadcrumbItem[] | null {
  for (const node of menus) {
    const fullPath = resolvePath(node, parentPath);
    const nextChain = [
      ...chain,
      { title: node.title, path: node.type === "MENU" ? fullPath : undefined },
    ];
    if (node.type === "MENU" && (fullPath === targetPath || `/${fullPath}` === targetPath)) {
      return nextChain;
    }
    if (node.children && node.children.length > 0) {
      const found = findBreadcrumbChain(node.children, targetPath, fullPath, nextChain);
      if (found) return found;
    }
  }
  return null;
}

/** 菜单中 Dashboard 节点的完整 path（首页 tab / 面包屑首页的跳转目标） */
const dashboardPath = findNodePathByName(menuStore.menuTree, "Dashboard") ?? "/";

/**
 * 查找菜单树中第一个可跳转的 MENU（含 name/path/title）。
 * 校区管理员等无 Dashboard 权限的账号，初始标签落点用其首个菜单，
 * 避免初始"数据看板"标签指向无权限页面。
 */
function findFirstMenuTab(menus: AdminMenuNode[], parentPath = ""): TabItem | null {
  for (const node of menus) {
    const fullPath = resolveMenuPath(node, parentPath);
    if (node.type === "MENU") {
      return { name: node.name, path: fullPath, title: menuLabel(node.title) };
    }
    if (node.children && node.children.length > 0) {
      const child = findFirstMenuTab(node.children, fullPath);
      if (child) return child;
    }
  }
  return null;
}

/** 当前面包屑链（未命中时退化为仅显示当前页标题） */
const breadcrumb = computed<BreadcrumbItem[]>(() => {
  const chain = findBreadcrumbChain(menuStore.menuTree, route.path);
  if (chain) {
    return [{ title: t("layout.breadcrumbHome"), path: dashboardPath }, ...chain];
  }
  const title = typeof route.meta.title === "string" ? route.meta.title : String(route.name ?? "");
  return [{ title: t("layout.breadcrumbHome"), path: dashboardPath }, { title: menuLabel(title) }];
});

/* ==================== 多标签页（tabs-view） ==================== */

interface TabItem {
  /** 路由 name（唯一标识） */
  name: string;
  /** 跳转 path */
  path: string;
  /** 标签标题 */
  title: string;
}

/** 已访问标签列表（Dashboard 固定首位且不可关闭；无 Dashboard 权限时用首个菜单占位） */
const visitedTabs = ref<TabItem[]>([
  findFirstMenuTab(visibleMenuTree.value) ?? {
    name: "Dashboard",
    path: dashboardPath,
    title: t("layout.navDashboard"),
  },
]);

/** 解析路由对应的标签标题：菜单树 → meta.title → 路由 name 兜底 */
function resolveTabTitle(target: RouteLocationNormalizedLoaded): string {
  const chain = findBreadcrumbChain(menuStore.menuTree, target.path);
  if (chain) {
    const last = chain[chain.length - 1];
    if (last) return menuLabel(last.title);
  }
  const metaTitle = target.meta.title;
  if (typeof metaTitle === "string" && metaTitle) {
    return menuLabel(metaTitle);
  }
  return String(target.name ?? target.path);
}

/** 监听路由变化，将新访问页面加入标签列表（登录/403/404 不加入） */
watch(
  () => route.fullPath,
  () => {
    const name = route.name;
    if (typeof name !== "string") return;
    if (name === "Login" || name === "Forbidden" || name === "NotFound") return;
    const existing = visitedTabs.value.find((tab) => tab.name === name);
    if (existing) {
      // 首次进入 Dashboard 时校准其 path（后端菜单 path 可能不是 "/"）
      existing.path = route.fullPath;
      return;
    }
    visitedTabs.value.push({
      name,
      path: route.fullPath,
      title: resolveTabTitle(route),
    });
  },
  { immediate: true },
);

/** 当前激活标签（跟随路由 name） */
const activeTabName = computed<string>(() => {
  const name = route.name;
  return typeof name === "string" ? name : "";
});

/** Dashboard 固定标签不可关闭 */
function isFixedTab(name: string): boolean {
  return name === "Dashboard";
}

/** 切换标签：跳转到对应 path */
function switchTab(tab: TabItem): void {
  if (tab.name === activeTabName.value) return;
  router.push(tab.path);
}

/** 关闭标签：移除后跳回相邻标签（右侧优先，否则左侧）；Dashboard 不可关闭 */
function closeTab(tab: TabItem): void {
  if (isFixedTab(tab.name)) return;
  const idx = visitedTabs.value.findIndex((item) => item.name === tab.name);
  if (idx < 0) return;
  const isActive = tab.name === activeTabName.value;
  visitedTabs.value.splice(idx, 1);
  if (isActive) {
    const next = visitedTabs.value[idx] ?? visitedTabs.value[idx - 1];
    if (next) {
      router.push(next.path);
    } else {
      router.push({ name: "Dashboard" });
    }
  }
}

/* ==================== 用户信息与退出登录 ==================== */

/** 当前管理员的显示名（回退到账号名） */
const displayName = computed(() =>
  sessionStore.user?.displayName || sessionStore.user?.username || "-",
);

/** 当前管理员角色（识别 SUPER_ADMIN / ADMIN，未知角色直出原文） */
const displayRole = computed(() => {
  const role = String(sessionStore.user?.role || "").toUpperCase();
  if (role === "SUPER_ADMIN") return t("users.roleSuperAdmin");
  if (role === "ADMIN") return t("users.roleAdmin");
  return role || "-";
});

/** 管辖校区（校区管理员显示，全局管理员隐藏） */
const campusName = computed(() => sessionStore.user?.campusName || "");

// 退出登录确认弹窗状态（复用 ConfirmDialog）
const logoutVisible = ref(false);
const loggingOut = ref(false);

function handleLogoutClick(): void {
  logoutVisible.value = true;
}

/** ConfirmDialog 确认回调：登出 + 清空菜单状态 + 跳转登录页 */
async function handleConfirmLogout(): Promise<void> {
  if (loggingOut.value) return; // 防重复点击
  loggingOut.value = true;
  try {
    await sessionStore.logout();
    menuStore.reset();
  } catch (err) {
    logger.error("[AdminV2 Layout] logout failed", err);
  } finally {
    // 成功/失败分支收敛：即便登出接口异常也跳转登录页，强制清理本地会话
    logoutVisible.value = false;
    router.push({ name: "Login" });
    loggingOut.value = false;
  }
}

function handleCancelLogout(): void {
  logoutVisible.value = false;
  loggingOut.value = false;
}
</script>

<template>
  <view class="layout">
    <!-- 左侧深色侧边栏（eladmin 风格） -->
    <aside class="sidebar" role="navigation" :aria-label="t('layout.navAriaLabel')">
      <view class="sidebar-logo">
        <text class="sidebar-logo-text">{{ t("login.title") }}</text>
      </view>

      <nav class="sidebar-menu">
        <template v-for="node in visibleMenuTree" :key="node.id">
          <!-- 目录：可折叠分组标题 + 子菜单 -->
          <view v-if="node.type === 'DIR'" class="menu-group">
            <button
              type="button"
              class="menu-group-title"
              @click="toggleGroup(node.id)"
            >
              <span class="menu-group-text">{{ menuLabel(node.title) }}</span>
              <span
                class="menu-group-arrow"
                :class="{ 'menu-group-arrow--open': isGroupExpanded(node.id) }"
              >▾</span>
            </button>
            <view v-if="isGroupExpanded(node.id)" class="menu-group-children">
              <router-link
                v-for="child in node.children ?? []"
                :key="child.id"
                :to="childLocation(child, node)"
                class="menu-item"
                active-class="menu-item--active"
              >
                <span class="menu-label">{{ menuLabel(child.title) }}</span>
              </router-link>
            </view>
          </view>
          <!-- 顶级菜单：直接渲染 -->
          <router-link
            v-else-if="node.type === 'MENU'"
            :key="node.id"
            :to="toLocation(node)"
            class="menu-item"
            active-class="menu-item--active"
          >
            <span class="menu-label">{{ menuLabel(node.title) }}</span>
          </router-link>
        </template>
      </nav>
    </aside>

    <!-- 右侧主区域 -->
    <section class="layout-main">
      <!-- 顶部栏：面包屑 + 用户信息 + 退出登录 -->
      <header class="layout-header">
        <nav class="breadcrumb" aria-label="breadcrumb">
          <template v-for="(item, index) in breadcrumb" :key="index">
            <router-link
              v-if="item.path"
              class="breadcrumb-item"
              :to="item.path"
            >{{ menuLabel(item.title) }}</router-link>
            <text v-else class="breadcrumb-item breadcrumb-item--current">{{ menuLabel(item.title) }}</text>
            <text v-if="index < breadcrumb.length - 1" class="breadcrumb-sep">/</text>
          </template>
        </nav>

        <view class="header-user">
          <view class="user-info">
            <text class="user-name">{{ displayName }}</text>
            <!-- campusName 为空（全局超级管理员）时不渲染校区徽标；
                 uni-app 规范 text 不可嵌套非 text 元素，改用 view 包裹多个 text -->
            <view class="user-role">
              <text>{{ displayRole }}</text>
              <text v-if="campusName"> · {{ campusName }}</text>
            </view>
          </view>
          <button class="logout-button" @click="handleLogoutClick">
            {{ t("common.logout") }}
          </button>
        </view>
      </header>

      <!-- 多标签页（tabs-view） -->
      <view class="tabs-view" role="tablist">
        <view
          v-for="tab in visitedTabs"
          :key="tab.name"
          class="tab-item"
          :class="{ 'tab-item--active': tab.name === activeTabName }"
          role="tab"
          :aria-selected="tab.name === activeTabName"
          @click="switchTab(tab)"
        >
          <span class="tab-label">{{ menuLabel(tab.title) }}</span>
          <button
            v-if="!isFixedTab(tab.name)"
            type="button"
            class="tab-close"
            :aria-label="t('layout.tabsClose')"
            @click.stop="closeTab(tab)"
          >×</button>
        </view>
      </view>

      <!-- 主内容区 -->
      <main class="layout-content">
        <router-view />
      </main>
    </section>

    <!-- 退出登录确认弹窗 -->
    <ConfirmDialog
      v-model:visible="logoutVisible"
      :title="t('common.logout')"
      :message="t('layout.logoutConfirm')"
      :danger="true"
      :confirming="loggingOut"
      @confirm="handleConfirmLogout"
      @cancel="handleCancelLogout"
    />
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

.layout {
  display: flex;
  min-height: 100vh;
  background: var(--admin-color-bg-page);
}

/* ========== 深色侧边栏（eladmin 风格） ========== */

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--admin-sidebar-bg);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-logo {
  height: 50px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-sidebar-logo-bg);
}

.sidebar-logo-text {
  font-size: var(--admin-font-xl);
  font-weight: 700;
  color: var(--admin-sidebar-text-active);
}

.sidebar-menu {
  flex: 1;
  padding: var(--admin-space-sm) 0;
}

.menu-group-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--admin-space-sm);
  padding: var(--admin-space-md-lg) var(--admin-space-xl);
  background: transparent;
  border: none;
  color: var(--admin-sidebar-text);
  font-size: var(--admin-font-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.menu-group-title:hover {
  background: var(--admin-sidebar-bg-hover);
  color: var(--admin-sidebar-text-active);
}

.menu-group-text {
  text-align: left;
}

.menu-group-arrow {
  font-size: var(--admin-font-sm);
  transition: transform 0.2s;
}

.menu-group-arrow--open {
  transform: rotate(180deg);
}

.menu-group-children {
  background: var(--admin-sidebar-submenu-bg);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: var(--admin-space-md-lg) var(--admin-space-xl);
  color: var(--admin-sidebar-text);
  text-decoration: none;
  font-size: var(--admin-font-lg);
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.menu-group-children .menu-item {
  padding-left: var(--admin-space-xxxl);
  font-size: var(--admin-font-md);
}

.menu-item:hover {
  background: var(--admin-sidebar-bg-hover);
  color: var(--admin-sidebar-text-active);
}

.menu-item--active {
  background: var(--admin-sidebar-bg-active);
  color: var(--admin-sidebar-text-active);
  border-left-color: var(--admin-color-bg-container);
}

/* ========== 右侧主区域 ========== */

.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.layout-header {
  height: 50px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--admin-space-lg);
  padding: 0 var(--admin-space-xl);
  background: var(--admin-header-bg);
  box-shadow: var(--admin-shadow-sm);
  z-index: 10;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--admin-space-xs);
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.breadcrumb-item {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-tertiary);
  text-decoration: none;
}

.breadcrumb-item--current {
  color: var(--admin-color-text-primary);
  font-weight: 500;
}

.breadcrumb-sep {
  color: var(--admin-color-text-placeholder);
}

.header-user {
  display: flex;
  align-items: center;
  gap: var(--admin-space-lg);
}

.user-info {
  text-align: right;
}

.user-name {
  display: block;
  font-size: var(--admin-font-md);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.user-role {
  display: block;
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-quaternary);
}

.logout-button {
  padding: var(--admin-space-xxs) var(--admin-space-md-lg);
  background: var(--admin-color-bg-hover);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  color: var(--admin-color-text-tertiary);
  font-size: var(--admin-font-md);
  cursor: pointer;
  transition: all 0.2s;
}

.logout-button:hover {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
  border-color: var(--admin-color-danger-border);
}

/* ========== 多标签页（tabs-view） ========== */

.tabs-view {
  display: flex;
  align-items: center;
  gap: var(--admin-space-sm);
  padding: var(--admin-space-sm) var(--admin-space-xl);
  background: var(--admin-tabs-bg);
  border-bottom: 1px solid var(--admin-color-border-light);
  overflow-x: auto;
  flex-shrink: 0;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: var(--admin-space-xs);
  padding: var(--admin-space-xxs) var(--admin-space-md);
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-tertiary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-item:hover {
  color: var(--admin-color-primary);
}

.tab-item--active {
  background: var(--admin-color-primary);
  border-color: var(--admin-color-primary);
  color: var(--admin-color-bg-container);
}

.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: var(--admin-font-lg);
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s;
}

.tab-close:hover {
  /* 主题自适应 hover 背景（暗色模式下自动适配，替代硬编码 rgba(255,255,255,.35)） */
  background: var(--admin-color-bg-hover);
}

/* ========== 主内容区 ========== */

.layout-content {
  flex: 1;
  padding: var(--admin-space-xl);
  overflow-y: auto;
}
</style>
