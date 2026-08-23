<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";

defineProps<{
  draft: string;
  disabled?: boolean;
  suggestions?: string[];
}>();

const emit = defineEmits<{
  "update:draft": [value: string];
  send: [];
  toggleEmoji: [];
}>();

const smileSrc = IMAGE_PATHS.MESSAGE_ICONS.SMILE;
function onInput(e: Event & { detail?: { value?: string } }) {
  emit("update:draft", e.detail?.value ?? "");
}
</script>

<template>
  <view class="chat-input">
    <view v-if="suggestions && suggestions.length > 0" class="chat-input__suggestions">
      <view
        v-for="(s, idx) in suggestions.slice(0, 4)"
        :key="idx"
        class="chat-input__suggestion"
        hover-class="chat-input__suggestion--hover"
        @tap="emit('update:draft', s)"
      >
        <text class="chat-input__suggestion-text">{{ s }}</text>
      </view>
    </view>

    <view class="chat-input__bar">
      <view class="chat-input__icon" hover-class="chat-input__icon--hover" @tap="emit('toggleEmoji')">
        <image class="chat-input__icon-img" :src="smileSrc" mode="aspectFit" />
      </view>
      <input
        class="chat-input__field"
        :value="draft"
        :disabled="disabled"
        placeholder="说点什么..."
        @input="onInput"
      />
            <view class="chat-input__send" :class="{ 'chat-input__send--disabled': !draft || disabled }" @tap="emit('send')">
        <text class="chat-input__send-text">发送</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.chat-input {
  background: #FFFFFF;
  border-top: 1rpx solid #EEF2F0;
}
.chat-input__suggestions {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 24rpx 4rpx;
  overflow-x: auto;
}
.chat-input__suggestion {
  flex-shrink: 0;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #E8F8F1;
}
.chat-input__suggestion--hover {
  opacity: 0.8;
}
.chat-input__suggestion-text {
  font-size: 24rpx;
  color: #36C99A;
}
.chat-input__bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
}
.chat-input__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #F0F2F5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chat-input__icon--hover {
  opacity: 0.7;
}
.chat-input__icon-img {
  width: 40rpx;
  height: 40rpx;
}
.chat-input__field {
  flex: 1;
  height: 72rpx;
  border-radius: 18rpx;
  padding: 0 24rpx;
  background: #F0F2F5;
  font-size: 26rpx;
  color: #222222;
}
.chat-input__send {
  height: 72rpx;
  padding: 0 36rpx;
  border-radius: 999rpx;
  background: #36C99A;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chat-input__send--disabled {
  opacity: 0.5;
}
.chat-input__send-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 600;
}
</style>



