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

function handleView(feedback: any) {
  console.log("查看反馈:", feedback);
}

function handleProcess(feedback: any) {
  console.log("处理反馈:", feedback);
}
</script>

<template>
  <view class="feedback-page">
    <view class="page-header">
      <text class="page-title">反馈管理</text>
      <text class="page-subtitle">处理用户反馈与建议</text>
    </view>

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
</style>
