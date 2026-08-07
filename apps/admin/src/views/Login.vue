<script setup lang="ts">
/**
 * Admin v2 登录视图（复制自旧后台 apps/admin 逻辑，token key 改 admin_v2_token）。
 *
 * 关键差异：
 * - 登录成功后调用 menuStore.loadMenus() + addDynamicRoutes()，
 *   确保跳转目标（Dashboard 等动态路由）已注册；
 * - 回跳 redirect 参数通过 sanitizeRedirect 校验（防开放重定向）；
 * - 开发环境账号提示从环境变量读取，生产环境不渲染。
 */
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { sanitizeRedirect } from "../router/guards";
import { useSessionStore } from "../stores/session";
import { useMenuStore, findFirstMenuPath } from "../stores/menu";
import { useI18n } from "vue-i18n";
import { env } from "../config/env";
import { addDynamicRoutes } from "../router";

const router = useRouter();
const route = useRoute();
const sessionStore = useSessionStore();
const menuStore = useMenuStore();
const { t } = useI18n();

const form = ref({
  username: "",
  password: "",
});

const loading = ref(false);
const error = ref("");

// 仅开发环境显示默认账号提示（不展示密码，防误配真实密码泄露）
const showDevHint = computed(() => Boolean(env.isDev && env.devDefaultUsername));

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    error.value = t("login.credentialsRequired");
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    await sessionStore.login(form.value);
    // 登录成功后立即拉取动态菜单并注册路由，保证跳转目标可用
    await menuStore.loadMenus();
    addDynamicRoutes(menuStore.menuTree);
    // 优先回跳 redirect 查询参数指向的站内路径（已校验 + 已注册，防止 404/越权路径）；
    // 否则跳转当前角色菜单树中第一个可跳转菜单（校区管理员无 Dashboard 权限时避免 403）
    const redirect = sanitizeRedirect(route.query.redirect);
    if (redirect && router.resolve(redirect).name !== "NotFound") {
      router.push(redirect);
    } else {
      const fallback = findFirstMenuPath(menuStore.menuTree);
      router.push(fallback ?? "/");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    error.value = message || t("login.loginFailed");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <view class="login-page">
    <view class="login-card">
      <view class="login-header">
        <text class="login-title">{{ t("login.title") }}</text>
        <text class="login-subtitle">{{ t("login.subtitle") }}</text>
      </view>

      <view class="login-form">
        <view class="form-item">
          <text class="form-label">{{ t("login.usernameLabel") }}</text>
          <input
            v-model="form.username"
            class="form-input"
            type="text"
            :placeholder="t('login.usernamePlaceholder')"
            @keyup.enter="handleLogin"
          />
        </view>

        <view class="form-item">
          <text class="form-label">{{ t("login.passwordLabel") }}</text>
          <input
            v-model="form.password"
            class="form-input"
            type="password"
            :placeholder="t('login.passwordPlaceholder')"
            @keyup.enter="handleLogin"
          />
        </view>

        <view v-if="error" class="error-message">{{ error }}</view>

        <button
          class="login-button"
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? t("login.loggingIn") : t("login.loginButton") }}
        </button>

        <!-- 开发环境默认账号提示（仅开发环境显示账号，不显示密码） -->
        <view v-if="showDevHint" class="login-hint">
          <text>{{ t("login.devUsernameHint", { username: env.devDefaultUsername }) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--admin-color-primary) 0%, var(--admin-color-gradient-secondary) 100%);
  padding: var(--admin-space-xl);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xxl);
  padding: var(--admin-space-section) var(--admin-space-xxxl);
  box-shadow: var(--admin-shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: var(--admin-space-xxxl);
}

.login-title {
  display: block;
  font-size: var(--admin-font-xxxl);
  font-weight: 700;
  color: var(--admin-color-text-primary);
  margin-bottom: var(--admin-space-sm);
}

.login-subtitle {
  display: block;
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-tertiary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-lg);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-xxs);
}

.form-label {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
  font-weight: 500;
}

.form-input {
  padding: var(--admin-space-md) var(--admin-space-md-lg);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--admin-color-primary);
}

.error-message {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
  padding: var(--admin-space-md-sm) var(--admin-space-md-lg);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-md);
}

.login-button {
  padding: var(--admin-space-md);
  background: var(--admin-color-primary);
  color: var(--admin-color-bg-container);
  border: none;
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-xl);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.login-button:hover {
  background: var(--admin-color-primary-hover);
}

.login-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.login-hint {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-xs);
  padding: var(--admin-space-md-sm) var(--admin-space-md);
  background: var(--admin-color-accent-soft);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-sm);
  color: var(--admin-color-primary);
}
</style>
