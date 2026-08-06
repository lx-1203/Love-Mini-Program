<script setup lang="ts">
/**
 * 我的钱包（交友币）
 *
 * 展示交友币余额、收支明细（账单）、演示充值入口。
 * 数据源：useCoinsStore（mock 内存 / real /api/v1/wallet/*）。
 * 解锁私信/访客/喜欢你/悄悄话均从此余额扣费（见 stores/coins.ts）。
 */
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useCoinsStore } from "../../stores/coins";
import { request } from "../../services/http";
import { lightHaptic, successHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();
const coinsStore = useCoinsStore();

/** 余额（元） */
const balanceYuan = computed<number>(() => coinsStore.balanceYuan);

/** 流水列表 */
const transactions = computed(() => coinsStore.transactions);

/** 加载状态 */
const loading = ref(false);

onShow(async () => {
  loading.value = true;
  try {
    await Promise.all([
      coinsStore.fetchBalance(true),
      coinsStore.listTransactions({ page: 0, size: 20 }),
    ]);
  } catch (_e) {
    // 网络异常静默，页面展示兜底文案
  } finally {
    loading.value = false;
  }
});

/** 演示充值：+100 元（wallet/recharge 双 profile 可用：mock 内存 / real 数据库） */
async function handleRecharge() {
  lightHaptic();
  try {
    const orderId = `RECHARGE-DEMO-${Date.now()}`;
    await request<{ balanceAfterCents: number }, { amountCents: number; orderId: string }>({
      url: "/wallet/recharge",
      method: "POST",
      data: { amountCents: 10000, orderId },
      headers: { "Idempotency-Key": orderId },
    });
    await Promise.all([
      coinsStore.fetchBalance(true),
      coinsStore.listTransactions({ page: 0, size: 20 }),
    ]);
    successHaptic();
    uni.showToast({ title: t("wallet.rechargeSuccess", { n: 100 }), icon: "success" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    uni.showToast({ title: message, icon: "none" });
  }
}

/** 返回上一页 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: "/pages/profile/index" });
  }
}

/** 流水类型文案（收入/支出） */
function typeLabel(type?: string): string {
  return type === "CREDIT" ? t("wallet.income") : t("wallet.expense");
}

/** 金额文本（收入 +，支出 -） */
function amountText(item: { type?: string; amount: number }): string {
  const sign = item.type === "CREDIT" ? "+" : "-";
  return `${sign}¥${(item.amount / 100).toFixed(0)}`;
}
</script>

<template>
  <view class="wallet page-fade-in">
    <!-- 顶部栏 -->
    <view class="wallet__header">
      <view class="wallet__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="wallet__back-text">‹</text>
      </view>
      <text class="wallet__title">{{ t('wallet.title') }}</text>
      <view class="wallet__header-spacer" />
    </view>

    <!-- 余额卡 -->
    <view class="wallet__balance-card">
      <image class="wallet__balance-icon" :src="IMAGE_PATHS.ICONS_EMOJI.MONEY" mode="aspectFit" alt="" />
      <text class="wallet__balance-label">{{ t('wallet.balanceLabel') }}</text>
      <view class="wallet__balance-value-row">
        <text class="wallet__balance-currency">¥</text>
        <text class="wallet__balance-value">{{ loading ? '--' : balanceYuan.toFixed(0) }}</text>
      </view>
      <text class="wallet__balance-hint">{{ t('wallet.balanceHint') }}</text>
      <view class="wallet__recharge press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('wallet.recharge')" @tap="handleRecharge">
        <text class="wallet__recharge-text">{{ t('wallet.recharge') }}</text>
      </view>
    </view>

    <!-- 收支明细 -->
    <view class="wallet__section">
      <text class="wallet__section-title">{{ t('wallet.transactions') }}</text>
      <view v-if="transactions.length > 0" class="wallet__tx-list">
        <view v-for="tx in transactions" :key="tx.id" class="wallet__tx-item">
          <view class="wallet__tx-info">
            <text class="wallet__tx-type">{{ typeLabel(tx.type) }}</text>
            <text class="wallet__tx-remark">{{ tx.remark || tx.relatedType || '' }}</text>
          </view>
          <text class="wallet__tx-amount" :class="{ 'wallet__tx-amount--income': tx.type === 'CREDIT' }">
            {{ amountText(tx) }}
          </text>
        </view>
      </view>
      <text v-else class="wallet__empty">{{ t('wallet.empty') }}</text>
    </view>

    <!-- 底部留白 -->
    <view class="wallet__footer-space" />
  </view>
</template>

<style scoped lang="scss">
.wallet {
  min-height: 100vh;
  background: var(--c-bg-page, #f4f6fa);
  padding-bottom: env(safe-area-inset-bottom);
}

.wallet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--sp-4) + env(safe-area-inset-top)) var(--sp-4) var(--sp-3);
  background: linear-gradient(135deg, var(--c-brand-500, #3fcf8e) 0%, var(--c-brand-400, #6fe0b0) 100%);
}

.wallet__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.2));
}

.wallet__back-text {
  font-size: var(--fs-3xl, 40rpx);
  color: var(--c-text-inverse, #ffffff);
  line-height: 1;
}

.wallet__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.wallet__header-spacer {
  width: 64rpx;
}

.wallet__balance-card {
  margin: var(--sp-5) var(--sp-4);
  padding: var(--sp-6);
  border-radius: var(--r-2xl, 32rpx);
  background: linear-gradient(135deg, var(--c-brand-500, #3fcf8e) 0%, var(--c-brand-400, #6fe0b0) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  box-shadow: 0 16rpx 40rpx var(--c-brand-bg-tint-strong, rgba(63, 207, 142, 0.35));
}

.wallet__balance-icon {
  width: 72rpx;
  height: 72rpx;
}

.wallet__balance-label {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85));
}

.wallet__balance-value-row {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.wallet__balance-currency {
  font-size: var(--fs-3xl, 40rpx);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.wallet__balance-value {
  font-size: var(--fs-7xl, 64rpx);
  font-weight: 800;
  color: var(--c-text-inverse, #ffffff);
}

.wallet__balance-hint {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85));
}

.wallet__recharge {
  margin-top: var(--sp-3);
  padding: 12rpx 40rpx;
  border-radius: var(--r-full);
  background: var(--c-text-inverse, #ffffff);
}

.wallet__recharge-text {
  font-size: var(--fs-base, 26rpx);
  font-weight: 700;
  color: var(--c-brand-600, #22a35f);
}

.wallet__section {
  margin: 0 var(--sp-4);
}

.wallet__section-title {
  display: block;
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1a2332);
  margin-bottom: var(--sp-3);
}

.wallet__tx-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.wallet__tx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--r-lg, 16rpx);
  background: var(--c-bg-container, #ffffff);
  border: 1rpx solid var(--c-divider-light, #f1f5f9);
}

.wallet__tx-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.wallet__tx-type {
  font-size: var(--fs-base, 26rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1a2332);
}

.wallet__tx-remark {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wallet__tx-amount {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-secondary, #475569);
  flex-shrink: 0;
}

.wallet__tx-amount--income {
  color: var(--c-success, #22c55e);
}

.wallet__empty {
  display: block;
  padding: var(--sp-8) 0;
  text-align: center;
  font-size: var(--fs-base, 26rpx);
  color: var(--c-text-tertiary, #94a3b8);
}

.wallet__footer-space {
  height: env(safe-area-inset-bottom);
}
</style>
