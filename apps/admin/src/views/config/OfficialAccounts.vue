<script setup lang="ts">
/**
 * Admin 官方号只读视图（复制自旧后台 apps/admin，适配 admin-v2 目录结构）。
 *
 * 展示两个官方号（产品助手号 / 活动运营号）的账号元信息与消息流；
 * 只读版（推送能力列入后续迭代）。
 */
import { ref, onMounted, computed } from "vue";
import {
  listOfficialAccounts,
  getOfficialAccountMessages,
  type OfficialAccountView,
  type OfficialMessageView,
} from "@/api/official-accounts";
import { ApiError } from "@/api/http";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

/** 官方号账号列表 */
const accounts = ref<OfficialAccountView[]>([]);
const loading = ref(false);
const error = ref("");

/** 当前选中的官方号 code */
const activeCode = ref<string>("");

/** 当前官方号消息流 */
const messages = ref<OfficialMessageView[]>([]);
const messagesLoading = ref(false);

/** 当前选中账号元信息 */
const activeAccount = computed(() =>
  accounts.value.find((a) => a.code === activeCode.value),
);

/** 时间格式化（YYYY-MM-DD HH:mm） */
function formatTime(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 加载账号列表，默认选中第一个并加载其消息流 */
async function fetchAccounts() {
  loading.value = true;
  error.value = "";
  try {
    const result = await listOfficialAccounts();
    accounts.value = result || [];
    if (accounts.value.length > 0 && !activeCode.value) {
      activeCode.value = accounts.value[0]!.code;
      await fetchMessages(activeCode.value);
    }
  } catch (err: unknown) {
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("officialAccounts.loadFailed");
  } finally {
    loading.value = false;
  }
}

/** 加载某官方号消息流 */
async function fetchMessages(code: string) {
  if (!code) return;
  messagesLoading.value = true;
  try {
    const result = await getOfficialAccountMessages(code);
    messages.value = result || [];
  } catch (err: unknown) {
    messages.value = [];
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("officialAccounts.loadMessagesFailed");
  } finally {
    messagesLoading.value = false;
  }
}

/** 切换官方号 */
function selectAccount(code: string) {
  activeCode.value = code;
  void fetchMessages(code);
}

onMounted(fetchAccounts);
</script>

<template>
  <div class="official-page">
    <div class="page-header">
      <h2>{{ t("officialAccounts.title") }}</h2>
      <p class="page-subtitle">{{ t("officialAccounts.subtitle") }}</p>
    </div>

    <!-- 加载失败 -->
    <div v-if="error && accounts.length === 0" class="error-box">
      {{ error }}
      <button class="btn btn-primary" @click="fetchAccounts">{{ t("common.retry") }}</button>
    </div>

    <!-- 账号列表 -->
    <div v-else-if="loading" class="loading-box">{{ t("common.loading") }}</div>

    <div v-else class="official-body">
      <!-- 账号 Tab -->
      <div class="account-tabs">
        <button
          v-for="acc in accounts"
          :key="acc.code"
          class="account-tab"
          :class="{ 'account-tab--active': acc.code === activeCode }"
          @click="selectAccount(acc.code)"
        >
          <span class="account-tab__name">{{ acc.name }}</span>
          <span class="account-tab__desc">{{ acc.description }}</span>
        </button>
      </div>

      <!-- 消息流 -->
      <div class="messages-panel">
        <div class="messages-panel__header">
          <span class="messages-panel__title">
            {{ activeAccount ? activeAccount.name : "-" }}
          </span>
          <span class="messages-panel__count">
            {{ t("officialAccounts.messageCount", { n: messages.length }) }}
          </span>
        </div>

        <div v-if="messagesLoading" class="loading-box">{{ t("common.loading") }}</div>
        <div v-else-if="messages.length === 0" class="empty-box">
          {{ t("officialAccounts.emptyMessages") }}
        </div>

        <table v-else class="message-table">
          <thead>
            <tr>
              <th>{{ t("officialAccounts.colType") }}</th>
              <th>{{ t("officialAccounts.colContent") }}</th>
              <th>{{ t("officialAccounts.colCard") }}</th>
              <th>{{ t("officialAccounts.colTarget") }}</th>
              <th>{{ t("officialAccounts.colPublishedAt") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="msg in messages" :key="msg.id">
              <td>
                <span
                  class="type-badge"
                  :class="msg.messageType === 'card' ? 'type-badge--card' : 'type-badge--text'"
                >
                  {{ msg.messageType }}
                </span>
              </td>
              <td class="cell-content">{{ msg.content }}</td>
              <td>
                <span v-if="msg.cardTitle">{{ msg.cardTitle }}</span>
                <span v-if="msg.cardTag" class="card-tag">{{ msg.cardTag }}</span>
                <span v-else>-</span>
              </td>
              <td class="cell-target">
                <a v-if="msg.cardTargetUrl" :href="msg.cardTargetUrl" target="_blank" rel="noopener">
                  {{ msg.cardTargetUrl }}
                </a>
                <span v-else>-</span>
              </td>
              <td class="cell-time">{{ formatTime(msg.publishedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.official-page {
  padding: var(--admin-space-xxl);
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 22px;
}

.page-subtitle {
  margin: 0 0 24px;
  color: var(--admin-color-text-tertiary);
  font-size: 14px;
}

.error-box,
.loading-box,
.empty-box {
  padding: 32px;
  text-align: center;
  color: var(--admin-color-text-tertiary);
  background: var(--admin-color-bg-subtle);
  border-radius: 8px;
  border: 1px dashed var(--admin-color-border);
}

.error-box button {
  margin-left: var(--admin-space-md);
}

.account-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.account-tab {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 20px;
  border: 1px solid var(--admin-color-border);
  border-radius: 8px;
  background: var(--admin-color-bg-container);
  cursor: pointer;
  text-align: left;
}

.account-tab--active {
  border-color: var(--admin-color-skip-link);
  background: var(--admin-color-success-soft);
}

.account-tab__name {
  font-weight: 600;
  font-size: 15px;
}

.account-tab__desc {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}

.messages-panel {
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border);
  border-radius: 8px;
  overflow: hidden;
}

.messages-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--admin-color-border-light);
}

.messages-panel__title {
  font-weight: 600;
}

.messages-panel__count {
  font-size: 13px;
  color: var(--admin-color-text-quaternary);
}

.message-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.message-table th,
.message-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--admin-color-border-light);
  vertical-align: top;
}

.message-table th {
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-tertiary);
  font-weight: 600;
  white-space: nowrap;
}

.type-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: var(--admin-font-sm);
  font-weight: 600;
}

.type-badge--text {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.type-badge--card {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.cell-content {
  max-width: 320px;
  line-height: 1.6;
}

.card-tag {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
  font-size: var(--admin-font-sm);
}

.cell-target a {
  color: var(--admin-color-skip-link);
  word-break: break-all;
}

.cell-time {
  white-space: nowrap;
  color: var(--admin-color-text-quaternary);
}
</style>
