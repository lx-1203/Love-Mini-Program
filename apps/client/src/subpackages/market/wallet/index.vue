<script setup lang="ts">
/**
 * 我的钱包（交友币）
 *
 * 展示交友币余额、收支明细（账单）、演示充值入口。
 * 数据源：useCoinsStore（mock 内存 / real /api/v1/wallet/*）。
 * 解锁私信/访客/喜欢你/悄悄话均从此余额扣费（见 stores/coins.ts）。
 */
import { ref, computed, watch } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useCoinsStore } from "../../../stores/coins";
import { useAppConfigStore } from "../../../stores/app-config";
import { request } from "../../../services/http";
// P1 修复（2026-10-31）：充值幂等键要跨「页面卸载 / H5 刷新」存活 ⇒ 落盘，键名统一登记
import { STORAGE_KEYS } from "../../../constants/storage-keys";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
import { lightHaptic, successHaptic } from "../../../utils/haptic";
import { IMAGE_PATHS } from "../../../config/images";
// R4-00067: 演示充值仅限 mock/开发环境（真实模式禁止无限刷余额）
import { useMock } from "../../../stores/helpers/use-mock";
import { isDev } from "../../../config/env";
// R10-P1-003：注入 --statusbar/--capsule-right（DevTools env(safe-area-inset-top) 恒 0，标题叠印状态栏）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
// P1 修复（2026-10-31）：本页此前**没有任何**访问守卫 —— 游客点进来即发
// GET /wallet/balance + GET /wallet/transactions 两个必 401 的请求，在拿到
// 「请先登录」toast 与 reLaunch 之前，余额卡与流水明细已经渲染过了。
import { usePageAccess } from "../../../composables/usePageAccess";
import { walletPageRequirements } from "../../../config/page-access";
// 游客档由页面入口守卫先行处置（guard-then-fetch，与在册五组
// subpackages/campus/campus/index.vue 等同源载具 guards/guest-access.ts）
import { guideGuestToLogin } from "../../../guards/guest-access";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();
const coinsStore = useCoinsStore();
const appConfig = useAppConfigStore();

/** 会话层门槛（requiresAuth:true）：持失效 token 的会话由 usePageAccess 处置。 */
usePageAccess(walletPageRequirements);

/**
 * 游客守卫旗标：`guideGuestToLogin()` 返回 true ⇒ 本页一律不再取数（P1 修复的核心是
 * 「守卫先于请求」，而不是「请求先于弹走」）。uni-app 首帧时序 onLoad → onShow → onMounted，
 * 所以 onShow / watch / 重试按钮走的都是同一个已置位的旗标。
 */
const guestGuarded = ref(false);
onLoad(() => {
  guestGuarded.value = guideGuestToLogin();
});

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
  // P1 守卫先行：游客（含正在被送往登录页的人）一律不发受保护请求。
  // 这是本页唯一的取数入口（onShow / 解封补偿 / 失败重试三条腿都走它）。
  if (guestGuarded.value) return;
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
/**
 * 演示充值的入账金额（分 = 100 元）；与幂等记录绑定，金额变了就是另一笔操作。
 */
const RECHARGE_AMOUNT_CENTS = 10000;

/**
 * 一次「未走完到终态」的充值操作（落盘形态）。
 *
 * P1 修复（2026-10-31）：充值幂等键此前是 `RECHARGE-DEMO-${Date.now()}` **在调用内**生成，
 * 与自己 :119 那行「幂等键单次流程内固定」的注释直接矛盾——每击换一个键，服务端
 * `POST /wallet/recharge` 的 `@Idempotent`（Idempotency-Key + Redis，见 WalletController）
 * 就永远没有可去重的对象；唯一的真闸是内存里的 `recharging` ref，而它在
 * `onUnload` / H5 刷新 / 请求被杀时一并消失。于是「服务端已入账、响应丢了」这一笔
 * 会被下一次点击再入账一次。键必须跟着这笔操作活到终态 ⇒ 落盘。
 */
interface PendingRecharge {
  /** 本次操作的 Idempotency-Key */
  key: string;
  /** 本次操作的入账金额（分）——金额不同即不同操作，不复用键 */
  amountCents: number;
}

/** 读取未完成的充值操作（存储不可用/脏数据一律按「无」处理，不阻塞充值） */
function readPendingRecharge(): PendingRecharge | null {
  try {
    const raw = uni.getStorageSync(STORAGE_KEYS.WALLET_PENDING_RECHARGE);
    if (!raw) return null;
    const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as PendingRecharge).key === "string" &&
      (parsed as PendingRecharge).key &&
      typeof (parsed as PendingRecharge).amountCents === "number"
    ) {
      return {
        key: (parsed as PendingRecharge).key,
        amountCents: (parsed as PendingRecharge).amountCents,
      };
    }
    return null;
  } catch (_e) {
    return null;
  }
}

/** 落盘未完成的充值操作（写入失败不影响本次请求，只是丢了跨页面的键复用） */
function writePendingRecharge(pending: PendingRecharge): void {
  try {
    uni.setStorageSync(STORAGE_KEYS.WALLET_PENDING_RECHARGE, JSON.stringify(pending));
  } catch (_e) {
    /* 存储不可用（隐私模式/配额）：退化为仅本页面实例内复用键 */
  }
}

/** 清除未完成记录：仅在操作抵达**终态**（入账成功）时调用 */
function clearPendingRecharge(): void {
  try {
    uni.removeStorageSync(STORAGE_KEYS.WALLET_PENDING_RECHARGE);
  } catch (_e) {
    /* 清不掉就让下一次点击继续复用同一个键 —— 宁可被服务端判重复，不可重复入账 */
  }
}

/**
 * 取本次充值操作的幂等键：**同一笔未走完的充值必须复用同一个键**。
 *
 * 服务端语义（已核 apps/api，只读）：
 * - `POST /wallet/recharge` 标了 `@Idempotent`（`IdempotentInterceptor`：Redis `SET NX EX`，
 *   默认 TTL 4 小时），同键第二次进来抛 `IdempotencyException("重复请求已被拦截…")` ⇒ 不会重复入账；
 * - 业务失败（HTTP ≥ 400）时拦截器会在 afterCompletion **释放**该键（R4-00287），
 *   所以「保留键重试」不会被一次确定性失败永久锁死；
 * - 服务层另有 order_id 唯一索引兜底。
 *
 * 若后端哪天不再按头去重，这里的键就只是对账线索，防重复入账只剩 `recharging` 在途锁
 * 一道闸（扛不住刷新/杀进程）——所以键的稳定性本身必须测住。
 */
function acquireRechargeIdempotencyKey(amountCents: number): string {
  const pending = readPendingRecharge();
  if (pending && pending.amountCents === amountCents) return pending.key;
  const created: PendingRecharge = {
    key: `RECHARGE-DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    amountCents,
  };
  writePendingRecharge(created);
  return created.key;
}

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
  // 修复（P0-12）：后端 RechargeRequest 仅含 amountCents（orderId 由服务端生成），
  // 删除请求体中的 orderId 字段；orderId 仅作为 Idempotency-Key 请求头防重复提交。
  // P1 修复（2026-10-31）：幂等键在**派发之前**按「这一次充值操作」取得并落盘
  // —— 与 :119 注释一致（键单次流程内固定），且响应丢失/刷新后的重试撞的是同一个键。
  const orderId = acquireRechargeIdempotencyKey(RECHARGE_AMOUNT_CENTS);
  try {
    await request<{ balanceAfterCents: number }, { amountCents: number }>({
      url: "/wallet/recharge",
      method: "POST",
      data: { amountCents: RECHARGE_AMOUNT_CENTS },
      headers: { "Idempotency-Key": orderId },
    });
    // 终态：入账已确认 ⇒ 清掉未完成记录，下一次点击是一笔新操作、一个新键
    clearPendingRecharge();
    await Promise.all([
      coinsStore.fetchBalance(true),
      coinsStore.listTransactions({ page: 0, size: 20 }),
    ]);
    successHaptic();
    uni.showToast({ title: t("wallet.rechargeSuccess", { n: 100 }), icon: "success" });
  } catch (err) {
    // 非终态（超时/断网/响应丢失）：**保留**键不清 —— 重试复用同一个 Idempotency-Key，
    // 由服务端 @Idempotent 拒掉「其实已经入账成功」的那一次重复提交。
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
 *
 * ⚠️ 这一枚**只用于文案**（收入/支出标签），不参与符号渲染 —— 符号一律走 isDebitRow()，
 * 否则「按 type 补一次符号、再按金额补一次」就会渲染出 `-¥-3.00` 这种双符号。
 */
function isIncome(type?: string): boolean {
  return type === "CREDIT" || type === "INCOME";
}

/**
 * 流水行的收支方向（**单一判定处**，P2 修复）。
 *
 * 原实现 `amountText()` 无条件按 `type` 补 +/−，而 `WalletTransactionItemView.amount`
 * 一旦下发带符号值（负数=支出，账单类接口的常见形态），页面就会印出双符号。
 * 现在的口径：符号只决定一次 —— 金额自带符号时以金额为准（后端是资金权威），
 * 金额无符号（历史/种子数据恒正）时以 type 为准；展示的数字一律取绝对值，
 * 所以两条来源不可能叠加成「-¥-3.00」。
 */
function isDebitRow(item: { type?: string; amount: number }): boolean {
  if (item.amount < 0) return true;
  return !isIncome(item.type);
}

/** 流水类型文案（收入/支出）——与符号同一个判定（isDebitRow），不许各判一次 */
function typeLabel(item: { type?: string; amount: number }): string {
  return isDebitRow(item) ? t("wallet.expense") : t("wallet.income");
}

/** 金额文本（收入 +，支出 -；数字取绝对值 ⇒ 符号只出现一次） */
function amountText(item: { type?: string; amount: number }): string {
  const yuan = Math.abs(item.amount) / 100;
  return `${isDebitRow(item) ? "-" : "+"}¥${yuan.toFixed(2)}`;
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
    <!-- P1 修复：游客档（正被送往登录页）不渲染余额卡/流水/充值，也不冒充「封存卡」文案 -->
    <template v-if="!guestGuarded && !commerceSealed">
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
          class="wallet__recharge press-feedback" :class="{ 'wallet__recharge--pending': recharging }" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-disabled="recharging ? 'true' : 'false'" :aria-label="t('wallet.recharge')" @tap="handleRecharge"
        >
          <text class="wallet__recharge-text">{{ recharging ? t('common.loading') : t('wallet.recharge') }}</text>
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
              <text class="wallet__tx-type">{{ typeLabel(tx) }}</text>
              <text class="wallet__tx-remark">{{ tx.remark || tx.relatedType || '' }}</text>
            </view>
            <text class="wallet__tx-amount" :class="{ 'wallet__tx-amount--income': !isDebitRow(tx) }">
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

    <!-- 封存态卡（SVG 锁图标，禁 emoji）：游客档不展示（那不是「被封存」，是「没登录」） -->
    <view v-else-if="!guestGuarded" class="wallet__sealed" aria-live="polite">
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

/* P1 修复（2026-10-31）：充值在途期间按钮进入禁用态（H5 连点不落地；
   MP 侧 pointer-events 不生效，由 handleRecharge 的 recharging 早退兜底）。 */
.wallet__recharge--pending {
  opacity: 0.6;
  pointer-events: none;
}

/* ========== 批次 A / ADR-2：商业化封存态 ========== */
/* R9-L14-D16：左右外边距原为 --sp-4 16rpx=8px（只有页边距 --page-padding 32rpx=16px
   的一半，帧内卡左缘 10px），与 shop 卡 12px 不成档 ⇒ 收到 --page-padding */
.wallet__sealed {
  margin: var(--sp-10) var(--page-padding);
  padding: var(--sp-8) var(--sp-6);
  border-radius: var(--r-2xl, 32rpx);
  background: var(--c-bg-container, #ffffff);
  border: 1rpx solid var(--c-divider-light, rgba(15, 23, 42, 0.06));
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
  color: var(--c-text-primary, #1A1E1C);
}

.wallet__sealed-desc {
  /* R10-L14-D08（字号 P2）：这句「为什么这页是空的」是本页唯一的解释行，
     原 --fs-sm 实值 22rpx=11.1px（design-variables.scss:561；行内 24rpx 是过期字面量兜底，
     已知机制 §2 点名不要信 .vue 里的过期 fallback），与角标/法务同档、比同屏封存标题小 4px。
     R9-L14-D11 的卡建议原文写「三页同改」，实际只落了 shop:759 / detail:563 两页 ⇒ 本页补上，
     与两页逐字同写法：--fs-md 26rpx=13.1px，并清掉过期 fallback。 */
  font-size: var(--fs-md);
  color: var(--c-text-tertiary, #6B7571);
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
  color: var(--c-text-primary, #1A1E1C);
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
  border: 1rpx solid var(--c-divider-light, rgba(15, 23, 42, 0.06));
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
  color: var(--c-text-primary, #1A1E1C);
}

.wallet__tx-remark {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary, #6B7571);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wallet__tx-amount {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-secondary, #4A524E);
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
  color: var(--c-text-tertiary, #6B7571);
}

.wallet__footer-space {
  height: env(safe-area-inset-bottom);
}
</style>
