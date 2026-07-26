<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Avatar from '../common/Avatar.vue';

const props = defineProps<{
  id?: string;
  name?: string;
  initials?: string;
  avatarUrl?: string;
  headline?: string;
  isSameSchool?: boolean;
  isSameMajor?: boolean;
  commonCircleCount?: number;
  actionText?: string;
}>();

const emit = defineEmits<{
  tap: [];
}>();

const { t } = useI18n();

/** 操作按钮文案 */
const actionLabel = computed(() => props.actionText || t('home.personActionChat'));

/** ARIA 标签 */
const ariaLabel = computed(() =>
  t('home.personCardAria', {
    name: props.name || '',
    headline: props.headline || '',
  })
);

// 修复（严格模式 noUnusedLocals）：ariaLabel 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用。
defineExpose({ ariaLabel });
</script>

<template>
  <view
    class="person-card"
    @tap="emit('tap')"
    role="button"
    :aria-label="ariaLabel"
  >
    <view class="person-avatar" :class="{ 'person-avatar--halo': isSameSchool }">
      <Avatar :name="initials || name?.charAt(0)" :src="avatarUrl" size="md" />
    </view>
    <view class="person-info">
      <text class="person-name">{{ name }}</text>
      <text class="person-headline" v-if="headline">{{ headline }}</text>
      <view class="person-tags">
        <text v-if="isSameSchool" class="person-tag person-tag--school">{{ t('home.personSameSchool') }}</text>
        <text v-if="isSameMajor" class="person-tag person-tag--major">{{ t('home.personSameMajor') }}</text>
        <text v-if="commonCircleCount && commonCircleCount > 0" class="person-tag person-tag--circle">
          {{ t('home.personCommonCircle', { n: commonCircleCount }) }}
        </text>
      </view>
    </view>
    <view class="person-action">
      <text class="person-action-text">{{ actionLabel }}</text>
    </view>
  </view>
</template>

<style scoped>
.person-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  box-shadow: var(--c-elevation-1);
  border: var(--c-border-card);
  cursor: pointer;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.person-card:active {
  transform: translateY(-2rpx);
  box-shadow: var(--c-elevation-2);
  border: var(--c-border-card-brand);
}

.person-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.person-avatar--halo {
  box-shadow: 0 0 0 4rpx var(--c-secondary-blue-border-tint, rgba(91, 127, 255, 0.2)), 0 0 16rpx var(--c-secondary-blue-bg-tint-light, rgba(91, 127, 255, 0.15));
}

.person-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.person-name {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.person-headline {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.person-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  margin-top: 6rpx;
}
.person-tag {
  padding: 2rpx 12rpx;
  border-radius: var(--r-sm);
  font-size: 20rpx;
  font-weight: 500;
}
.person-tag--school {
  background: var(--c-brand-50);
  color: var(--c-brand);
}
.person-tag--major {
  background: var(--c-apricot-50);
  color: var(--c-accent-400);
}
.person-tag--circle {
  background: var(--c-neutral-100);
  color: var(--c-text-tertiary);
}

.person-action {
  padding: 12rpx 24rpx;
  border-radius: 9999rpx;
  background: var(--c-brand-400);
  flex-shrink: 0;
}
.person-action:active { background: var(--c-brand); }
.person-action-text {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text-inverse, #FFFFFF);
}
</style>
