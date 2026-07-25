<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = withDefaults(defineProps<{
  title?: string;
  more?: boolean;
  moreText?: string;
}>(), {
  more: false,
  moreText: '',
});

const emit = defineEmits<{
  more: [];
}>();

const { t } = useI18n();

const moreTextLabel = computed(() => props.moreText || t('common.viewAll'));
</script>

<template>
  <view
    class="section-header"
    <!-- #ifdef H5 -->
    role="heading"
    aria-level="2"
    :aria-label="title"
    <!-- #endif -->
  >
    <text class="section-title">{{ title }}</text>
    <view
      v-if="more"
      class="section-more"
      @tap="emit('more')"
      <!-- #ifdef H5 -->
      role="button"
      :aria-label="moreTextLabel"
      <!-- #endif -->
    >
      <text class="section-more-text">{{ moreTextLabel }} ›</text>
    </view>
    <slot name="right" />
  </view>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 0 20rpx;
}
.section-title {
  font-size: var(--fs-3xl);
  font-weight: 600;
  color: var(--c-text-primary);
  letter-spacing: -0.02em;
}
.section-more-text {
  font-size: var(--fs-base);
  color: var(--c-text-quaternary);
}
</style>
