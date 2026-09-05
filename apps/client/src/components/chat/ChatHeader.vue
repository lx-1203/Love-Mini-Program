<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";

const props = withDefaults(
  defineProps<{
    avatar?: string;
    nickname: string;
    online?: boolean;
    relationDays?: number;
  }>(),
  { avatar: "", online: false, relationDays: 1 }
);

const emit = defineEmits<{
  back: [];
  more: [];
  "avatar-tap": [];
  "avatar-pat": [];
}>();

/** 2026-08-23：头像单击/双击检测（双击=拍一拍，单击=弹出菜单） */
let avatarTapTimer: ReturnType<typeof setTimeout> | null = null;
let lastAvatarTap = 0;
function onAvatarTap() {
  const now = Date.now();
  if (now - lastAvatarTap < 300) {
    if (avatarTapTimer) { clearTimeout(avatarTapTimer); avatarTapTimer = null; }
    lastAvatarTap = 0;
    emit("avatar-pat");
    return;
  }
  lastAvatarTap = now;
  if (avatarTapTimer) clearTimeout(avatarTapTimer);
  avatarTapTimer = setTimeout(() => {
    avatarTapTimer = null;
    emit("avatar-tap");
  }, 300);
}

const ringSrc = IMAGE_PATHS.MESSAGE_ICONS.AVATAR_RING;
const onlineSrc = IMAGE_PATHS.MESSAGE_ICONS.ONLINE;
const heartSrc = IMAGE_PATHS.MESSAGE_ICONS.HEART;
</script>

<template>
  <view class="chat-header" role="banner">
    <view class="chat-header__back" hover-class="chat-header__hover" @tap="emit('back')">
      <text class="chat-header__back-text">‹</text>
    </view>
    <view class="chat-header__avatar-wrap" @tap="onAvatarTap">
      <image v-if="props.avatar" class="chat-header__avatar" :src="resolveMediaUrl(props.avatar)" mode="aspectFill" />
      <view v-else class="chat-header__avatar chat-header__avatar--fallback">
        <text class="chat-header__avatar-text">{{ (nickname || "?").charAt(0) }}</text>
      </view>
      <image class="chat-header__ring" :src="ringSrc" mode="aspectFit" />
      <image v-if="online" class="chat-header__online" :src="onlineSrc" mode="aspectFit" />
    </view>
    <view class="chat-header__title-wrap">
      <view class="chat-header__title-row">
        <text class="chat-header__title">{{ nickname }}</text>
        <image class="chat-header__heart" :src="heartSrc" mode="aspectFit" />
        <text class="chat-header__days">认识 {{ relationDays }} 天</text>
      </view>
      <text class="chat-header__status">{{ online ? "在线" : "离线" }}</text>
    </view>
    <view class="chat-header__more" hover-class="chat-header__hover" @tap="emit('more')">
      <text class="chat-header__more-text">···</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.chat-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  padding-top: calc(env(safe-area-inset-top) + 20rpx);
  /* 2026-08-26：背景统一为页面底（--c-bg-page #EEF7F2），
     避免顶部纯白与下方内容浅灰绿拼接成"上下背景不一致" */
  background: var(--c-bg-page, #EEF7F2);
  border-bottom: 1rpx solid #EEF2F0;
}
.chat-header__back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chat-header__back-text {
  font-size: 56rpx;
  color: #36C99A;
}
.chat-header__avatar-wrap {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
}
.chat-header__avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
}
.chat-header__avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F8F1;
}
.chat-header__avatar-text {
  font-size: 32rpx;
  color: #36C99A;
  font-weight: 700;
}
.chat-header__ring {
  pointer-events: none;
  position: absolute;
  left: 0;
  top: 0;
  width: 80rpx;
  height: 80rpx;
}
.chat-header__online {
  pointer-events: none;
  position: absolute;
  right: -4rpx;
  bottom: -4rpx;
  width: 24rpx;
  height: 24rpx;
}
.chat-header__title-wrap {
  flex: 1;
  min-width: 0;
}
.chat-header__title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.chat-header__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #222222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-header__heart {
  width: 28rpx;
  height: 28rpx;
}
.chat-header__days {
  font-size: 22rpx;
  color: #FF6B81;
}
.chat-header__status {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #999999;
}
.chat-header__more {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chat-header__more-text {
  font-size: 40rpx;
  color: #666666;
}
.chat-header__hover {
  opacity: 0.7;
}
</style>

