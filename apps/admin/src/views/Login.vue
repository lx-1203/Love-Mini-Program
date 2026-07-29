<script setup lang="ts">
/**
 * Admin 登录视图（SubTask 3.3.2 i18n 化 + Task 5 移除 import.meta.env）。
 *
 * 改造点：
 * - 标题/副标题/标签/占位符/按钮/错误提示全部走 i18n
 * - 错误回退消息（如 "登录失败"）改为 errors.* key
 * - 开发环境账号提示通过 i18n 模板插值，便于英文版展示
 * - Task 5：所有 import.meta.env.VITE_* 改为通过 config/env.ts 统一封装的 env 对象引用
 */
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useSessionStore } from "../stores/session";
import { useI18n } from "vue-i18n";
import { env } from "../config/env";

const router = useRouter();
const route = useRoute();
const sessionStore = useSessionStore();
const { t } = useI18n();

const form = ref({
  username: "",
  password: "",
});

const loading = ref(false);
const error = ref("");

// 修复：默认凭据提示改为从环境变量读取，仅开发环境显示
// Task 5：通过 env.isDev / env.devDefaultUsername / env.devDefaultPassword 引用，
// 生产环境 env.isDev 为 false，提示区块不渲染
const showDevHint = computed(() => {
  return Boolean(env.isDev && devUsername.value && devPassword.value);
});

const devUsername = computed(() => env.devDefaultUsername);
const devPassword = computed(() => env.devDefaultPassword);

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    error.value = t("login.usernameRequired") + " / " + t("login.passwordRequired");
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    await sessionStore.login(form.value);
    // Task 14：登录成功后优先回跳到 redirect 查询参数指向的路径，
    // 无 redirect 时回首页，保证路由守卫拦截后的用户体验连贯
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "";
    router.push(redirect || { name: "Dashboard" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    // 后端返回的错误信息已由拦截器根据错误码翻译，这里仅做兜底
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

        <!-- 修复：移除硬编码默认凭据明文展示，改为从环境变量读取（仅开发环境显示）
             生产环境（NODE_ENV=production）完全不显示默认凭据提示 -->
        <view v-if="showDevHint" class="login-hint">
          <text>{{ t("login.devUsernameHint", { username: devUsername }) }}</text>
          <text>{{ t("login.devPasswordHint", { password: devPassword }) }}</text>
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
