<script setup lang="ts">
/**
 * 举报管理页。
 * 提供举报列表的分页查询（按状态/目标类型筛选）与处理（HANDLE 已处理 / REJECT 驳回）。
 * 对应后端 com.campuslove.api.admin.AdminReportController。
 */
import { ref, onMounted } from "vue";
import {
  listReports,
  handleReport,
  REPORT_TARGET_TYPES,
  REPORT_STATUSES,
  type AdminReportView,
  type AdminReportListQuery,
  type AdminReportHandleRequest,
} from "../api/reports";
import { ApiError } from "../api/http";

/** 举报列表数据 */
const reports = ref<AdminReportView[]>([]);
/** 加载中标志 */
const loading = ref(false);
/** 错误信息 */
const errorMsg = ref("");

/** 状态筛选（空字符串表示全部） */
const statusFilter = ref<"" | "PENDING" | "HANDLED" | "REJECTED">("");
/** 目标类型筛选（空字符串表示全部） */
const targetTypeFilter = ref<"" | "POST" | "COMMENT" | "USER" | "TOPIC">("");

/** 当前页码（1-based） */
const page = ref(1);
/** 每页大小 */
const pageSize = ref(20);
/** 总记录数 */
const total = ref(0);
/** 总页数 */
const totalPages = ref(1);

/** 当前正在处理的举报（null 表示弹窗关闭） */
const handlingReport = ref<AdminReportView | null>(null);
/** 处理结果：HANDLE 已处理 / REJECT 驳回 */
const handleDecision = ref<"HANDLE" | "REJECT">("HANDLE");
/** 处理备注 */
const handleRemark = ref("");
/** 提交中标志 */
const submitting = ref(false);

/**
 * 拉取举报列表。
 * 根据当前筛选条件与分页参数请求后端数据。
 */
async function fetchReports() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const query: AdminReportListQuery = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (statusFilter.value) query.status = statusFilter.value;
    if (targetTypeFilter.value) query.targetType = targetTypeFilter.value;

    const result = await listReports(query);
    reports.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : "加载举报列表失败";
    reports.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    loading.value = false;
  }
}

/**
 * 触发查询：重置页码到第一页后拉取。
 */
function handleSearch() {
  page.value = 1;
  fetchReports();
}

/**
 * 重置筛选条件并刷新。
 */
function handleResetFilters() {
  statusFilter.value = "";
  targetTypeFilter.value = "";
  page.value = 1;
  fetchReports();
}

/**
 * 上一页。
 */
function handlePrevPage() {
  if (page.value > 1) {
    page.value--;
    fetchReports();
  }
}

/**
 * 下一页。
 */
function handleNextPage() {
  if (page.value < totalPages.value) {
    page.value++;
    fetchReports();
  }
}

/**
 * 打开处理弹窗。
 * @param report 当前举报记录
 */
function openHandleModal(report: AdminReportView) {
  handlingReport.value = report;
  handleDecision.value = "HANDLE";
  handleRemark.value = "";
}

/**
 * 关闭处理弹窗。
 */
function closeHandleModal() {
  handlingReport.value = null;
  handleRemark.value = "";
}

/**
 * 提交处理结果。
 * 调用后端 handleReport 接口，成功后关闭弹窗并刷新列表。
 */
async function submitHandle() {
  if (!handlingReport.value) return;
  submitting.value = true;
  try {
    const req: AdminReportHandleRequest = {
      result: handleDecision.value,
      remark: handleRemark.value || undefined,
    };
    await handleReport(handlingReport.value.id, req);
    handlingReport.value = null;
    handleRemark.value = "";
    await fetchReports();
  } catch (err) {
    alert(err instanceof ApiError ? err.message : "处理失败");
  } finally {
    submitting.value = false;
  }
}

/**
 * 格式化时间为本地可读格式。
 * @param iso ISO 时间字符串或 null
 */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

/**
 * 获取目标类型的中文标签。
 */
function targetTypeLabel(type: string): string {
  const found = REPORT_TARGET_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

/**
 * 获取状态的中文标签。
 */
function statusLabel(status: string): string {
  const found = REPORT_STATUSES.find((s) => s.value === status);
  return found ? found.label : status;
}

onMounted(() => {
  fetchReports();
});
</script>

<template>
  <view class="reports-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">举报管理</text>
      <text class="page-subtitle">处理用户举报的帖子/评论/用户/话题</text>
    </view>

    <!-- 筛选工具栏 -->
    <view class="toolbar">
      <select v-model="statusFilter" class="filter-select" @change="handleSearch">
        <option value="">全部状态</option>
        <option value="PENDING">待处理</option>
        <option value="HANDLED">已处理</option>
        <option value="REJECTED">已驳回</option>
      </select>
      <select v-model="targetTypeFilter" class="filter-select" @change="handleSearch">
        <option value="">全部目标</option>
        <option value="POST">帖子</option>
        <option value="COMMENT">评论</option>
        <option value="USER">用户</option>
        <option value="TOPIC">话题</option>
      </select>
      <button class="ghost-button" @click="handleResetFilters">重置</button>
    </view>

    <!-- 错误提示 -->
    <view v-if="errorMsg" class="error-banner">{{ errorMsg }}</view>

    <!-- 举报列表表格 -->
    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>目标类型</th>
            <th>目标ID</th>
            <th>举报人</th>
            <th>原因</th>
            <th>描述</th>
            <th>状态</th>
            <th>处理人</th>
            <th>处理时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" class="empty-cell">加载中...</td>
          </tr>
          <tr v-else-if="reports.length === 0">
            <td colspan="10" class="empty-cell">暂无举报数据</td>
          </tr>
          <tr v-for="report in reports" :key="report.id">
            <td>{{ report.id }}</td>
            <td>
              <span class="target-badge">{{ targetTypeLabel(report.targetType) }}</span>
            </td>
            <td>{{ report.targetId }}</td>
            <td>
              <view class="reporter-cell">
                <text>{{ report.reporterNickname || `用户#${report.reporterId}` }}</text>
              </view>
            </td>
            <td>{{ report.reason }}</td>
            <td class="description-cell">{{ report.description || "—" }}</td>
            <td>
              <span class="status-badge" :class="`status-${report.status}`">
                {{ statusLabel(report.status) }}
              </span>
            </td>
            <td>{{ report.handlerId ? `#${report.handlerId}` : "—" }}</td>
            <td>{{ formatDate(report.handledAt) }}</td>
            <td class="action-cell">
              <button
                v-if="report.status === 'PENDING'"
                class="action-button handle"
                @click="openHandleModal(report)"
              >处理</button>
              <text v-else class="handled-text">已处理</text>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 分页 -->
    <view class="pagination">
      <button class="page-button" :disabled="page <= 1" @click="handlePrevPage">上一页</button>
      <text class="page-info">第 {{ page }} / {{ totalPages }} 页（共 {{ total }} 条）</text>
      <button class="page-button" :disabled="page >= totalPages" @click="handleNextPage">下一页</button>
    </view>

    <!-- 处理举报弹窗 -->
    <view v-if="handlingReport" class="modal-mask" @click.self="closeHandleModal">
      <view class="modal">
        <text class="modal-title">处理举报 #{{ handlingReport.id }}</text>

        <!-- 举报信息预览 -->
        <view class="report-info-box">
          <view class="info-row">
            <text class="info-label">目标：</text>
            <text>{{ targetTypeLabel(handlingReport.targetType) }} #{{ handlingReport.targetId }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">举报人：</text>
            <text>{{ handlingReport.reporterNickname || `用户#${handlingReport.reporterId}` }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">原因：</text>
            <text>{{ handlingReport.reason }}</text>
          </view>
          <view v-if="handlingReport.description" class="info-row">
            <text class="info-label">描述：</text>
            <text>{{ handlingReport.description }}</text>
          </view>
        </view>

        <!-- 处理决定单选 -->
        <view class="form-row">
          <text class="form-label">处理决定</text>
          <view class="radio-group">
            <label class="radio-item">
              <input v-model="handleDecision" type="radio" value="HANDLE" />
              <span>已处理（核实并处置）</span>
            </label>
            <label class="radio-item">
              <input v-model="handleDecision" type="radio" value="REJECT" />
              <span>驳回（无效举报）</span>
            </label>
          </view>
        </view>

        <!-- 处理备注 -->
        <view class="form-row">
          <text class="form-label">处理备注（可选）</text>
          <textarea v-model="handleRemark" class="form-textarea" rows="3" placeholder="请输入处理说明..." />
        </view>

        <!-- 操作按钮 -->
        <view class="modal-actions">
          <button class="ghost-button" @click="closeHandleModal">取消</button>
          <button class="primary-button" :disabled="submitting" @click="submitHandle">
            {{ submitting ? "提交中..." : "提交" }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.reports-page {
  max-width: 1400px;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.page-subtitle {
  display: block;
  font-size: 14px;
  color: #999;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.ghost-button {
  padding: 10px 20px;
  background: transparent;
  color: #666;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.ghost-button:hover {
  background: #f5f5f5;
}

.primary-button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.primary-button:hover {
  background: #5568d3;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-banner {
  background: #fff1f0;
  color: #f5222d;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
}

.data-table th,
.data-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
  font-size: 13px;
}

.data-table th {
  background: #f9f9f9;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  white-space: nowrap;
}

.data-table tbody tr:hover {
  background: #f9f9f9;
}

.empty-cell {
  text-align: center;
  color: #999;
  padding: 40px 16px;
}

.target-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #f0f5ff;
  color: #2f54eb;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.reporter-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #555;
}

.description-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #666;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-PENDING {
  background: #fff7e6;
  color: #fa8c16;
}

.status-HANDLED {
  background: #f6ffed;
  color: #52c41a;
}

.status-REJECTED {
  background: #fff1f0;
  color: #f5222d;
}

.action-cell {
  display: flex;
  gap: 8px;
}

.action-button.handle {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background: #e6f7ff;
  color: #1890ff;
  transition: all 0.2s;
}

.action-button.handle:hover {
  background: #bae7ff;
}

.handled-text {
  font-size: 12px;
  color: #999;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.page-button {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.page-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.page-info {
  font-size: 14px;
  color: #666;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 480px;
  max-width: 90%;
}

.modal-title {
  display: block;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.report-info-box {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #555;
  line-height: 1.8;
}

.info-row {
  display: flex;
  gap: 6px;
}

.info-label {
  font-weight: 600;
  color: #666;
  flex-shrink: 0;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-label {
  font-size: 13px;
  color: #666;
}

.radio-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
}

.form-textarea {
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
