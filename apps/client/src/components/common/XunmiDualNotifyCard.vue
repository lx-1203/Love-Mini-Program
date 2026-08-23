<script setup lang="ts">
/**
 * XunmiDualNotifyCard — 双通知卡片组件
 * 用于消息页顶部"有人喜欢你"+"正在等待回复"双卡布局
 */
defineProps<{
  likeCount?: number;
  chatCount?: number;
}>();

const emit = defineEmits<{
  (e: 'viewLikes'): void;
  (e: 'viewChats'): void;
}>();
</script>

<template>
  <view class="dual-notify">
    <view class="dual-notify__card dual-notify__card--green" hover-class="dual-notify__card--pressed" @tap="emit('viewLikes')">
      <text class="dual-notify__icon">&#9829;</text>
      <view class="dual-notify__content">
        <text class="dual-notify__title dual-notify__title--green">有人喜欢你</text>
        <text class="dual-notify__sub">{{ likeCount || 3 }}个人想认识你</text>
      </view>
      <text class="dual-notify__action dual-notify__action--green">去看看 &gt;</text>
    </view>

    <view class="dual-notify__card dual-notify__card--pink" hover-class="dual-notify__card--pressed" @tap="emit('viewChats')">
      <text class="dual-notify__icon">&#9993;</text>
      <view class="dual-notify__content">
        <text class="dual-notify__title dual-notify__title--pink">正在等待回复</text>
        <text class="dual-notify__sub">{{ chatCount || 2 }}个聊天正在继续</text>
      </view>
      <text class="dual-notify__action dual-notify__action--pink">去回复 &gt;</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.dual-notify {
  display: flex;
  gap: 24rpx;
}

.dual-notify__card {
  flex: 1;
  padding: 24rpx;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.dual-notify__card--green {
  background: linear-gradient(135deg, #E8FAF3, #D1F5E7);
}

.dual-notify__card--pink {
  background: linear-gradient(135deg, #FFECEF, #FFD9DF);
}

.dual-notify__card--pressed {
  opacity: 0.85;
  transform: scale(0.98);
}

.dual-notify__icon {
  font-size: 48rpx;
}

.dual-notify__content {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.dual-notify__title {
  font-size: 28rpx;
  font-weight: 600;
}

.dual-notify__title--green { color: #1F8D6A; }
.dual-notify__title--pink { color: #CC4A5F; }

.dual-notify__sub {
  font-size: 24rpx;
  color: #6B7571;
}

.dual-notify__action {
  font-size: 24rpx;
  font-weight: 500;
  align-self: flex-end;
}

.dual-notify__action--green { color: #36C99A; }
.dual-notify__action--pink { color: #FF6B81; }
</style>
