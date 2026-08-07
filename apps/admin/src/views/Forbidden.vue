<script setup lang="ts">
/**
 * 403 禁止访问页面（复制自旧后台 apps/admin）。
 *
 * 当路由守卫检测到动态菜单加载失败 / 未注册路径兜底时跳转至此。
 * 提供退出登录入口，避免用户卡死在无权限页面（退出后回到登录页重新登录）。
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session";
import { useMenuStore } from "../stores/menu";

const { t } = useI18n();
const router = useRouter();
const sessionStore = useSessionStore();
const menuStore = useMenuStore();

// 登出按钮 loading 防护（防重复点击）
const loggingOut = ref(false);

/**
 * 退出登录：先清空本地会话与菜单再跳转登录页。
 *
 * 死循环修复：若不清除会话直接跳 /login，守卫会把已登录用户弹回首页，
 * 形成循环；必须先 logout()。
 */
async function goLogin() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await sessionStore.logout();
    menuStore.reset();
  } finally {
    router.push({ name: "Login" });
    loggingOut.value = false;
  }
}
</script>

<template>
  <view class="forbidden-page">
    <view class="forbidden-card">
      <text class="forbidden-code">403</text>
      <text class="forbidden-title">{{ t("forbidden.title") }}</text>
      <text class="forbidden-desc">{{ t("forbidden.description") }}</text>
      <view class="forbidden-actions">
        <!-- 仅保留退出登录入口（角色不足时返回首页会被守卫再次拦回） -->
        <button class="action-primary" :disabled="loggingOut" @click="goLogin">
          {{ loggingOut ? t("common.loading") : t("common.logout") }}
        </button>
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

.action-primary {
  padding: var(--admin-space-md-sm) var(--admin-space-xl);
  border: none;
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--admin-color-primary);
  color: var(--admin-color-bg-container);
}

.action-primary:hover {
  background: var(--admin-color-primary-hover);
}
</style>
