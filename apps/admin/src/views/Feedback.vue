<script setup lang="ts">
import { ref } from "vue";

const feedbacks = ref([
  {
    id: 1,
    type: "反馈",
    title: "视频主视觉需要稳定兜底",
    status: "processing",
    user: "星野",
    createdAt: "2026-06-18",
  },
  {
    id: 2,
    type: "建议",
    title: "首页保留讨论和活动入口",
    status: "reviewed",
    user: "小明",
    createdAt: "2026-06-20",
  },
]);

const showDetailModal = ref(false);
const detailFeedback = ref<any>(null);
const toastMessage = ref("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(msg: string) {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
    toastTimer = null;
  }, 3000);
}

function handleView(feedback: any) {
  detailFeedback.value = feedback;
  showDetailModal.value = true;
}

function handleProcess(feedback: any) {
  const confirmed = confirm(`确定要将反馈"${feedback.title}"标记为已处理吗？`);
  if (confirmed) {
    feedback.status = "reviewed";
    showToast("已标记为已处理");
  }
}
</script>

<template>
  <view class="feedback-page">
    <view class="page-header">
      <text class="page-title">反馈管理</text>
      <text class="page-subtitle">处理用户反馈与建议</text>
    </view>

    <view v-if="toastMessage" class="toast-message">{{ toastMessage }}</view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>类型</th>
            <th>标题</th>
            <th>提交用户</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="feedback in feedbacks" :key="feedback.id">
            <td>{{ feedback.id }}</td>
            <td>
              <span class="type-badge" :class="`type-${feedback.type}`">
                {{ feedback.type }}
              </span>
            </td>
            <td>{{ feedback.title }}</td>
            <td>{{ feedback.user }}</td>
            <td>
              <span class="status-badge" :class="`status-${feedback.status}`">
                {{ feedback.status === "processing" ? "处理中" : "已处理" }}
              </span>
            </td>
            <td>{{ feedback.createdAt }}</td>
            <td class="action-cell">
              <button class="action-button view" @click="handleView(feedback)">查看</button>
              <button class="action-button process" @click="handleProcess(feedback)">处理</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 反馈详情弹窗 -->
    <view v-if="showDetailModal" class="modal-overlay" @click="showDetailModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">反馈详情</text>
          <button class="modal-close" @click="showDetailModal = false">关闭</button>
        </view>
        <view class="modal-body" v-if="detailFeedback">
          <view class="detail-row">
            <text class="detail-label">ID：</text>
            <text>{{ detailFeedback.id }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">类型：</text>
            <text>{{ detailFeedback.type }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">标题：</text>
            <text>{{ detailFeedback.title }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">提交用户：</text>
            <text>{{ detailFeedback.user }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">状态：</text>
            <text>{{ detailFeedback.status === "processing" ? "处理中" : "已处理" }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">提交时间：</text>
            <text>{{ detailFeedback.createdAt }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.feedback-page {
  max-width: 1200px;
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

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.data-table th {
  background: #f9f9f9;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.data-table tbody tr:hover {
  background: #f9f9f9;
}

.type-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.type-反馈 {
  background: #fff7e6;
  color: #fa8c16;
}

.type-建议 {
  background: #e6f7ff;
  color: #1890ff;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-processing {
  background: #fff7e6;
  color: #fa8c16;
}

.status-reviewed {
  background: #f6ffed;
  color: #52c41a;
}

.action-cell {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button.view {
  background: #e6f7ff;
  color: #1890ff;
}

.action-button.view:hover {
  background: #bae7ff;
}

.action-button.process {
  background: #f6ffed;
  color: #52c41a;
}

.action-button.process:hover {
  background: #d9f7be;
}

.toast-message {
  padding: 10px 16px;
  background: #f6ffed;
  border-left: 3px solid #52c41a;
  border-radius: 4px;
  color: #52c41a;
  font-size: 13px;
  margin-bottom: 16px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  min-width: 420px;
  max-width: 90vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  padding: 6px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #666;
  font-size: 13px;
  cursor: pointer;
}

.modal-close:hover {
  background: #f5f5f5;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  gap: 8px;
  font-size: 14px;
  color: #333;
}

.detail-label {
  font-weight: 600;
  color: #666;
  min-width: 80px;
}
</style>
