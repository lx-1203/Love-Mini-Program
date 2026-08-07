<script setup lang="ts">
/**
 * VIP 红包页
 *
 * 功能：
 * - 创建红包：选择类型（普通/拼手气）、输入金额、个数、祝福语
 * - 查看发送记录：展示最近创建的红包
 * - 领取红包：通过 URL 参数 ?claimId=xxx 进入领取流程
 *
 * mp-weixin 兼容：
 * - 使用 @tap / hover-class 而非 click / :hover
 * - 不使用 import.meta.env，状态由 store 管理
 * - 金额单位：分 ↔ 元转换在前端完成（后端存储为分）
 */
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useVipRedPacketStore, type RedPacketType } from "../../stores/vip-red-packet";
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";
// P1-08：会员功能开关（false 时子页拦截返回）
import { featureFlags } from "../../config/feature-flags";

const { t } = useI18n();

/** 红包页主视觉图标（emoji 替换为 SVG） */
const heroIcon = IMAGE_PATHS.ICONS_EMOJI.GIFT;
const store = useVipRedPacketStore();

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

/** 红包类型选项 */
const typeOptions = computed<{ value: RedPacketType; label: string; desc: string }[]>(() => [
  { value: "NORMAL", label: t("vip.redPacketTypeNormal"), desc: t("vip.redPacketTypeNormalDesc") },
  { value: "LUCKY", label: t("vip.redPacketTypeLucky"), desc: t("vip.redPacketTypeLuckyDesc") },
]);

/** 当前选中的红包类型 */
const selectedType = ref<RedPacketType>("NORMAL");

/** 金额输入（元） */
const amountInput = ref<string>("");

/** 个数输入 */
const countInput = ref<string>("1");

/** 祝福语 */
const blessingInput = ref<string>("");

/** 是否展示领取弹窗 */
const showClaimModal = ref(false);

/** 待领取的红包 ID（从 URL 参数获取） */
const claimId = ref<number | null>(null);

/** 领取结果金额（分） */
const claimedAmount = ref<number | null>(null);

/** 金额（分），由元转换而来 */
const amountInCents = computed(() => {
  const yuan = parseFloat(amountInput.value);
  if (isNaN(yuan) || yuan <= 0) return 0;
  return Math.round(yuan * 100);
});

/** 个数（整数） */
const count = computed(() => {
  const n = parseInt(countInput.value, 10);
  return isNaN(n) || n < 1 ? 0 : n;
});

/** 表单是否合法 */
const isFormValid = computed(() => {
  if (amountInCents.value < 100 || amountInCents.value > 100_000) return false;
  if (count.value < 1 || count.value > 100) return false;
  // 普通红包要求金额能被个数整除
  if (selectedType.value === "NORMAL" && amountInCents.value % count.value !== 0) return false;
  return true;
});

/** 每个红包金额（元，仅普通红包显示） */
const perPacketYuan = computed(() => {
  if (selectedType.value !== "NORMAL" || count.value === 0) return "";
  return (amountInCents.value / count.value / 100).toFixed(2);
});

/** 金额展示（元） */
const amountDisplay = computed(() => amountInput.value || "0");

/** 选择红包类型 */
function selectType(type: RedPacketType) {
  lightHaptic();
  selectedType.value = type;
}

/** 创建红包 */
async function handleCreate() {
  if (!isFormValid.value) {
    uni.showToast({ title: t("vip.redPacketFormInvalid"), icon: "none" });
    return;
  }
  if (store.creating) return;

  try {
    const result = await store.createRedPacket({
      totalAmount: amountInCents.value,
      totalCount: count.value,
      type: selectedType.value,
      blessing: blessingInput.value.trim() || undefined,
    });
    uni.showToast({ title: t("vip.redPacketCreateSuccess"), icon: "success" });
    // 重置表单
    amountInput.value = "";
    countInput.value = "1";
    blessingInput.value = "";
    // 跳转到红包详情页或展示分享
    uni.showModal({
      title: t("vip.redPacketCreatedTitle"),
      content: t("vip.redPacketCreatedContent", { id: result.id }),
      showCancel: true,
      confirmText: t("vip.redPacketShare"),
      // 修复（review #56）：原 cancelText 用 common.confirm（“确定”），
      // 与确认按钮“分享”语义颠倒；改为“取消”表示放弃分享、关闭弹窗。
      cancelText: t("common.cancel"),
      success: (res) => {
        if (res.confirm) {
          uni.showToast({ title: t("vip.redPacketShareTip"), icon: "none" });
        }
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("vip.redPacketCreateFailed");
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

/** 空操作占位（catchtap 占位 handler，mp-weixin 要求 catchtap 必须绑定 handler） */
function noop() {}

/** 关闭领取弹窗 */
function closeClaimModal() {
  showClaimModal.value = false;
  claimId.value = null;
  claimedAmount.value = null;
}

/** 返回上一页 */
function goBack() {
  lightHaptic();
  uni.navigateBack({ delta: 1 });
}

// P1-08：会员功能未启用时子页同样拦截（toast + 返回），避免深链进入功能页
onLoad(() => {
  if (!featureFlags.membershipEnabled) {
    uni.showToast({ title: t("vip.membershipDisabled"), icon: "none" });
    if (getCurrentPages().length > 1) {
      uni.navigateBack();
    } else {
      uni.switchTab({ url: "/pages/profile/index" });
    }
  }
});

// 页面加载时检查 URL 参数，判断是否为领取红包流程
onLoad((options) => {
  if (options?.claimId) {
    const id = parseInt(options.claimId, 10);
    if (!isNaN(id) && id > 0) {
      claimId.value = id;
      showClaimModal.value = true;
    } else {
      // infra R2-00061: 非法 claimId 给错误反馈，避免静默无响应
      uni.showToast({ title: t("vip.redPacketInvalidLink"), icon: "none" });
    }
  }
});

// 修复（严格模式 noUnusedLocals）：noop 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ noop });
</script>

<template>
  <view class="red-packet-page page-fade-in">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100">
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">{{ t('vip.redPacketNavTitle') }}</text>
      <view class="nav-bar__placeholder" />
    </view>

    <view class="safe-top" />

    <!-- 红包主视觉 -->
    <view class="rp-hero">
      <view class="rp-hero__icon">
        <image class="rp-hero__icon-emoji" :src="heroIcon" mode="aspectFit" alt="" />
      </view>
      <text class="rp-hero__title">{{ t('vip.redPacketHeroTitle') }}</text>
      <text class="rp-hero__subtitle">{{ t('vip.redPacketHeroSubtitle') }}</text>
    </view>

    <!-- 类型选择 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('vip.redPacketTypeTitle') }}</text>
      </view>
      <view class="type-grid">
        <view
          v-for="opt in typeOptions" :key="opt.value"
          class="type-card press-feedback"
          :class="{ 'type-card--selected': selectedType === opt.value }"
          @tap="selectType(opt.value)"
          hover-class="type-card--hover"
          hover-stay-time="100"
        >
          <text class="type-card__label">{{ opt.label }}</text>
          <text class="type-card__desc">{{ opt.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 金额输入 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('vip.redPacketAmountTitle') }}</text>
      </view>
      <view class="amount-input-wrap">
        <text class="amount-input__currency">¥</text>
        <input
          class="amount-input"
          type="digit"
          :placeholder="t('vip.redPacketAmountPlaceholder')"
          :value="amountInput"
          @input="amountInput = readInputValue($event)" :aria-label="t('vip.redPacketAmountPlaceholder')"
        />
        <text v-if="selectedType === 'NORMAL' && perPacketYuan" class="amount-input__hint">
          {{ t('vip.redPacketPerPacket', { amount: perPacketYuan }) }}
        </text>
      </view>
    </view>

    <!-- 个数输入 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('vip.redPacketCountTitle') }}</text>
      </view>
      <view class="count-input-wrap">
        <input
          class="count-input"
          type="number"
          :placeholder="t('vip.redPacketCountPlaceholder')"
          :value="countInput"
          @input="countInput = readInputValue($event)" :aria-label="t('vip.redPacketCountPlaceholder')"
        />
        <text class="count-input__suffix">{{ t('vip.redPacketCountUnit') }}</text>
      </view>
    </view>

    <!-- 祝福语 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('vip.redPacketBlessingTitle') }}</text>
      </view>
      <view class="blessing-input-wrap">
        <textarea
          class="blessing-input"
          :placeholder="t('vip.redPacketBlessingPlaceholder')"
          :maxlength="200"
          :value="blessingInput"
          @input="blessingInput = readInputValue($event)" :aria-label="t('vip.redPacketBlessingPlaceholder')"
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
        @tap="handleCreate"
        hover-class="footer__btn--hover"
        hover-stay-time="100"
      >
        <text class="footer__btn-text">
          {{ store.creating ? t('vip.redPacketCreating') : t('vip.redPacketSendBtn') }}
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
      <view class="claim-modal" catchtap="noop">
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
.red-packet-page {
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
.rp-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 32rpx 48rpx;
  position: relative;
  z-index: 1;
}
.rp-hero__icon {
  width: 144rpx;
  height: 144rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}
.rp-hero__icon-emoji {
  width: 72rpx;
  height: 72rpx;
  color: var(--c-warning, #f59e0b);
}
.rp-hero__title {
  font-size: var(--fs-4xl, 40rpx);
  font-weight: 800;
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
  margin-bottom: 8rpx;
}
.rp-hero__subtitle {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-overlay-white-text-strong);
}

/* ==================== 分组 ==================== */
.section {
  position: relative;
  z-index: 1;
  margin: 24rpx 24rpx 0;
  background: var(--c-overlay-white-bg-most);
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

/* ==================== 类型选择 ==================== */
.type-grid {
  display: flex;
  gap: 16rpx;
}
.type-card {
  flex: 1;
  background: var(--c-bg-secondary);
  border: 2rpx solid transparent;
  border-radius: var(--r-lg, 16rpx);
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  transition: all var(--d-fast, 120ms) ease;
  &--hover {
    transform: scale(0.98);
  }
  &--selected {
    background: var(--c-romance-bg-tint);
    border-color: var(--c-romance-500);
  }
}
.type-card__label {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}
.type-card__desc {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary);
  text-align: center;
}

/* ==================== 金额输入 ==================== */
.amount-input-wrap {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  flex-wrap: wrap;
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
.amount-input__hint {
  flex-basis: 100%;
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
  margin-top: 8rpx;
}

/* ==================== 个数输入 ==================== */
.count-input-wrap {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.count-input {
  flex: 1;
  font-size: var(--fs-4xl, 40rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}
.count-input__suffix {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary);
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
  background: var(--c-overlay-white-bg-most);
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
