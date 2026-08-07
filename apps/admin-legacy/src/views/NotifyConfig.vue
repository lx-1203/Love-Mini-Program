<script setup lang="ts">
/**
 * Admin 通知配置视图（SubTask 3.3.2 i18n 化）。
 *
 * 改造点：
 * - 标题/副标题/列头/按钮/状态文案全部走 i18n key
 * - 错误回退与成功提示通过 notifyConfig.loadFailed/saveSuccess/saveFailed 表达
 * - 加载/空数据状态复用 common.loading / notifyConfig.noData
 */
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import {
  listNotifyConfigs,
  updateNotifyConfigs,
  type NotifyConfigView,
  type NotifyConfigUpdateRequest,
} from "../api/notify-config";
import { ApiError } from "../api/http";
// infra R2-00443：错误态接入共享 ErrorState 组件（原无重试入口）
import ErrorState from "../components/ErrorState.vue";
import { useI18n } from "vue-i18n";
import { TOAST_DURATION_MS } from "../utils/constants";

const { t } = useI18n();

// 通知配置列表（每行直接可编辑）
const configs = ref<NotifyConfigView[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
// 保存成功的轻提示文本，3 秒后自动清空
const successMessage = ref("");
let successTimer: ReturnType<typeof setTimeout> | null = null;

// infra R2-00444：脏检查——保存前的基线快照。
// 原实现提交全部配置（无脏检查），未修改也全量 PUT，误触保存覆盖未提交修改。
let baseline: string = "";

/** infra R2-00444：是否有未保存修改（enabled/template 任一变更） */
const hasChanges = computed(() => {
  const snapshot = JSON.stringify(
    configs.value.map((c) => ({ type: c.type, enabled: c.enabled, template: c.template })),
  );
  return snapshot !== baseline;
});

/** infra R2-00445：通知类型英文枚举 → i18n 标签（原类型列直接展示 LIKE/COMMENT 等） */
function typeLabel(type: string): string {
  switch (type) {
    case "LIKE":
      return t("notifyConfig.fieldLikeNotify");
    case "COMMENT":
      return t("notifyConfig.fieldCommentNotify");
    case "FOLLOW":
      return t("notifyConfig.fieldFollowNotify");
    case "MATCH":
      return t("notifyConfig.fieldMatchNotify");
    case "SYSTEM":
      return t("notifyConfig.fieldSystemNotify");
    case "VISITOR":
      return t("notifyConfig.fieldVisitorNotify");
    default:
      return type;
  }
}

/** 模板长度上限（后端校验对齐前的前端保护值，防超长模板误提交） */
const TEMPLATE_MAX_LENGTH = 2000;

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
    // infra R2-00444：加载成功后记录基线快照
    baseline = JSON.stringify(
      configs.value.map((c) => ({ type: c.type, enabled: c.enabled, template: c.template })),
    );
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
 * infra R2-00444：无变更时直接提示并跳过请求（防误触保存覆盖）；
 * infra R2-00446：保存前校验模板长度，超长给出明确提示。
 */
async function handleSave() {
  if (!hasChanges.value) {
    return;
  }
  // 模板长度校验（行级）
  const overLong = configs.value.find((c) => (c.template || "").length > TEMPLATE_MAX_LENGTH);
  if (overLong) {
    error.value = t("notifyConfig.templateTooLong", { n: TEMPLATE_MAX_LENGTH });
    return;
  }
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
    // 保存成功后更新基线
    baseline = JSON.stringify(
      configs.value.map((c) => ({ type: c.type, enabled: c.enabled, template: c.template })),
    );
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
  // infra R2-00447：toast 时长魔法数字收敛为公共常量
  successTimer = setTimeout(() => {
    successMessage.value = "";
    successTimer = null;
  }, TOAST_DURATION_MS);
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

// 修复：组件卸载时清理 successTimer，避免定时器在卸载后触发更新报错
onBeforeUnmount(() => {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = null;
  }
});
</script>

<template>
  <view class="notify-page">
    <view class="page-header">
      <text class="page-title">{{ t("notifyConfig.title") }}</text>
      <text class="page-subtitle">{{ t("notifyConfig.tableSubtitle") }}</text>
    </view>

    <view class="toolbar">
      <button class="primary-button" :disabled="saving || loading || !hasChanges" @click="handleSave">
        {{ saving ? t("common.saving") : t("notifyConfig.saveButtonShort") }}
      </button>
      <!-- infra R2-00448：未保存修改提示（原无脏状态文案，误触保存覆盖未提交修改） -->
      <text v-if="hasChanges && !saving" class="unsaved-tip">{{ t("notifyConfig.unsavedChanges") }}</text>
    </view>

    <!-- infra R2-00443：错误态接入 ErrorState 组件（含重试按钮） -->
    <ErrorState v-if="error" :message="error" @retry="fetchConfigs" />
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
            <!-- infra R2-00445：类型列展示 i18n 标签（原直接展示 LIKE_NOTIFY 等英文枚举） -->
            <td class="type-cell">{{ typeLabel(config.type) }}</td>
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
                :maxlength="TEMPLATE_MAX_LENGTH"
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

/* infra R2-00448：未保存修改提示样式 */
.unsaved-tip {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-warning);
}
</style>
