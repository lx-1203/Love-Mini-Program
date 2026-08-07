<script setup lang="ts">
/**
 * Admin 布局视图（SubTask 3.3.2 i18n 化）。
 *
 * 改造点：
 * - 菜单项 label 改为 i18n key（layout.navXxx）
 * - "管理后台" / "管理员" / "退出登录" / 路由 fallback 文案改走 i18n
 * - 路由 name 与 i18n key 通过 table 显式映射，避免拼写错误
 *
 * Task 44：handleLogout 为敏感操作（结束会话），添加 ConfirmDialog 二次确认。
 * Task 45：异常分支统一通过 logger 记录，避免直接 console 调用。
 * Task 46：handleLogout 包裹 try/catch，异常时仍跳转登录页，避免界面卡死。
 */
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session";
import { useI18n } from "vue-i18n";
// Task 44：接入共享 ConfirmDialog 组件，用于退出登录二次确认
import ConfirmDialog from "../components/ConfirmDialog.vue";
// Task 45：统一日志入口
import { logger } from "../utils/logger";

const router = useRouter();
const sessionStore = useSessionStore();
const { t } = useI18n();

interface MenuItem {
  name: string;
  labelKey: string;
  icon: string;
  /** 可见角色白名单（小写）；缺省 = 所有管理员可见 */
  roles?: string[];
}

/** 菜单项配置：name 对应 router 路由 name，labelKey 对应 i18n 文案 key。 */
const menuItems: MenuItem[] = [
  { name: "Dashboard", labelKey: "layout.navDashboard", icon: "/icons/chart.svg" },
  { name: "Users", labelKey: "layout.navUsers", icon: "/icons/user.svg" },
  // 商业模式：每个高校一个管理员 —— 管理员账号管理仅超级管理员可见
  { name: "Admins", labelKey: "layout.navAdmins", icon: "/icons/user.svg", roles: ["super_admin"] },
  // 在线用户管理仅超级管理员可见（后端端点 @PreAuthorize SUPER_ADMIN，权限对齐）
  { name: "OnlineUsers", labelKey: "layout.navOnlineUsers", icon: "/icons/user.svg", roles: ["super_admin"] },
  { name: "Posts", labelKey: "layout.navPosts", icon: "/icons/file-text.svg" },
  { name: "Feedback", labelKey: "layout.navFeedback", icon: "/icons/list.svg" },
  { name: "AuditLogs", labelKey: "layout.navAuditLogs", icon: "/icons/clipboard.svg" },
  { name: "Reports", labelKey: "layout.navReports", icon: "/icons/prohibited.svg" },
  { name: "NotifyConfig", labelKey: "layout.navNotifyConfig", icon: "/icons/lock.svg" },
  // 2026-08-07 官方号体系：官方号消息流只读视图
  { name: "OfficialAccounts", labelKey: "layout.navOfficialAccounts", icon: "/icons/bolt.svg" },
  { name: "SensitiveWords", labelKey: "layout.navSensitiveWords", icon: "/icons/prohibited.svg" },
  { name: "MatchConfig", labelKey: "layout.navMatchConfig", icon: "/icons/bolt.svg" },
  { name: "Config", labelKey: "layout.navConfig", icon: "/icons/lock.svg" },
  { name: "Certifications", labelKey: "layout.navCertifications", icon: "/icons/eye.svg" },
  { name: "Comments", labelKey: "layout.navComments", icon: "/icons/list.svg" },
];

/** 按当前管理员角色过滤菜单项（SUPER_ADMIN 可见全部，普通 ADMIN 隐藏管理员管理） */
const visibleMenuItems = computed(() => {
  const role = String(sessionStore.user?.role || "").toUpperCase();
  return menuItems.filter((item) => !item.roles || item.roles.includes(role.toLowerCase()));
});

/** 当前管理员的显示名（infra R2-00458：回退到账号名 username，
 *  原回退“管理员中心”误导——用户看不到自己是谁） */
const displayName = computed(() =>
  sessionStore.user?.displayName || sessionStore.user?.username || t("layout.userMenuTitle"),
);
/** 当前管理员角色（缺失时回退到 i18n；识别 SUPER_ADMIN / admin / super_admin 等大小写变体）。 */
const displayRole = computed(() => {
  const role = String(sessionStore.user?.role || "").toUpperCase();
  if (!role) return t("users.roleAdmin");
  if (role === "SUPER_ADMIN") return t("users.roleSuperAdmin");
  if (role === "ADMIN") return t("users.roleAdmin");
  return t("users.roleUser");
});

// Task 44：退出登录确认弹窗状态
const logoutVisible = ref(false);
const loggingOut = ref(false);

/**
 * Task 44：点击退出登录按钮时仅打开确认弹窗，不直接执行登出。
 */
function handleLogoutClick(): void {
  logoutVisible.value = true;
}

/**
 * Task 44 + Task 46：ConfirmDialog 确认回调，执行真实登出。
 *
 * 包裹 try/catch 确保即使后端登出接口异常仍跳转登录页，
 * 避免用户卡在已登出但路由未切换的中间态。
 */
async function handleConfirmLogout(): Promise<void> {
  if (loggingOut.value) return; // 防重复点击
  loggingOut.value = true;
  try {
    await sessionStore.logout();
  } catch (err) {
    // Task 45：异常通过 logger 记录，便于线上问题定位
    logger.error("[Layout] logout failed", err);
  } finally {
    // infra R2-00459：成功/失败分支收敛——即便登出失败也跳转登录页，强制清理本地会话，
    // 原成功与 catch 分支重复实现跳转逻辑
    logoutVisible.value = false;
    router.push({ name: "Login" });
    loggingOut.value = false;
  }
}

/** Task 44：ConfirmDialog 取消回调，清理临时状态 */
function handleCancelLogout(): void {
  logoutVisible.value = false;
  loggingOut.value = false;
}

/**
 * P6 a11y：Skip link 触发时，将焦点移到主内容区。
 * 让键盘用户跳过侧边栏导航直达主内容。
 * infra R2-00460：增加环境守卫（测试/SSR 环境无 document）
 */
function focusMainContent(): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("main-content");
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
</script>

<template>
  <view class="layout">
    <!-- P6 a11y：Skip link 跳到主内容（键盘 Tab 焦点首次进入时可见） -->
    <a
      href="#main-content"
      class="skip-link sr-only-focusable"
      @click.prevent="focusMainContent"
    >{{ t("common.skipToMain") }}</a>

    <view class="sidebar" role="navigation" :aria-label="t('layout.navAriaLabel')">
      <view class="sidebar-header">
        <text class="logo-text">{{ t("login.title") }}</text>
      </view>

      <nav class="sidebar-menu">
        <router-link
          v-for="item in visibleMenuItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="menu-item"
          active-class="menu-item--active"
        >
          <image class="menu-icon" :src="item.icon" mode="aspectFit" alt="" aria-hidden="true" />
          <text class="menu-label">{{ t(item.labelKey) }}</text>
        </router-link>
      </nav>

      <view class="sidebar-footer">
        <view class="user-info">
          <text class="user-name">{{ displayName }}</text>
          <text class="user-role">{{ displayRole }}</text>
        </view>
        <button class="logout-button" @click="handleLogoutClick">{{ t("common.logout") }}</button>
      </view>
    </view>

    <view
      class="main-content"
      id="main-content"
      role="main"
      tabindex="-1"
    >
      <router-view />
    </view>

    <!-- Task 44：退出登录确认弹窗（敏感操作二次确认） -->
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
.layout {
  display: flex;
  min-height: 100vh;
  background: var(--admin-color-bg-page);
}

/* P6 a11y：sr-only / sr-only-focusable（视觉隐藏，屏幕阅读器可读；获得焦点时显示） */
.sr-only,
.sr-only-focusable {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only-focusable:focus,
.sr-only-focusable:active {
  position: fixed;
  top: 0;
  left: 0;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
  z-index: 9999;
  padding: var(--admin-space-md) var(--admin-space-xl);
  background: var(--admin-color-skip-link);
  color: var(--admin-color-skip-link-fg);
  border-radius: 0 0 var(--admin-radius-md) 0;
  font-size: var(--admin-font-lg);
  font-weight: 600;
  text-decoration: none;
}

/* Skip link 视觉样式（focus 时显示） */
.skip-link {
  outline: 2px solid var(--admin-color-skip-link);
  outline-offset: 2px;
}

.main-content:focus {
  outline: none;
}

.sidebar {
  width: 240px;
  background: var(--admin-color-bg-container);
  display: flex;
  flex-direction: column;
  box-shadow: var(--admin-shadow-sm);
}

.sidebar-header {
  padding: var(--admin-space-xxl) var(--admin-space-xl);
  border-bottom: 1px solid var(--admin-color-border-light);
}

.logo-text {
  font-size: var(--admin-font-xl);
  font-weight: 700;
  color: var(--admin-color-text-primary);
}

.sidebar-menu {
  flex: 1;
  padding: var(--admin-space-lg) 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--admin-space-md);
  padding: var(--admin-space-md-lg) var(--admin-space-xl);
  color: var(--admin-color-text-tertiary);
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
}

.menu-item:hover {
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-primary);
}

.menu-item--active {
  background: linear-gradient(90deg, var(--admin-color-primary-soft) 0%, transparent 100%);
  color: var(--admin-color-primary);
  border-right: 3px solid var(--admin-color-primary);
}

.menu-icon {
  width: var(--admin-space-xl);
  height: var(--admin-space-xl);
}

.menu-label {
  font-size: var(--admin-font-lg);
  font-weight: 500;
}

.sidebar-footer {
  padding: var(--admin-space-xl);
  border-top: 1px solid var(--admin-color-border-light);
}

.user-info {
  margin-bottom: var(--admin-space-md);
}

.user-name {
  display: block;
  font-size: var(--admin-font-lg);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.user-role {
  display: block;
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
  margin-top: 2px;
}

.logout-button {
  width: 100%;
  padding: var(--admin-space-md-sm);
  background: var(--admin-color-bg-hover);
  border: none;
  border-radius: var(--admin-radius-md);
  color: var(--admin-color-text-tertiary);
  font-size: var(--admin-font-md);
  cursor: pointer;
  transition: all 0.2s;
}

.logout-button:hover {
  background: var(--admin-color-bg-hover);
  color: var(--admin-color-text-primary);
}

.main-content {
  flex: 1;
  padding: var(--admin-space-xxl);
  overflow-y: auto;
}
</style>
