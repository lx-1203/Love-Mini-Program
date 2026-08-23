<script setup lang="ts">
defineProps<{
  label: string;
  active?: boolean;
}>();

const emit = defineEmits<{ (e: "tap", label: string): void }>();
</script>

<template>
  <view
    class="interest-tag"
    :class="{ 'interest-tag--active': active }"
    hover-class="interest-tag--pressed"
    @tap="emit('tap', label)"
  >
    <text class="interest-tag__text">{{ label }}</text>
  </view>
</template>

<style scoped lang="scss">
.interest-tag {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: #E8FBF3;
  border: 1rpx solid rgba(32, 201, 151, 0.12);
}

.interest-tag--active {
  background: linear-gradient(135deg, #6BE3B8 0%, #36C99A 100%);
}

.interest-tag--active .interest-tag__text {
  color: #ffffff;
}

.interest-tag--pressed {
  opacity: 0.8;
}

.interest-tag__text {
  font-size: 24rpx;
  color: #333333;
  font-weight: 600;
}
</style>
