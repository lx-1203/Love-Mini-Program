<script setup lang="ts">
/**
 * Admin 布局视图（SubTask 3.3.2 i18n 化）。
 *
 * 改造点：
 * - 菜单项 label 改为 i18n key（layout.navXxx）
 * - "管理后台" / "管理员" / "退出登录" / 路由 fallback 文案改走 i18n
 * - 路由 name 与 i18n key 通过 table 显式映射，避免拼写错误
 */
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session";
import { useI18n } from "vue-i18n";

const router = useRouter();
const sessionStore = useSessionStore();
const { t } = useI18n();

interface MenuItem {
  name: string;
  labelKey: string;
  icon: string;
}

/** 菜单项配置：name 对应 router 路由 name，labelKey 对应 i18n 文案 key。 */
const menuItems: MenuItem[] = [
  { name: "Dashboard", labelKey: "layout.navDashboard", icon: "/icons/chart.svg" },
  { name: "Users", labelKey: "layout.navUsers", icon: "/icons/user.svg" },
  { name: "Posts", labelKey: "layout.navPosts", icon: "/icons/file-text.svg" },
  { name: "Feedback", labelKey: "layout.navFeedback", icon: "/icons/list.svg" },
  { name: "AuditLogs", labelKey: "layout.navAuditLogs", icon: "/icons/clipboard.svg" },
  { name: "Reports", labelKey: "layout.navReports", icon: "/icons/prohibited.svg" },
  { name: "NotifyConfig", labelKey: "layout.navNotifyConfig", icon: "/icons/lock.svg" },
  { name: "SensitiveWords", labelKey: "layout.navSensitiveWords", icon: "/icons/prohibited.svg" },
];

/** 当前管理员的显示名（缺失时回退到 i18n）。 */
const displayName = computed(() => sessionStore.user?.displayName || t("layout.userMenuTitle"));
/** 当前管理员角色（缺失时回退到 ADMIN 字面量）。 */
const displayRole = computed(() => sessionStore.user?.role || "ADMIN");

async function handleLogout() {
  await sessionStore.logout();
  router.push({ name: "Login" });
}

/**
 * P6 a11y：Skip link 触发时，将焦点移到主内容区。
 * 让键盘用户跳过侧边栏导航直达主内容。
 */
function focusMainContent(): void {
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

    <view class="sidebar" role="navigation" aria-label="主导航">
      <view class="sidebar-header">
        <text class="logo-text">{{ t("login.title") }}</text>
      </view>

      <nav class="sidebar-menu">
        <router-link
          v-for="item in menuItems"
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
        <button class="logout-button" @click="handleLogout">{{ t("common.logout") }}</button>
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
  </view>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
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
  padding: 12px 20px;
  background: #3FCF8E;
  color: #ffffff;
  border-radius: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

/* Skip link 视觉样式（focus 时显示） */
.skip-link {
  outline: 2px solid #3FCF8E;
  outline-offset: 2px;
}

.main-content:focus {
  outline: none;
}

.sidebar {
  width: 240px;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.sidebar-menu {
  flex: 1;
  padding: 16px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  color: #666;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
}

.menu-item:hover {
  background: #f9f9f9;
  color: #333;
}

.menu-item--active {
  background: linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, transparent 100%);
  color: #667eea;
  border-right: 3px solid #667eea;
}

.menu-icon {
  width: 20px;
  height: 20px;
}

.menu-label {
  font-size: 14px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #f0f0f0;
}

.user-info {
  margin-bottom: 12px;
}

.user-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.user-role {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.logout-button {
  width: 100%;
  padding: 10px;
  background: #f5f5f5;
  border: none;
  border-radius: 6px;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-button:hover {
  background: #eee;
  color: #333;
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>
