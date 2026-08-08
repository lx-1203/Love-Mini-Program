<script setup lang="ts">
/**
 * Admin v2 钱包管理视图（商业模式「商业运营」域）。
 *
 * 功能：
 * - Tab1「钱包列表」：钱包 ID / 用户 ID / 可用余额（分转元）/ 冻结 / 状态 / 更新时间；
 *   筛选：用户 ID + 余额范围（元，提交时转分）+ 分页
 * - 「调整余额」弹窗：用户 ID 预填（打开时取当前行）/可输入，金额（元，正数充值、负数扣减），
 *   原因 → adjustWalletBalance，成功后刷新
 * - Tab2「钱包流水」：调用 listWalletTransactions，按用户 ID / 交易类型（DEBIT/CREDIT）筛选 + 分页
 *
 * 对应后端 com.campuslove.api.admin.AdminWalletController：
 *   - GET /api/v1/admin/business/wallets
 *   - GET /api/v1/admin/business/wallets/transactions
 *   - POST /api/v1/admin/business/wallets/{userId}/adjust
 * 金额单位：分（balanceCents/amount），前端展示/录入统一转元。
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import {
  listWallets,
  listWalletTransactions,
  adjustWalletBalance,
  type WalletView,
  type WalletTransactionView,
} from "../../api/business";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE, TOAST_DURATION_MS } from "../../utils/constants";
import { useRequestRace } from "../../composables/useRequestRace";

const { t } = useI18n();

/** Tab 类型：list=钱包列表 / transactions=钱包流水 */
type TabKey = "list" | "transactions";

const activeTab = ref<TabKey>("list");

/* ========== 钱包列表 ========== */
const wallets = ref<WalletView[]>([]);
const loading = ref(false);
const errorMsg = ref("");

const userIdQuery = ref("");
const balanceFromQuery = ref("");
const balanceToQuery = ref("");

const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

/* ========== 钱包流水 ========== */
const transactions = ref<WalletTransactionView[]>([]);
const txLoading = ref(false);
const txError = ref("");

const txUserIdQuery = ref("");
const txTypeFilter = ref("");

const txPage = ref(1);
const txPageSize = ref(DEFAULT_PAGE_SIZE);
const txTotal = ref(0);
const txTotalPages = ref(1);

/* ========== 调整余额弹窗 ========== */
const adjustVisible = ref(false);
/** 调整目标用户 ID（列表行预填，可手动修改） */
const adjustUserId = ref("");
/** 调整金额（元，正数充值、负数扣减） */
const adjustAmount = ref("");
/** 调整原因 */
const adjustReason = ref("");
const adjusting = ref(false);
const modalError = ref("");
/** 调整成功后的轻提示 */
const toastMessage = ref("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// 请求竞态防护（钱包列表 / 钱包流水各自独立竞态流，互不干扰）
const { nextSeq: walletNextSeq, isStale: walletIsStale } = useRequestRace();
const { nextSeq: txNextSeq, isStale: txIsStale } = useRequestRace();
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** 交易类型选项 */
const TX_TYPE_OPTIONS = [
  { value: "DEBIT", labelKey: "wallets.txTypeDebit" },
  { value: "CREDIT", labelKey: "wallets.txTypeCredit" },
];

/** 分转元展示（保留两位小数） */
function formatYuan(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "-";
  return (cents / 100).toFixed(2);
}

/** 钱包状态列（后端无独立状态字段，按冻结金额派生：有冻结=部分冻结，否则=正常） */
function walletStatusLabel(wallet: WalletView): string {
  return wallet.frozenCents > 0 ? t("wallets.statusFrozen") : t("wallets.statusNormal");
}

function walletStatusClass(wallet: WalletView): string {
  return wallet.frozenCents > 0 ? "status-frozen" : "status-normal";
}

/** 交易类型文案 */
function txTypeLabel(type: string): string {
  return type === "CREDIT" ? t("wallets.txTypeCredit") : type === "DEBIT" ? t("wallets.txTypeDebit") : type;
}

function txTypeClass(type: string): string {
  return type === "CREDIT" ? "type-credit" : "type-debit";
}

/** 轻提示（3 秒自动消失） */
function showToast(msg: string) {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
    toastTimer = null;
  }, TOAST_DURATION_MS);
}

/** 切换 Tab（首次进入流水 Tab 时自动加载） */
function handleTabChange(tab: TabKey) {
  activeTab.value = tab;
  if (tab === "transactions" && transactions.value.length === 0 && !txLoading.value) {
    fetchTransactions();
  }
}

/* ========== 钱包列表加载 ========== */
async function fetchWallets() {
  loading.value = true;
  errorMsg.value = "";
  const seq = walletNextSeq();
  try {
    const result = await listWallets({
      userId: userIdQuery.value.trim() ? Number(userIdQuery.value.trim()) : undefined,
      // 后端余额单位为分，前端输入为元，提交前转分
      balanceFrom: balanceFromQuery.value.trim() ? Math.round(Number(balanceFromQuery.value.trim()) * 100) : undefined,
      balanceTo: balanceToQuery.value.trim() ? Math.round(Number(balanceToQuery.value.trim()) * 100) : undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (walletIsStale(seq)) return;
    wallets.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    if (walletIsStale(seq)) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("wallets.loadFailed");
    wallets.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (!walletIsStale(seq)) {
      loading.value = false;
    }
  }
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  page.value = 1;
  fetchWallets();
}

function handleReset() {
  userIdQuery.value = "";
  balanceFromQuery.value = "";
  balanceToQuery.value = "";
  handleSearch();
}

function handlePageChange() {
  fetchWallets();
}

/* ========== 钱包流水加载 ========== */
async function fetchTransactions() {
  txLoading.value = true;
  txError.value = "";
  const seq = txNextSeq();
  try {
    const result = await listWalletTransactions({
      userId: txUserIdQuery.value.trim() ? Number(txUserIdQuery.value.trim()) : undefined,
      type: txTypeFilter.value || undefined,
      page: txPage.value,
      pageSize: txPageSize.value,
    });
    if (txIsStale(seq)) return;
    transactions.value = result.items;
    txTotal.value = result.total;
    txTotalPages.value = result.totalPages;
  } catch (err) {
    if (txIsStale(seq)) return;
    txError.value = err instanceof ApiError ? err.message : t("wallets.txLoadFailed");
    transactions.value = [];
    txTotal.value = 0;
    txTotalPages.value = 1;
  } finally {
    if (!txIsStale(seq)) {
      txLoading.value = false;
    }
  }
}

function handleTxSearch() {
  txPage.value = 1;
  fetchTransactions();
}

function handleTxReset() {
  txUserIdQuery.value = "";
  txTypeFilter.value = "";
  handleTxSearch();
}

function handleTxPageChange() {
  fetchTransactions();
}

/* ========== 调整余额 ========== */
/** 打开调整弹窗（预填当前行用户 ID，可手动修改） */
function openAdjust(wallet: WalletView | null) {
  adjustUserId.value = wallet ? String(wallet.userId) : "";
  adjustAmount.value = "";
  adjustReason.value = "";
  modalError.value = "";
  adjustVisible.value = true;
}

function closeAdjust() {
  if (adjusting.value) return;
  adjustVisible.value = false;
}

/**
 * 提交调整余额。
 * 前端校验：用户 ID 必须为正整数；金额必须为有效数字且非 0（正数充值、负数扣减）。
 * 金额单位：前端以元录入，提交时转分。
 */
async function handleAdjust() {
  if (adjusting.value) return;
  const userId = Number(adjustUserId.value.trim());
  if (!Number.isInteger(userId) || userId <= 0) {
    modalError.value = t("wallets.invalidUserId");
    return;
  }
  const amountYuan = Number(adjustAmount.value.trim());
  if (!Number.isFinite(amountYuan) || amountYuan === 0) {
    modalError.value = t("wallets.invalidAmount");
    return;
  }
  adjusting.value = true;
  modalError.value = "";
  try {
    const result = await adjustWalletBalance(userId, {
      // 元 → 分（四舍五入取整，避免浮点误差）
      amount: Math.round(amountYuan * 100),
      reason: adjustReason.value.trim() || undefined,
    });
    adjustVisible.value = false;
    showToast(t("wallets.adjustSuccess", { userId: result.userId, balance: formatYuan(result.balanceAfter) }));
    await fetchWallets();
  } catch (err) {
    modalError.value = err instanceof ApiError ? err.message : t("wallets.adjustFailed");
  } finally {
    adjusting.value = false;
  }
}

onMounted(() => {
  fetchWallets();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
});
</script>

<template>
  <view class="wallets-page">
    <view class="page-header">
      <text class="page-title">{{ t("wallets.title") }}</text>
      <text class="page-subtitle">{{ t("wallets.subtitle") }}</text>
    </view>

    <view v-if="toastMessage" class="toast-message" role="status" aria-live="polite">
      <text>{{ toastMessage }}</text>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="tab-button"
        :class="{ 'tab-button--active': activeTab === 'list' }"
        @click="handleTabChange('list')"
      >{{ t("wallets.tabWallets") }}</button>
      <button
        type="button"
        role="tab"
        class="tab-button"
        :class="{ 'tab-button--active': activeTab === 'transactions' }"
        @click="handleTabChange('transactions')"
      >{{ t("wallets.tabTransactions") }}</button>
    </view>

    <!-- ========== Tab1 钱包列表 ========== -->
    <template v-if="activeTab === 'list'">
      <view class="toolbar">
        <input
          v-model="userIdQuery"
          class="search-input"
          type="number"
          min="1"
          :placeholder="t('wallets.userIdPlaceholder')"
          @keyup.enter="handleSearch"
        />
        <input
          v-model="balanceFromQuery"
          class="search-input narrow"
          type="number"
          min="0"
          step="0.01"
          :placeholder="t('wallets.balanceFromPlaceholder')"
          @keyup.enter="handleSearch"
        />
        <text class="range-sep">{{ t("wallets.rangeSep") }}</text>
        <input
          v-model="balanceToQuery"
          class="search-input narrow"
          type="number"
          min="0"
          step="0.01"
          :placeholder="t('wallets.balanceToPlaceholder')"
          @keyup.enter="handleSearch"
        />
        <button class="primary-button" @click="handleSearch">{{ t("common.search") }}</button>
        <button class="ghost-button" @click="handleReset">{{ t("common.reset") }}</button>
        <button class="primary-button" @click="openAdjust(null)">{{ t("wallets.adjustButton") }}</button>
      </view>

      <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchWallets" />

      <view class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">{{ t("wallets.columnWalletId") }}</th>
              <th scope="col">{{ t("wallets.columnUserId") }}</th>
              <th scope="col">{{ t("wallets.columnBalance") }}</th>
              <th scope="col">{{ t("wallets.columnFrozen") }}</th>
              <th scope="col">{{ t("wallets.columnStatus") }}</th>
              <th scope="col">{{ t("wallets.columnUpdatedAt") }}</th>
              <th scope="col">{{ t("wallets.columnActions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="empty-cell">{{ t("common.loading") }}</td>
            </tr>
            <tr v-else-if="wallets.length === 0">
              <td colspan="7" class="empty-cell">{{ t("wallets.noData") }}</td>
            </tr>
            <tr v-for="wallet in wallets" :key="wallet.id">
              <td>{{ wallet.id }}</td>
              <td>{{ wallet.userId }}</td>
              <td class="amount-cell">{{ formatYuan(wallet.balanceCents) }}</td>
              <td class="frozen-cell">{{ formatYuan(wallet.frozenCents) }}</td>
              <td>
                <span class="status-badge" :class="walletStatusClass(wallet)">
                  {{ walletStatusLabel(wallet) }}
                </span>
              </td>
              <td class="time-cell">{{ formatDateTime(wallet.updatedAt) }}</td>
              <td class="action-cell">
                <button class="action-button edit" @click="openAdjust(wallet)">{{ t("wallets.adjustButton") }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </view>

      <Pagination
        v-model:page="page"
        :total-pages="totalPages"
        :total="total"
        :disabled="loading"
        @change="handlePageChange"
      />
    </template>

    <!-- ========== Tab2 钱包流水 ========== -->
    <template v-else>
      <view class="toolbar">
        <input
          v-model="txUserIdQuery"
          class="search-input"
          type="number"
          min="1"
          :placeholder="t('wallets.userIdPlaceholder')"
          @keyup.enter="handleTxSearch"
        />
        <select v-model="txTypeFilter" class="filter-select">
          <option value="">{{ t("wallets.allTypes") }}</option>
          <option v-for="o in TX_TYPE_OPTIONS" :key="o.value" :value="o.value">{{ t(o.labelKey) }}</option>
        </select>
        <button class="primary-button" @click="handleTxSearch">{{ t("common.search") }}</button>
        <button class="ghost-button" @click="handleTxReset">{{ t("common.reset") }}</button>
      </view>

      <ErrorState v-if="txError" :message="txError" @retry="fetchTransactions" />

      <view class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">{{ t("wallets.columnTxId") }}</th>
              <th scope="col">{{ t("wallets.columnUserId") }}</th>
              <th scope="col">{{ t("wallets.columnType") }}</th>
              <th scope="col">{{ t("wallets.columnAmount") }}</th>
              <th scope="col">{{ t("wallets.columnBalanceAfter") }}</th>
              <th scope="col">{{ t("wallets.columnRelated") }}</th>
              <th scope="col">{{ t("wallets.columnRemark") }}</th>
              <th scope="col">{{ t("wallets.columnTime") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="txLoading">
              <td colspan="8" class="empty-cell">{{ t("common.loading") }}</td>
            </tr>
            <tr v-else-if="transactions.length === 0">
              <td colspan="8" class="empty-cell">{{ t("wallets.noTxData") }}</td>
            </tr>
            <tr v-for="tx in transactions" :key="tx.id">
              <td>{{ tx.id }}</td>
              <td>{{ tx.userId }}</td>
              <td>
                <span class="tx-badge" :class="txTypeClass(tx.type)">
                  {{ txTypeLabel(tx.type) }}
                </span>
              </td>
              <td class="amount-cell">{{ formatYuan(tx.amount) }}</td>
              <td>{{ formatYuan(tx.balanceAfter) }}</td>
              <td>{{ tx.relatedType || "-" }}</td>
              <td class="remark-cell">{{ tx.remark || "-" }}</td>
              <td class="time-cell">{{ formatDateTime(tx.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </view>

      <Pagination
        v-model:page="txPage"
        :total-pages="txTotalPages"
        :total="txTotal"
        :disabled="txLoading"
        @change="handleTxPageChange"
      />
    </template>

    <!-- 调整余额弹窗 -->
    <view v-if="adjustVisible" class="modal-mask" @click.self="closeAdjust">
      <view class="modal adjust-modal">
        <text class="modal-title">{{ t("wallets.adjustTitle") }}</text>

        <view class="form-row">
          <text class="form-label">{{ t("wallets.adjustUserIdLabel") }}</text>
          <input v-model="adjustUserId" class="form-input" type="number" min="1" :placeholder="t('wallets.adjustUserIdPlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("wallets.adjustAmountLabel") }}</text>
          <input v-model="adjustAmount" class="form-input" type="number" step="0.01" :placeholder="t('wallets.adjustAmountPlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("wallets.adjustReasonLabel") }}</text>
          <textarea v-model="adjustReason" class="form-textarea" rows="2" :placeholder="t('wallets.reasonPlaceholder')" />
        </view>

        <text v-if="modalError" class="modal-error">{{ modalError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="adjusting" @click="closeAdjust">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="adjusting" @click="handleAdjust">
            {{ adjusting ? t("wallets.submitting") : t("wallets.confirmAdjust") }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.wallets-page {
  max-width: var(--admin-page-max-width);
}

.tabs {
  display: flex;
  gap: var(--admin-space-sm);
  margin-bottom: var(--admin-space-xxl);
  border-bottom: 1px solid var(--admin-color-border-light);
}

.tab-button {
  padding: var(--admin-space-md) var(--admin-space-xl);
  background: transparent;
  border: none;
  border-bottom: var(--admin-underline-width) solid transparent;
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-tertiary);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  color: var(--admin-color-text-primary);
}

.tab-button--active {
  color: var(--admin-color-primary);
  border-bottom-color: var(--admin-color-primary);
  font-weight: 600;
}

.search-input.narrow {
  width: var(--admin-control-width);
}

.range-sep {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-quaternary);
}

.amount-cell {
  font-weight: 600;
  color: var(--admin-color-text-primary);
  white-space: nowrap;
}

.frozen-cell {
  color: var(--admin-color-warning);
  white-space: nowrap;
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

.remark-cell {
  max-width: var(--admin-control-max-width);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--admin-color-text-tertiary);
}

.status-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.status-normal {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-frozen {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.tx-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.type-credit {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.type-debit {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.action-button.edit {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.action-button.edit:hover {
  background: var(--admin-color-info-softer);
}

.toast-message {
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
  background: var(--admin-color-success-soft);
  border-left: 3px solid var(--admin-color-success);
  border-radius: var(--admin-radius-sm);
  color: var(--admin-color-success);
  font-size: var(--admin-font-md);
  margin-bottom: var(--admin-space-lg);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: var(--admin-color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xl);
  padding: var(--admin-space-xxl);
  max-width: 90%;
}

.adjust-modal {
  width: var(--admin-dialog-width-sm);
}

.modal-title {
  display: block;
  font-size: var(--admin-font-xxl);
  font-weight: 600;
  margin-bottom: var(--admin-space-lg);
  color: var(--admin-color-text-primary);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-xxs);
  margin-bottom: var(--admin-space-lg);
}

.form-label {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-tertiary);
}

.form-input {
  padding: var(--admin-space-md-sm) var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-lg);
}

.form-textarea {
  padding: var(--admin-space-md-sm) var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-lg);
  resize: vertical;
  font-family: inherit;
}

.modal-error {
  display: block;
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger);
  margin-bottom: var(--admin-space-md);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--admin-space-sm);
}
</style>
