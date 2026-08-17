<script setup lang="ts">
import { computed } from "vue";
import { PROFILE_ASSET } from "../../../config/profile-assets";

const props = withDefaults(defineProps<{
  liked?: boolean;
  matched?: boolean;
  chatted?: boolean;
  blocked?: boolean;
  loading?: boolean;
}>(), {
  liked: false,
  matched: false,
  chatted: false,
  blocked: false,
  loading: false,
});

const chatLabel = computed(() => {
  if (props.blocked) return "已拉黑";
  if (props.chatted) return "继续聊天";
  if (props.matched) return "发消息";
  if (props.liked) return "等待回应";
  return "打招呼";
});

const emit = defineEmits<{
  (e: "like"): void;
  (e: "message"): void;
  (e: "whisper"): void;
}>();
</script>

<template>
  <view class="public-action">
    <image class="public-action__skin" :src="PROFILE_ASSET.action" mode="aspectFill" alt="" />
    <view class="public-action__content">
      <view class="public-action__btn public-action__btn--crush" @tap="emit('whisper')">
        <text class="public-action__text">送心动卡</text>
      </view>
      <view class="public-action__btn public-action__btn--chat" @tap="emit('message')">
        <text class="public-action__text">{{ chatLabel }}</text>
      </view>
      <view
        class="public-action__btn public-action__btn--like"
        :class="{ 'public-action__btn--disabled': liked || loading }"
        @tap="emit('like')"
      >
        <text class="public-action__text">{{ blocked ? "已拉黑" : liked ? "等待回应" : "喜欢" }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.public-action {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 144rpx;
  z-index: 20;
}

.public-action__skin {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.public-action__content {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 24rpx;
}

.public-action__btn {
  flex: 1;
  height: 80rpx;
  margin: 0 10rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.public-action__btn--crush {
  background: #FFE4EC;
}

.public-action__btn--crush .public-action__text {
  color: #FF6B91;
}

.public-action__btn--chat {
  background: linear-gradient(135deg, #6BE3B8 0%, #36C99A 100%);
}

.public-action__btn--like {
  background: linear-gradient(135deg, #FF9DB5 0%, #FF6B91 100%);
}

.public-action__btn--disabled {
  opacity: 0.55;
}

.public-action__text {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>


