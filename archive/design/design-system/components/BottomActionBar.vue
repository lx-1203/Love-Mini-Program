<!-- ============================================================
  BottomActionBar - 底部操作栏
  变更点：
  1. 从 tokens 读取全部样式
  2. 增加按钮类型变体（primary / secondary / ghost / danger）
  3. 增加加载态与禁用态
  4. 增加按钮动效
============================================================ -->
<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../tokens';

const props = defineProps<{
  primaryLabel: string;
  secondaryLabel?: string;
  primaryType?: 'primary' | 'secondary' | 'ghost' | 'danger';
  secondaryType?: 'primary' | 'secondary' | 'ghost' | 'danger';
  primaryLoading?: boolean;
  secondaryLoading?: boolean;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'primary'): void;
  (e: 'secondary'): void;
}>();

const t = computed(() => designTokens);

const barStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: props.secondaryLabel ? '1fr 1fr' : '1fr',
  gap: `${t.value.spacing[3]}rpx`,
  padding: `${t.value.spacing[4]}rpx ${t.value.layout.pagePadding}rpx`,
  paddingBottom: `${t.value.spacing[4] + t.value.layout.safeBottom}rpx`,
  background: t.value.color.bg.container,
  borderTop: `1rpx solid ${t.value.color.border.light}`,
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: t.value.zIndex.sticky,
}));

function getButtonStyle(type: string, disabled: boolean) {
  const base = {
    height: `${t.value.component.button.height.md}rpx`,
    borderRadius: `${t.value.component.button.radius}rpx`,
    fontSize: `${t.value.typography.size.body}rpx`,
    fontWeight: t.value.typography.weight.semibold,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${t.value.motion.duration.fast}ms ${t.value.motion.easing.default}`,
    opacity: disabled ? 0.4 : 1,
  };

  switch (type) {
    case 'primary':
      return {
        ...base,
        background: t.value.color.gradient.brand,
        color: t.value.color.text.inverse,
        boxShadow: t.value.shadow.brand,
      };
    case 'secondary':
      return {
        ...base,
        background: t.value.color.bg.surface,
        color: t.value.color.text.brand,
        border: `2rpx solid ${t.value.color.brand[400]}`,
      };
    case 'ghost':
      return {
        ...base,
        background: 'transparent',
        color: t.value.color.text.brand,
        border: `2rpx solid ${t.value.color.brand[400]}`,
      };
    case 'danger':
      return {
        ...base,
        background: t.value.color.error,
        color: t.value.color.text.inverse,
      };
    default:
      return base;
  }
}
</script>

<template>
  <view class="bar" :style="barStyle">
    <button
      v-if="secondaryLabel"
      class="bar__btn"
      :style="getButtonStyle(secondaryType || 'secondary', !!secondaryDisabled)"
      :disabled="secondaryDisabled || secondaryLoading"
      @click="emit('secondary')"
    >
      <text v-if="secondaryLoading" class="bar__spinner">⟳</text>
      <text>{{ secondaryLabel }}</text>
    </button>
    <button
      class="bar__btn bar__btn--primary"
      :style="getButtonStyle(primaryType || 'primary', !!primaryDisabled)"
      :disabled="primaryDisabled || primaryLoading"
      @click="emit('primary')"
    >
      <text v-if="primaryLoading" class="bar__spinner">⟳</text>
      <text>{{ primaryLabel }}</text>
    </button>
  </view>
</template>

<style lang="scss" scoped>
.bar {
  &__btn {
    border: none;

    &:active:not(:disabled) {
      transform: scale(0.96);
    }

    &--primary:active:not(:disabled) {
      box-shadow: v-bind('t.shadow.md');
    }
  }

  &__spinner {
    display: inline-block;
    margin-right: v-bind('`${t.spacing[2]}rpx`');
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
}
</style>
