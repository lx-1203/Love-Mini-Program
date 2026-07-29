<script setup lang="ts">
/**
 * VIP 账单页
 *
 * 功能：
 * - 展示用户 VIP 订阅、续费、退款等账单历史
 * - 支持下拉刷新
 * - 支持按类型筛选（全部/订阅/续费/退款）
 *
 * mp-weixin 兼容：
 * - 使用 @tap / hover-class 而非 click / :hover
 * - 使用 onPullDownRefresh 实现下拉刷新
 * - 不使用 import.meta.env
 */
import { ref, computed } from "vue";
import { onPullDownRefresh } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useVipBillingStore, type BillType } from "../../stores/vip-billing";
import { lightHaptic } from "../../utils/haptic";
import EmptyState from "../../components/common/EmptyState.vue";

const { t } = useI18n();
const store = useVipBillingStore();

/** 筛选类型：ALL / SUBSCRIBE / RENEW / REFUND */
const filterType = ref<"ALL" | BillType>("ALL");

/** 筛选选项 */
const filterOptions = computed<{ value: "ALL" | BillType; label: string }[]>(() => [
  { value: "ALL", label: t("vip.billsFilterAll") },
  { value: "SUBSCRIBE", label: t("vip.billsFilterSubscribe") },
  { value: "RENEW", label: t("vip.billsFilterRenew") },
  { value: "REFUND", label: t("vip.billsFilterRefund") },
]);

/** 筛选后的账单列表 */
const filteredBills = computed(() => {
  if (filterType.value === "ALL") {
    return store.bills;
  }
  return store.bills.filter((b) => b.type === filterType.value);
});

/** 加载状态 */
const isLoading = computed(() => store.loading);

/** 是否为空 */
const isEmpty = computed(() => filteredBills.value.length === 0);

/** 选择筛选类型 */
function selectFilter(type: "ALL" | BillType) {
  lightHaptic();
  filterType.value = type;
}

/** 加载账单数据 */
async function loadBills(forceRefresh = false) {
  try {
    await store.listBills(forceRefresh);
  } catch (error) {
    const message = error instanceof Error ? error.message : t("vip.billsLoadFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/** 下拉刷新 */
onPullDownRefresh(async () => {
  await loadBills(true);
  uni.stopPullDownRefresh();
});

/** 格式化金额（分 → 元） */
function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** 格式化日期 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch (_e) {
    return dateStr;
  }
}

/** 类型标签颜色 */
function typeColor(type: BillType): string {
  if (type === "SUBSCRIBE") return "bill-card__type--subscribe";
  if (type === "RENEW") return "bill-card__type--renew";
  if (type === "REFUND") return "bill-card__type--refund";
  return "";
}

/** 状态标签颜色 */
function statusColor(status: string): string {
  if (status === "SUCCESS") return "bill-card__status--success";
  if (status === "FAILED") return "bill-card__status--failed";
  if (status === "REFUNDED") return "bill-card__status--refunded";
  return "";
}

/** 翻译类型 */
function typeLabel(type: BillType): string {
  if (type === "SUBSCRIBE") return t("vip.billsTypeSubscribe");
  if (type === "RENEW") return t("vip.billsTypeRenew");
  if (type === "REFUND") return t("vip.billsTypeRefund");
  return type;
}

/** 翻译状态 */
function statusLabel(status: string): string {
  if (status === "SUCCESS") return t("vip.billsStatusSuccess");
  if (status === "FAILED") return t("vip.billsStatusFailed");
  if (status === "REFUNDED") return t("vip.billsStatusRefunded");
  return status;
}

/** 返回上一页 */
function goBack() {
  lightHaptic();
  uni.navigateBack({ delta: 1 });
}

// 初始化加载
loadBills();
</script>

<template>
  <view class="bills-page page-fade-in">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100">
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">{{ t('vip.billsNavTitle') }}</text>
      <view class="nav-bar__placeholder" />
    </view>

    <view class="safe-top" />

    <!-- 主视觉 -->
    <view class="hero">
      <view class="hero__icon">
        <text class="hero__icon-emoji">📋</text>
      </view>
      <text class="hero__title">{{ t('vip.billsHeroTitle') }}</text>
      <text class="hero__subtitle">{{ t('vip.billsHeroSubtitle') }}</text>
    </view>

    <!-- 筛选 -->
    <scroll-view scroll-x class="filter-bar">
      <view class="filter-bar__inner">
        <view
          v-for="opt in filterOptions" :key="opt.value"
          class="filter-chip press-feedback"
          :class="{ 'filter-chip--active': filterType === opt.value }"
          @tap="selectFilter(opt.value)"
          hover-class="filter-chip--hover"
          hover-stay-time="100"
        >
          <text class="filter-chip__text">{{ opt.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 账单列表 -->
    <view class="bills-list" role="list">
      <!-- 加载中骨架 -->
      <view v-if="isLoading && isEmpty" class="empty-state">
        <text class="empty-state__text">{{ t('common.loading') }}</text>
      </view>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="isEmpty"
        :title="t('vip.billsEmpty')"
        type="no-data"
      />

      <!-- 账单卡片 -->
      <view
        v-for="bill in filteredBills" :key="bill.id"
        class="bill-card"
      >
        <view class="bill-card__header">
          <view class="bill-card__type" :class="typeColor(bill.type)">
            <text class="bill-card__type-text">{{ typeLabel(bill.type) }}</text>
          </view>
          <view class="bill-card__status" :class="statusColor(bill.status)">
            <text class="bill-card__status-text">{{ statusLabel(bill.status) }}</text>
          </view>
        </view>
        <view class="bill-card__body">
          <view class="bill-card__row">
            <text class="bill-card__label">{{ t('vip.billsCardPlan') }}</text>
            <text class="bill-card__value">{{ bill.planName || bill.planId || '-' }}</text>
          </view>
          <view class="bill-card__row">
            <text class="bill-card__label">{{ t('vip.billsCardAmount') }}</text>
            <text class="bill-card__value bill-card__value--amount">¥{{ formatAmount(bill.amount) }}</text>
          </view>
          <view v-if="bill.originalAmount" class="bill-card__row">
            <text class="bill-card__label">{{ t('vip.billsCardOriginal') }}</text>
            <text class="bill-card__value bill-card__value--strike">¥{{ formatAmount(bill.originalAmount) }}</text>
          </view>
          <view v-if="bill.periodStart && bill.periodEnd" class="bill-card__row">
            <text class="bill-card__label">{{ t('vip.billsCardPeriod') }}</text>
            <text class="bill-card__value">
              {{ formatDate(bill.periodStart) }} ~ {{ formatDate(bill.periodEnd) }}
            </text>
          </view>
          <view v-if="bill.paymentMethod" class="bill-card__row">
            <text class="bill-card__label">{{ t('vip.billsCardPayMethod') }}</text>
            <text class="bill-card__value">{{ bill.paymentMethod === 'WECHAT' ? t('vip.billsPayWechat') : bill.paymentMethod }}</text>
          </view>
          <view v-if="bill.transactionId" class="bill-card__row">
            <text class="bill-card__label">{{ t('vip.billsCardTxnId') }}</text>
            <text class="bill-card__value bill-card__value--mono">{{ bill.transactionId }}</text>
          </view>
          <view v-if="bill.remark" class="bill-card__row">
            <text class="bill-card__label">{{ t('vip.billsCardRemark') }}</text>
            <text class="bill-card__value">{{ bill.remark }}</text>
          </view>
          <view class="bill-card__row">
            <text class="bill-card__label">{{ t('vip.billsCardCreatedAt') }}</text>
            <text class="bill-card__value">{{ formatDate(bill.createdAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.bills-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-bg-page);
  box-sizing: border-box;
  position: relative;
  padding-bottom: 80rpx;
}

/* ==================== 导航栏 ==================== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  /* 容器背景：使用 token 替代硬编码 #FFFFFF */
  background: var(--c-bg-container);
  border-bottom: 1rpx solid var(--c-border-light);
}
.nav-bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  &--hover {
    background: var(--c-bg-secondary);
    transform: scale(0.94);
  }
}
.nav-bar__back-icon {
  font-size: var(--fs-7xl, 56rpx);
  color: var(--c-text-primary);
  font-weight: 300;
  line-height: 1;
}
.nav-bar__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary);
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
  padding: 32rpx 32rpx 24rpx;
  background: linear-gradient(135deg, var(--c-gold) 0%, var(--c-accent-400) 100%);
}
.hero__icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-border-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}
.hero__icon-emoji {
  font-size: var(--fs-6xl, 48rpx);
  line-height: 1;
}
.hero__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 800;
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
  margin-bottom: 4rpx;
}
.hero__subtitle {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-overlay-text-secondary);
}

/* ==================== 筛选 ==================== */
.filter-bar {
  /* 容器背景：使用 token 替代硬编码 #FFFFFF */
  background: var(--c-bg-container);
  padding: 16rpx 0;
  white-space: nowrap;
  border-bottom: 1rpx solid var(--c-border-light);
}
.filter-bar__inner {
  display: inline-flex;
  gap: 12rpx;
  padding: 0 24rpx;
}
.filter-chip {
  display: inline-flex;
  padding: 12rpx 32rpx;
  background: var(--c-bg-secondary);
  border-radius: var(--r-full, 9999rpx);
  border: 2rpx solid transparent;
  transition: all var(--d-fast, 120ms) ease;
  &--hover {
    transform: scale(0.96);
  }
  &--active {
    background: var(--c-gold-bg-tint);
    border-color: var(--c-gold);
  }
}
.filter-chip__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
  font-weight: 600;
}
.filter-chip--active .filter-chip__text {
  color: var(--c-gold);
}

/* ==================== 账单列表 ==================== */
.bills-list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* ==================== 空状态 ==================== */
.empty-state {
  padding: 80rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.empty-state__icon {
  font-size: 96rpx;
}
.empty-state__text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-tertiary);
}

/* ==================== 账单卡片 ==================== */
.bill-card {
  /* 容器背景：使用 token 替代硬编码 #FFFFFF */
  background: var(--c-bg-container);
  border-radius: var(--r-lg, 20rpx);
  padding: 24rpx;
  box-shadow: var(--s-sm);
  border: 1rpx solid var(--c-border-light);
}
.bill-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16rpx;
  border-bottom: 1rpx dashed var(--c-border-light);
  margin-bottom: 16rpx;
}
.bill-card__type {
  padding: 4rpx 16rpx;
  border-radius: var(--r-sm, 8rpx);
  background: var(--c-romance-bg-tint);
  &--subscribe {
    background: var(--c-success-bg-tint);
  }
  &--renew {
    background: var(--c-info-bg-tint);
  }
  &--refund {
    background: var(--c-red-bg-tint);
  }
}
.bill-card__type-text {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 600;
  color: var(--c-romance-500);
}
.bill-card__type--subscribe .bill-card__type-text {
  color: var(--c-success);
}
.bill-card__type--renew .bill-card__type-text {
  color: var(--c-secondary-blue-500);
}
.bill-card__type--refund .bill-card__type-text {
  color: var(--c-error);
}
.bill-card__status {
  padding: 4rpx 16rpx;
  border-radius: var(--r-sm, 8rpx);
  background: var(--c-success-bg-tint);
  &--success {
    background: var(--c-success-bg-tint);
  }
  &--failed {
    background: var(--c-red-bg-tint);
  }
  &--refunded {
    background: var(--c-warning-bg-tint);
  }
}
.bill-card__status-text {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 600;
  color: var(--c-success);
}
.bill-card__status--failed .bill-card__status-text {
  color: var(--c-error);
}
.bill-card__status--refunded .bill-card__status-text {
  color: var(--c-warning);
}
.bill-card__body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.bill-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.bill-card__label {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}
.bill-card__value {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-primary);
  text-align: right;
  word-break: break-all;
  &--amount {
    font-weight: 700;
    color: var(--c-romance-500);
    font-size: var(--fs-2xl, 32rpx);
  }
  &--strike {
    text-decoration: line-through;
    color: var(--c-text-tertiary);
    font-size: var(--fs-base, 24rpx);
  }
  &--mono {
    font-family: monospace;
    font-size: var(--fs-base, 24rpx);
  }
}
</style>
