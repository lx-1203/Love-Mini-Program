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
import Pagination from "../../components/Pagination.vue";
import { useI18n } from "vue-i18n";
import { formatDateTime } from "../../utils/format";
import { useRequestRace } from "../../composables/useRequestRace";
import { useSessionStore } from "../../stores/session";

const { t } = useI18n();
const sessionStore = useSessionStore();

const onlineUsers = ref<OnlineUserView[]>([]);
const loading = ref(false);
const errorMsg = ref("");

/**
 * 分页状态：后端 OnlineUserAdminController 默认 page=0/size=50（上限 200），0-based，
 * 内存分页直出列表（无 total 包络）。原先不带 page 拉取 ⇒ 第 51 个以后的在线用户永远不可见。
 * totalPages 按 has-more 语义估算：满页返回时假定还有下一页；
 * 总数无从得知，不向 Pagination 传 total（组件自动隐藏「共 N 条」段）。
 */
const page = ref(0);
const pageSize = ref(50);
const totalPages = ref(1);
/** 每页大小可选项（默认 50 对齐后端默认值，上限对齐后端 @Max(200)） */
const pageSizeOptions = [20, 50, 100, 200];

// 踢下线确认弹窗状态
const kickVisible = ref(false);
const kickTarget = ref<OnlineUserView | null>(null);
const kicking = ref(false);

// 请求竞态防护（快速刷新时旧响应不覆盖新数据）
const { nextSeq, isStale } = useRequestRace();
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

async function fetchOnlineUsers() {
  loading.value = true;
  errorMsg.value = "";
  const seq = nextSeq();
  try {
    const result = await listOnlineUsers(page.value, pageSize.value);
    if (isStale(seq)) return;
    onlineUsers.value = result || [];
    // has-more 语义：满页返回 ⇒ 假定还有下一页；不满页 ⇒ 当前即最后一页
    totalPages.value =
      onlineUsers.value.length === pageSize.value ? page.value + 2 : page.value + 1;
  } catch (err) {
    if (isStale(seq)) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("onlineUsers.loadFailed");
    onlineUsers.value = [];
    totalPages.value = 1;
  } finally {
    if (!isStale(seq)) {
      loading.value = false;
    }
  }
}

/** 页码切换（Pagination 已通过 v-model:page 同步 page，这里只负责拉数据） */
function handlePageChange() {
  fetchOnlineUsers();
}

/** 每页大小切换：回到第一页再拉取 */
function handlePageSizeChange() {
  page.value = 0;
  fetchOnlineUsers();
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
  if (!sessionStore.canSuperAdminWrite) return;
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
      <select
        v-model="pageSize"
        class="filter-select"
        :aria-label="t('common.pageSize', { n: pageSize })"
        @change="handlePageSizeChange"
      >
        <option v-for="n in pageSizeOptions" :key="n" :value="n">{{ n }}</option>
      </select>
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
              <button v-if="sessionStore.canSuperAdminWrite" class="action-button kick" @click="handleKickClick(user)">
                {{ t("onlineUsers.actionKick") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <Pagination
      v-model:page="page"
      :total-pages="totalPages"
      :page-size="pageSize"
      :page-base="0"
      :disabled="loading"
      @change="handlePageChange"
    />

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
