<script setup lang="ts">
/**
 * Admin v2 在线用户管理视图（参考旧后台 apps/admin/src/views/OnlineUsers.vue 复制，
 * API 接入系统管理域 api/system.ts）。
 *
 * - 展示当前在线用户列表（userId / 昵称 / 登录方式 / 登录时间）
 * - 支持「踢下线」：复用后端 jti 黑名单机制强制下线，二次确认后调用
 * - 全部文案走 i18n（onlineUsers.*）
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import { listOnlineUsers, kickOnlineUser, type OnlineUserView } from "../../api/system";
import { ApiError } from "../../api/http";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { useI18n } from "vue-i18n";
import { formatDateTime } from "../../utils/format";

const { t } = useI18n();

const onlineUsers = ref<OnlineUserView[]>([]);
const loading = ref(false);
const errorMsg = ref("");

// 踢下线确认弹窗状态
const kickVisible = ref(false);
const kickTarget = ref<OnlineUserView | null>(null);
const kicking = ref(false);

// 请求竞态防护（快速刷新时旧响应不覆盖新数据）
let reqSeq = 0;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

async function fetchOnlineUsers() {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listOnlineUsers();
    if (seq !== reqSeq) return;
    onlineUsers.value = result || [];
  } catch (err) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("onlineUsers.loadFailed");
    onlineUsers.value = [];
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** 手动刷新（含防重复点击） */
function handleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    fetchOnlineUsers();
  }, 300);
}

/** 点击踢下线 → 打开确认弹窗 */
function handleKickClick(user: OnlineUserView) {
  kickTarget.value = user;
  kickVisible.value = true;
}

/** 确认踢下线 */
async function handleKickConfirm() {
  const target = kickTarget.value;
  if (!target || kicking.value) return;
  kicking.value = true;
  try {
    await kickOnlineUser(target.userId);
    kickVisible.value = false;
    kickTarget.value = null;
    await fetchOnlineUsers();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("onlineUsers.kickFailed");
  } finally {
    kicking.value = false;
  }
}

function handleKickCancel() {
  kickTarget.value = null;
  kicking.value = false;
}

/** 登录方式 → i18n 标签 */
function loginMethodLabel(method: string): string {
  switch (method) {
    case "wechat":
      return t("onlineUsers.methodWechat");
    case "phone":
      return t("onlineUsers.methodPhone");
    case "admin":
      return t("onlineUsers.methodAdmin");
    default:
      return method || "-";
  }
}

function formatTime(iso: string): string {
  return formatDateTime(iso);
}

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
});

onMounted(() => {
  fetchOnlineUsers();
});
</script>

<template>
  <view class="online-users-page">
    <view class="page-header">
      <text class="page-title">{{ t("onlineUsers.title") }}</text>
      <text class="page-subtitle">{{ t("onlineUsers.tableSubtitle") }}</text>
    </view>

    <view class="toolbar">
      <button class="primary-button" :disabled="loading" @click="handleRefresh">
        {{ t("common.refresh") }}
      </button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchOnlineUsers" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("onlineUsers.columnId") }}</th>
            <th scope="col">{{ t("onlineUsers.columnNickname") }}</th>
            <th scope="col">{{ t("onlineUsers.columnLoginMethod") }}</th>
            <th scope="col">{{ t("onlineUsers.columnLoginAt") }}</th>
            <th scope="col">{{ t("onlineUsers.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty-cell">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="onlineUsers.length === 0">
            <td colspan="5" class="empty-cell">{{ t("onlineUsers.noData") }}</td>
          </tr>
          <tr v-for="user in onlineUsers" :key="user.userId">
            <td>{{ user.userId }}</td>
            <td>{{ user.nickname || t("common.emptyPlaceholder") }}</td>
            <td>
              <span class="method-badge">{{ loginMethodLabel(user.loginMethod) }}</span>
            </td>
            <td>{{ formatTime(user.loginAt) }}</td>
            <td>
              <button class="action-button kick" @click="handleKickClick(user)">
                {{ t("onlineUsers.actionKick") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <ConfirmDialog
      v-model:visible="kickVisible"
      :title="t('onlineUsers.kickTitle')"
      :message="kickTarget ? t('onlineUsers.kickConfirmMessage', { name: kickTarget.nickname || kickTarget.userId }) : ''"
      :danger="true"
      :confirming="kicking"
      @confirm="handleKickConfirm"
      @cancel="handleKickCancel"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.online-users-page {
  max-width: 1000px;
}

.method-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.action-button.kick {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.action-button.kick:hover {
  background: var(--admin-color-danger-softer);
}
</style>
