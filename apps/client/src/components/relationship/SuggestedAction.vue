<script setup lang="ts">
import type { SuggestedActionView } from "../../services/generated/api-types-supplement";

defineProps<{
  action: SuggestedActionView;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  tap: [];
}>();
</script>

<template>
  <view
    class="suggested-action"
    :class="{ 'suggested-action--disabled': disabled }"
    hover-class="suggested-action--hover"
    hover-stay-time="120"
    role="button"
    @tap="emit('tap')"
  >
    <text class="suggested-action__text">{{ action.text }}</text>
    <text class="suggested-action__arrow">›</text>
  </view>
</template>

<style scoped lang="scss">
.suggested-action {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #36C99A;
  color: #FFFFFF;
}
.suggested-action--disabled {
  opacity: 0.6;
}
.suggested-action--hover {
  opacity: 0.85;
}
.suggested-action__text {
  font-size: 24rpx;
  font-weight: 600;
}
.suggested-action__arrow {
  font-size: 28rpx;
  font-weight: 600;
}
</style>
