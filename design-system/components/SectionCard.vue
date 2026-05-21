<!-- ============================================================
  SectionCard - 区块卡片组件
  变更点：
  1. 从 tokens 读取全部样式
  2. 增加变体：default / ghost / gradient / interactive
  3. 增加 header 右侧插槽
  4. 增加点击动效与 hover 态
============================================================ -->
<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../tokens';

const props = defineProps<{
  title?: string;
  subtitle?: string;
  compact?: boolean;
  variant?: 'default' | 'ghost' | 'gradient' | 'interactive';
  clickable?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const t = computed(() => designTokens);

const cardStyle = computed(() => {
  const base = {
    borderRadius: `${t.value.component.card.radius}rpx`,
    padding: props.compact ? `${t.value.spacing[3]}rpx` : `${t.value.component.card.padding}rpx`,
    marginBottom: `${t.value.spacing[4]}rpx`,
    transition: `all ${t.value.motion.duration.fast}ms ${t.value.motion.easing.default}`,
  };

  switch (props.variant) {
    case 'ghost':
      return {
        ...base,
        background: 'transparent',
        border: `1rpx solid ${t.value.color.border.light}`,
      };
    case 'gradient':
      return {
        ...base,
        background: t.value.color.gradient.brand,
        color: t.value.color.text.inverse,
        boxShadow: t.value.shadow.brand,
      };
    case 'interactive':
      return {
        ...base,
        background: t.value.color.bg.container,
        boxShadow: t.value.shadow.sm,
        opacity: props.disabled ? 0.5 : 1,
      };
    default:
      return {
        ...base,
        background: t.value.color.bg.container,
        boxShadow: t.value.shadow.xs,
      };
  }
});

const titleStyle = computed(() => ({
  fontSize: `${t.value.typography.size.h3}rpx`,
  fontWeight: t.value.typography.weight.semibold,
  color: props.variant === 'gradient' ? t.value.color.text.inverse : t.value.color.text.primary,
  lineHeight: t.value.typography.lineHeight.tight,
}));

const subtitleStyle = computed(() => ({
  fontSize: `${t.value.typography.size.caption}rpx`,
  color: props.variant === 'gradient' ? 'rgba(255,255,255,0.8)' : t.value.color.text.secondary,
  marginTop: `${t.value.spacing[1]}rpx`,
}));

function handleClick() {
  if (props.clickable && !props.disabled) {
    emit('click');
  }
}
</script>

<template>
  <view
    class="card"
    :class="{
      'card--compact': compact,
      'card--clickable': clickable && !disabled,
      'card--disabled': disabled,
    }"
    :style="cardStyle"
    @click="handleClick"
  >
    <view v-if="title || subtitle || $slots['header-right']" class="card__header">
      <view>
        <text v-if="title" class="card__title" :style="titleStyle">{{ title }}</text>
        <text v-if="subtitle" class="card__subtitle" :style="subtitleStyle">{{ subtitle }}</text>
      </view>
      <slot name="header-right" />
    </view>
    <view class="card__body">
      <slot />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.card {
  &--clickable:active {
    transform: scale(0.98);
    box-shadow: v-bind('t.shadow.md');
  }

  &--disabled {
    pointer-events: none;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: v-bind('`${t.spacing[3]}rpx`');
  }

  &__body {
    // 内容区由 slot 填充
  }
}
</style>
