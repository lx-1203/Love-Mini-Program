<script setup lang="ts">
/**
 * VIP 优惠码兑换页
 *
 * 功能：
 * - 输入优惠码并校验是否可用
 * - 展示优惠详情（满减金额 / 折扣百分比）
 * - 一键兑换，应用折扣到当前订单
 *
 * mp-weixin 兼容：
 * - 使用 @tap / hover-class 而非 click / :hover
 * - 不使用 import.meta.env
 * - 金额单位：分 ↔ 元转换在前端完成
 */
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { usePromoCodeStore } from "../../stores/promo-code";
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";
// P2 修复（2026-10-31）：本页不再从 config/vip-plans.ts 的展示镜像取「订单金额」默认值
// （原 R4-00117 的 `VIP_PLANS.find(...).price` 播种）—— 那个数字既不是用户要付的钱，
// 也不是服务端目录价，却被直接换算成 baseAmount 上送并印成「应付 ¥X」。
// P1-08：会员功能开关（false 时子页拦截返回）
import { featureFlags } from "../../config/feature-flags";
// R11-G2：注入 --statusbar（本页样式使用 var(--statusbar, env(...))，DevTools env 恒 0 必须由 JS 注入）
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();

// P1-08：会员功能未启用时拦截（toast + 返回），避免深链进入功能页
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

/** 兑换码页主视觉图标（emoji 替换为 SVG） */
const heroIcon = IMAGE_PATHS.ICONS_EMOJI.TICKET;
const store = usePromoCodeStore();

/**
 * 读取 input 事件的 value，统一兜底为空字符串。
 *
 * uni-app input 事件回调签名跨平台形态不一，detail.value 字段
 * 在 H5 与 mp-weixin 均存在但官方类型未统一声明，此处通过安全的类型断言访问。
 *
 * @param e - 事件对象（Event 类型，运行时携带 detail.value 字段）
 * @returns 输入框当前值，读取失败时返回空字符串
 */
function readInputValue(e: Event): string {
  const detail = (e as unknown as { detail?: { value?: string } }).detail;
  return detail?.value ?? "";
}

/** 优惠码输入 */
const codeInput = ref<string>("");

/**
 * 订单金额输入（元）—— **用户自填的折扣预览基数**，不是报价。
 *
 * P2 修复（2026-10-31）：此前这里用 `VIP_PLANS` 季卡的静态镜像价播种（48），
 * 于是页面把一个与任何成交口径都无关的数字当成「订单金额」发给服务端
 * （`baseAmount`）并印出「应付 ¥X」。服务端 `POST /vip/promo-codes/validate|redeem`
 * 的 baseAmount 只做**本端折扣预览**（P0-3 B：PromoCodeController 的 Javadoc 与
 * BillingService 的真实扣款都用 VipPlanCatalog 取价，客户端金额不参与成交），
 * 所以现在：初始为空、必须由用户自己填，且页面上任何「应付/优惠」数字只准来自服务端响应。
 */
const orderAmountInput = ref<string>("");

/** 订单金额（分） */
const orderAmountCents = computed(() => {
  const yuan = parseFloat(orderAmountInput.value);
  if (isNaN(yuan) || yuan <= 0) return 0;
  return Math.round(yuan * 100);
});

/** 校验结果（来自 store） */
const validationResult = computed(() => store.lastValidation);

/**
 * 服务端字段名归一读取（P2 修复）。
 *
 * 在册契约差：后端 PromoCodeService 的 ValidateResultView 发的是 `finalAmount` / `valid`，
 * RedeemResultView 发的是 `discountAmount` / `finalAmount`，
 * 而客户端 stores/promo-code.ts 的视图类型写的是 `payableAmount` / `available`（mock 分支
 * 自造的那套键名）。原实现 `validationResult.value.payableAmount ?? orderAmountCents.value`
 * 在 real 档永远取不到 payableAmount ⇒ 静默回落到**客户端自算金额**，
 * 于是「应付 ¥X」成了一个服务端从未报过的数。
 *
 * 现在的口径：只认服务端真的给了的字段（两个名字都查，契约名优先），
 * 没给 ⇒ null ⇒ 该行不渲染。宁可不显示，不许编。
 *
 * @param view 服务端响应视图（可空）
 * @param keys 依次尝试的响应字段名（服务端契约名在前）
 * @returns 分值金额；服务端未下发布时返回 null
 */
function readCentsFromView(view: unknown, keys: string[]): number | null {
  if (view === null || typeof view !== "object") return null;
  const record = view as Record<string, unknown>;
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  }
  return null;
}

/** 服务端是否判定该码可用（后端 `valid` / mock `available`，两口径都认） */
function readAvailableFromView(view: unknown): boolean {
  if (view === null || typeof view !== "object") return false;
  const record = view as Record<string, unknown>;
  return record.available === true || record.valid === true;
}

/** 优惠后金额（元，**仅取服务端报价**；服务端没报则为空串 ⇒ 该行不渲染） */
const payableYuan = computed(() => {
  const cents = readCentsFromView(validationResult.value, ["finalAmount", "payableAmount"]);
  return cents === null ? "" : (cents / 100).toFixed(2);
});

/** 优惠金额（元，同上：只认服务端下发值，不用本地金额倒推） */
const discountYuan = computed(() => {
  const cents = readCentsFromView(validationResult.value, ["discountAmount"]);
  return cents === null ? "" : (cents / 100).toFixed(2);
});

/** 兑换结果 */
const redeemResult = computed(() => store.lastRedeemResult);

/** 服务端判定本码可用（模板唯一判点，不再直接读 mock 专有的 available） */
const codeAvailable = computed(() => readAvailableFromView(validationResult.value));

/** 兑换结果里的优惠金额（元，仅服务端下发值；没下发即空串 ⇒ 该行不渲染） */
const redeemDiscountYuan = computed(() => {
  const cents = readCentsFromView(redeemResult.value, ["discountAmount"]);
  return cents === null ? "" : (cents / 100).toFixed(2);
});

/** 兑换结果里的应付金额（元，同上：后端契约名 finalAmount 优先） */
const redeemPayableYuan = computed(() => {
  const cents = readCentsFromView(redeemResult.value, ["finalAmount", "payableAmount"]);
  return cents === null ? "" : (cents / 100).toFixed(2);
});

/** 校验优惠码 */
async function handleValidate() {
  if (!codeInput.value.trim()) {
    uni.showToast({ title: t("vip.promoCodeEmpty"), icon: "none" });
    return;
  }
  // infra R2-00060: 输入格式即时轻校验（最终以服务端校验为准）
  if (!/^[A-Za-z0-9-]{4,24}$/.test(codeInput.value.trim())) {
    uni.showToast({ title: t("vip.promoCodeFormatInvalid"), icon: "none" });
    return;
  }
  if (orderAmountCents.value <= 0) {
    uni.showToast({ title: t("vip.promoCodeAmountInvalid"), icon: "none" });
    return;
  }
  if (store.validating) return;

  try {
    const result = await store.validateCode({
      code: codeInput.value.trim(),
      baseAmount: orderAmountCents.value,
    });
    if (readAvailableFromView(result)) {
      uni.showToast({
        title: t("vip.promoCodeValid", { discount: discountYuan.value }),
        icon: "success",
      });
    } else {
      uni.showToast({
        title: result.reason || t("vip.promoCodeInvalid"),
        icon: "none",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : t("vip.promoCodeValidateFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/** 兑换优惠码 */
async function handleRedeem() {
  if (!readAvailableFromView(validationResult.value)) {
    uni.showToast({ title: t("vip.promoCodeNotValidated"), icon: "none" });
    return;
  }
  if (store.redeeming) return;

  try {
    const result = await store.redeemCode({
      code: codeInput.value.trim(),
      baseAmount: orderAmountCents.value,
    });
    if (result.success) {
      // P2 修复：弹窗里的两个数字同样只取服务端响应（后端契约名 finalAmount 优先）。
      // 服务端两个值都报不出来时**不弹带金额的窗** —— 宁可只报「兑换成功」，
      // 也不许在资金页面上印一个客户端自己算出来的「应付」。
      const redeemDiscount = readCentsFromView(result, ["discountAmount"]);
      const redeemPayable = readCentsFromView(result, ["finalAmount", "payableAmount"]);
      if (redeemDiscount !== null && redeemPayable !== null) {
        uni.showModal({
          title: t("vip.promoCodeRedeemSuccessTitle"),
          content: t("vip.promoCodeRedeemSuccessContent", {
            discount: (redeemDiscount / 100).toFixed(2),
            payable: (redeemPayable / 100).toFixed(2),
          }),
          showCancel: false,
          confirmText: t("common.confirm"),
        });
      } else {
        uni.showToast({ title: t("vip.promoCodeRedeemSuccess"), icon: "success" });
      }
    } else {
      uni.showToast({
        title: result.reason || t("vip.promoCodeRedeemFailed"),
        icon: "none",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : t("vip.promoCodeRedeemFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/** 重置 */
function handleReset() {
  lightHaptic();
  codeInput.value = "";
  store.reset();
}

/** 返回上一页 */
function goBack() {
  lightHaptic();
  // MP-R2-次要22-008：栈底兜底
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: "/pages/profile/index" });
  }
}
</script>

<template>
  <view class="promo-page" :style="menuStyleVars">
    <view class="safe-top" />

<!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100">
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">{{ t('vip.promoCodeNavTitle') }}</text>
      <view class="nav-bar__placeholder" />
    </view>
    
    <!-- 主视觉 -->
    <view class="hero">
      <view class="hero__icon">
        <image class="hero__icon-emoji" :src="heroIcon" mode="aspectFit" alt="" />
      </view>
      <text class="hero__title">{{ t('vip.promoCodeHeroTitle') }}</text>
      <text class="hero__subtitle">{{ t('vip.promoCodeHeroSubtitle') }}</text>
    </view>

    <!-- 输入区 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('vip.promoCodeInputLabel') }}</text>
      </view>
      <view class="code-input-wrap">
        <input
  cursor-spacing="20"
          class="code-input"
          :placeholder="t('vip.promoCodeInputPlaceholder')"
          :value="codeInput"
          maxlength="32"
          @input="codeInput = readInputValue($event)" :aria-label="t('vip.promoCodeInputPlaceholder')"
        />
      </view>
    </view>

    <!-- 订单金额：用户自填的**折扣预览基数**。
         P2 修复说明（在册）：这个输入框不再是「套餐镜像价播种的报价」。服务端
         POST /vip/promo-codes/validate|redeem 只用它算预览折扣（P0-3 B），真实成交取
         VipPlanCatalog 的目录价；本页因此不预填任何数字，也不把输入值倒推成「应付」。
         下面两行的数字只可能来自服务端响应字段。 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('vip.promoCodeOrderAmountLabel') }}</text>
      </view>
      <view class="amount-input-wrap">
        <text class="amount-input__currency">¥</text>
        <input
  cursor-spacing="20"
          class="amount-input"
          type="digit"
          :value="orderAmountInput"
          @input="orderAmountInput = readInputValue($event)"
        />
      </view>
    </view>

    <!-- 校验按钮 -->
    <view class="action-row">
      <view
        class="action-btn press-feedback"
        :class="{ 'action-btn--disabled': !codeInput.trim() || store.validating }"
        @tap="handleValidate"
        hover-class="action-btn--hover"
        hover-stay-time="100"
      >
        <text class="action-btn__text">
          {{ store.validating ? t('vip.promoCodeValidating') : t('vip.promoCodeValidateBtn') }}
        </text>
      </view>
      <view
        class="action-btn action-btn--ghost press-feedback"
        @tap="handleReset"
        hover-class="action-btn--hover"
        hover-stay-time="100"
      >
        <text class="action-btn__text">{{ t('vip.promoCodeResetBtn') }}</text>
      </view>
    </view>

    <!-- 校验结果 -->
    <view v-if="validationResult" class="section result-section">
      <view class="section__title">
        <text class="section__title-text">{{ t('vip.promoCodeResultTitle') }}</text>
      </view>
      <view class="result-card" :class="{ 'result-card--invalid': !validationResult.available }">
        <view class="result-row">
          <text class="result-row__label">{{ t('vip.promoCodeResultCode') }}</text>
          <text class="result-row__value">{{ validationResult.code }}</text>
        </view>
        <view class="result-row">
          <text class="result-row__label">{{ t('vip.promoCodeResultType') }}</text>
          <text class="result-row__value">
            {{ validationResult.discountType === 'AMOUNT' ? t('vip.promoCodeTypeAmount') : t('vip.promoCodeTypePercent') }}
          </text>
        </view>
        <view v-if="validationResult.description" class="result-row">
          <text class="result-row__label">{{ t('vip.promoCodeResultDesc') }}</text>
          <text class="result-row__value">{{ validationResult.description }}</text>
        </view>
        <view v-if="codeAvailable && discountYuan" class="result-row">
          <text class="result-row__label">{{ t('vip.promoCodeResultDiscount') }}</text>
          <text class="result-row__value result-row__value--accent">¥{{ discountYuan }}</text>
        </view>
        <view v-if="codeAvailable && payableYuan" class="result-row">
          <text class="result-row__label">{{ t('vip.promoCodeResultPayable') }}</text>
          <text class="result-row__value result-row__value--accent">¥{{ payableYuan }}</text>
        </view>
        <view v-if="!validationResult.available" class="result-row">
          <text class="result-row__label">{{ t('vip.promoCodeResultReason') }}</text>
          <text class="result-row__value result-row__value--danger">
            {{ validationResult.reason || t('vip.promoCodeInvalid') }}
          </text>
        </view>
      </view>
    </view>

    <!-- 兑换按钮 -->
    <view v-if="codeAvailable" class="footer">
      <view
        class="footer__btn press-feedback"
        :class="{ 'footer__btn--disabled': store.redeeming }"
        @tap="handleRedeem"
        hover-class="footer__btn--hover"
        hover-stay-time="100"
      >
        <text class="footer__btn-text">
          {{ store.redeeming ? t('vip.promoCodeRedeeming') : t('vip.promoCodeRedeemBtn') }}
        </text>
      </view>
    </view>

    <!-- 兑换结果展示 -->
    <view v-if="redeemResult" class="section result-section">
      <view class="section__title">
        <text class="section__title-text">{{ t('vip.promoCodeRedeemResultTitle') }}</text>
      </view>
      <view class="result-card" :class="{ 'result-card--invalid': !redeemResult.success }">
        <view class="result-row">
          <text class="result-row__label">{{ t('vip.promoCodeResultStatus') }}</text>
          <text class="result-row__value" :class="redeemResult.success ? 'result-row__value--accent' : 'result-row__value--danger'">
            {{ redeemResult.success ? t('vip.promoCodeRedeemSuccess') : t('vip.promoCodeRedeemFailed') }}
          </text>
        </view>
        <view v-if="redeemDiscountYuan" class="result-row">
          <text class="result-row__label">{{ t('vip.promoCodeResultDiscount') }}</text>
          <text class="result-row__value">¥{{ redeemDiscountYuan }}</text>
        </view>
        <view v-if="redeemPayableYuan" class="result-row">
          <text class="result-row__label">{{ t('vip.promoCodeResultPayable') }}</text>
          <text class="result-row__value">¥{{ redeemPayableYuan }}</text>
        </view>
      </view>
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.promo-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: linear-gradient(180deg, var(--c-gold) 0%, var(--c-accent-400) 100%);
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
  height: var(--statusbar, env(safe-area-inset-top));
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
}
.hero__icon {
  width: 144rpx;
  height: 144rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-border-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}
.hero__icon-emoji {
  width: 72rpx;
  height: 72rpx;
  color: var(--c-brand-500);
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
  margin: 16rpx 24rpx 0;
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

/* ==================== 输入区 ==================== */
.code-input-wrap {
  background: var(--c-bg-secondary);
  border-radius: var(--r-lg, 16rpx);
  padding: 24rpx;
}
.code-input {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-primary);
  letter-spacing: 4rpx;
  text-align: center;
}
.amount-input-wrap {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  background: var(--c-bg-secondary);
  border-radius: var(--r-lg, 16rpx);
  padding: 16rpx 24rpx;
}
.amount-input__currency {
  font-size: var(--fs-2xl, 32rpx);
  color: var(--c-gold);
  font-weight: 700;
}
.amount-input {
  flex: 1;
  font-size: var(--fs-6xl, 48rpx);
  font-weight: 800;
  color: var(--c-text-primary);
}

/* ==================== 操作按钮 ==================== */
.action-row {
  display: flex;
  gap: 16rpx;
  margin: 24rpx 24rpx 0;
  position: relative;
  z-index: 1;
}
.action-btn {
  flex: 1;
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, var(--c-gold) 0%, var(--c-accent-400) 100%);
  border-radius: var(--r-full, 9999rpx);
  box-shadow: var(--s-accent);
  transition: all var(--d-fast, 120ms) ease;
  display: flex;
  justify-content: center;
  align-items: center;
  &--ghost {
    background: var(--c-overlay-white-bg-most);
    box-shadow: var(--s-md);
  }
  &--hover {
    transform: scale(0.96);
  }
  &--disabled {
    opacity: 0.5;
  }
}
.action-btn__text {
  font-size: var(--fs-lg, 28rpx);
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
  font-weight: 700;
}
.action-btn--ghost .action-btn__text {
  color: var(--c-text-primary);
}

/* ==================== 结果卡片 ==================== */
.result-section {
  margin-top: 24rpx;
}
.result-card {
  background: var(--c-bg-secondary);
  border-radius: var(--r-lg, 16rpx);
  padding: 16rpx 24rpx;
  border: 2rpx solid transparent;
  &--invalid {
    background: var(--c-red-bg-tint);
    border-color: var(--c-red-border-tint);
  }
}
.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx dashed var(--c-border-light);
  &:last-child {
    border-bottom: none;
  }
}
.result-row__label {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-tertiary);
}
.result-row__value {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary);
  font-weight: 600;
  &--accent {
    color: var(--c-romance-500);
  }
  &--danger {
    color: var(--c-error);
  }
}

/* ==================== 底部按钮 ==================== */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: var(--c-overlay-white-bg-most);
  border-top: 1rpx solid var(--c-border-light);
  z-index: 10;
}
.footer__btn {
  padding: 24rpx 0;
  background: linear-gradient(135deg, var(--c-gold) 0%, var(--c-accent-400) 100%);
  border-radius: var(--r-full, 9999rpx);
  box-shadow: var(--s-accent);
  transition: all var(--d-fast, 120ms) ease;
  display: flex;
  justify-content: center;
  align-items: center;
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
</style>
