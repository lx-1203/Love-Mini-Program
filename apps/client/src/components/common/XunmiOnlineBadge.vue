<script setup lang="ts">
/**
 * XunmiOnlineBadge — 在线徽章组件
 * 用于头像右下角的在线状态点
 */
withDefaults(defineProps<{
  online?: boolean;
  size?: number;
}>(), {
  online: true,
  size: 20,
});
</script>

<template>
  <view
    v-if="online"
    class="online-badge"
    :style="{
      width: size + 'rpx',
      height: size + 'rpx',
    }"
  />
</template>

<style scoped lang="scss">
.online-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  background: #36C99A;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  z-index: 5;
}
</style>
