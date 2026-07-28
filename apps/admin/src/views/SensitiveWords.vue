<script setup lang="ts">
/**
 * 敏感词管理页（SubTask 3.3.2 i18n 化）。
 * 提供敏感词列表的分类筛选、新增、删除。
 * 对应后端 com.campuslove.api.admin.AdminSensitiveWordController。
 *
 * SubTask 3.3.2 改造点：
 * - 标题/列头/筛选下拉/按钮/弹窗文案全部走 i18n key（sensitiveWords.*）
 * - 分类下拉通过 SENSITIVE_WORD_CATEGORIES[i].labelKey 渲染
 * - 错误回退通过 sensitiveWords.loadFailed / createFailed / deleteSensitiveWordFailed 表达
 */
import { ref, onMounted, computed } from "vue";
import {
  listSensitiveWords,
  createSensitiveWord,
  deleteSensitiveWord,
  SENSITIVE_WORD_CATEGORIES,
  type SensitiveWordView,
} from "../api/sensitive-words";
import { ApiError } from "../api/http";
// Task 3.7.3：接入共享 ConfirmDialog 组件，替换原生 confirm()
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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

// Task 3.7.3：删除确认弹窗状态
const deleteVisible = ref(false);
const deleteTarget = ref<SensitiveWordView | null>(null);
const deleting = ref(false);

// 分类 value → i18n label 映射
const categoryLabelMap = computed(() => {
  const m: Record<string, string> = {};
  for (const c of SENSITIVE_WORD_CATEGORIES) m[c.value] = t(c.labelKey);
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
    error.value = err instanceof ApiError ? err.message : (err as any)?.message || t("sensitiveWords.loadFailed");
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
    error.value = t("sensitiveWords.wordRequired");
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
    error.value = err instanceof ApiError ? err.message : (err as any)?.message || t("sensitiveWords.createFailed");
  } finally {
    submitting.value = false;
  }
}

/**
 * Task 3.7.3：打开删除确认弹窗（替代直接调用 handleDelete）。
 * @param word 待删除敏感词
 */
function handleDeleteClick(word: SensitiveWordView) {
  deleteTarget.value = word;
  deleteVisible.value = true;
}

/**
 * Task 3.7.3：ConfirmDialog 确认回调，执行真实删除调用。
 */
async function handleConfirmDelete() {
  const target = deleteTarget.value;
  if (!target) return;
  deleting.value = true;
  error.value = "";
  try {
    await deleteSensitiveWord(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    await fetchWords(filterCategory.value || undefined);
  } catch (err: any) {
    error.value = err instanceof ApiError ? err.message : (err as any)?.message || t("sensitiveWords.deleteSensitiveWordFailed");
  } finally {
    deleting.value = false;
  }
}

/**
 * Task 3.7.3：ConfirmDialog 取消回调，清理临时状态。
 */
function handleCancelDelete() {
  deleteTarget.value = null;
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
      <text class="page-title">{{ t("sensitiveWords.pageTitle") }}</text>
      <text class="page-subtitle">{{ t("sensitiveWords.pageSubtitle") }}</text>
    </view>

    <!-- 顶部工具栏：分类筛选 + 新增表单 -->
    <view class="toolbar">
      <select v-model="filterCategory" class="filter-select" @change="handleFilter">
        <option value="">{{ t("sensitiveWords.filterAllCategories") }}</option>
        <option
          v-for="c in SENSITIVE_WORD_CATEGORIES"
          :key="c.value"
          :value="c.value"
        >
          {{ t(c.labelKey) }}
        </option>
      </select>

      <view class="divider"></view>

      <input
        v-model="newWord"
        class="filter-input"
        type="text"
        :placeholder="t('sensitiveWords.wordPlaceholder')"
        @keyup.enter="handleCreate"
      />
      <select v-model="newCategory" class="filter-select">
        <option value="">{{ t("sensitiveWords.noCategory") }}</option>
        <option
          v-for="c in SENSITIVE_WORD_CATEGORIES"
          :key="c.value"
          :value="c.value"
        >
          {{ t(c.labelKey) }}
        </option>
      </select>
      <button
        class="primary-button"
        :disabled="submitting"
        @click="handleCreate"
      >
        {{ submitting ? t("sensitiveWords.creating") : t("sensitiveWords.createButton") }}
      </button>
    </view>

    <view v-if="error" class="error-message">{{ error }}</view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("sensitiveWords.columnId") }}</th>
            <th scope="col">{{ t("sensitiveWords.columnWord") }}</th>
            <th scope="col">{{ t("sensitiveWords.columnCategory") }}</th>
            <th scope="col">{{ t("sensitiveWords.columnCreatedAt") }}</th>
            <th scope="col">{{ t("sensitiveWords.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="words.length === 0">
            <td colspan="5" class="empty-row">{{ t("sensitiveWords.noData") }}</td>
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
              <button class="danger-button" @click="handleDeleteClick(word)">
                {{ t("sensitiveWords.actionDelete") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- Task 3.7.3：删除确认弹窗（替代原生 confirm） -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="t('sensitiveWords.deleteTitle')"
      :message="deleteTarget ? t('sensitiveWords.deleteConfirmMessage', { word: deleteTarget.word }) : ''"
      :danger="true"
      :confirming="deleting"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />
  </view>
</template>

<style scoped>
/* Task 3.7.1：接入共享样式表，去除与 admin-common.css 重复的定义 */
@import "../styles/admin-common.css";

.sw-page {
  max-width: 1400px;
}

/* SensitiveWords 特有：搜索输入框比通用 filter-input 更宽 */
.filter-input {
  min-width: 200px;
}

.data-table {
  min-width: 800px;
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
