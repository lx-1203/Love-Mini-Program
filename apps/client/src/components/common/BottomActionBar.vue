<script setup lang="ts">
defineProps<{
  primaryLabel: string;
  secondaryLabel?: string;
}>();

const emit = defineEmits<{
  primary: [];
  secondary: [];
}>();
</script>

<template>
  <view class="bar">
    <button v-if="secondaryLabel" class="bar__secondary" @click="emit('secondary')">
      {{ secondaryLabel }}
    </button>
    <button class="bar__primary" @click="emit('primary')">{{ primaryLabel }}</button>
  </view>
</template>

<style scoped lang="scss">
.bar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.bar__primary,
.bar__secondary {
  height: 88rpx;
  border: 0;
  border-radius: 18rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.bar__primary {
  background: var(--td-brand-color-7);
  color: #fff;
}

.bar__secondary {
  background: #fff;
  color: var(--td-text-color-primary);
  border: 1px solid var(--td-border-level-1-color);
}
</style>
