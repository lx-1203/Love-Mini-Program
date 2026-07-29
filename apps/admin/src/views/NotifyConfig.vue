<script setup lang="ts">
/**
 * Admin 通知配置视图（SubTask 3.3.2 i18n 化）。
 *
 * 改造点：
 * - 标题/副标题/列头/按钮/状态文案全部走 i18n key
 * - 错误回退与成功提示通过 notifyConfig.loadFailed/saveSuccess/saveFailed 表达
 * - 加载/空数据状态复用 common.loading / notifyConfig.noData
 */
import { ref, onMounted } from "vue";
import {
  listNotifyConfigs,
  updateNotifyConfigs,
  type NotifyConfigView,
  type NotifyConfigUpdateRequest,
} from "../api/notify-config";
import { ApiError } from "../api/http";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// 通知配置列表（每行直接可编辑）
const configs = ref<NotifyConfigView[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
// 保存成功的轻提示文本，3 秒后自动清空
const successMessage = ref("");
let successTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 加载全部通知配置。
 * 失败时设置 error，并清空列表。
 */
async function fetchConfigs() {
  loading.value = true;
  error.value = "";
  try {
    const result = await listNotifyConfigs();
    configs.value = result || [];
  } catch (err: unknown) {
    // 修复 no-explicit-any：catch 类型改为 unknown，通过类型守卫收敛
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("notifyConfig.loadFailed");
    configs.value = [];
  } finally {
    loading.value = false;
  }
}

/**
 * 保存全部配置：把当前所有行组装为 {type, enabled, template} 数组后批量提交。
 */
async function handleSave() {
  saving.value = true;
  error.value = "";
  try {
    const payload: NotifyConfigUpdateRequest[] = configs.value.map((c) => ({
      type: c.type,
      enabled: c.enabled,
      template: c.template,
    }));
    const updated = await updateNotifyConfigs(payload);
    configs.value = updated || configs.value;
    showSuccess(t("notifyConfig.saveSuccess"));
  } catch (err: unknown) {
    // 修复 no-explicit-any：catch 类型改为 unknown，通过类型守卫收敛
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("notifyConfig.saveConfigFailed");
  } finally {
    saving.value = false;
  }
}

/**
 * 展示成功提示，3 秒后自动消失。
 */
function showSuccess(msg: string) {
  if (successTimer) {
    clearTimeout(successTimer);
  }
  successMessage.value = msg;
  successTimer = setTimeout(() => {
    successMessage.value = "";
    successTimer = null;
  }, 3000);
}

/**
 * 格式化时间：兼容 ISO 字符串，截到秒。
 */
function formatTime(s?: string): string {
  if (!s) return "-";
  return s.replace("T", " ").slice(0, 19);
}

onMounted(() => {
  fetchConfigs();
});
</script>

<template>
  <view class="notify-page">
    <view class="page-header">
      <text class="page-title">{{ t("notifyConfig.title") }}</text>
      <text class="page-subtitle">{{ t("notifyConfig.tableSubtitle") }}</text>
    </view>

    <view class="toolbar">
      <button class="primary-button" :disabled="saving || loading" @click="handleSave">
        {{ saving ? t("common.saving") : t("notifyConfig.saveButtonShort") }}
      </button>
    </view>

    <view v-if="error" class="error-message">{{ error }}</view>
    <view v-if="successMessage" class="success-message">{{ successMessage }}</view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("notifyConfig.columnType") }}</th>
            <th scope="col">{{ t("notifyConfig.columnEnabled") }}</th>
            <th scope="col">{{ t("notifyConfig.columnTemplate") }}</th>
            <th scope="col">{{ t("notifyConfig.columnUpdatedAt") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="configs.length === 0">
            <td colspan="4" class="empty-row">{{ t("notifyConfig.noData") }}</td>
          </tr>
          <tr v-for="config in configs" :key="config.id">
            <td class="type-cell">{{ config.type }}</td>
            <td>
              <label class="switch-label">
                <input
                  v-model="config.enabled"
                  type="checkbox"
                  class="switch-input"
                />
                <text class="switch-text">{{ config.enabled ? t("notifyConfig.enabledLabel") : t("notifyConfig.disabledLabel") }}</text>
              </label>
            </td>
            <td>
              <textarea
                v-model="config.template"
                class="template-input"
                rows="3"
                :placeholder="t('notifyConfig.templatePlaceholder')"
              />
            </td>
            <td class="time-cell">{{ formatTime(config.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </view>
  </view>
</template>

<style scoped>
/* Task 3.7.1：接入共享样式表，去除与 admin-common.css 重复的定义 */
@import "../styles/admin-common.css";

.notify-page {
  max-width: 1400px;
}

/* NotifyConfig 特有：模板输入框较宽，需要保证可滚动 */
.data-table {
  min-width: 900px;
}

.type-cell {
  font-weight: 500;
  color: var(--admin-color-text-primary);
  white-space: nowrap;
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

.template-input {
  width: 100%;
  min-width: 360px;
  padding: var(--admin-space-sm) var(--admin-space-md-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-md);
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.template-input:focus {
  outline: none;
  border-color: var(--admin-color-primary);
}
</style>
