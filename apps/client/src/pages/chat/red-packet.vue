<script setup lang="ts">
/**
 * 聊天红包页
 *
 * 功能：
 * - 在聊天会话中发送红包（普通红包，单个）
 * - 调用 useVipRedPacketStore.createRedPacket，传入 chatId 关联会话
 * - 创建成功后返回上一页，并将红包消息注入聊天流（由 chat-session 处理）
 *
 * URL 参数：
 * - sessionId: 聊天会话 ID
 * - claimId: 可选，领取红包流程时传入
 *
 * mp-weixin 兼容：
 * - 使用 @tap / hover-class 而非 click / :hover
 * - 不使用 import.meta.env
 * - 金额单位：分 ↔ 元转换在前端完成
 */
import { ref, computed, onUnmounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useVipRedPacketStore } from "../../stores/vip-red-packet";
import { lightHaptic } from "../../utils/haptic";

/**
 * SubTask 1.5.2：红包发送成功后的跳转定时器引用，用于卸载时清理。
 *
 * <p>原实现 {@code setTimeout(() => uni.navigateBack(...), 800)} 未保存返回值，
 * 用户在 800ms 延迟内快速返回上一页时，定时器仍会触发 navigateBack，
 * 可能导致意外的双重页面出栈。</p>
 */
let sendSuccessNavTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * SubTask 1.5.2：页面卸载时清理未触发的跳转定时器。
 */
onUnmounted(() => {
  if (sendSuccessNavTimer) {
    clearTimeout(sendSuccessNavTimer);
    sendSuccessNavTimer = null;
  }
});

/**
 * 读取 input/textarea 事件的 value，统一兜底为空字符串。
 *
 * uni-app input/textarea 事件回调签名跨平台形态不一，detail.value 字段
 * 在 H5 与 mp-weixin 均存在但官方类型未统一声明，此处通过安全的类型断言访问。
 *
 * @param e - 事件对象（Event 类型，运行时携带 detail.value 字段）
 * @returns 输入框当前值，读取失败时返回空字符串
 */
function readInputValue(e: Event): string {
  const detail = (e as unknown as { detail?: { value?: string } }).detail;
  return detail?.value ?? "";
}

const { t } = useI18n();
const store = useVipRedPacketStore();

/** 当前会话 ID */
const sessionId = ref<string>("");

/** 金额输入（元） */
const amountInput = ref<string>("");

/** 祝福语 */
const blessingInput = ref<string>("");

/** 是否展示领取弹窗 */
const showClaimModal = ref(false);

/** 待领取的红包 ID */
const claimId = ref<number | null>(null);

/** 领取结果金额（分） */
const claimedAmount = ref<number | null>(null);

/** 金额（分） */
const amountInCents = computed(() => {
  const yuan = parseFloat(amountInput.value);
  if (isNaN(yuan) || yuan <= 0) return 0;
  return Math.round(yuan * 100);
});

/** 表单是否合法 */
const isFormValid = computed(() => {
  return amountInCents.value >= 100 && amountInCents.value <= 100_000;
});

/** 金额展示（元） */
const amountDisplay = computed(() => amountInput.value || "0");

/** 发送红包 */
async function handleSend() {
  if (!isFormValid.value) {
    uni.showToast({ title: t("chatRedPacket.formInvalid"), icon: "none" });
    return;
  }
  if (store.creating) return;

  try {
    await store.createRedPacket({
      totalAmount: amountInCents.value,
      totalCount: 1,
      type: "NORMAL",
      chatId: sessionId.value || undefined,
      blessing: blessingInput.value.trim() || undefined,
    });
    uni.showToast({ title: t("chatRedPacket.sendSuccess"), icon: "success" });
    // 返回上一页，让 chat-session 刷新消息流
    // SubTask 1.5.2：保存跳转定时器引用，卸载时统一清理
    if (sendSuccessNavTimer) clearTimeout(sendSuccessNavTimer);
    sendSuccessNavTimer = setTimeout(() => {
      sendSuccessNavTimer = null;
      uni.navigateBack({ delta: 1 });
    }, 800);
  } catch (error) {
    const message = error instanceof Error ? error.message : t("chatRedPacket.sendFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/** 领取红包 */
async function handleClaim() {
  if (!claimId.value) return;
  if (store.claiming) return;

  try {
    const result = await store.claimRedPacket(claimId.value);
    claimedAmount.value = result.amount;
    uni.showToast({
      title: t("vip.redPacketClaimSuccess", { amount: (result.amount / 100).toFixed(2) }),
      icon: "success",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("vip.redPacketClaimFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    showClaimModal.value = false;
  }
}

/** 关闭领取弹窗 */
function closeClaimModal() {
  showClaimModal.value = false;
  claimId.value = null;
  claimedAmount.value = null;
}

/**
 * 空操作函数，用于 catchtap 阻止冒泡时的占位 handler。
 *
 * 源码层面直接使用 catchtap="noop" 阻止冒泡：
 * mp-weixin 端 catchtap 原生阻止冒泡且必须绑定 handler，故需 noop 占位；
 * H5 端 catchtap 不生效，由外层遮罩 @tap 兜底关闭。
 */
const noop = () => {};

/** 返回上一页 */
function goBack() {
  lightHaptic();
  uni.navigateBack({ delta: 1 });
}

onLoad((options) => {
  if (!options) return;
  // 解析会话 ID
  if (typeof options.sessionId === "string" && options.sessionId.trim().length > 0) {
    sessionId.value = options.sessionId.trim();
  }
  // 解析领取红包 ID
  if (options.claimId) {
    const id = parseInt(options.claimId, 10);
    if (!isNaN(id) && id > 0) {
      claimId.value = id;
      showClaimModal.value = true;
    }
  }
});

// 修复（严格模式 noUnusedLocals）：noop 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ noop });
</script>

<template>
  <view class="chat-rp-page page-fade-in">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view
        class="nav-bar__back press-feedback"
        @tap="goBack"
        hover-class="nav-bar__back--hover"
        hover-stay-time="100"
      >
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">{{ t('chatRedPacket.navTitle') }}</text>
      <view class="nav-bar__placeholder" />
    </view>

    <view class="safe-top" />

    <!-- 主视觉 -->
    <view class="hero">
      <view class="hero__icon">
        <text class="hero__icon-emoji">🧧</text>
      </view>
      <text class="hero__title">{{ t('chatRedPacket.heroTitle') }}</text>
      <text class="hero__subtitle">{{ t('chatRedPacket.heroSubtitle') }}</text>
    </view>

    <!-- 金额输入 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('chatRedPacket.amountLabel') }}</text>
      </view>
      <view class="amount-input-wrap">
        <text class="amount-input__currency">¥</text>
        <input
          class="amount-input"
          type="digit"
          :placeholder="t('chatRedPacket.amountPlaceholder')"
          :value="amountInput"
          @input="amountInput = readInputValue($event)" aria-label="t('chatRedPacket.amountPlaceholder')"
        />
      </view>
    </view>

    <!-- 祝福语 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('chatRedPacket.blessingLabel') }}</text>
      </view>
      <view class="blessing-input-wrap">
        <textarea
          class="blessing-input"
          :placeholder="t('chatRedPacket.blessingPlaceholder')"
          :maxlength="200"
          :value="blessingInput"
          @input="blessingInput = readInputValue($event)" aria-label="t('chatRedPacket.blessingPlaceholder')"
        />
      </view>
    </view>

    <!-- 底部塞钱按钮 -->
    <view class="footer">
      <view class="footer__amount-row">
        <text class="footer__label">{{ t('vip.redPacketTotalLabel') }}</text>
        <text class="footer__currency">¥</text>
        <text class="footer__amount">{{ amountDisplay }}</text>
      </view>
      <view
        class="footer__btn press-feedback"
        :class="{ 'footer__btn--disabled': !isFormValid || store.creating }"
        @tap="handleSend"
        hover-class="footer__btn--hover"
        hover-stay-time="100"
      >
        <text class="footer__btn-text">
          {{ store.creating ? t('chatRedPacket.sending') : t('chatRedPacket.sendBtn') }}
        </text>
      </view>
    </view>

    <view class="safe-bottom" />

    <!-- 领取红包弹窗 -->
    <view
      v-if="showClaimModal"
      class="claim-modal-mask"
      @tap="closeClaimModal"
      role="dialog"
      aria-modal="true"
      :aria-label="t('vip.redPacketClaimTitle')"
    >
      <view
        class="claim-modal"
        catchtap="noop"
      >
        <view class="claim-modal__header">
          <text class="claim-modal__title">{{ t('vip.redPacketClaimTitle') }}</text>
          <text
            class="claim-modal__close"
            @tap="closeClaimModal"
            role="button"
            :aria-label="t('common.cancel')"
          >×</text>
        </view>
        <view class="claim-modal__body">
          <template v-if="claimedAmount !== null">
            <text class="claim-modal__amount">¥{{ (claimedAmount / 100).toFixed(2) }}</text>
            <text class="claim-modal__tip">{{ t('vip.redPacketClaimDone') }}</text>
          </template>
          <template v-else>
            <text class="claim-modal__desc">{{ t('vip.redPacketClaimDesc') }}</text>
            <view
              class="claim-modal__btn press-feedback"
              :class="{ 'claim-modal__btn--disabled': store.claiming }"
              @tap="handleClaim"
              hover-class="claim-modal__btn--hover"
              hover-stay-time="100"
            >
              <text class="claim-modal__btn-text">
                {{ store.claiming ? t('vip.redPacketClaiming') : t('vip.redPacketClaimBtn') }}
              </text>
            </view>
          </template>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.chat-rp-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: linear-gradient(180deg, var(--c-romance-500) 0%, var(--c-romance-700) 100%);
  box-sizing: border-box;
  position: relative;
  padding-bottom: 200rpx;
}

/* ==================== 导航栏 ==================== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  position: relative;
  z-index: 1;
}
.nav-bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  &--hover {
    background: var(--c-overlay-border-light);
    transform: scale(0.94);
  }
}
.nav-bar__back-icon {
  font-size: var(--fs-7xl, 56rpx);
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
  font-weight: 300;
  line-height: 1;
}
.nav-bar__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
}
.nav-bar__placeholder {
  width: 64rpx;
  height: 64rpx;
}
.safe-top, .safe-bottom {
  height: env(safe-area-inset-top);
  flex-shrink: 0;
}
.safe-bottom {
  height: env(safe-area-inset-bottom);
}

/* ==================== 主视觉 ==================== */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 32rpx 48rpx;
  position: relative;
  z-index: 1;
}
.hero__icon {
  width: 144rpx;
  height: 144rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}
.hero__icon-emoji {
  font-size: 72rpx;
  line-height: 1;
}
.hero__title {
  font-size: var(--fs-4xl, 40rpx);
  font-weight: 800;
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
  margin-bottom: 8rpx;
}
.hero__subtitle {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-overlay-text-secondary);
}

/* ==================== 分组 ==================== */
.section {
  position: relative;
  z-index: 1;
  margin: 24rpx 24rpx 0;
  background: var(--c-overlay-bg-pure);
  border-radius: var(--r-lg, 20rpx);
  padding: 24rpx;
  box-shadow: var(--s-md);
}
.section__title {
  padding: 0 0 16rpx;
}
.section__title-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-secondary);
  font-weight: 600;
}

/* ==================== 金额输入 ==================== */
.amount-input-wrap {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.amount-input__currency {
  font-size: var(--fs-3xl, 36rpx);
  color: var(--c-romance-500);
  font-weight: 700;
}
.amount-input {
  flex: 1;
  font-size: var(--fs-7xl, 56rpx);
  font-weight: 800;
  color: var(--c-text-primary);
  min-width: 200rpx;
}

/* ==================== 祝福语 ==================== */
.blessing-input {
  width: 100%;
  min-height: 120rpx;
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary);
  line-height: 1.5;
}

/* ==================== 底部按钮 ==================== */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: var(--c-overlay-bg-pure);
  border-top: 1rpx solid var(--c-border-light);
  z-index: 10;
}
.footer__amount-row {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}
.footer__label {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary);
}
.footer__currency {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-romance-500);
  font-weight: 600;
}
.footer__amount {
  font-size: var(--fs-4xl, 40rpx);
  color: var(--c-romance-500);
  font-weight: 800;
  line-height: 1;
}
.footer__btn {
  padding: 24rpx 56rpx;
  background: linear-gradient(135deg, var(--c-romance-500) 0%, var(--c-romance-700) 100%);
  border-radius: var(--r-full, 9999rpx);
  box-shadow: var(--s-romance-md);
  transition: all var(--d-fast, 120ms) ease;
  &--hover {
    transform: scale(0.96);
  }
  &--disabled {
    opacity: 0.5;
  }
}
.footer__btn-text {
  font-size: var(--fs-xl, 30rpx);
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
  font-weight: 700;
}

/* ==================== 领取弹窗 ==================== */
.claim-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-bg-overlay);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.claim-modal {
  width: 600rpx;
  /* 容器背景：使用 token 替代硬编码 #FFFFFF */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  overflow: hidden;
}
.claim-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: linear-gradient(135deg, var(--c-romance-500) 0%, var(--c-romance-700) 100%);
}
.claim-modal__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
}
.claim-modal__close {
  font-size: var(--fs-6xl, 48rpx);
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
  line-height: 1;
  padding: 0 12rpx;
}
.claim-modal__body {
  padding: 48rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.claim-modal__amount {
  font-size: 80rpx;
  font-weight: 800;
  color: var(--c-romance-500);
}
.claim-modal__tip {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-tertiary);
}
.claim-modal__desc {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.6;
}
.claim-modal__btn {
  padding: 20rpx 80rpx;
  background: linear-gradient(135deg, var(--c-romance-500) 0%, var(--c-romance-700) 100%);
  border-radius: var(--r-full, 9999rpx);
  box-shadow: var(--s-romance-md);
  &--hover {
    transform: scale(0.96);
  }
  &--disabled {
    opacity: 0.5;
  }
}
.claim-modal__btn-text {
  font-size: var(--fs-xl, 30rpx);
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
  font-weight: 700;
}
</style>
