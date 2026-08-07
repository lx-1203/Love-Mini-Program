<script setup lang="ts">
/**
 * Admin 官方号只读视图（2026-08-07 官方号体系）。
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
} from "../api/official-accounts";
import { ApiError } from "../api/http";
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
  padding: 24px;
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 22px;
}

.page-subtitle {
  margin: 0 0 24px;
  color: #64748b;
  font-size: 14px;
}

.error-box,
.loading-box,
.empty-box {
  padding: 32px;
  text-align: center;
  color: #64748b;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #e2e8f0;
}

.error-box button {
  margin-left: 12px;
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
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.account-tab--active {
  border-color: #3fcf8e;
  background: #f0fdf9;
}

.account-tab__name {
  font-weight: 600;
  font-size: 15px;
}

.account-tab__desc {
  font-size: 12px;
  color: #94a3b8;
}

.messages-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.messages-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #eef2f7;
}

.messages-panel__title {
  font-weight: 600;
}

.messages-panel__count {
  font-size: 13px;
  color: #94a3b8;
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
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

.message-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
  white-space: nowrap;
}

.type-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.type-badge--text {
  background: #e8f8f0;
  color: #25a86c;
}

.type-badge--card {
  background: #fdf2f8;
  color: #db2777;
}

.cell-content {
  max-width: 320px;
  line-height: 1.6;
}

.card-tag {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #fff7ed;
  color: #ea580c;
  font-size: 12px;
}

.cell-target a {
  color: #3fcf8e;
  word-break: break-all;
}

.cell-time {
  white-space: nowrap;
  color: #94a3b8;
}
</style>
