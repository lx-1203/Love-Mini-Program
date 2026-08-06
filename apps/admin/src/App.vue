<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { useSessionStore } from "./stores/session";
import { setLocale, getLocale } from "./i18n";

const sessionStore = useSessionStore();
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

onMounted(async () => {
  // 启动时恢复用户上次选择的语言（无记录时保持默认 zh-CN）；
  // en-US 为预留资源，通过此语言切换入口可达（对应 i18n/setLocale 注释）
  try {
    const saved = localStorage.getItem("admin_locale");
    if (saved === "zh-CN" || saved === "en-US") {
      setLocale(saved);
      currentLocale.value = saved;
    }
  } catch {
    // localStorage 不可用时忽略，保持默认语言
  }
  await sessionStore.bootstrap();
});
</script>

<template>
  <div class="app-container">
    <!-- 语言切换入口（i18n/setLocale 的唯一调用方，en-US 资源通过此处可达）
         infra R2-00462：登录页隐藏语言切换器（原固定悬浮右上角，登录页也显示，
         视觉干扰且无实际用途） -->
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
