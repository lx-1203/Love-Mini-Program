<script setup lang="ts">
/**
 * Admin v2 布局视图（对齐 design-tokens-admin.md 统一布局骨架）。
 *
 * 结构（design Frame 00–12 统一骨架）：
 *   - 左侧白色侧边栏 220px：品牌名「恋爱运营后台」+ 动态菜单
 *     （目录渲染为分组标题 12px/500 #8595a4，菜单项高 40px；
 *     选中态三合一：浅蓝底 #e9f1fd + 左 3px #0064e0 竖条 + 主色字 600）；
 *   - 右侧主区域：
 *       · 顶部工具栏 56px：左页面标题 20px/600，右菜单快搜 + 用户头像下拉；
 *       · 主内容区灰底 #f1f4f7 + 24px 内距，router-view。
 *
 * 菜单数据源：menuStore.menuTree（由守卫/登录页在进入前 loadMenus 填充）。
 */
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { setLocale, getLocale } from "../i18n";
import { useSessionStore } from "../stores/session";
import { useMenuStore, type AdminMenuNode } from "../stores/menu";
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
 * 当前登录角色是否全局超级管理员。
 * 真实环境后端菜单树已按角色过滤（ADMIN 不关联系统管理菜单），
 * 下方过滤仅兜底本地静态菜单（mock/fallback）场景，避免校区管理员看到系统管理入口。
 */
const isSuperAdmin = computed(
  () => String(sessionStore.user?.role || "").toUpperCase() === "SUPER_ADMIN",
);

/**
 * 过滤 SUPER_ADMIN 专属菜单（递归）：删除 superAdminOnly 标记的 MENU 节点
 * （标记定义在 menu store 的 staticFallbackMenus，新增专属菜单只标记一处），
 * 并移除被清空的 DIR 目录（目录下无可见子菜单时整组隐藏）。
 */
function filterSuperAdminOnlyMenus(nodes: AdminMenuNode[]): AdminMenuNode[] {
  const visible: AdminMenuNode[] = [];
  for (const node of nodes) {
    if (node.type === "MENU" && node.superAdminOnly === true) {
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

/** 目录折叠状态：默认全部展开（分组标题可见性即导航全貌） */
const expandedGroups = ref<Set<number>>(new Set());

watch(
  () => menuStore.menuTree,
  (tree) => {
    tree.forEach((node) => {
      if (node.type === "DIR") {
        expandedGroups.value.add(node.id);
      }
    });
  },
  { immediate: true, deep: false },
);

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

/* ==================== 顶栏页面标题（面包屑链末位） ==================== */

interface BreadcrumbItem {
  title: string;
  path?: string;
}

/**
 * 在菜单树中按目标 path 定位节点链（目录 → 菜单），用于解析页面标题。
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

/**
 * 顶栏页面标题：菜单链末位（当前页）标题；
 * 未命中菜单树时回退 route.meta.title / 路由 name。
 */
const pageTitle = computed<string>(() => {
  const chain = findBreadcrumbChain(menuStore.menuTree, route.path);
  if (chain && chain.length > 0) {
    return menuLabel(chain[chain.length - 1]!.title);
  }
  const title = typeof route.meta.title === "string" ? route.meta.title : String(route.name ?? "");
  return menuLabel(title);
});

/* ==================== 顶栏菜单快搜 ==================== */

interface FlatMenu {
  name: string;
  path: string;
  label: string;
  group: string;
}

/** 展平菜单树（仅 MENU 节点），供快搜索引 */
const flatMenus = computed<FlatMenu[]>(() => {
  const out: FlatMenu[] = [];
  function walk(nodes: AdminMenuNode[], parentPath: string, group: string): void {
    for (const node of nodes) {
      const fullPath = resolvePath(node, parentPath);
      if (node.type === "MENU") {
        out.push({
          name: node.name,
          path: fullPath,
          label: menuLabel(node.title),
          group,
        });
      }
      if (node.children && node.children.length > 0) {
        walk(node.children, fullPath, node.type === "DIR" ? menuLabel(node.title) : group);
      }
    }
  }
  walk(visibleMenuTree.value, "", "");
  return out;
});

const searchQuery = ref("");
const searchFocused = ref(false);

/** 快搜结果（按 label/group 前缀包含匹配，最多 8 条） */
const searchResults = computed<FlatMenu[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [];
  return flatMenus.value
    .filter((m) => m.label.toLowerCase().includes(q) || m.group.toLowerCase().includes(q))
    .slice(0, 8);
});

const showSearchPanel = computed(() => searchFocused.value && searchResults.value.length > 0);

function goToMenu(menu: FlatMenu): void {
  searchQuery.value = "";
  searchFocused.value = false;
  router.push(menu.path);
}

function onSearchBlur(): void {
  // 延迟收起，避免点击结果前面板先关闭
  window.setTimeout(() => {
    searchFocused.value = false;
  }, 150);
}

/* ==================== 用户信息与退出登录 ==================== */

/** 当前管理员的显示名（回退到账号名） */
const displayName = computed(() =>
  sessionStore.user?.displayName || sessionStore.user?.username || "-",
);

/** 头像圆内展示的字符（显示名首字符，design Frame 顶栏右侧圆头像） */
const avatarChar = computed(() => displayName.value.trim().charAt(0).toUpperCase() || "A");

/** 当前管理员角色（识别 SUPER_ADMIN / ADMIN，未知角色直出原文） */
const displayRole = computed(() => {
  const role = String(sessionStore.user?.role || "").toUpperCase();
  if (role === "SUPER_ADMIN") return t("users.roleSuperAdmin");
  if (role === "ADMIN") return t("users.roleAdmin");
  return role || "-";
});

/** 管辖校区（校区管理员显示，全局管理员隐藏） */
const campusName = computed(() => sessionStore.user?.campusName || "");

/** 头像下拉菜单开关 */
const userMenuOpen = ref(false);

/** 当前语言（下拉切换，与 App 独立页浮层共用 setLocale） */
const currentLocale = ref<string>(getLocale());

function handleLocaleChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (value === "zh-CN" || value === "en-US") {
    setLocale(value);
    currentLocale.value = value;
  }
}

function toggleUserMenu(): void {
  userMenuOpen.value = !userMenuOpen.value;
}

// 退出登录确认弹窗状态（复用 ConfirmDialog）
const logoutVisible = ref(false);
const loggingOut = ref(false);

function handleLogoutClick(): void {
  userMenuOpen.value = false;
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

/** 路由变化/首帧后把当前选中菜单滚入可视区（长菜单场景，design 侧边栏选中态需一眼可见） */
watch(
  () => route.path,
  async () => {
    await nextTick();
    document.querySelector(".menu-item--active")?.scrollIntoView({ block: "nearest" });
  },
  { immediate: true },
);

/** 路由切换时收起头像下拉 */
watch(
  () => route.fullPath,
  () => {
    userMenuOpen.value = false;
  },
);
</script>

<template>
  <div class="layout">
    <!-- 左侧白色侧边栏（design-tokens §5.1） -->
    <aside class="sidebar" role="navigation" :aria-label="t('layout.navAriaLabel')">
      <div class="sidebar-brand">
        <span class="sidebar-brand-text">{{ t("layout.brand") }}</span>
      </div>

      <nav class="sidebar-menu">
        <template v-for="node in visibleMenuTree" :key="node.id">
          <!-- 目录：分组标题 + 子菜单（§10.1 分组标题 12px/500 #8595a4） -->
          <div v-if="node.type === 'DIR'" class="menu-group">
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
            <div v-if="isGroupExpanded(node.id)" class="menu-group-children">
              <router-link
                v-for="child in node.children ?? []"
                :key="child.id"
                :to="childLocation(child, node)"
                class="menu-item"
                active-class="menu-item--active"
              >
                <span class="menu-label">{{ menuLabel(child.title) }}</span>
              </router-link>
            </div>
          </div>
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
      <!-- 顶部工具栏 56px：页面标题 + 快搜 + 用户头像（§5.2） -->
      <header class="layout-header">
        <h1 class="header-title">{{ pageTitle }}</h1>

        <div class="header-actions">
          <!-- 菜单快搜（高频操作放顶栏右侧，§7 Prefer） -->
          <div class="header-search">
            <input
              v-model="searchQuery"
              class="header-search-input"
              type="text"
              :placeholder="t('layout.searchPlaceholder')"
              :aria-label="t('layout.searchPlaceholder')"
              @focus="searchFocused = true"
              @blur="onSearchBlur"
            />
            <div v-if="showSearchPanel" class="search-panel">
              <button
                v-for="item in searchResults"
                :key="item.name"
                type="button"
                class="search-panel-item"
                @mousedown.prevent="goToMenu(item)"
              >
                <span class="search-panel-label">{{ item.label }}</span>
                <span class="search-panel-group">{{ item.group }}</span>
              </button>
            </div>
          </div>

          <!-- 用户头像下拉（头像 32px 圆，design Frame 顶栏右侧） -->
          <div class="user-menu">
            <button
              type="button"
              class="avatar-button"
              :aria-label="displayName"
              @click.stop="toggleUserMenu"
            >
              {{ avatarChar }}
            </button>
            <div v-if="userMenuOpen" class="user-dropdown">
              <div class="user-dropdown-info">
                <span class="user-name">{{ displayName }}</span>
                <span class="user-role">
                  {{ displayRole }}<template v-if="campusName"> · {{ campusName }}</template>
                </span>
              </div>
              <div class="user-dropdown-locale">
                <label class="user-dropdown-locale-label" for="layout-locale-select">{{ t("common.language") }}</label>
                <select
                  id="layout-locale-select"
                  class="user-dropdown-locale-select"
                  :value="currentLocale"
                  @change="handleLocaleChange"
                >
                  <option value="zh-CN">{{ t("common.chinese") }}</option>
                  <option value="en-US">{{ t("common.english") }}</option>
                </select>
              </div>
              <button type="button" class="user-dropdown-logout" @click="handleLogoutClick">
                {{ t("common.logout") }}
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- 主内容区（灰底 + 24px 内距） -->
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
  </div>
</template>

<style scoped>
@import "../styles/admin-common.css";

.layout {
  display: flex;
  min-height: 100vh;
  background: var(--admin-color-bg-page);
}

/* ========== 白色侧边栏（220px，右接 1px 分隔） ========== */

.sidebar {
  width: var(--admin-layout-sidebar-width);
  flex-shrink: 0;
  background: var(--admin-sidebar-bg);
  border-right: 1px solid var(--admin-color-border-light);
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-brand {
  height: var(--admin-layout-bar-height);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 var(--admin-space-xxl);
}

.sidebar-brand-text {
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
  color: var(--admin-color-text-primary);
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  padding: var(--admin-space-sm);
}

/* 分组标题（§10.1：12px/500 #8595a4，上 16 下 8） */
.menu-group-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--admin-space-sm);
  padding: var(--admin-space-lg) var(--admin-space-sm) var(--admin-space-sm) var(--admin-space-md);
  background: transparent;
  border: none;
  color: var(--admin-color-text-tertiary);
  font-size: var(--admin-font-sm);
  line-height: 18px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
}

.menu-group-text {
  text-align: left;
}

.menu-group-arrow {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-tertiary);
  transition: transform 0.2s;
}

.menu-group-arrow--open {
  transform: rotate(180deg);
}

/* 菜单项：高 40px · 圆角 6px · 14px #5d6c7b（§5.1） */
.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 var(--admin-space-md);
  margin-bottom: 2px;
  border-radius: var(--admin-radius-md);
  color: var(--admin-sidebar-text);
  text-decoration: none;
  font-size: var(--admin-font-lg);
  line-height: 22px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.menu-group-children .menu-item {
  margin-left: var(--admin-space-md);
  padding-left: var(--admin-space-lg);
}

.menu-item:hover {
  background: var(--admin-sidebar-bg-hover);
}

/* 选中态三合一：浅蓝底 + 左 3px 主色竖条（紧贴侧边栏左缘）+ 主色字 600 */
.menu-item--active {
  background: var(--admin-sidebar-bg-active);
  color: var(--admin-sidebar-text-active);
  font-weight: 600;
}

.menu-item--active::before {
  content: "";
  position: absolute;
  left: calc(-1 * var(--admin-space-sm));
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--admin-color-primary);
  border-radius: 0 2px 2px 0;
}

.menu-group-children .menu-item--active::before {
  left: calc(-1 * var(--admin-space-md));
}

/* ========== 右侧主区域 ========== */

.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 顶部工具栏：56px 白底下边线，sticky（§5.2） */
.layout-header {
  height: var(--admin-layout-bar-height);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--admin-space-lg);
  padding: 0 var(--admin-space-xxl);
  background: var(--admin-header-bg);
  border-bottom: 1px solid var(--admin-color-border-light);
  position: sticky;
  top: 0;
  z-index: 200;
}

.header-title {
  margin: 0;
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
  color: var(--admin-color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--admin-space-md);
  flex-shrink: 0;
}

/* 菜单快搜（高 36px · 圆角 6px · 边框 #ced0d4） */
.header-search {
  position: relative;
}

.header-search-input {
  width: 240px;
  height: var(--admin-control-height);
  padding: 0 var(--admin-space-md);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-lg);
  font-family: inherit;
  color: var(--admin-color-text-primary);
  background: var(--admin-color-bg-container);
}

.header-search-input::placeholder {
  color: var(--admin-color-text-tertiary);
}

.header-search-input:focus {
  outline: none;
  border-color: var(--admin-color-primary);
  box-shadow: var(--admin-focus-ring);
}

.search-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 280px;
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
  box-shadow: var(--admin-shadow-md);
  z-index: 300;
  overflow: hidden;
}

.search-panel-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--admin-space-md);
  height: 40px;
  padding: 0 var(--admin-space-md);
  background: transparent;
  border: none;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}

.search-panel-item:hover {
  background: var(--admin-color-bg-hover);
}

.search-panel-label {
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-primary);
}

.search-panel-group {
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-tertiary);
  white-space: nowrap;
}

/* 用户头像（32px 圆）+ 下拉 */
.user-menu {
  position: relative;
}

.avatar-button {
  width: 32px;
  height: 32px;
  border-radius: var(--admin-radius-full, 9999px);
  border: none;
  background: var(--admin-color-text-secondary);
  color: var(--admin-color-on-primary);
  font-size: var(--admin-font-lg);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
  box-shadow: var(--admin-shadow-md);
  z-index: 300;
  overflow: hidden;
}

.user-dropdown-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--admin-space-md) var(--admin-space-lg);
  border-bottom: 1px solid var(--admin-color-border-light);
}

.user-name {
  font-size: var(--admin-font-lg);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.user-role {
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-tertiary);
}

.user-dropdown-locale {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--admin-space-md);
  padding: var(--admin-space-md) var(--admin-space-lg);
  border-bottom: 1px solid var(--admin-color-border-light);
}

.user-dropdown-locale-label {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
}

.user-dropdown-locale-select {
  height: 28px;
  padding: 0 var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-sm);
  font-family: inherit;
  color: var(--admin-color-text-primary);
  background: var(--admin-color-bg-container);
}

.user-dropdown-logout {
  width: 100%;
  height: 40px;
  padding: 0 var(--admin-space-lg);
  background: transparent;
  border: none;
  color: var(--admin-color-danger);
  font-size: var(--admin-font-lg);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.user-dropdown-logout:hover {
  background: var(--admin-color-danger-soft);
}

/* ========== 主内容区（灰底 + 24px 内距） ========== */

.layout-content {
  flex: 1;
  padding: var(--admin-space-xxl);
  min-width: 0;
}
</style>
