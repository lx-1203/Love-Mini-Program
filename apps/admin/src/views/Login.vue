<script setup lang="ts">
/**
 * Admin 登录视图（SubTask 3.3.2 i18n 化）。
 *
 * 改造点：
 * - 标题/副标题/标签/占位符/按钮/错误提示全部走 i18n
 * - 错误回退消息（如 "登录失败"）改为 errors.* key
 * - 开发环境账号提示通过 i18n 模板插值，便于英文版展示
 *
 * 工程约束遵守：
 * - 保留 import.meta.env.DEV（H5 + Vite 环境支持，Admin 不在 mp-weixin 运行）
 */
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session";
import { useI18n } from "vue-i18n";

const router = useRouter();
const sessionStore = useSessionStore();
const { t } = useI18n();

const form = ref({
  username: "",
  password: "",
});

const loading = ref(false);
const error = ref("");

// 修复：默认凭据提示改为从环境变量读取，仅开发环境显示
// 生产环境（NODE_ENV=production）import.meta.env.DEV 为 false，提示区块不渲染
const showDevHint = computed(() => {
  return Boolean(import.meta.env.DEV && devUsername.value && devPassword.value);
});

const devUsername = computed(() => import.meta.env.VITE_DEV_DEFAULT_USERNAME || "");
const devPassword = computed(() => import.meta.env.VITE_DEV_DEFAULT_PASSWORD || "");

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    error.value = t("login.usernameRequired") + " / " + t("login.passwordRequired");
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    await sessionStore.login(form.value);
    router.push({ name: "Dashboard" });
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.login-subtitle {
  display: block;
  font-size: 14px;
  color: #666;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.form-input {
  padding: 12px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.error-message {
  background: #fff1f0;
  color: #f5222d;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
}

.login-button {
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.login-button:hover {
  background: #5568d3;
}

.login-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.login-hint {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: #f0f4ff;
  border-radius: 6px;
  font-size: 12px;
  color: #667eea;
}
</style>
