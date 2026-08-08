<script setup lang="ts">
/**
 * 敏感词管理页（复制自旧后台 apps/admin，适配 admin-v2 目录结构）。
 * 提供敏感词列表的分类筛选、新增、删除。
 * 对应后端 com.campuslove.api.admin.AdminSensitiveWordController。
 */
import { ref, onMounted, computed } from "vue";
import {
  listSensitiveWords,
  createSensitiveWord,
  deleteSensitiveWord,
  SENSITIVE_WORD_CATEGORIES,
  type SensitiveWordView,
} from "@/api/sensitive-words";
import { ApiError } from "@/api/http";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import ErrorState from "@/components/ErrorState.vue";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "@/stores/session";
import { WORD_MAX_LENGTH } from "@/utils/constants";

const { t } = useI18n();
const sessionStore = useSessionStore();

/** 是否全局超级管理员（新增/删除敏感词仅 SUPER_ADMIN 可用，普通管理员操作会被后端 403） */
const isSuperAdmin = computed(
  () => String(sessionStore.user?.role || "").toUpperCase() === "SUPER_ADMIN",
);

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

// 删除确认弹窗状态
const deleteVisible = ref(false);
const deleteTarget = ref<SensitiveWordView | null>(null);
const deleting = ref(false);

// 请求竞态防护（快速切换分类时旧响应不覆盖新数据）
let reqSeq = 0;

// 分类 value → i18n label 映射
const categoryLabelMap = computed(() => {
  const m: Record<string, string> = {};
  for (const c of SENSITIVE_WORD_CATEGORIES) m[c.value] = t(c.labelKey);
  return m;
});

/**
 * 加载敏感词列表。
 * @param category 可选分类过滤
 *
 * 分页说明：敏感词库规模较小（通常数百条以内），当前使用全量加载方案；
 * 后端 AdminSensitiveWordController 支持 Pageable 分页（见 FIN-00326 修复），
 * 若数据量增长可切换为分页查询（page/pageSize 参数 + Pagination 组件）。
 */
async function fetchWords(category?: string) {
  loading.value = true;
  error.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listSensitiveWords(category);
    if (seq !== reqSeq) return; // 丢弃过期响应
    words.value = result || [];
  } catch (err: unknown) {
    if (seq !== reqSeq) return;
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("sensitiveWords.loadFailed");
    words.value = [];
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
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
 * 校验：非空、长度上限、与已有词去重（大小写不敏感）。
 */
async function handleCreate() {
  const word = newWord.value.trim();
  if (!word) {
    error.value = t("sensitiveWords.wordRequired");
    return;
  }
  if (word.length > WORD_MAX_LENGTH) {
    error.value = t("sensitiveWords.wordTooLong", { n: WORD_MAX_LENGTH });
    return;
  }
  const lower = word.toLowerCase();
  if (words.value.some((w) => w.word.toLowerCase() === lower)) {
    error.value = t("sensitiveWords.wordDuplicate");
    return;
  }
  submitting.value = true;
  error.value = "";
  try {
    await createSensitiveWord(word, newCategory.value || undefined);
    newWord.value = "";
    newCategory.value = "";
    await fetchWords(filterCategory.value || undefined);
  } catch (err: unknown) {
    // 后端 409（资源已存在）透传为 i18n 重复提示
    if (err instanceof ApiError && err.status === 409) {
      error.value = t("sensitiveWords.wordDuplicate");
    } else {
      error.value =
        err instanceof ApiError
          ? err.message
          : err instanceof Error && err.message
            ? err.message
            : t("sensitiveWords.createFailed");
    }
  } finally {
    submitting.value = false;
  }
}

/**
 * 打开删除确认弹窗。
 * @param word 待删除敏感词
 */
function handleDeleteClick(word: SensitiveWordView) {
  deleteTarget.value = word;
  deleteVisible.value = true;
}

/**
 * ConfirmDialog 确认回调，执行真实删除调用。
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
  } catch (err: unknown) {
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("sensitiveWords.deleteSensitiveWordFailed");
  } finally {
    deleting.value = false;
  }
}

/**
 * ConfirmDialog 取消回调，清理临时状态。
 */
function handleCancelDelete() {
  deleteTarget.value = null;
}

/** 复制敏感词到剪贴板（运营复制不便时的快捷入口） */
async function copyWord(word: SensitiveWordView) {
  try {
    await navigator.clipboard.writeText(word.word);
    error.value = "";
  } catch {
    error.value = t("sensitiveWords.copyFailed");
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
      <text class="page-title">{{ t("sensitiveWords.pageTitle") }}</text>
      <text class="page-subtitle">{{ t("sensitiveWords.pageSubtitle") }}</text>
    </view>

    <!-- 校区管理员只读提示：新增/删除敏感词仅超级管理员可用 -->
    <view v-if="!isSuperAdmin" class="readonly-tip" role="status">
      <text>{{ t("sensitiveWords.readonlyTip") }}</text>
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

      <template v-if="isSuperAdmin">
        <view class="divider"></view>

        <input
          v-model="newWord"
          class="filter-input"
          type="text"
          :maxlength="WORD_MAX_LENGTH"
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
      </template>
    </view>

    <ErrorState v-if="error" :message="error" @retry="() => fetchWords(filterCategory || undefined)" />

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
            <td class="action-cell">
              <button class="ghost-button copy-button" @click="copyWord(word)">
                {{ t("sensitiveWords.copyButton") }}
              </button>
              <button
                v-if="isSuperAdmin"
                class="danger-button"
                :disabled="deleting"
                @click="handleDeleteClick(word)"
              >
                {{ t("sensitiveWords.actionDelete") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 删除确认弹窗 -->
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
@import "@/styles/admin-common.css";

.sw-page {
  max-width: 1400px;
}

.readonly-tip {
  background: var(--admin-color-warning-soft);
  border-left: 3px solid var(--admin-color-warning);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-md);
  color: var(--admin-color-warning);
}

/* SensitiveWords 特有：搜索输入框比通用 filter-input 更宽 */
.filter-input {
  min-width: 200px;
}

.data-table {
  min-width: 800px;
}

.danger-button {
  padding: var(--admin-space-xxs) var(--admin-space-md-lg);
  border: none;
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.danger-button:hover {
  background: var(--admin-color-danger);
  color: var(--admin-color-bg-container);
}

.danger-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 复制按钮紧凑样式 */
.copy-button {
  padding: var(--admin-space-xxs) var(--admin-space-md);
  margin-right: var(--admin-space-sm);
  font-size: var(--admin-font-sm);
}

.action-cell {
  white-space: nowrap;
}

.word-cell {
  font-weight: 500;
  color: var(--admin-color-text-primary);
  word-break: break-all;
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

.category-tag {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-sm);
  background: var(--admin-color-accent-soft);
  color: var(--admin-color-accent);
  border-radius: var(--admin-radius-sm);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}
</style>
