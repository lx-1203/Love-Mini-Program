<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "../stores/session";

const router = useRouter();
const sessionStore = useSessionStore();

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
    error.value = "请输入用户名和密码";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    await sessionStore.login(form.value);
    router.push({ name: "Dashboard" });
  } catch (err: any) {
    error.value = err.message || "登录失败";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <view class="login-page">
    <view class="login-card">
      <view class="login-header">
        <text class="login-title">管理员登录</text>
        <text class="login-subtitle">校园恋爱小程序管理后台</text>
      </view>

      <view class="login-form">
        <view class="form-item">
          <text class="form-label">用户名</text>
          <input
            v-model="form.username"
            class="form-input"
            type="text"
            placeholder="请输入用户名"
            @keyup.enter="handleLogin"
          />
        </view>

        <view class="form-item">
          <text class="form-label">密码</text>
          <input
            v-model="form.password"
            class="form-input"
            type="password"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          />
        </view>

        <view v-if="error" class="error-message">{{ error }}</view>

        <button
          class="login-button"
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? "登录中..." : "登录" }}
        </button>

        <!-- 修复：移除硬编码默认凭据明文展示，改为从环境变量读取（仅开发环境显示）
             生产环境（NODE_ENV=production）完全不显示默认凭据提示 -->
        <view v-if="showDevHint" class="login-hint">
          <text>开发环境默认账号：{{ devUsername }} / {{ devPassword }}</text>
        </view>
        <!-- TODO: 首次登录强制修改密码功能待实现
             安全要求：管理员首次登录后必须修改默认密码，
             后端需在 loginAsAdmin 返回时标记 passwordMustChange=true，
             前端检测到此标记后跳转到强制改密页面 -->
        <view class="login-hint login-hint-warning">
          <text>首次登录后请立即修改默认密码</text>
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
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.login-subtitle {
  display: block;
  font-size: 14px;
  color: #999;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  padding: 12px;
  background: #fee;
  border-left: 3px solid #f44;
  border-radius: 4px;
  color: #f44;
  font-size: 13px;
}

.login-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-hint {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

/* 首次登录改密警告提示样式 */
.login-hint-warning {
  color: #d97706;
  font-weight: 500;
}
</style>
