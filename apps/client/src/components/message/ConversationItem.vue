<script setup lang="ts">
import { computed, ref } from "vue";
import type { MessageSession } from "../../stores/messages";
import RelationshipTag from "../relationship/RelationshipTag.vue";
import UnreadBadge from "../common/UnreadBadge.vue";
import { resolveMediaUrl } from "../../utils/media";
import { IMAGE_PATHS } from "../../config/images";

const props = defineProps<{
  session: MessageSession;
}>();

const emit = defineEmits<{
  tap: [session: MessageSession];
  longpress: [session: MessageSession];
  mute: [session: MessageSession];
  delete: [session: MessageSession];
}>();

const avatarLoadError = ref(false);
const partnerAvatar = computed(() => {
  avatarLoadError.value = false;
  return resolveMediaUrl(props.session.partnerAvatar);
});
const hasRelationship = computed(() => props.session.relationship != null && !props.session.isOfficial);
const fallbackInitial = computed(() => (props.session.partnerName || "?").charAt(0));

function onAvatarError() {
  avatarLoadError.value = true;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  if (date.toDateString() === now.toDateString()) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const yesterday = new Date(now.getTime() - 86400000);
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
</script>

<template>
  <view class="conversation-item" hover-class="conversation-item--hover" @tap="emit('tap', session)" @longpress="emit('longpress', session)">
    <view class="conversation-item__avatar-wrap">
      <view v-if="session.isOfficial" class="conversation-item__official">
        <image class="conversation-item__official-text" :src="IMAGE_PATHS.ICONS_EMOJI.SPROUT" mode="aspectFit" alt="" />
      </view>
      <image
        v-else-if="partnerAvatar && !avatarLoadError"
        class="conversation-item__avatar"
        :src="partnerAvatar"
        mode="aspectFill"
        @error="onAvatarError"
      />
      <view v-else class="conversation-item__fallback">
        <text class="conversation-item__fallback-text">{{ fallbackInitial }}</text>
      </view>
    </view>

    <view class="conversation-item__content">
      <view class="conversation-item__top">
        <text class="conversation-item__name">{{ session.partnerName }}</text>
        <RelationshipTag v-if="hasRelationship" :status="session.relationship!.status" size="sm" />
      </view>
      <text class="conversation-item__preview">{{ session.lastMessagePreview || "暂无消息预览" }}</text>
    </view>

    <view class="conversation-item__right">
      <text class="conversation-item__time">{{ formatTime(session.lastMessageSentAt) }}</text>
      <UnreadBadge v-if="session.unreadCount > 0" :count="session.unreadCount" tone="love" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.conversation-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 0 32rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F1F1F1;
}
.conversation-item--hover {
  background: #EEF7F2;
}
.conversation-item__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.conversation-item__avatar,
.conversation-item__fallback,
.conversation-item__official {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
}
.conversation-item__avatar {
  border-radius: var(--r-full);

  background: #F0F2F5;
}
.conversation-item__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F8F1;
}
.conversation-item__fallback-text {
  font-size: 32rpx;
  color: #36C99A;
  font-weight: 700;
}
.conversation-item__official {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F8F1;
}
.conversation-item__official-text {
  width: 44rpx;
  height: 44rpx;
  color: #36C99A;
}
.conversation-item__content {
  flex: 1;
  min-width: 0;
}
.conversation-item__top {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.conversation-item__name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333A37;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conversation-item__preview {
  display: block;
  margin-top: 4rpx;
  font-size: 26rpx;
  color: #555555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conversation-item__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  flex-shrink: 0;
}
.conversation-item__time {
  font-size: 24rpx;
  color: #9AA39F;
}
</style>
