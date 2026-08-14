<script setup lang="ts">
/**
 * B3 恋爱小纸条 · 悄悄话解锁底部弹层（2026-08-13）
 *
 * 三态状态机（内部维护）：
 * - paywall：信纸渐变卡片（锁图标）+ 标题 + 费用提示 + 余额 + [解锁查看]/[暂不]
 * - unlocking：解锁中（父组件执行扣费/解锁请求期间展示 spinner）
 * - result：悄悄话文案（引用样式）+ [去和TA聊天]/[关闭]
 *
 * 解锁逻辑由父组件执行（mock 走 coinsStore.spend 本地扣费；
 * real 走 POST /recommendations/{userId}/whisper/unlock 后端幂等扣费），
 * 成功后调用本组件 expose 的 showResult(whisperText) 进入结果态（并 emit unlocked），
 * 失败调用 resetToPaywall() 回到付费墙（错误提示由父组件 toast/modal 承载）。
 *
 * 入场/出场动画：遮罩复用全局 overlay-fade-in/out keyframes，
 * 面板使用本组件自定义 whisper-sheet-slide-up/down 上下滑
 * （与 QuickFilterSheet 同款 closing ref + 200ms 定时器模式，卸载时清理）。
 */
import { ref, computed, watch, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import { UNLOCK_COST_YUAN } from "../../stores/coins";

/** 弹层阶段：付费墙 → 解锁中 → 结果 */
type WhisperPhase = "paywall" | "unlocking" | "result";

const props = defineProps<{
  visible: boolean;
  /** 对方昵称（信纸卡片展示） */
  userName: string;
  /** 当前用户交友币余额（分，null 表示未知——不做余额拦截，由父组件/后端校验） */
  balanceCents: number | null;
}>();

const emit = defineEmits<{
  /** 请求关闭（遮罩点击 / 暂不 / 关闭） */
  (e: "close"): void;
  /** 点击「去和TA聊天」（父组件关闭弹层并进入会话） */
  (e: "chat"): void;
  /** 点击「解锁查看」（父组件执行扣费/解锁，成功后调用 showResult） */
  (e: "unlock"): void;
  /** 解锁成功进入结果态（携带悄悄话文案） */
  (e: "unlocked", whisperText: string): void;
}>();

const { t } = useI18n();

/** 当前阶段 */
const phase = ref<WhisperPhase>("paywall");
/** 解锁成功后的悄悄话文案（结果态展示） */
const whisperText = ref("");
/** 关闭动画进行中标志（2026-08-13：先播放下滑出场 200ms 再通知父组件卸载） */
const closing = ref(false);
/** 关闭动画定时器引用（卸载时清理） */
let closeTimer: ReturnType<typeof setTimeout> | null = null;

/** 悄悄话解锁单价（分，定价镜像表与服务端 app.unlock-price.whisper 对齐） */
const WHISPER_COST_CENTS = Math.round(UNLOCK_COST_YUAN.WHISPER * 100);

/** 余额是否足够（null 视为未知：不拦截，由解锁请求兜底校验） */
const hasEnoughBalance = computed<boolean>(
  () => props.balanceCents === null || props.balanceCents >= WHISPER_COST_CENTS
);

/** 每次打开重置到付费墙（结果态仅由解锁成功后 showResult 驱动） */
watch(
  () => props.visible,
  (val) => {
    if (!val) {
      closing.value = false;
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      return;
    }
    phase.value = "paywall";
    whisperText.value = "";
  }
);

/** 卸载时清理关闭动画定时器，避免组件销毁后定时器仍触发 emit */
onUnmounted(() => {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
});

/** 请求关闭：先播放下滑出场动画（200ms）再通知父组件卸载 */
function requestClose(): void {
  if (closing.value) return;
  closing.value = true;
  closeTimer = setTimeout(() => {
    closeTimer = null;
    closing.value = false;
    emit("close");
  }, 200);
}

/** 点击「解锁查看」：进入解锁中，通知父组件执行扣费/解锁（防重复点击） */
function onConfirm(): void {
  if (phase.value !== "paywall" || closing.value) return;
  phase.value = "unlocking";
  emit("unlock");
}

/**
 * 解锁成功 → 结果态（由父组件在扣费/解锁成功后调用）。
 * @param text 悄悄话文案
 */
function showResult(text: string): void {
  whisperText.value = text;
  phase.value = "result";
  emit("unlocked", text);
}

/** 解锁失败 → 回到付费墙（由父组件在解锁失败后调用，错误提示由父组件承载） */
function resetToPaywall(): void {
  phase.value = "paywall";
}

/** 父组件通过 ref 驱动结果态/回退付费墙 */
defineExpose({ showResult, resetToPaywall });
</script>

<template>
  <view
    v-if="visible"
    class="whisper-sheet-mask"
    :class="{ 'whisper-sheet-mask--closing': closing }"
    @tap="phase !== 'unlocking' && requestClose()"
  >
    <view
      class="whisper-sheet"
      :class="{ 'whisper-sheet--closing': closing }"
      @tap.stop
    >
      <view class="whisper-sheet__handle" />

      <!-- ===== 付费墙：信纸视觉 + 费用提示 + 余额 ===== -->
      <template v-if="phase === 'paywall'">
        <text class="whisper-sheet__title">{{ t('discover.whisperUnlockTitle') }}</text>
        <view class="whisper-letter">
          <view class="whisper-letter__seal">
            <image class="whisper-letter__lock" :src="IMAGE_PATHS.ICONS_EMOJI.LOCK" mode="aspectFit" alt="" />
          </view>
          <text class="whisper-letter__name">{{ t('discover.whisperFromUser', { name: userName }) }}</text>
          <text class="whisper-letter__hint">{{ t('discover.whisperCostHint', { n: UNLOCK_COST_YUAN.WHISPER }) }}</text>
        </view>
        <text
          class="whisper-sheet__balance"
          :class="{ 'whisper-sheet__balance--insufficient': !hasEnoughBalance }"
        >
          {{ t('discover.whisperBalanceHint', { n: props.balanceCents ?? '--' }) }}
        </text>
        <view class="whisper-sheet__actions">
          <view
            class="whisper-sheet__btn whisper-sheet__btn--ghost press-feedback"
            hover-class="whisper-sheet__btn--pressed"
            hover-stay-time="120"
            role="button"
            :aria-label="t('discover.whisperUnlockCancel')"
            @tap="requestClose"
          >
            <text class="whisper-sheet__btn-text">{{ t('discover.whisperUnlockCancel') }}</text>
          </view>
          <view
            class="whisper-sheet__btn whisper-sheet__btn--confirm press-feedback"
            hover-class="whisper-sheet__btn--pressed"
            hover-stay-time="120"
            role="button"
            :aria-label="t('discover.whisperUnlockConfirm')"
            @tap="onConfirm"
          >
            <text class="whisper-sheet__btn-text">{{ t('discover.whisperUnlockConfirm') }}</text>
          </view>
        </view>
      </template>

      <!-- ===== 解锁中：spinner ===== -->
      <view v-else-if="phase === 'unlocking'" class="whisper-unlocking">
        <view class="whisper-unlocking__spinner" />
        <text class="whisper-unlocking__text">{{ t('discover.unlocking') }}</text>
      </view>

      <!-- ===== 结果：悄悄话文案（引用样式）+ 去聊天/关闭 ===== -->
      <template v-else>
        <text class="whisper-sheet__title">{{ t('discover.whisperUnlockTitle') }}</text>
        <view class="whisper-result">
          <view class="whisper-result__quote" />
          <text class="whisper-result__text">{{ whisperText }}</text>
        </view>
        <view class="whisper-sheet__actions">
          <view
            class="whisper-sheet__btn whisper-sheet__btn--ghost press-feedback"
            hover-class="whisper-sheet__btn--pressed"
            hover-stay-time="120"
            role="button"
            :aria-label="t('common.close')"
            @tap="requestClose"
          >
            <text class="whisper-sheet__btn-text">{{ t('common.close') }}</text>
          </view>
          <view
            class="whisper-sheet__btn whisper-sheet__btn--confirm press-feedback"
            hover-class="whisper-sheet__btn--pressed"
            hover-stay-time="120"
            role="button"
            :aria-label="t('discover.whisperChatCta')"
            @tap="emit('chat')"
          >
            <text class="whisper-sheet__btn-text">{{ t('discover.whisperChatCta') }}</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* 遮罩：淡入复用全局 keyframes（theme/animations.scss），与 QuickFilterSheet 一致 */
.whisper-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-overlay-mid-strong, rgba(15, 23, 42, 0.5));
  display: flex;
  align-items: flex-end;
  z-index: 95;
  animation: overlay-fade-in var(--d-slow, 250ms) cubic-bezier(0.4, 0, 0.2, 1) both;
}

.whisper-sheet-mask--closing {
  animation: overlay-fade-out var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1) both;
}

.whisper-sheet {
  width: 100%;
  background: var(--c-bg-container, #ffffff);
  border-radius: 32rpx 32rpx 0 0;
  padding: 16rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28rpx;
  animation: whisper-sheet-slide-up var(--d-normal, 200ms) ease-out;
}

/* 2026-08-13：下滑出场动画（原实现无出场直接卸载） */
.whisper-sheet--closing {
  animation: whisper-sheet-slide-down var(--d-normal, 200ms) ease-in both;
}

@keyframes whisper-sheet-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes whisper-sheet-slide-down {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

.whisper-sheet__handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: var(--c-neutral-200, #e2e8f0);
  align-self: center;
}

.whisper-sheet__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
}

/* ===== 信纸卡片（付费墙视觉）：品牌渐变底 + 锁图标封印 + 费用提示 ===== */
.whisper-letter {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx 32rpx;
  border-radius: var(--r-2xl, 32rpx);
  /* 信纸渐变：品牌青绿→浪漫粉，无精确对应 token，直接写色值 */
  background: linear-gradient(150deg, #e8fffa 0%, #fdf3f8 60%, #fff7ed 100%);
  border: 1rpx solid var(--c-overlay-border-light, #e2e8f0);
}

.whisper-letter__seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-circle, 50%);
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
  box-shadow: var(--s-brand-md, 0 4rpx 16rpx rgba(63, 207, 142, 0.3));
}

.whisper-letter__lock {
  width: 44rpx;
  height: 44rpx;
  filter: brightness(0) invert(1);
}

.whisper-letter__name {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-primary);
}

.whisper-letter__hint {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
}

/* ===== 余额提示 ===== */
.whisper-sheet__balance {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* 余额不足时红色警示（点击解锁仍由后端 409 兜底校验） */
.whisper-sheet__balance--insufficient {
  color: var(--c-error, #ef4444);
  font-weight: 600;
}

/* ===== 解锁中 spinner ===== */
.whisper-unlocking {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 60rpx 0 40rpx;
}

.whisper-unlocking__spinner {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-circle, 50%);
  border: 6rpx solid var(--c-neutral-200, #e2e8f0);
  border-top-color: var(--c-brand-500, #3fcf8e);
  animation: whisper-spin 800ms linear infinite;
}

.whisper-unlocking__text {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
}

@keyframes whisper-spin {
  to { transform: rotate(360deg); }
}

/* ===== 结果态：引用样式文案 ===== */
.whisper-result {
  width: 100%;
  display: flex;
  gap: 20rpx;
  padding: 36rpx 28rpx;
  border-radius: var(--r-lg, 16rpx);
  background: var(--c-bg-container, #f8fafc);
  border: 1rpx solid var(--c-overlay-border-light, #e2e8f0);
}

.whisper-result__quote {
  flex-shrink: 0;
  width: 6rpx;
  border-radius: 3rpx;
  background: linear-gradient(180deg, var(--c-brand-400) 0%, var(--c-romance-400) 100%);
}

.whisper-result__text {
  flex: 1;
  font-size: var(--fs-lg);
  line-height: 1.7;
  color: var(--c-text-primary);
  word-break: break-all;
}

/* ===== 底部按钮 ===== */
.whisper-sheet__actions {
  display: flex;
  gap: 16rpx;
  width: 100%;
}

.whisper-sheet__btn {
  flex: 1;
  padding: 20rpx 0;
  border-radius: var(--r-full);
  text-align: center;
  transition: all var(--d-normal, 200ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

.whisper-sheet__btn--pressed {
  transform: scale(0.94);
  opacity: 0.88;
}

.whisper-sheet__btn--ghost {
  background: var(--c-bg-container, #f8fafc);
  border: 1rpx solid var(--c-overlay-border-light, #e2e8f0);
}

.whisper-sheet__btn--confirm {
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
  box-shadow: var(--s-brand-md, 0 4rpx 16rpx rgba(63, 207, 142, 0.3));
}

.whisper-sheet__btn-text {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-primary);
}

.whisper-sheet__btn--confirm .whisper-sheet__btn-text {
  color: var(--c-text-inverse);
}
</style>
