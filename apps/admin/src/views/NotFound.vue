<script setup lang="ts">
/**
 * 404 页面（复制自旧后台 apps/admin）。
 *
 * 新增 catch-all 路由的兜底视图：访问未知路径时不再渲染空白页，
 * 提供返回首页与返回上一页两个入口。
 */
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useMenuStore, findFirstMenuPath } from "../stores/menu";

const router = useRouter();
const { t } = useI18n();
const menuStore = useMenuStore();

/**
 * 返回首页：优先跳转当前角色菜单树中第一个可跳转菜单，
 * 避免无 Dashboard 权限的校区管理员点击硬编码路由 name 无响应；
 * 菜单未加载（如未登录直达 404）时回退到 /，由路由守卫统一决定跳转（登录页等）。
 */
function goHome(): void {
  const fallback = findFirstMenuPath(menuStore.menuTree);
  void router.push(fallback ?? "/");
}
</script>

<template>
  <view class="not-found-page">
    <view class="not-found-card">
      <text class="not-found-code">404</text>
      <text class="not-found-title">{{ t("notFound.title") }}</text>
      <text class="not-found-desc">{{ t("notFound.description") }}</text>
      <view class="not-found-actions">
        <button class="action-primary" @click="goHome">
          {{ t("notFound.backHome") }}
        </button>
        <button class="action-secondary" @click="router.back()">
          {{ t("common.back") }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--admin-color-bg-page);
  padding: var(--admin-space-xl);
}

.not-found-card {
  width: 100%;
  max-width: 420px;
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xxl);
  padding: var(--admin-space-section) var(--admin-space-xxxl);
  box-shadow: var(--admin-shadow-lg);
  text-align: center;
}

.not-found-code {
  display: block;
  font-size: var(--admin-font-display-xl);
  font-weight: 800;
  color: var(--admin-color-text-quaternary);
  line-height: 1;
  margin-bottom: var(--admin-space-lg);
}

.not-found-title {
  display: block;
  font-size: var(--admin-font-xl);
  font-weight: 600;
  color: var(--admin-color-text-primary);
  margin-bottom: var(--admin-space-sm);
}

.not-found-desc {
  display: block;
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-quaternary);
  margin-bottom: var(--admin-space-xxl);
}

.not-found-actions {
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
  color: var(--admin-color-text-primary);
}
</style>
