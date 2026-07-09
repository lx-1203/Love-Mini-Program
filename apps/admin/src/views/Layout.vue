<script setup lang="ts">
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session";

const router = useRouter();
const sessionStore = useSessionStore();

const menuItems = [
  { name: "Dashboard", label: "仪表盘", icon: "📊" },
  { name: "Users", label: "用户管理", icon: "👥" },
  { name: "Posts", label: "帖子管理", icon: "📝" },
  { name: "Feedback", label: "反馈管理", icon: "💬" },
  { name: "AuditLogs", label: "审计日志", icon: "📋" },
  { name: "Reports", label: "举报管理", icon: "🚩" },
  { name: "NotifyConfig", label: "通知配置", icon: "🔔" },
  { name: "SensitiveWords", label: "敏感词管理", icon: "🚫" },
];

async function handleLogout() {
  await sessionStore.logout();
  router.push({ name: "Login" });
}
</script>

<template>
  <view class="layout">
    <view class="sidebar">
      <view class="sidebar-header">
        <text class="logo-text">管理后台</text>
      </view>

      <nav class="sidebar-menu">
        <router-link
          v-for="item in menuItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="menu-item"
          active-class="menu-item--active"
        >
          <text class="menu-icon">{{ item.icon }}</text>
          <text class="menu-label">{{ item.label }}</text>
        </router-link>
      </nav>

      <view class="sidebar-footer">
        <view class="user-info">
          <text class="user-name">{{ sessionStore.user?.displayName || "管理员" }}</text>
          <text class="user-role">{{ sessionStore.user?.role || "ADMIN" }}</text>
        </view>
        <button class="logout-button" @click="handleLogout">退出登录</button>
      </view>
    </view>

    <view class="main-content">
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
  font-size: 20px;
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
