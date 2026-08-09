<script setup lang="ts">
/**
 * MatchGreetingTip - 匹配成功破冰固定提示（2026-08-09 微信 1:1 重构）
 *
 * 聊天记录第一条固定展示：居中系统提示文案 + 2 个快捷破冰按钮。
 * 与普通 system 消息区分：附带可点击的直发按钮，点击立即以我方身份发出。
 * 展示条件由父页面控制（会话无任何用户消息时）。
 */
import { useI18n } from "vue-i18n";

defineProps<{
  /** 快捷按钮文案（最多取 2 条；为空时父页面回退固定文案） */
  buttons: string[];
}>();

const emit = defineEmits<{
  /** 点击某个破冰按钮，传出文案（父页面直接发送） */
  send: [text: string];
}>();

const { t } = useI18n();
</script>

<template>
  <view class="match-greeting" role="status" :aria-label="t('chat.matchGreeting.aria')">
    <!-- 居中系统提示（与 bubble--system 视觉一致：无气泡、浅灰背景、12px 灰字） -->
    <view class="match-greeting__tip">
      <text class="match-greeting__text">{{ t("chat.matchGreeting.text") }}</text>
    </view>

    <!-- 快捷破冰按钮：品牌绿描边胶囊，点击直接发送 -->
    <view class="match-greeting__actions" role="list">
      <view
        v-for="(text, idx) in buttons"
        :key="idx"
        class="match-greeting__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="emit('send', text)"
        role="button"
        :aria-label="t('chat.matchGreeting.sendAria', { text })"
      >
        <text class="match-greeting__btn-text">{{ text }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.match-greeting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-5);
  /* 与消息流上下间距一致，无对应 token 档位 */
  padding: 24rpx var(--sp-6) 16rpx;
}

/* 居中系统提示：浅灰底 + 12px(24rpx) 灰字，与 system 消息视觉一致 */
.match-greeting__tip {
  display: inline-flex;
  align-items: center;
  padding: 6rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-neutral-100, rgba(0, 0, 0, 0.05));
  max-width: 84%;
}

.match-greeting__text {
  font-size: 24rpx;
  color: var(--c-text-tertiary);
  text-align: center;
  line-height: 1.5;
}

/* 快捷按钮：品牌绿描边胶囊 */
.match-greeting__actions {
  display: flex;
  gap: var(--sp-4);
  flex-wrap: wrap;
  justify-content: center;
}

.match-greeting__btn {
  display: inline-flex;
  align-items: center;
  /* 12rpx 无对应 token 档位，保留 */
  padding: 12rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  border: 2rpx solid var(--c-brand);
  background: var(--c-brand-50, rgba(63, 207, 142, 0.08));
}

.match-greeting__btn-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-brand);
  font-weight: 600;
}
</style>
