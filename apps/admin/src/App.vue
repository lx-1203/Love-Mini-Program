<script setup lang="ts">
/**
 * Admin v2 根组件：router-view 根容器 + 语言切换入口。
 *
 * 会话恢复（bootstrap）已由 main.ts 负责，此处不再重复调用。
 * 登录页（route.name === 'Login'）隐藏语言切换器，避免视觉干扰。
 */
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { setLocale, getLocale } from "./i18n";

const route = useRoute();
const { t } = useI18n();

const currentLocale = ref<string>(getLocale());

function handleLocaleChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (value === "zh-CN" || value === "en-US") {
    setLocale(value);
    currentLocale.value = value;
  }
}

onMounted(() => {
  // 启动时恢复用户上次选择的语言（无记录时保持默认 zh-CN）
  try {
    const saved = localStorage.getItem("admin_v2_locale");
    if (saved === "zh-CN" || saved === "en-US") {
      setLocale(saved);
      currentLocale.value = saved;
    }
  } catch {
    // localStorage 不可用时忽略，保持默认语言
  }
});
</script>

<template>
  <div class="app-container">
    <!-- 语言切换入口（i18n/setLocale 的唯一调用方，登录页隐藏） -->
    <div v-if="route.name !== 'Login'" class="locale-switcher">
      <label class="locale-label" :for="'locale-select'">{{ t("common.language") }}</label>
      <select
        id="locale-select"
        class="locale-select"
        :value="currentLocale"
        @change="handleLocaleChange"
      >
        <option value="zh-CN">{{ t("common.chinese") }}</option>
        <option value="en-US">{{ t("common.english") }}</option>
      </select>
    </div>
    <router-view />
  </div>
</template>

<style>
.app-container {
  width: 100%;
  min-height: 100vh;
  background-color: var(--admin-color-bg-page);
}

.locale-switcher {
  position: fixed;
  top: var(--admin-space-md);
  right: var(--admin-space-lg);
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: var(--admin-space-xs);
  padding: var(--admin-space-xxs) var(--admin-space-sm);
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  box-shadow: var(--admin-shadow-sm);
}

.locale-label {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-tertiary);
}

.locale-select {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-primary);
  border: none;
  background: transparent;
  cursor: pointer;
}
</style>
