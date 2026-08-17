<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  description?: string;
  actionText?: string;
}>(), {
  description: "",
  actionText: "",
});

const emit = defineEmits<{ (e: "action"): void }>();
</script>

<template>
  <view class="profile-empty">
    <text class="profile-empty__icon">🌿</text>
    <text class="profile-empty__title">{{ title }}</text>
    <text v-if="description" class="profile-empty__desc">{{ description }}</text>
    <view v-if="actionText" class="profile-empty__action" hover-class="profile-empty__action--pressed" @tap="emit('action')">
      <text class="profile-empty__action-text">{{ actionText }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.profile-empty {
  margin: 24rpx;
  padding: 48rpx 32rpx;
  border-radius: 40rpx;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.profile-empty__icon {
  font-size: 64rpx;
}

.profile-empty__title {
  font-size: 30rpx;
  font-weight: 700;
  color: #222222;
}

.profile-empty__desc {
  font-size: 24rpx;
  color: #777777;
  text-align: center;
}

.profile-empty__action {
  margin-top: 12rpx;
  padding: 14rpx 32rpx;
  border-radius: 999rpx;
  background: #DFF8EF;
}

.profile-empty__action--pressed {
  opacity: 0.8;
}

.profile-empty__action-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #36C99A;
}
</style>
