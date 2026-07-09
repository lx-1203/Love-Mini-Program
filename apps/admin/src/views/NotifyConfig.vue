<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  listNotifyConfigs,
  updateNotifyConfigs,
  type NotifyConfigView,
  type NotifyConfigUpdateRequest,
} from "../api/notify-config";
import { ApiError } from "../api/http";

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
  } catch (err: any) {
    error.value = err instanceof ApiError ? err.message : err.message || "加载通知配置失败";
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
    showSuccess("保存成功");
  } catch (err: any) {
    error.value = err instanceof ApiError ? err.message : err.message || "保存通知配置失败";
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
      <text class="page-title">通知配置</text>
      <text class="page-subtitle">管理各类型通知的启用状态与模板内容</text>
    </view>

    <view class="toolbar">
      <button class="primary-button" :disabled="saving || loading" @click="handleSave">
        {{ saving ? "保存中..." : "保存" }}
      </button>
    </view>

    <view v-if="error" class="error-message">{{ error }}</view>
    <view v-if="successMessage" class="success-message">{{ successMessage }}</view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>类型</th>
            <th>启用状态</th>
            <th>模板内容</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="empty-row">加载中...</td>
          </tr>
          <tr v-else-if="configs.length === 0">
            <td colspan="4" class="empty-row">暂无通知配置</td>
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
                <text class="switch-text">{{ config.enabled ? "已启用" : "已停用" }}</text>
              </label>
            </td>
            <td>
              <textarea
                v-model="config.template"
                class="template-input"
                rows="3"
                placeholder="请输入模板内容"
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
.notify-page {
  max-width: 1400px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.page-subtitle {
  display: block;
  font-size: 14px;
  color: #999;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
}

.primary-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: #667eea;
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: #5568d3;
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background: #fee;
  border-left: 3px solid #f44;
  border-radius: 4px;
  color: #f44;
  font-size: 13px;
  margin-bottom: 16px;
}

.success-message {
  padding: 12px;
  background: #f6ffed;
  border-left: 3px solid #52c41a;
  border-radius: 4px;
  color: #52c41a;
  font-size: 13px;
  margin-bottom: 16px;
}

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

.data-table th,
.data-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  vertical-align: top;
}

.data-table th {
  background: #f9f9f9;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  white-space: nowrap;
}

.data-table tbody tr:hover {
  background: #f9f9f9;
}

.empty-row {
  text-align: center;
  color: #999;
  padding: 32px;
}

.type-cell {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.time-cell {
  color: #999;
  white-space: nowrap;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.switch-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.switch-text {
  font-size: 12px;
  color: #666;
}

.template-input {
  width: 100%;
  min-width: 360px;
  padding: 8px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.template-input:focus {
  outline: none;
  border-color: #667eea;
}
</style>
