<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  tap: [];
}>();

const { t } = useI18n();
</script>

<template>
  <view
    class="phone-btn"
    :class="{ 'phone-btn--loading': loading }"
    @tap="emit('tap')"
    role="button"
    :aria-label="t('login.phoneLogin')"
    :aria-disabled="loading"
    :aria-busy="loading"
  >
    <text class="phone-btn-text">{{ t('login.phoneLogin') }}</text>
  </view>
</template>

<style scoped>
.phone-btn {
  width: 100%;
  height: 96rpx;
  border-radius: var(--r-full, 9999rpx);
  background: transparent;
  border: 2rpx solid rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}
.phone-btn:active { transform: scale(0.98); }
/* #ifdef H5 */
.phone-btn:hover {
  border-color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.1);
}
/* #endif */
.phone-btn--loading { opacity: 0.7; pointer-events: none; }
.phone-btn-text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: rgba(255,255,255,0.8);
}
</style>
