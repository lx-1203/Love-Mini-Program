<script setup lang="ts">
/**
 * 错误状态组件（复制自旧后台 apps/admin）。
 *
 * 用途：在 Dashboard / Feedback / AuditLogs 等视图的数据加载失败时，
 * 提供统一的错误展示与重试入口，避免每个视图各写一套错误降级 UI。
 *
 * 设计约束：
 * - 不使用 emoji（项目规范）
 * - 文案走 i18n（errorState.* 命名空间），便于多语言
 * - 通过 props 接收 message，由父组件决定错误来源（API 错误、聚合错误等）
 * - 通过 emit('retry') 通知父组件触发重试，组件本身不关心重试逻辑
 */
import { useI18n } from "vue-i18n";

defineProps<{
  /** 错误提示文案，由父组件传入（通常为后端错误 message 或 i18n key 解析后的文案） */
  message: string;
}>();

const emit = defineEmits<{
  (e: "retry"): void;
}>();

const { t } = useI18n();
</script>

<template>
  <view class="error-state" role="alert" aria-live="polite">
    <view class="error-state__icon" aria-hidden="true">!</view>
    <view class="error-state__body">
      <text class="error-state__title">{{ t("errorState.title") }}</text>
      <text class="error-state__message">{{ message || t("errorState.networkError") }}</text>
    </view>
    <button
      type="button"
      class="error-state__retry"
      @click="emit('retry')"
    >
      {{ t("errorState.retry") }}
    </button>
  </view>
</template>

<style scoped>
.error-state {
  display: flex;
  align-items: center;
  gap: var(--admin-space-lg);
  padding: var(--admin-space-lg) var(--admin-space-xl);
  background: var(--admin-color-danger-soft);
  border: 1px solid var(--admin-color-danger-border);
  border-radius: var(--admin-radius-lg);
  margin-bottom: var(--admin-space-lg);
}

.error-state__icon {
  flex-shrink: 0;
  width: var(--admin-space-xxxl);
  height: var(--admin-space-xxxl);
  border-radius: 50%;
  background: var(--admin-color-danger);
  color: var(--admin-color-bg-container);
  font-size: var(--admin-font-xxl);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-state__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-xs);
  min-width: 0;
}

.error-state__title {
  font-size: var(--admin-font-lg);
  font-weight: 600;
  color: var(--admin-color-danger-title);
}

.error-state__message {
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger-message);
  word-break: break-word;
}

.error-state__retry {
  flex-shrink: 0;
  padding: var(--admin-space-sm) var(--admin-space-lg);
  background: var(--admin-color-danger);
  color: var(--admin-color-bg-container);
  border: none;
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-md);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.error-state__retry:hover {
  background: var(--admin-color-danger-active);
}
</style>
