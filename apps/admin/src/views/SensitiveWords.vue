<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  listSensitiveWords,
  createSensitiveWord,
  deleteSensitiveWord,
  SENSITIVE_WORD_CATEGORIES,
  type SensitiveWordView,
} from "../api/sensitive-words";
import { ApiError } from "../api/http";

// 列表数据
const words = ref<SensitiveWordView[]>([]);
const loading = ref(false);
const error = ref("");

// 顶部筛选：分类下拉
const filterCategory = ref("");

// 新增表单
const newWord = ref("");
const newCategory = ref("");
const submitting = ref(false);

// 分类 value → 中文 label 映射
const categoryLabelMap = computed(() => {
  const m: Record<string, string> = {};
  for (const c of SENSITIVE_WORD_CATEGORIES) m[c.value] = c.label;
  return m;
});

/**
 * 加载敏感词列表。
 * @param category 可选分类过滤
 */
async function fetchWords(category?: string) {
  loading.value = true;
  error.value = "";
  try {
    const result = await listSensitiveWords(category);
    words.value = result || [];
  } catch (err: any) {
    error.value = err instanceof ApiError ? err.message : err.message || "加载敏感词列表失败";
    words.value = [];
  } finally {
    loading.value = false;
  }
}

/**
 * 顶部筛选查询：按分类重新加载列表。
 */
function handleFilter() {
  fetchWords(filterCategory.value || undefined);
}

/**
 * 提交新增敏感词。
 * 成功后清空表单并刷新列表。
 */
async function handleCreate() {
  const word = newWord.value.trim();
  if (!word) {
    error.value = "请输入敏感词";
    return;
  }
  submitting.value = true;
  error.value = "";
  try {
    await createSensitiveWord(word, newCategory.value || undefined);
    newWord.value = "";
    newCategory.value = "";
    await fetchWords(filterCategory.value || undefined);
  } catch (err: any) {
    error.value = err instanceof ApiError ? err.message : err.message || "新增敏感词失败";
  } finally {
    submitting.value = false;
  }
}

/**
 * 删除敏感词。
 * @param id 敏感词主键
 */
async function handleDelete(id: number) {
  error.value = "";
  try {
    await deleteSensitiveWord(id);
    await fetchWords(filterCategory.value || undefined);
  } catch (err: any) {
    error.value = err instanceof ApiError ? err.message : err.message || "删除敏感词失败";
  }
}

/**
 * 格式化时间：兼容 ISO 字符串，截到秒。
 */
function formatTime(s?: string): string {
  if (!s) return "-";
  return s.replace("T", " ").slice(0, 19);
}

onMounted(() => {
  fetchWords();
});
</script>

<template>
  <view class="sw-page">
    <view class="page-header">
      <text class="page-title">敏感词管理</text>
      <text class="page-subtitle">维护平台敏感词库，按分类过滤与管理</text>
    </view>

    <!-- 顶部工具栏：分类筛选 + 新增表单 -->
    <view class="toolbar">
      <select v-model="filterCategory" class="filter-select" @change="handleFilter">
        <option value="">全部分类</option>
        <option
          v-for="c in SENSITIVE_WORD_CATEGORIES"
          :key="c.value"
          :value="c.value"
        >
          {{ c.label }}
        </option>
      </select>

      <view class="divider"></view>

      <input
        v-model="newWord"
        class="filter-input"
        type="text"
        placeholder="输入敏感词"
        @keyup.enter="handleCreate"
      />
      <select v-model="newCategory" class="filter-select">
        <option value="">不指定分类</option>
        <option
          v-for="c in SENSITIVE_WORD_CATEGORIES"
          :key="c.value"
          :value="c.value"
        >
          {{ c.label }}
        </option>
      </select>
      <button
        class="primary-button"
        :disabled="submitting"
        @click="handleCreate"
      >
        {{ submitting ? "提交中..." : "新增" }}
      </button>
    </view>

    <view v-if="error" class="error-message">{{ error }}</view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>敏感词</th>
            <th>分类</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty-row">加载中...</td>
          </tr>
          <tr v-else-if="words.length === 0">
            <td colspan="5" class="empty-row">暂无敏感词</td>
          </tr>
          <tr v-for="word in words" :key="word.id">
            <td>{{ word.id }}</td>
            <td class="word-cell">{{ word.word }}</td>
            <td>
              <span v-if="word.category" class="category-tag">
                {{ categoryLabelMap[word.category] || word.category }}
              </span>
              <text v-else class="empty-cell">-</text>
            </td>
            <td class="time-cell">{{ formatTime(word.createdAt) }}</td>
            <td>
              <button class="danger-button" @click="handleDelete(word.id)">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>
  </view>
</template>

<style scoped>
.sw-page {
  max-width: 1400px;
}

.page-header {
  margin-bottom: 24px;
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

.filter-input {
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  min-width: 200px;
}

.filter-select {
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  min-width: 160px;
}

.divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  margin: 0 4px;
}

.primary-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: #667eea;
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: #5568d3;
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.danger-button {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff1f0;
  color: #f5222d;
}

.danger-button:hover {
  background: #f5222d;
  color: white;
}

.error-message {
  padding: 12px;
  background: #fee;
  border-left: 3px solid #f44;
  border-radius: 4px;
  color: #f44;
  font-size: 13px;
  margin-bottom: 16px;
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
  min-width: 800px;
}

.data-table th,
.data-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  vertical-align: top;
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

.empty-row {
  text-align: center;
  color: #999;
  padding: 32px;
}

.empty-cell {
  color: #ccc;
}

.word-cell {
  font-weight: 500;
  color: #333;
  word-break: break-all;
}

.time-cell {
  color: #999;
  white-space: nowrap;
}

.category-tag {
  display: inline-block;
  padding: 2px 8px;
  background: #f0f5ff;
  color: #2f54eb;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
</style>
