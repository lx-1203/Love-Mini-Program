<script setup lang="ts">
/**
 * EmptyState - 统一空状态组件
 *
 * 支持两种使用方式：
 * 1. 预设类型：通过 `type` 选择 'no-data' | 'no-match' | 'no-chat'，自动匹配图标与 i18n 文案
 * 2. 显式传入：通过 `image` / `title` / `description` / `actionText` props 自定义内容
 *
 * 显式传入优先级高于预设类型，便于业务侧灵活覆盖。
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';

const props = withDefaults(defineProps<{
  /** 预设空状态类型 */
  type?: 'no-data' | 'no-match' | 'no-chat' | 'network';
  /** 兼容旧 prop：等价于 title */
  message?: string;
  /** 显式图标 URL（优先级最高） */
  image?: string;
  /** 显式主标题（优先级高于 type/message） */
  title?: string;
  /** 显式副标题/描述 */
  description?: string;
  /** 操作按钮文案（传入即渲染按钮，点击触发 action 事件） */
  actionText?: string;
}>(), {
  type: 'no-data',
  message: '',
  image: '',
  title: '',
  description: '',
  actionText: '',
});

const emit = defineEmits<{
  /** 点击操作按钮时触发 */
  action: [];
}>();

const { t } = useI18n();

/** 预设类型 → 图标映射 */
const presetIconMap: Record<string, string> = {
  'no-data': IMAGE_PATHS.ICONS_COMMON.SEARCH,
  'no-match': IMAGE_PATHS.ICONS_COMMON.CLOSE,
  'no-chat': IMAGE_PATHS.ICONS_COMMON.NOTIFICATION,
  'network': IMAGE_PATHS.ICONS_COMMON.CLOSE,
};

/** 预设类型 → 副标题 i18n key 映射 */
const presetSubMap: Record<string, string> = {
  'no-data': t('empty.noDataSub'),
  'no-match': t('empty.noMatchSub'),
  'no-chat': t('empty.noChatSub'),
  'network': t('empty.networkSub'),
};

const iconSrc = computed(() => props.image || presetIconMap[props.type] || IMAGE_PATHS.ICONS_COMMON.SEARCH);

const titleText = computed(() => {
  if (props.title) return props.title;
  if (props.message) return props.message;
  return t('empty.noData');
});

const descriptionText = computed(() => props.description || presetSubMap[props.type] || t('empty.noDataSub'));

const hasAction = computed(() => !!props.actionText);

function handleAction() {
  emit('action');
}
</script>

<template>
  <view
    class="empty"
    role="status"
    aria-live="polite"
    :aria-label="titleText"
  >
    <image class="empty-icon" :src="iconSrc" mode="aspectFit" alt="" />
    <text class="empty-msg">{{ titleText }}</text>
    <text class="empty-sub">{{ descriptionText }}</text>
    <view
      v-if="hasAction"
      class="empty-action press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      role="button"
      :aria-label="actionText"
      @tap="handleAction"
    >
      <text class="empty-action__text">{{ actionText }}</text>
    </view>
    <slot />
  </view>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}
.empty-icon { width: 120rpx; height: 120rpx; margin-bottom: 16rpx; }
.empty-msg {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-secondary);
}
.empty-sub {
  font-size: var(--fs-base);
  color: var(--c-text-quaternary);
  margin-top: 8rpx;
  text-align: center;
}
.empty-action {
  margin-top: 24rpx;
  padding: 16rpx 40rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand);
}
.empty-action__text {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-text-inverse, #FFFFFF);
}
</style>
