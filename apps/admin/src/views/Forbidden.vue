<script setup lang="ts">
/**
 * 403 禁止访问页面（Task 14 + Task 6 i18n 抽取）。
 *
 * 当路由守卫检测到当前用户角色不在 to.meta.roles 白名单中时跳转至此。
 * 提供返回首页与重新登录入口，避免用户卡死在无权限页面。
 *
 * Task 6：将原 errors.permission 抽取到专属 forbidden.* 命名空间，
 * title 与 description 使用不同 key，避免重复文案。
 */
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();

function goHome() {
  router.push({ name: "Dashboard" });
}

function goLogin() {
  router.push({ name: "Login" });
}
</script>

<template>
  <view class="forbidden-page">
    <view class="forbidden-card">
      <text class="forbidden-code">403</text>
      <text class="forbidden-title">{{ t("forbidden.title") }}</text>
      <text class="forbidden-desc">{{ t("forbidden.description") }}</text>
      <view class="forbidden-actions">
        <button class="action-primary" @click="goHome">{{ t("common.back") }}</button>
        <button class="action-secondary" @click="goLogin">{{ t("common.logout") }}</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.forbidden-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--admin-color-primary) 0%, var(--admin-color-gradient-secondary) 100%);
  padding: var(--admin-space-xl);
}

.forbidden-card {
  width: 100%;
  max-width: 420px;
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xxl);
  padding: var(--admin-space-section) var(--admin-space-xxxl);
  box-shadow: var(--admin-shadow-lg);
  text-align: center;
}

.forbidden-code {
  display: block;
  font-size: var(--admin-font-display-xl);
  font-weight: 800;
  color: var(--admin-color-danger);
  line-height: 1;
  margin-bottom: var(--admin-space-lg);
}

.forbidden-title {
  display: block;
  font-size: var(--admin-font-xl);
  font-weight: 600;
  color: var(--admin-color-text-primary);
  margin-bottom: var(--admin-space-sm);
}

.forbidden-desc {
  display: block;
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-quaternary);
  margin-bottom: var(--admin-space-xxl);
}

.forbidden-actions {
  display: flex;
  gap: var(--admin-space-md);
  justify-content: center;
}

.action-primary,
.action-secondary {
  padding: var(--admin-space-md-sm) var(--admin-space-xl);
  border: none;
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-primary {
  background: var(--admin-color-primary);
  color: var(--admin-color-bg-container);
}

.action-primary:hover {
  background: var(--admin-color-primary-hover);
}

.action-secondary {
  background: var(--admin-color-bg-hover);
  color: var(--admin-color-text-tertiary);
}

.action-secondary:hover {
  background: var(--admin-color-bg-hover);
}
</style>
