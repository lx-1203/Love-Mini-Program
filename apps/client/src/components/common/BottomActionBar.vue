<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  primaryLabel: string;
  secondaryLabel?: string;
  /** 2026-08-07：主按钮禁用态（表单未完成时置灰不可点击） */
  disabled?: boolean;
}>();

const { t } = useI18n();

const emit = defineEmits<{
  primary: [];
  secondary: [];
}>();

// 修复（严格模式 noUnusedLocals）：原 `const t = designTokens;` 后未使用 t，
// designTokens 导入也仅用于该别名；模板未引用 designTokens，故导入与别名一并移除。
// emit 在模板 @tap 中使用（不在 #ifdef H5 内），vue-tsc 可识别，无需额外处理。
</script>

<template>
  <view
    class="bar"
    :class="{ 'bar--single': !secondaryLabel }"
    role="toolbar"
    :aria-label="t('common.actionBarAria')"
  >
    <button
      v-if="secondaryLabel"
      class="bar__secondary"
      @tap="emit('secondary')"
      :aria-label="secondaryLabel"
    >
      {{ secondaryLabel }}
    </button>
    <button
      class="bar__primary"
      :class="{ 'bar__primary--disabled': disabled }"
      :disabled="disabled"
      :aria-disabled="disabled || undefined"
      :aria-label="primaryLabel"
      @tap="!disabled && emit('primary')"
    >
      {{ primaryLabel }}
    </button>
  </view>
</template>

<style scoped>
.bar {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}
.bar--single {
  flex-direction: row;
}

.bar__primary,
.bar__secondary {
  flex: 1;
  height: 88rpx;
  border: 0;
  border-radius: var(--r-xl);
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  transition: all var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.bar__primary {
  background: var(--c-gradient-brand);
  color: var(--c-text-inverse, #FFFFFF);
  box-shadow: var(--s-brand);
}
.bar__primary:active {
  transform: scale(0.97);
  transition: all var(--d-fast, 120ms) cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--s-brand-md);
}

/* 2026-08-07：禁用态（表单未完成时置灰、不可点击、无投影） */
.bar__primary--disabled {
  background: var(--c-neutral-200, #E5E8EC);
  color: var(--c-text-tertiary, #8A919C);
  box-shadow: none;
}
.bar__primary--disabled:active {
  transform: none;
  box-shadow: none;
}

.bar__secondary {
  background: var(--c-bg-container);
  color: var(--c-text-primary);
  border: 1rpx solid var(--c-border-default);
}
.bar__secondary:active {
  transform: scale(0.97);
  transition: all var(--d-fast, 120ms) cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--c-neutral-100);
}
</style>
