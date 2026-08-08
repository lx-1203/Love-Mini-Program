<script setup lang="ts">
/**
 * Admin 系统配置视图（复制自旧后台 apps/admin，适配 admin-v2 目录结构）。
 *
 * 对应后端 com.campuslove.api.admin.AdminConfigController：
 * - GET  /api/v1/admin/configs          / PUT /configs/{key}    （参数配置）
 * - GET  /api/v1/admin/rules            / PUT /rules/{id}       （业务规则）
 * - GET  /api/v1/admin/switches         / PUT /switches/{key}   （功能开关）
 *
 * 三个 Tab 各自独立加载与保存；每行行内编辑 + 行内保存按钮（对应各自的独立 PUT 端点）。
 * 写操作要求 SUPER_ADMIN，普通管理员保存时后端返回 403。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  listConfigs,
  updateConfig,
  listRules,
  updateRule,
  listSwitches,
  updateSwitch,
  type AdminConfig,
  type AdminRule,
  type AdminSwitch,
} from "@/api/config";
import { ApiError } from "@/api/http";
import ErrorState from "@/components/ErrorState.vue";
import { useSessionStore } from "@/stores/session";
import { TOAST_DURATION_MS } from "@/utils/constants";

const { t } = useI18n();
const sessionStore = useSessionStore();

/** 是否全局超级管理员（配置写操作仅 SUPER_ADMIN 可用，普通管理员保存会被后端 403） */
const isSuperAdmin = computed(
  () => String(sessionStore.user?.role || "").toUpperCase() === "SUPER_ADMIN",
);

type TabKey = "configs" | "rules" | "switches";

const activeTab = ref<TabKey>("configs");

const configs = ref<AdminConfig[]>([]);
const rules = ref<AdminRule[]>([]);
const switches = ref<AdminSwitch[]>([]);

const loading = ref(false);
const error = ref("");
/** 正在保存的行标识（config-{key} / rule-{id} / switch-{key}），用于禁用对应行按钮防连点 */
const savingKey = ref("");
// 保存成功的轻提示文本，3 秒后自动清空
const successMessage = ref("");
let successTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 切换 Tab 并加载对应数据（仅首次切换时请求）。
 */
function handleTabChange(tab: TabKey) {
  activeTab.value = tab;
  error.value = "";
  if (tab === "configs" && configs.value.length === 0 && !loading.value) {
    fetchConfigs();
  } else if (tab === "rules" && rules.value.length === 0 && !loading.value) {
    fetchRules();
  } else if (tab === "switches" && switches.value.length === 0 && !loading.value) {
    fetchSwitches();
  }
}

async function fetchConfigs() {
  loading.value = true;
  error.value = "";
  try {
    configs.value = (await listConfigs()) || [];
  } catch (err: unknown) {
    error.value = errorMessage(err, t("config.loadFailed"));
    configs.value = [];
  } finally {
    loading.value = false;
  }
}

async function fetchRules() {
  loading.value = true;
  error.value = "";
  try {
    rules.value = (await listRules()) || [];
  } catch (err: unknown) {
    error.value = errorMessage(err, t("config.loadFailed"));
    rules.value = [];
  } finally {
    loading.value = false;
  }
}

async function fetchSwitches() {
  loading.value = true;
  error.value = "";
  try {
    switches.value = (await listSwitches()) || [];
  } catch (err: unknown) {
    error.value = errorMessage(err, t("config.loadFailed"));
    switches.value = [];
  } finally {
    loading.value = false;
  }
}

/** 统一错误文案收敛：ApiError 优先后端 message，其余回退 i18n fallback */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError
    ? err.message
    : err instanceof Error && err.message
      ? err.message
      : fallback;
}

/** 保存单条参数配置（key 行） */
async function handleSaveConfig(row: AdminConfig) {
  const value = (row.value || "").trim();
  if (!value) {
    error.value = t("config.valueRequired");
    return;
  }
  if (savingKey.value) return;
  savingKey.value = `config-${row.key}`;
  error.value = "";
  try {
    const updated = await updateConfig(row.key, {
      value,
      description: row.description,
    });
    Object.assign(row, updated);
    showSuccess(t("config.saveSuccess"));
  } catch (err: unknown) {
    error.value = errorMessage(err, t("config.saveFailed"));
  } finally {
    savingKey.value = "";
  }
}

/** 保存单条业务规则（id 行） */
async function handleSaveRule(row: AdminRule) {
  if (savingKey.value) return;
  savingKey.value = `rule-${row.id}`;
  error.value = "";
  try {
    const updated = await updateRule(row.id, {
      expression: row.expression,
      enabled: row.enabled,
      description: row.description,
    });
    Object.assign(row, updated);
    showSuccess(t("config.saveSuccess"));
  } catch (err: unknown) {
    error.value = errorMessage(err, t("config.saveFailed"));
  } finally {
    savingKey.value = "";
  }
}

/** 保存单条功能开关（key 行，仅 enabled 可更新） */
async function handleSaveSwitch(row: AdminSwitch) {
  if (savingKey.value) return;
  savingKey.value = `switch-${row.key}`;
  error.value = "";
  try {
    const updated = await updateSwitch(row.key, { enabled: row.enabled });
    Object.assign(row, updated);
    showSuccess(t("config.saveSuccess"));
  } catch (err: unknown) {
    error.value = errorMessage(err, t("config.saveFailed"));
  } finally {
    savingKey.value = "";
  }
}

/** 展示成功提示，3 秒后自动消失 */
function showSuccess(msg: string) {
  if (successTimer) clearTimeout(successTimer);
  successMessage.value = msg;
  successTimer = setTimeout(() => {
    successMessage.value = "";
    successTimer = null;
  }, TOAST_DURATION_MS);
}

/** 格式化时间：兼容 ISO 字符串，截到秒 */
function formatTime(s?: string): string {
  if (!s) return "-";
  return s.replace("T", " ").slice(0, 19);
}

/** 启用状态列：checkbox + 文案 */
function enabledLabel(enabled: boolean): string {
  return enabled ? t("config.enabledLabel") : t("config.disabledLabel");
}

onMounted(() => {
  fetchConfigs();
});

// 组件卸载时清理定时器，避免卸载后触发更新
onBeforeUnmount(() => {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = null;
  }
});
</script>

<template>
  <view class="config-page">
    <view class="page-header">
      <text class="page-title">{{ t("config.title") }}</text>
      <text class="page-subtitle">{{ t("config.subtitle") }}</text>
    </view>

    <!-- 校区管理员只读提示：配置写操作仅超级管理员可用 -->
    <view v-if="!isSuperAdmin" class="readonly-tip" role="status">
      <text>{{ t("config.readonlyTip") }}</text>
    </view>

    <view class="tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="tab-button"
        :class="{ 'tab-button--active': activeTab === 'configs' }"
        @click="handleTabChange('configs')"
      >{{ t("config.tabConfigs") }}</button>
      <button
        type="button"
        role="tab"
        class="tab-button"
        :class="{ 'tab-button--active': activeTab === 'rules' }"
        @click="handleTabChange('rules')"
      >{{ t("config.tabRules") }}</button>
      <button
        type="button"
        role="tab"
        class="tab-button"
        :class="{ 'tab-button--active': activeTab === 'switches' }"
        @click="handleTabChange('switches')"
      >{{ t("config.tabSwitches") }}</button>
    </view>

    <ErrorState v-if="error" :message="error" @retry="() => handleTabChange(activeTab)" />
    <view v-if="successMessage" class="success-message">{{ successMessage }}</view>

    <!-- 参数配置 -->
    <view v-if="activeTab === 'configs'" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("config.columnKey") }}</th>
            <th scope="col">{{ t("config.columnValue") }}</th>
            <th scope="col">{{ t("config.columnDescription") }}</th>
            <th scope="col">{{ t("config.columnUpdatedAt") }}</th>
            <th scope="col">{{ t("config.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="configs.length === 0">
            <td colspan="5" class="empty-row">{{ t("config.noData") }}</td>
          </tr>
          <tr v-for="row in configs" :key="row.key">
            <td class="key-cell">{{ row.key }}</td>
            <td>
              <input v-model="row.value" class="row-input" type="text" />
            </td>
            <td>
              <input v-model="row.description" class="row-input" type="text" />
            </td>
            <td class="time-cell">{{ formatTime(row.updatedAt) }}</td>
            <td class="action-cell">
              <button
                v-if="isSuperAdmin"
                class="action-button edit"
                :disabled="savingKey === `config-${row.key}`"
                @click="handleSaveConfig(row)"
              >
                {{ savingKey === `config-${row.key}` ? t("common.saving") : t("config.actionSave") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 业务规则 -->
    <view v-else-if="activeTab === 'rules'" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("config.columnName") }}</th>
            <th scope="col">{{ t("config.columnExpression") }}</th>
            <th scope="col">{{ t("config.columnEnabled") }}</th>
            <th scope="col">{{ t("config.columnDescription") }}</th>
            <th scope="col">{{ t("config.columnUpdatedAt") }}</th>
            <th scope="col">{{ t("config.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="rules.length === 0">
            <td colspan="6" class="empty-row">{{ t("config.noData") }}</td>
          </tr>
          <tr v-for="row in rules" :key="row.id">
            <td class="key-cell">{{ row.name }}</td>
            <td>
              <input v-model="row.expression" class="row-input" type="text" />
            </td>
            <td>
              <label class="switch-label">
                <input v-model="row.enabled" type="checkbox" class="switch-input" />
                <text class="switch-text">{{ enabledLabel(row.enabled) }}</text>
              </label>
            </td>
            <td>
              <input v-model="row.description" class="row-input" type="text" />
            </td>
            <td class="time-cell">{{ formatTime(row.updatedAt) }}</td>
            <td class="action-cell">
              <button
                v-if="isSuperAdmin"
                class="action-button edit"
                :disabled="savingKey === `rule-${row.id}`"
                @click="handleSaveRule(row)"
              >
                {{ savingKey === `rule-${row.id}` ? t("common.saving") : t("config.actionSave") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 功能开关 -->
    <view v-else class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("config.columnKey") }}</th>
            <th scope="col">{{ t("config.columnEnabled") }}</th>
            <th scope="col">{{ t("config.columnDescription") }}</th>
            <th scope="col">{{ t("config.columnUpdatedAt") }}</th>
            <th scope="col">{{ t("config.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="switches.length === 0">
            <td colspan="5" class="empty-row">{{ t("config.noData") }}</td>
          </tr>
          <tr v-for="row in switches" :key="row.key">
            <td class="key-cell">{{ row.key }}</td>
            <td>
              <label class="switch-label">
                <input v-model="row.enabled" type="checkbox" class="switch-input" />
                <text class="switch-text">{{ enabledLabel(row.enabled) }}</text>
              </label>
            </td>
            <td>{{ row.description || t("common.emptyPlaceholder") }}</td>
            <td class="time-cell">{{ formatTime(row.updatedAt) }}</td>
            <td class="action-cell">
              <button
                v-if="isSuperAdmin"
                class="action-button edit"
                :disabled="savingKey === `switch-${row.key}`"
                @click="handleSaveSwitch(row)"
              >
                {{ savingKey === `switch-${row.key}` ? t("common.saving") : t("config.actionSave") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>
  </view>
</template>

<style scoped>
@import "@/styles/admin-common.css";

.config-page {
  max-width: 1400px;
}

.readonly-tip {
  background: var(--admin-color-warning-soft);
  border-left: 3px solid var(--admin-color-warning);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-md);
  color: var(--admin-color-warning);
}

.tabs {
  display: flex;
  gap: var(--admin-space-sm);
  margin-bottom: var(--admin-space-xxl);
  border-bottom: 1px solid var(--admin-color-border-light);
}

.tab-button {
  padding: var(--admin-space-md) var(--admin-space-xl);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-tertiary);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  color: var(--admin-color-text-primary);
}

.tab-button--active {
  color: var(--admin-color-primary);
  border-bottom-color: var(--admin-color-primary);
  font-weight: 600;
}

.key-cell {
  font-weight: 500;
  color: var(--admin-color-text-primary);
  white-space: nowrap;
}

.row-input {
  width: 100%;
  min-width: 140px;
  padding: var(--admin-space-sm) var(--admin-space-md-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-md);
  box-sizing: border-box;
}

.row-input:focus {
  outline: none;
  border-color: var(--admin-color-primary);
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: var(--admin-space-sm);
  cursor: pointer;
  user-select: none;
}

.switch-input {
  width: var(--admin-space-lg);
  height: var(--admin-space-lg);
  cursor: pointer;
}

.switch-text {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-tertiary);
}
</style>
