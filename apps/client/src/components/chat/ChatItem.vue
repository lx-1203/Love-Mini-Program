<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Avatar from '../common/Avatar.vue';
import UnreadBadge from '../common/UnreadBadge.vue';

const props = defineProps<{
  id?: string;
  avatarUrl?: string;
  initials?: string;
  name?: string;
  lastMessage?: string;
  time?: string;
  unread?: number;
  online?: boolean;
  isOfficial?: boolean;
  isMatch?: boolean;
}>();

const emit = defineEmits<{
  tap: [];
}>();

const { t } = useI18n();

/** ARIA 标签：组合会话名称 + 最后消息 */
const ariaLabel = computed(() =>
  t('chat.chatItemAria', {
    name: props.name || '',
    msg: props.lastMessage || '',
  })
);

// 修复（严格模式 noUnusedLocals）：ariaLabel 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用。
defineExpose({ ariaLabel });
</script>

<template>
  <view
    class="chat-item"
    @tap="emit('tap')"
    role="button"
    :aria-label="ariaLabel"
  >
    <view class="chat-item-avatar">
      <Avatar :src="avatarUrl" :name="initials || name?.charAt(0)" size="sm" :online="online" />
    </view>
    <view class="chat-item-content">
      <view class="chat-item-top">
        <text class="chat-item-name">
          {{ name }}
          <text v-if="isMatch" class="chat-item-match">{{ t('chat.matchBadge') }}</text>
        </text>
        <text class="chat-item-time">{{ time }}</text>
      </view>
      <view class="chat-item-bottom">
        <text class="chat-item-msg">{{ lastMessage }}</text>
        <UnreadBadge v-if="unread && unread > 0" :count="unread" />
      </view>
    </view>
    <view
      v-if="isOfficial"
      class="chat-item-official"
      role="img"
      :aria-label="t('chat.officialBadge')"
    >
      <text class="chat-item-official-text">{{ t('chat.officialBadge') }}</text>
    </view>
  </view>
</template>

<style scoped>
.chat-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  background: var(--c-bg-container);
  border-bottom: 1rpx solid var(--c-border-light);
  transition: background 150ms ease;
}
.chat-item:active { background: var(--c-neutral-50); }

.chat-item-avatar {
  flex-shrink: 0;
}
.chat-item-avatar :deep(.avatar) {
  border-radius: 50%;
}

.chat-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.chat-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chat-item-name {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 12rpx;
}
.chat-item-match {
  font-size: var(--fs-sm);
  color: var(--c-pink-400);
  font-weight: 500;
  flex-shrink: 0;
}
.chat-item-time {
  font-size: var(--fs-sm);
  color: var(--c-text-quaternary);
  flex-shrink: 0;
}
.chat-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chat-item-msg {
  font-size: var(--fs-base);
  color: var(--c-text-quaternary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 16rpx;
}
.chat-item-official {
  flex-shrink: 0;
  padding: 4rpx 16rpx;
  border-radius: var(--r-sm);
  background: var(--c-brand-50);
}
.chat-item-official-text {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-brand);
  font-weight: 600;
}
</style>
