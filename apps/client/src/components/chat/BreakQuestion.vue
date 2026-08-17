<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { BreakQuestionItem } from "../../types/chat";

const props = withDefaults(
  defineProps<{
    items: BreakQuestionItem[];
    loading?: boolean;
  }>(),
  { items: () => [], loading: false }
);

const emit = defineEmits<{
  (e: "send", text: string): void;
}>();

const { t } = useI18n();

const interestTexts = computed(() =>
  props.items.map((item) => item.text).filter((text) => text.length > 0).slice(0, 3)
);

const opener = computed(() => props.items[0]?.actionText ?? "");
</script>

<template>
  <view v-if="loading || items.length > 0" class="break-question">
    <view class="break-question__interests">
      <text class="break-question__lead">{{ t('chat.breakQuestion.commonInterests') }}</text>
      <view class="break-question__chips">
        <text
          v-for="text in interestTexts"
          :key="text"
          class="break-question__chip"
        >{{ text }}</text>
      </view>
    </view>

    <view
      v-if="opener"
      class="break-question__opener press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      role="button"
      :aria-label="opener"
      @tap="emit('send', opener)"
    >
      <text class="break-question__opener-label">{{ t('chat.breakQuestion.recommendedOpener') }}</text>
      <text class="break-question__opener-text">{{ opener }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.break-question {
  padding: 20rpx 24rpx;
  border-top: 1px solid #eaf3ef;
  background: #f8fffc;
}

.break-question__interests {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.break-question__lead {
  font-size: 24rpx;
  color: #5f6f6b;
  font-weight: 700;
}

.break-question__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.break-question__chip {
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #eaf9f2;
  color: #22a976;
  font-size: 22rpx;
  font-weight: 700;
}

.break-question__opener {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 16rpx 20rpx;
  border-radius: 20rpx;
  background: #fff0f6;
  border: 2rpx solid #ffd2e3;
}

.break-question__opener-label {
  font-size: 22rpx;
  color: #e94d87;
  font-weight: 700;
}

.break-question__opener-text {
  font-size: 26rpx;
  color: #222222;
  line-height: 1.5;
}
</style>