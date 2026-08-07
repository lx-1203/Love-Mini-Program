<script setup lang="ts">
/**
 * Admin v2 - 报名管理视图（活动运营域）。
 *
 * 对应后端 com.campuslove.api.admin.AdminActivityController：
 * - GET  /api/v1/admin/activities/{id}/enrollments         （报名分页列表）
 * - GET  /api/v1/admin/activities/{id}/enrollments/export   （报名 CSV 导出）
 *
 * 进入方式：从 Activities 页「查看报名」跳转（router.push({ name: 'Enrollments', query: { activityId } })），
 * 也可在页内手输活动 ID 加载。报名记录无取消机制，状态恒为 joined（已报名）。
 */
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import {
  listEnrollments,
  exportEnrollments,
  type ActivityEnrollment,
} from "../../api/activities";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

const { t } = useI18n();
const route = useRoute();

/** 活动 ID 输入（从路由 query 初始化，可手输） */
const activityIdInput = ref("");

/** 当前活动 ID（合法数字时才非空） */
const currentId = (): number | null => {
  const n = Number(activityIdInput.value.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
};

// ===== 列表状态 =====
const enrollments = ref<ActivityEnrollment[]>([]);
const loading = ref(false);
const errorMsg = ref("");
/** 导出操作状态与成功提示 */
const exporting = ref(false);
const successMsg = ref("");

// ===== 分页状态 =====
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

/** 请求竞态防护 */
let reqSeq = 0;

/** 加载报名列表（依赖当前活动 ID） */
async function fetchEnrollments(): Promise<void> {
  const id = currentId();
  if (id === null) {
    // 未填写/非法活动 ID：清空列表并提示
    enrollments.value = [];
    total.value = 0;
    totalPages.value = 1;
    errorMsg.value = "请先输入有效的活动 ID";
    return;
  }
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listEnrollments(id, { page: page.value, pageSize: pageSize.value });
    if (seq !== reqSeq) return;
    enrollments.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : "加载报名列表失败";
    enrollments.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** 查询按钮：回到第一页再加载 */
function handleLoad(): void {
  page.value = 1;
  successMsg.value = "";
  void fetchEnrollments();
}

/** 分页变更回调 */
function handlePageChange(): void {
  void fetchEnrollments();
}

/** 导出报名 CSV（走 api/activities.ts 的 Blob 下载封装） */
async function handleExport(): Promise<void> {
  const id = currentId();
  if (id === null || exporting.value) return;
  exporting.value = true;
  successMsg.value = "";
  errorMsg.value = "";
  try {
    await exportEnrollments(id);
    successMsg.value = t("enrollments.exportSuccess");
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : "导出失败";
  } finally {
    exporting.value = false;
  }
}

/** 作者昵称兜底展示 */
function authorLabel(e: ActivityEnrollment): string {
  return e.nickname || `用户#${e.userId}`;
}

// 初始化：从路由 query 读取 activityId（Activities 页跳转进入）
onMounted(() => {
  const raw = route.query.activityId;
  activityIdInput.value = typeof raw === "string" ? raw : "";
  if (activityIdInput.value) {
    void fetchEnrollments();
  } else {
    errorMsg.value = "请先输入有效的活动 ID";
  }
});

// 监听路由 query 变化（同一路由实例内多次跳转时复用组件，需重新加载）
watch(
  () => route.query.activityId,
  (raw) => {
    const next = typeof raw === "string" ? raw : "";
    if (next && next !== activityIdInput.value) {
      activityIdInput.value = next;
      page.value = 1;
      void fetchEnrollments();
    }
  },
);
</script>

<template>
  <view class="enrollments-page">
    <view class="page-header">
      <text class="page-title">{{ t("layout.navEnrollments") }}</text>
      <text class="page-subtitle">查看指定活动的报名用户列表，支持 CSV 导出</text>
    </view>

    <view class="toolbar">
      <input
        v-model="activityIdInput"
        class="search-input"
        type="text"
        placeholder="输入活动 ID（如从活动列表跳转则自动填充）"
        @keyup.enter="handleLoad"
      />
      <button class="primary-button" @click="handleLoad">{{ t("common.search") }}</button>
      <button class="ghost-button" :disabled="exporting || currentId() === null" @click="handleExport">
        {{ exporting ? "导出中..." : "导出 CSV" }}
      </button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchEnrollments" />
    <view v-if="successMsg" class="success-message">{{ successMsg }}</view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">报名ID</th>
            <th scope="col">用户ID</th>
            <th scope="col">昵称</th>
            <th scope="col">头像</th>
            <th scope="col">报名时间</th>
            <th scope="col">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="enrollments.length === 0">
            <td colspan="6" class="empty-row">暂无报名记录</td>
          </tr>
          <tr v-for="e in enrollments" :key="e.id">
            <td>{{ e.id }}</td>
            <td>{{ e.userId }}</td>
            <td>{{ authorLabel(e) }}</td>
            <td>
              <img v-if="e.avatarUrl" :src="e.avatarUrl" class="avatar" alt="头像" />
              <text v-else class="avatar-placeholder">—</text>
            </td>
            <td class="time-cell">{{ formatDateTime(e.enrolledAt) }}</td>
            <td>
              <span class="status-badge status-joined">已报名</span>
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
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.enrollments-page {
  max-width: 1200px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--admin-color-bg-subtle);
}

.avatar-placeholder {
  color: var(--admin-color-text-quaternary);
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

.status-joined {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}
</style>
