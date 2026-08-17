<script setup lang="ts">
/**
 * WhisperComposeSheet — 悄悄话（付费留言）弹层（v3.1 契约 §9）
 * ≤60 字 · 200 交友币（= 200 分，服务端定价）· 幂等 clientRequestId · 文案「已送达，优先展示给 TA」
 */
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../services/api";
import { useCoinsStore } from "../../stores/coins";
import { showErrorToast } from "../../utils/error-toast";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    userId: number | string;
    userName?: string;
  }>(),
  { userName: "" }
);

const emit = defineEmits<{ (e: "close"): void; (e: "sent"): void }>();

const { t } = useI18n();
const coinsStore = useCoinsStore();

const content = ref("");
const sending = ref(false);

watch(
  () => props.visible,
  (v) => {
    if (v) {
      content.value = "";
      sending.value = false;
      void coinsStore.fetchBalance(false).catch(() => {});
    }
  }
);

async function handleSend() {
  const text = content.value.trim();
  if (!text) {
    uni.showToast({ title: t("whisper.required"), icon: "none" });
    return;
  }
  if (text.length > 60) {
    uni.showToast({ title: t("whisper.tooLong"), icon: "none" });
    return;
  }
  sending.value = true;
  try {
    const clientRequestId = `whisper-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await clientApi.sendWhisper({
      receiverId: Number(props.userId),
      content: text,
      clientRequestId,
    });
    uni.showToast({ title: t("whisper.sent"), icon: "success" });
    emit("sent");
    emit("close");
  } catch (error) {
    showErrorToast(error, t("whisper.sendFailed"));
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <view v-if="visible" class="whisper-mask" @tap="emit('close')">
    <view class="whisper-sheet" @tap.stop>
      <view class="whisper-sheet__head">
        <text class="whisper-sheet__title">{{ t('whisper.title') }}</text>
        <view class="whisper-sheet__close press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.closeAria')" @tap="emit('close')">
          <text class="whisper-sheet__close-text">×</text>
        </view>
      </view>

      <text class="whisper-sheet__sub">
        {{ t('whisper.toUser', { name: userName || t('whisper.defaultName') }) }}
      </text>

      <textarea
        class="whisper-sheet__input"
        :value="content"
        :maxlength="60"
        :placeholder="t('whisper.placeholder')"
        @input="content = ($event as any).detail.value"
      />

      <view class="whisper-sheet__meta">
        <text class="whisper-sheet__meta-text">{{ t('whisper.price') }}</text>
        <text class="whisper-sheet__meta-text">{{ t('whisper.balance', { n: coinsStore.balanceCents }) }}</text>
      </view>

      <view class="whisper-sheet__send press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('whisper.send')" @tap="handleSend">
        <text class="whisper-sheet__send-text">{{ sending ? t('common.loading') : t('whisper.send') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.whisper-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.whisper-sheet {
  width: 100%;
  background: var(--c-bg-container, #ffffff);
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx calc(env(safe-area-inset-bottom) + 32rpx);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.whisper-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.whisper-sheet__title {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.whisper-sheet__close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: var(--c-neutral-100, #F0F2F5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.whisper-sheet__close-text {
  font-size: 36rpx;
  color: var(--c-text-secondary, #666666);
}

.whisper-sheet__sub {
  font-size: 24rpx;
  color: var(--c-text-secondary, #666666);
}

.whisper-sheet__input {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: var(--c-bg-page, #F7FAF9);
  border: 1rpx solid var(--c-line, #ECEFF2);
  font-size: 26rpx;
  color: var(--c-text-primary, #222222);
}

.whisper-sheet__meta {
  display: flex;
  justify-content: space-between;
}

.whisper-sheet__meta-text {
  font-size: 22rpx;
  color: var(--c-text-tertiary, #666666);
}

.whisper-sheet__send {
  padding: 22rpx 0;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #6FA1FF 0%, #4D8DFF 100%);
  text-align: center;
}

.whisper-sheet__send-text {
  font-size: 30rpx;
  font-weight: 800;
  color: #ffffff;
}
</style>
