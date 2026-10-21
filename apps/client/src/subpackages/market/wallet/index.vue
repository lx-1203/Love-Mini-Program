<script setup lang="ts">
/**
 * 我的钱包（交友币）
 *
 * 展示交友币余额、收支明细（账单）、演示充值入口。
 * 数据源：useCoinsStore（mock 内存 / real /api/v1/wallet/*）。
 * 解锁私信/访客/喜欢你/悄悄话均从此余额扣费（见 stores/coins.ts）。
 */
import { ref, computed, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useCoinsStore } from "../../../stores/coins";
import { useAppConfigStore } from "../../../stores/app-config";
import { request } from "../../../services/http";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
import { lightHaptic, successHaptic } from "../../../utils/haptic";
import { IMAGE_PATHS } from "../../../config/images";
// R4-00067: 演示充值仅限 mock/开发环境（真实模式禁止无限刷余额）
import { useMock } from "../../../stores/helpers/use-mock";
import { isDev } from "../../../config/env";
// R10-P1-003：注入 --statusbar/--capsule-right（DevTools env(safe-area-inset-top) 恒 0，标题叠印状态栏）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();
const coinsStore = useCoinsStore();
const appConfig = useAppConfigStore();

/**
 * 商业化封存（批次 A / ADR-2）：交友币属 commerce.coin 子闸管辖。
 * 缺省封存（=== true 才放行），mock 后端未下发 commerce.* 时恒为封存态。
 */
const commerceSealed = computed(() => !appConfig.isCommerceOn("coin"));

/** 余额（元） */
const balanceYuan = computed<number>(() => coinsStore.balanceYuan);

/** 流水列表 */
const transactions = computed(() => coinsStore.transactions);

/** 加载状态 */
const loading = ref(false);

// MP-R2-次要22-004：解封补偿——配置异步拉回后自动补拉余额/流水，
// 避免解封后余额显示兜底 0 元、流水显示「暂无流水」误导用户
watch(commerceSealed, (sealed) => {
  if (!sealed && !loading.value) {
    void refreshWallet();
  }
});

// MP-R2-次要22-011：加载失败态（原网络异常静默后余额显示兜底 0 元、流水显示
// 「暂无流水」，与真实空账不可区分）+ 统一刷新函数（onShow 与解封补偿共用）
const loadFailed = ref(false);

async function refreshWallet(): Promise<void> {
  loading.value = true;
  loadFailed.value = false;
  try {
    await Promise.all([
      coinsStore.fetchBalance(true),
      coinsStore.listTransactions({ page: 0, size: 20 }),
    ]);
  } catch (_e) {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

onShow(async () => {
  // 批次 A / ADR-2：封存态不发任何钱包请求（余额/流水均不拉取）
  if (commerceSealed.value) return;
  await refreshWallet();
});

/** 演示充值进行中锁（MP-R1-C26REQ-002：防重入——快击 N 次即 N 个不同幂等键的
 *  POST /wallet/recharge，服务端幂等头无法去重，理论快击 5 次入账 5×¥100） */
const recharging = ref(false);
/** 演示充值：+100 元（wallet/recharge 双 profile 可用：mock 内存 / real 数据库） */
async function handleRecharge() {
  // MP-R1-C26REQ-002：在途/冷却期内忽略重复点击
  if (recharging.value) return;
  // 封存守卫（ADR-2）：封存态禁止充值请求
  if (commerceSealed.value) {
    uni.showToast({ title: t("commerce.sealedToast"), icon: "none" });
    return;
  }
  recharging.value = true;
  lightHaptic();
  try {
    // 修复（P0-12）：后端 RechargeRequest 仅含 amountCents（orderId 由服务端生成），
    // 删除请求体中的 orderId 字段；orderId 仅作为 Idempotency-Key 请求头防重复提交。
    // MP-R1-C26REQ-002：幂等键单次流程内固定（原 Date.now() 每击重生成，服务端无法去重）
    const orderId = `RECHARGE-DEMO-${Date.now()}`;
    await request<{ balanceAfterCents: number }, { amountCents: number }>({
      url: "/wallet/recharge",
      method: "POST",
      data: { amountCents: 10000 },
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
  } finally {
    recharging.value = false;
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

/**
 * P1-18：判断流水是否为收入。
 * 兼容两种取值：服务层流水类型为 CREDIT（收入）/ DEBIT（支出），
 * 种子/历史数据可能为 INCOME / EXPENSE，统一按收入/支出语义归类。
 */
function isIncome(type?: string): boolean {
  return type === "CREDIT" || type === "INCOME";
}

/** 流水类型文案（收入/支出） */
function typeLabel(type?: string): string {
  return isIncome(type) ? t("wallet.income") : t("wallet.expense");
}

/** 金额文本（收入 +，支出 -） */
function amountText(item: { type?: string; amount: number }): string {
  const sign = isIncome(item.type) ? "+" : "-";
  return `${sign}¥${(item.amount / 100).toFixed(2)}`;
}
</script>

<template>
  <view class="wallet" :style="menuStyleVars">
    <!-- 顶部栏 -->
    <view class="wallet__header">
      <view class="wallet__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <!-- R9-L14-D14：字形 ‹（36rpx 白字，帧内仅剩约 10×10px 细笔画）换成与
             shop:278 / detail:299 同档的 40rpx BACK 素材，同域两页控件取档一致 -->
        <image class="wallet__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
      </view>
      <text class="wallet__title">{{ t('wallet.title') }}</text>
      <view class="wallet__header-spacer" />
    </view>

    <!-- 批次 A / ADR-2：商业化封存态（commerce.coin=false）展示封存卡，隐藏余额/充值/明细 -->
    <template v-if="!commerceSealed">
      <!-- 余额卡 -->
      <view class="wallet__balance-card">
        <image class="wallet__balance-icon" :src="IMAGE_PATHS.ICONS_EMOJI.MONEY" mode="aspectFit" alt="" />
        <text class="wallet__balance-label">{{ t('wallet.balanceLabel') }}</text>
        <view class="wallet__balance-value-row">
          <text class="wallet__balance-currency">¥</text>
          <text class="wallet__balance-value">{{ (loading || loadFailed) ? '--' : balanceYuan.toFixed(2) }}</text>
        </view>
        <text class="wallet__balance-hint">{{ t('wallet.balanceHint') }}</text>
        <!-- R4-00067：演示充值无支付流程（直接 POST /wallet/recharge 入账），
             仅 mock/开发环境展示；真实模式隐藏，避免用户无限刷余额 -->
        <view
          v-if="useMock() || isDev"
          class="wallet__recharge press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('wallet.recharge')" @tap="handleRecharge"
        >
          <text class="wallet__recharge-text">{{ t('wallet.recharge') }}</text>
        </view>
      </view>

      <!-- 收支明细 -->
      <view class="wallet__section">
        <!-- MP-R2-次要22-011：加载失败重试条 -->
      <view v-if="loadFailed" class="wallet__load-error">
        <text class="wallet__load-error-text">{{ t('common.networkError') }}</text>
        <view class="wallet__load-error-retry press-feedback" role="button" @tap="refreshWallet">
          <text class="wallet__load-error-retry-text">{{ t('common.retry') }}</text>
        </view>
      </view>
      <text class="wallet__section-title">{{ t('wallet.transactions') }}</text>
        <view v-if="transactions.length > 0" class="wallet__tx-list">
          <view v-for="tx in transactions" :key="tx.id" class="wallet__tx-item">
            <view class="wallet__tx-info">
              <text class="wallet__tx-type">{{ typeLabel(tx.type) }}</text>
              <text class="wallet__tx-remark">{{ tx.remark || tx.relatedType || '' }}</text>
            </view>
            <text class="wallet__tx-amount" :class="{ 'wallet__tx-amount--income': isIncome(tx.type) }">
              {{ amountText(tx) }}
            </text>
          </view>
        </view>
        <!-- 2026-09-03 骨架屏：明细首拉中占位 -->
        <view v-else-if="loading" role="status" aria-live="polite">
          <SkeletonBlock variant="list" :rows="3" :label="t('common.loading')" />
        </view>
        <text v-else class="wallet__empty">{{ t('wallet.empty') }}</text>
      </view>
    </template>

    <!-- 封存态卡（SVG 锁图标，禁 emoji） -->
    <view v-else class="wallet__sealed" aria-live="polite">
      <image class="wallet__sealed-icon" :src="IMAGE_PATHS.ICONS_COMMON.LOCK_SVG" mode="aspectFit" alt="" />
      <text class="wallet__sealed-title">{{ t('commerce.sealedTitle') }}</text>
      <text class="wallet__sealed-desc">{{ t('commerce.sealedDesc') }}</text>
    </view>

    <!-- 底部留白 -->
    <view class="wallet__footer-space" />
  </view>
</template>

<style scoped lang="scss">
/* MP-R2-次要22-011：加载失败重试条 */
.wallet__load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin: 0 0 20rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: var(--c-error-bg-tint, rgba(229, 69, 77, 0.1));
}
.wallet__load-error-text {
  flex: 1;
  font-size: 24rpx;
  color: var(--c-error, #E5454D);
}
.wallet__load-error-retry {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36C99A);
}
.wallet__load-error-retry-text {
  font-size: 24rpx;
  color: var(--c-neutral-0, #FFFFFF);
}

.wallet {
  min-height: 100vh;
  background: var(--c-bg-page, #f4f6fa);
  padding-bottom: env(safe-area-inset-bottom);
}

/* R9-L14-D12：页头由 135° 渐变 #36C99A→#55D5A7 收成 --c-brand-800 #156B51 纯色。
   0.95 白（--c-text-inverse=rgba(255,255,255,0.95)，design-variables.scss:369/749）
   压 brand-500 仅 2.03:1、压 brand-400 仅 1.78:1，整段不达正文级 4.5:1；
   brand-600 #2AAE83=2.81:1、brand-700 #1F8D6A=4.14:1 也够不到，
   故按 LockScreen.vue:736 同源结论取同族最深档：brand-800 相对亮度 L=0.11269，
   0.95 白合成 #F3F8F6 L=0.92669 ⇒ 0.97669/0.16269 = 6.00:1（纯白 6.45:1）≥ 4.5:1，
   且整条页头同一底色，标题横向任意位置比值不变（原渐变右端更差）。
   只改本站点消费侧，不动全局令牌。 */
.wallet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* R10-L14-D10（位置 P3）：横向内缩原取 --sp-4 = 16rpx = 8px，帧内返回盘左缘落 x≈9，
     而本页封存卡左缘是 15.5px（R9-L14-D16 刚收到 --page-padding）⇒ 卡比自己的页头向右缩 7px，
     页头与卡不成一条竖边；同域三页页头内缩 8/12/16px 三套值。
     横向改 --page-padding（32rpx=16px）⇒ 与 shop 页头同档、与本页卡缘成同一条竖边。
     纵向 top 的 calc 不动（状态栏让位由 menuStyleVars 注入 --statusbar，已知机制 §4）。 */
  padding: calc(var(--sp-4) + var(--statusbar, env(safe-area-inset-top))) var(--page-padding, 32rpx) var(--sp-3);
  background: var(--c-brand-800, #156B51);
}

/* R9-L14-D13：底盘原走 --c-overlay-white-bg-tint 实值 0.08 白
   （design-variables.scss:914；圆盘合成 #46CDA2，对页头 #36C99A 仅 1.06:1，
   帧内盘内没有任何 >248 的像素 ⇒ 圆盘不可见），改与 shop/detail 同档的
   --c-bg-container 白底 + --c-border-card（design-variables.scss:541 / 128）。
   白盘对 brand-800 = 1.05/0.16269 = 6.45:1 ≥ 非文本 3:1。 */
.wallet__back {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-container, #ffffff);
  border: var(--c-border-card);

  /* R10-L14-D07（可达性 P1）：本页 navigationStyle 为 custom（pages.json:49）没有系统返回箭头，
     封存分支（:212-216）内又没有任何其他控件 ⇒ 这枚 64rpx=32.3px 的白盘是唯一退出控件，
     点不中就走不出「我的钱包」。上一轮 R9-B49 给同域 shop/detail 补过命中盒（shop:437 /
     detail:444），本页独独漏了这条轴 ⇒ 同口径补透明伪元素：视觉圆仍 64rpx，
     四边各 -12rpx ⇒ 命中盒 88rpx=44.4px（全站最小可点档）。 */
  &::after {
    content: "";
    position: absolute;
    top: -12rpx;
    right: -12rpx;
    bottom: -12rpx;
    left: -12rpx;
  }
}

/* R9-L14-D14：与 shop:435 同档，40rpx=20px 的 BACK 素材 */
.wallet__back-icon {
  width: 40rpx;
  height: 40rpx;
}

/* R9-L14-D15：页标题 --fs-xl 实值 30rpx=15.1px，与正文档同级 ⇒ 提到与 shop:439
   同档的 --fs-5xl 44rpx=22.2px / 800（design-variables.scss:569），
   深绿底白字 6.00:1 不受字号档位影响 */
.wallet__title {
  font-size: var(--fs-5xl, 44rpx);
  font-weight: 800;
  color: var(--c-text-inverse, #ffffff);
}

.wallet__header-spacer {
  width: 64rpx;
}

.wallet__balance-card {
  margin: var(--sp-5) var(--sp-4);
  padding: var(--sp-6);
  border-radius: var(--r-2xl, 32rpx);
  background: linear-gradient(135deg, var(--c-brand-500, #36C99A) 0%, var(--c-brand-400, #6fe0b0) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  box-shadow: 0 16rpx 40rpx var(--c-brand-bg-tint-strong, rgba(61, 201, 148, 0.35));
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

/* ========== 批次 A / ADR-2：商业化封存态 ========== */
/* R9-L14-D16：左右外边距原为 --sp-4 16rpx=8px（只有页边距 --page-padding 32rpx=16px
   的一半，帧内卡左缘 10px），与 shop 卡 12px 不成档 ⇒ 收到 --page-padding */
.wallet__sealed {
  margin: var(--sp-10) var(--page-padding);
  padding: var(--sp-8) var(--sp-6);
  border-radius: var(--r-2xl, 32rpx);
  background: var(--c-bg-container, #ffffff);
  border: 1rpx solid var(--c-divider-light, #f1f5f9);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
}

.wallet__sealed-icon {
  width: 96rpx;
  height: 96rpx;
  opacity: 0.55;
}

.wallet__sealed-title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1a2332);
}

.wallet__sealed-desc {
  /* R10-L14-D08（字号 P2）：这句「为什么这页是空的」是本页唯一的解释行，
     原 --fs-sm 实值 22rpx=11.1px（design-variables.scss:561；行内 24rpx 是过期字面量兜底，
     已知机制 §2 点名不要信 .vue 里的过期 fallback），与角标/法务同档、比同屏封存标题小 4px。
     R9-L14-D11 的卡建议原文写「三页同改」，实际只落了 shop:759 / detail:563 两页 ⇒ 本页补上，
     与两页逐字同写法：--fs-md 26rpx=13.1px，并清掉过期 fallback。 */
  font-size: var(--fs-md);
  color: var(--c-text-tertiary, #94a3b8);
  text-align: center;
  line-height: 1.6;
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
