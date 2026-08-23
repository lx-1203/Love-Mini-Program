<script setup lang="ts">
const props = defineProps<{
  verified: boolean;
  student: boolean;
}>();

const label = props.verified ? (props.student ? "学生认证" : "已认证") : "未认证";
</script>

<template>
  <view class="verified-badge" :class="{ 'verified-badge--off': !verified }">
    <text class="verified-badge__text">{{ label }}</text>
  </view>
</template>

<style scoped lang="scss">
.verified-badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
  border: 1rpx solid #36C99A;
}

.verified-badge--off {
  opacity: 0.6;
  border-color: #9AA39F;
}

.verified-badge__text {
  font-size: 20rpx;
  font-weight: 600;
  color: #36C99A;
}

.verified-badge--off .verified-badge__text {
  color: #9AA39F;
}
</style>



