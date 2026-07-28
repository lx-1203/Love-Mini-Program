<script setup lang="ts">
/**
 * VIP 开通页
 * 展示 VIP 权益 + 套餐选择 + 立即开通
 * 套餐数据从 config/vip-plans.ts 读取，避免硬编码
 *
 * 增量功能（首批 VIP 相关）：
 * - 自动续费开关：调用 useAutoRenewStore 查询与切换
 * - 入口跳转：VIP 红包 / 优惠码 / 账单记录
 *
 * mp-weixin 兼容：
 * - 使用 @tap / hover-class 而非 click / :hover
 * - 不使用 import.meta.env，状态由 store 管理
 * - 金额单位：分 ↔ 元转换在前端完成
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";
import { VIP_PLANS, type VipPlan, type VipBenefit } from "../../config/vip-plans";
import { useAutoRenewStore } from "../../stores/vip-auto-renew";
import { createButtonGuard } from "../../utils/debounce";
// Sentry 监控：支付失败上报异常，页面切换 / 关键按钮点击记录面包屑
import { captureException, addBreadcrumb } from "../../services/sentry";

const { t } = useI18n();
const autoRenewStore = useAutoRenewStore();

/**
 * SubTask 1.5.2：mock 支付定时器引用，用于卸载时清理。
 *
 * <p>原实现 {@code setTimeout(..., 1200)} 未保存返回值，用户在 mock 支付流程
 * 进行中快速返回上一页时，定时器仍会触发 resolve 并执行后续 .then 回调，
 * 在已销毁页面上调用 uni.hideLoading / uni.showToast 等方法。</p>
 */
let mockPaymentTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * SubTask 1.5.2：页面卸载时清理未触发的 mock 支付定时器。
 */
onUnmounted(() => {
  if (mockPaymentTimer) {
    clearTimeout(mockPaymentTimer);
    mockPaymentTimer = null;
  }
});

/** VIP 权益列表 */
const benefits = computed<VipBenefit[]>(() => [
  { emoji: "👀", title: t("vip.benefitSeeLikes"), desc: t("vip.benefitSeeLikesDesc") },
  { emoji: "💝", title: t("vip.benefitUnlimitedLikes"), desc: t("vip.benefitUnlimitedLikesDesc") },
  { emoji: "👑", title: t("vip.benefitBadge"), desc: t("vip.benefitBadgeDesc") },
  { emoji: "🚀", title: t("vip.benefitBoost"), desc: t("vip.benefitBoostDesc") },
  { emoji: "🎨", title: t("vip.benefitTheme"), desc: t("vip.benefitThemeDesc") },
  { emoji: "", icon: IMAGE_PATHS.ICONS_EMOJI.CHAT, title: t("vip.benefitSuperLike"), desc: t("vip.benefitSuperLikeDesc") },
]);

/** 套餐列表（从 config 引入，避免硬编码价格） */
const plans = ref<VipPlan[]>(VIP_PLANS);

/** 当前选中的套餐 ID */
const selectedPlanId = ref<VipPlan["id"]>("quarterly");

/** 当前选中的套餐对象 */
const selectedPlan = computed(() =>
  plans.value.find((p) => p.id === selectedPlanId.value)
);

/** 是否正在处理开通 */
const processing = ref(false);

/** 选择套餐 */
function selectPlan(plan: VipPlan) {
  lightHaptic();
  selectedPlanId.value = plan.id;
}

/**
 * 立即开通：调用 uni.requestPayment，正确处理支付取消与失败。
 * - cancel：用户主动取消支付，仅 toast 提示，不报错
 * - fail：支付失败，toast 提示重试
 * - success：开通成功，提示后返回上一页
 */
function subscribe() {
  lightHaptic();
  if (processing.value) return;
  if (!selectedPlan.value) return;

  // 记录关键按钮点击面包屑，便于在支付失败时定位用户操作节点
  addBreadcrumb("ui", "button_click", {
    id: "vip.subscribe",
    planId: selectedPlan.value.id,
  });

  processing.value = true;
  uni.showLoading({ title: t("vip.processing") });

  // mock 模式下不调用真实支付，使用 setTimeout 模拟流程
  // 真实环境替换为 uni.requestPayment({/* 支付参数 */})，并在 fail 回调中区分 cancel
  // SubTask 1.5.2：保存定时器引用，卸载时统一清理
  if (mockPaymentTimer) clearTimeout(mockPaymentTimer);
  const mockPayment = new Promise<{ ok: boolean; cancelled: boolean; msg?: string }>((resolve) => {
    mockPaymentTimer = setTimeout(() => {
      mockPaymentTimer = null;
      // 模拟成功（真实环境调用 uni.requestPayment）
      resolve({ ok: true, cancelled: false });
    }, 1200);
  });

  mockPayment
    .then((result) => {
      uni.hideLoading();
      processing.value = false;
      if (result.cancelled) {
        // 用户取消支付：仅友好提示，不报错；记录面包屑便于回溯
        addBreadcrumb("ui", "payment_cancelled", {
          planId: selectedPlan.value?.id,
        });
        uni.showToast({ title: t("vip.paymentCancelled"), icon: "none" });
        return;
      }
      if (!result.ok) {
        // 支付失败：上报到 Sentry，source 标记为 vip.payment 便于后台筛选
        captureException(new Error(result.msg || "payment failed"), {
          source: "vip.payment",
          planId: selectedPlan.value?.id,
        });
        uni.showToast({ title: result.msg || t("vip.paymentFailed"), icon: "none" });
        return;
      }
      uni.showModal({
        title: t("vip.subscribeSuccess"),
        content: `${t("vip.subscribeSuccessContent", { name: selectedPlan.value?.name ?? "", period: selectedPlan.value?.period ?? "" })}`,
        showCancel: false,
        confirmText: t("profile.gotIt"),
        success: () => {
          uni.navigateBack({ delta: 1 });
        },
      });
    })
    .catch((error) => {
      uni.hideLoading();
      processing.value = false;
      // 支付流程异常：上报到 Sentry，含 planId 便于定位具体套餐
      captureException(error, {
        source: "vip.payment",
        planId: selectedPlan.value?.id,
      });
      uni.showToast({ title: t("vip.paymentFailed"), icon: "none" });
    });
}

/**
 * 按钮防抖包装：支付按钮在 processing 状态生效前的时间窗口内可能被重复点击，
 * createButtonGuard 提供立即锁，与 processing 标志双重保护，
 * 避免用户连点导致 uni.showLoading 被多次调用或支付流程被并发触发。
 * 防抖窗口 1500ms 覆盖支付流程的典型耗时。
 */
const subscribeGuarded = createButtonGuard(subscribe, 1500);

/** 查看权益详情 */
function viewBenefitDetail(benefit: VipBenefit) {
  lightHaptic();
  uni.showModal({
    title: benefit.title,
    content: benefit.desc,
    showCancel: false,
    confirmText: t("profile.gotIt"),
  });
}

/** 返回上一页 */
function goBack() {
  lightHaptic();
  uni.navigateBack({ delta: 1 });
}

/* ========== 自动续费开关 ========== */

/** 自动续费开关状态（来自 store） */
const autoRenewEnabled = computed(() => autoRenewStore.status.enabled);

/** 下次扣费日期（YYYY-MM-DD） */
const nextBillingDate = computed(() => {
  const iso = autoRenewStore.status.nextBillingAt;
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (_e) {
    return "";
  }
});

/** 切换自动续费开关 */
async function toggleAutoRenew() {
  lightHaptic();
  if (autoRenewStore.updating) return;

  // 开启前确认
  const nextEnabled = !autoRenewEnabled.value;
  if (nextEnabled) {
    const confirmed = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: t("vip.autoRenewConfirmTitle"),
        content: t("vip.autoRenewConfirmContent", {
          plan: selectedPlan.value?.name ?? "",
          date: nextBillingDate.value,
        }),
        confirmText: t("vip.autoRenewConfirm"),
        cancelText: t("common.cancel"),
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirmed) return;
  } else {
    // 关闭前确认
    const confirmed = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: t("vip.autoRenewOffTitle"),
        content: t("vip.autoRenewOffContent"),
        confirmText: t("vip.autoRenewOffConfirm"),
        cancelText: t("common.cancel"),
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirmed) return;
  }

  try {
    await autoRenewStore.setEnabled({
      enabled: nextEnabled,
      planId: selectedPlan.value?.id,
    });
    uni.showToast({
      title: nextEnabled
        ? t("vip.autoRenewOnSuccess")
        : t("vip.autoRenewOffSuccess"),
      icon: "success",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("vip.autoRenewToggleFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/* ========== VIP 相关功能入口 ========== */

/** 跳转到 VIP 红包页 */
function goRedPacket() {
  lightHaptic();
  uni.navigateTo({ url: "/pages/vip/red-packet" });
}

/** 跳转到 VIP 优惠码页 */
function goPromoCode() {
  lightHaptic();
  uni.navigateTo({ url: "/pages/vip/promo-code" });
}

/** 跳转到 VIP 账单页 */
function goBills() {
  lightHaptic();
  uni.navigateTo({ url: "/pages/vip/bills" });
}

/** 页面挂载时拉取自动续费状态 */
onMounted(() => {
  // 记录页面进入面包屑，便于在异常发生时回溯用户跳转路径
  addBreadcrumb("navigation", "page_enter", { url: "/pages/vip/index" });

  // 忽略错误，状态默认为关闭
  void autoRenewStore.fetchStatus().catch(() => {
    // 静默处理，不提示错误
  });
});
</script>

<template>
  <view class="vip-page page-fade-in">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100">
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">{{ t('vip.navTitle') }}</text>
      <view class="nav-bar__placeholder" />
    </view>

    <!-- 顶部安全区占位 -->
    <view class="safe-top" />

    <!-- VIP 头部卡片 -->
    <view class="vip-header">
      <view class="vip-header__crown">
        <text class="vip-header__crown-emoji">👑</text>
      </view>
      <text class="vip-header__title">{{ t('vip.headerTitle') }}</text>
      <text class="vip-header__subtitle">{{ t('vip.headerSubtitle') }}</text>
    </view>

    <!-- 权益列表 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('vip.benefitsTitle') }}</text>
      </view>
      <view class="benefits-grid">
        <view
          v-for="(item, index) in benefits"
          :key="index"
          class="benefit-item press-feedback"
          @tap="viewBenefitDetail(item)"
          hover-class="benefit-item--hover"
          hover-stay-time="100"
        >
          <view class="benefit-item__icon">
            <image
              v-if="item.icon"
              class="benefit-item__icon-img"
              :src="item.icon"
              mode="aspectFit" alt=""
            />
            <text v-else class="benefit-item__emoji">{{ item.emoji }}</text>
          </view>
          <view class="benefit-item__content">
            <text class="benefit-item__title">{{ item.title }}</text>
            <text class="benefit-item__desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 套餐选择 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('vip.planTitle') }}</text>
      </view>
      <view class="plans-grid">
        <view
          v-for="plan in plans"
          :key="plan.id"
          class="plan-card press-feedback"
          :class="{
            'plan-card--selected': plan.id === selectedPlanId,
            'plan-card--popular': plan.popular,
          }"
          @tap="selectPlan(plan)"
          hover-class="plan-card--hover"
          hover-stay-time="100"
        >
          <!-- 角标 -->
          <view v-if="plan.badge" class="plan-card__badge">
            <text class="plan-card__badge-text">{{ plan.badge }}</text>
          </view>

          <!-- 选中标记 -->
          <view v-if="plan.id === selectedPlanId" class="plan-card__check">
            <text class="plan-card__check-icon">✓</text>
          </view>

          <!-- 套餐名称 -->
          <text class="plan-card__name">{{ plan.name }}</text>

          <!-- 价格 -->
          <view class="plan-card__price-row">
            <text class="plan-card__currency">¥</text>
            <text class="plan-card__price">{{ plan.price }}</text>
          </view>

          <!-- 原价（划线） -->
          <text v-if="plan.originalPrice" class="plan-card__original-price">¥{{ plan.originalPrice }}</text>

          <!-- 周期 -->
          <text class="plan-card__period">{{ plan.period }}</text>

          <!-- 每日均价 -->
          <text v-if="plan.perDay" class="plan-card__per-day">{{ plan.perDay }}</text>
        </view>
      </view>
    </view>

    <!-- 用户协议 -->
    <view class="agreement">
      <text class="agreement__text">{{ t('vip.agreementPrefix') }}</text>
      <text class="agreement__link">{{ t('vip.serviceAgreement') }}</text>
      <text class="agreement__text">·</text>
      <text class="agreement__link">{{ t('vip.autoRenewAgreement') }}</text>
    </view>

    <!-- 自动续费开关 -->
    <view class="section">
      <view class="auto-renew">
        <view class="auto-renew__info">
          <text class="auto-renew__title">{{ t('vip.autoRenewTitle') }}</text>
          <text class="auto-renew__desc">
            {{ autoRenewEnabled
                ? t('vip.autoRenewNextBilling', { date: nextBillingDate })
                : t('vip.autoRenewDesc') }}
          </text>
        </view>
        <switch
          :checked="autoRenewEnabled"
          color="#FFD700"
          :disabled="autoRenewStore.updating"
          @change="toggleAutoRenew"
        />
      </view>
    </view>

    <!-- VIP 相关功能入口 -->
    <view class="section">
      <view class="entry-list" role="list">
        <view
          class="entry-item press-feedback"
          @tap="goRedPacket"
          hover-class="entry-item--hover"
          hover-stay-time="100"
        >
          <text class="entry-item__icon">🧧</text>
          <text class="entry-item__label">{{ t('vip.redPacketNavTitle') }}</text>
          <text class="entry-item__arrow">›</text>
        </view>
        <view
          class="entry-item press-feedback"
          @tap="goPromoCode"
          hover-class="entry-item--hover"
          hover-stay-time="100"
        >
          <text class="entry-item__icon">🎫</text>
          <text class="entry-item__label">{{ t('vip.promoCodeNavTitle') }}</text>
          <text class="entry-item__arrow">›</text>
        </view>
        <view
          class="entry-item press-feedback"
          @tap="goBills"
          hover-class="entry-item--hover"
          hover-stay-time="100"
        >
          <text class="entry-item__icon">📋</text>
          <text class="entry-item__label">{{ t('vip.billsNavTitle') }}</text>
          <text class="entry-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 底部开通按钮（固定） -->
    <view class="footer">
      <view class="footer__price-row">
        <text class="footer__label">{{ t('vip.payableLabel') }}</text>
        <text class="footer__currency">¥</text>
        <text class="footer__price">{{ selectedPlan?.price }}</text>
        <text v-if="selectedPlan?.originalPrice" class="footer__original-price">¥{{ selectedPlan?.originalPrice }}</text>
      </view>
      <view
        class="footer__btn press-feedback"
        :class="{ 'footer__btn--disabled': processing }"
        @tap="subscribeGuarded"
        hover-class="footer__btn--hover"
        hover-stay-time="100"
      >
        <text class="footer__btn-text">{{ processing ? t('vip.processing') : t('vip.subscribe') }}</text>
      </view>
    </view>

    <!-- 底部安全区占位 -->
    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.vip-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: linear-gradient(180deg, var(--c-neutral-800, #1a1a2e) 0%, var(--c-neutral-800, #16213e) 100%);
  box-sizing: border-box;
  position: relative;
  padding-bottom: 200rpx;
}

/* ==================== 顶部导航栏 ==================== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  background: transparent;
  position: relative;
  z-index: 1;
}

.nav-bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &--hover {
    background: var(--c-overlay-white-bg-tint-mid, var(--c-overlay-white-bg-tint-mid, rgba(255, 255, 255, 0.1)));
    transform: scale(0.94);
  }
}

.nav-bar__back-icon {
  font-size: var(--fs-7xl, 56rpx);
  color: var(--c-text-inverse, #FFFFFF);
  font-weight: 300;
  line-height: 1;
}

.nav-bar__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

.nav-bar__placeholder {
  width: 64rpx;
  height: 64rpx;
}

/* ==================== 安全区占位 ==================== */
.safe-top {
  height: calc(constant(safe-area-inset-top) + 0rpx);
  height: calc(env(safe-area-inset-top) + 0rpx);
  flex-shrink: 0;
}

.safe-bottom {
  height: calc(constant(safe-area-inset-bottom) + 0rpx);
  height: calc(env(safe-area-inset-bottom) + 0rpx);
  flex-shrink: 0;
}

/* ==================== VIP 头部 ==================== */
.vip-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 32rpx 48rpx;
  position: relative;
  z-index: 1;
}

.vip-header__crown {
  width: 144rpx;
  height: 144rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-gold, #FFD700) 0%, var(--c-accent-400, #FFA500) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 32rpx var(--c-vip-border-tint, var(--c-vip-border-tint, rgba(255, 215, 0, 0.4)));
}

.vip-header__crown-emoji {
  font-size: 72rpx;
  line-height: 1;
}

.vip-header__title {
  font-size: var(--fs-5xl, 44rpx);
  font-weight: 800;
  color: var(--c-gold, #FFD700);
  margin-bottom: 8rpx;
  letter-spacing: 2rpx;
}

.vip-header__subtitle {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-overlay-white-text-mid, var(--c-overlay-white-text-mid, rgba(255, 255, 255, 0.7)));
}

/* ==================== 分组 ==================== */
.section {
  position: relative;
  z-index: 1;
  margin: 24rpx 24rpx 0;
}

.section__title {
  padding: 0 12rpx 12rpx;
}

.section__title-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-overlay-text-secondary, var(--c-overlay-text-secondary, var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85))));
  font-weight: 600;
}

/* ==================== 权益网格 ==================== */
.benefits-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.benefit-item {
  flex: 1 1 calc(50% - 8rpx);
  min-width: 280rpx;
  background: var(--c-overlay-white-bg-tint, var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.08)));
  border: 1rpx solid var(--c-vip-border-light, var(--c-vip-border-light, rgba(255, 215, 0, 0.2)));
  border-radius: 20rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  transition: all 0.15s ease;

  &--hover {
    transform: scale(0.98);
    background: var(--c-vip-border-light, var(--c-vip-border-light, rgba(255, 215, 0, 0.1)));
  }
}

.benefit-item__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background: linear-gradient(135deg, var(--c-vip-border-light, var(--c-vip-border-light, rgba(255, 215, 0, 0.2))) 0%, var(--c-accent-bg-tint, var(--c-accent-bg-tint, rgba(255, 165, 0, 0.1))) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.benefit-item__emoji {
  font-size: var(--fs-lg, 28rpx);
}

.benefit-item__icon-img {
  width: 32rpx;
  height: 32rpx;
  /* SVG 使用 currentColor，与 VIP 金色主题对齐 */
  color: var(--c-gold, #FFD700);
}

.benefit-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.benefit-item__title {
  font-size: var(--fs-md, 26rpx);
  font-weight: 600;
  color: var(--c-gold, #FFD700);
}

.benefit-item__desc {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-overlay-text-tertiary, var(--c-overlay-bg-strong, var(--c-overlay-bg-strong, rgba(255, 255, 255, 0.6))));
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ==================== 套餐网格 ==================== */
.plans-grid {
  display: flex;
  gap: 16rpx;
}

.plan-card {
  flex: 1;
  position: relative;
  background: var(--c-overlay-white-bg-tint, var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.08)));
  border: 2rpx solid var(--c-overlay-white-bg-tint-mid, var(--c-overlay-white-bg-tint-mid, rgba(255, 255, 255, 0.1)));
  border-radius: 20rpx;
  padding: 32rpx 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: all 0.2s ease;

  &--hover {
    transform: scale(0.97);
  }

  &--selected {
    background: linear-gradient(135deg, var(--c-vip-border-light, var(--c-vip-border-light, rgba(255, 215, 0, 0.18))) 0%, var(--c-accent-bg-tint, var(--c-accent-bg-tint, rgba(255, 165, 0, 0.08))) 100%);
    border-color: var(--c-gold, #FFD700);
    box-shadow: 0 4rpx 16rpx var(--c-vip-border-tint, var(--c-vip-border-tint, rgba(255, 215, 0, 0.25)));
  }

  &--popular {
    border-color: var(--c-vip-border-tint, var(--c-vip-border-tint, rgba(255, 215, 0, 0.5)));
  }
}

.plan-card__badge {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  padding: 4rpx 16rpx;
  background: linear-gradient(135deg, var(--c-gold, #FFD700) 0%, var(--c-accent-400, #FFA500) 100%);
  border-radius: 0 0 12rpx 12rpx;
  box-shadow: 0 2rpx 8rpx var(--c-accent-bg-tint, var(--c-accent-bg-tint, rgba(255, 165, 0, 0.3)));
}

.plan-card__badge-text {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-vip-dark, #5D4E37);
  font-weight: 700;
}

.plan-card__check {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: var(--c-gold, #FFD700);
  display: flex;
  align-items: center;
  justify-content: center;
}

.plan-card__check-icon {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-vip-dark, #5D4E37);
  font-weight: 700;
  line-height: 1;
}

.plan-card__name {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse, #FFFFFF);
  font-weight: 600;
}

.plan-card__price-row {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
  margin-top: 4rpx;
}

.plan-card__currency {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-gold, #FFD700);
  font-weight: 600;
}

.plan-card__price {
  font-size: var(--fs-6xl, 48rpx);
  color: var(--c-gold, #FFD700);
  font-weight: 800;
  line-height: 1;
}

.plan-card__original-price {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-overlay-text-placeholder, var(--c-overlay-white-bg-stronger, var(--c-overlay-white-bg-stronger, rgba(255, 255, 255, 0.4))));
  text-decoration: line-through;
}

.plan-card__period {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-overlay-white-text-mid, var(--c-overlay-white-text-mid, rgba(255, 255, 255, 0.7)));
  margin-top: 4rpx;
}

.plan-card__per-day {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-gold, var(--c-gold, rgba(255, 215, 0, 0.8)));
  margin-top: 2rpx;
}

/* ==================== 用户协议 ==================== */
.agreement {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  padding: 32rpx 24rpx 16rpx;
  position: relative;
  z-index: 1;
  gap: 4rpx;
}

.agreement__text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-overlay-text-quaternary, var(--c-overlay-bg-mid, var(--c-overlay-bg-mid, rgba(255, 255, 255, 0.5))));
}

.agreement__link {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-gold, #FFD700);
}

/* ==================== 底部固定按钮 ==================== */
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
  background: var(--c-neutral-800, var(--c-neutral-800, rgba(26, 26, 46, 0.95)));
  border-top: 1rpx solid var(--c-vip-border-light, var(--c-vip-border-light, rgba(255, 215, 0, 0.2)));
  z-index: 10;
}

.footer__price-row {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
}

.footer__label {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-overlay-white-text-mid, var(--c-overlay-white-text-mid, rgba(255, 255, 255, 0.7)));
}

.footer__currency {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-gold, #FFD700);
  font-weight: 600;
}

.footer__price {
  font-size: var(--fs-5xl, 44rpx);
  color: var(--c-gold, #FFD700);
  font-weight: 800;
  line-height: 1;
}

.footer__original-price {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-overlay-text-placeholder, var(--c-overlay-white-bg-stronger, var(--c-overlay-white-bg-stronger, rgba(255, 255, 255, 0.4))));
  text-decoration: line-through;
  margin-left: 8rpx;
}

.footer__btn {
  padding: 24rpx 56rpx;
  background: linear-gradient(135deg, var(--c-gold, #FFD700) 0%, var(--c-accent-400, #FFA500) 100%);
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx var(--c-accent-bg-tint, var(--c-accent-bg-tint, rgba(255, 165, 0, 0.4)));
  transition: all 0.15s ease;

  &--hover {
    transform: scale(0.96);
    box-shadow: 0 2rpx 8rpx var(--c-accent-bg-tint, var(--c-accent-bg-tint, rgba(255, 165, 0, 0.3)));
  }

  &--disabled {
    opacity: 0.6;
  }
}

.footer__btn-text {
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-vip-dark, #5D4E37);
  font-weight: 700;
}

/* ==================== 自动续费 ==================== */
.auto-renew {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.auto-renew__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.auto-renew__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: var(--c-gold, #FFD700);
}

.auto-renew__desc {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-overlay-text-tertiary, rgba(255, 255, 255, 0.6));
  line-height: 1.4;
}

/* ==================== 功能入口 ==================== */
.entry-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.entry-item {
  display: flex;
  align-items: center;
  padding: 20rpx 8rpx;
  border-radius: var(--r-lg, 16rpx);
  transition: all 0.15s ease;

  &--hover {
    transform: scale(0.98);
    background: var(--c-vip-border-light, rgba(255, 215, 0, 0.08));
  }
}

.entry-item__icon {
  font-size: var(--fs-4xl, 40rpx);
  margin-right: 16rpx;
  width: 56rpx;
  text-align: center;
}

.entry-item__label {
  flex: 1;
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-overlay-white-text-mid, rgba(255, 255, 255, 0.85));
  font-weight: 500;
}

.entry-item__arrow {
  font-size: var(--fs-2xl, 32rpx);
  color: var(--c-overlay-text-tertiary, rgba(255, 255, 255, 0.4));
}
</style>
