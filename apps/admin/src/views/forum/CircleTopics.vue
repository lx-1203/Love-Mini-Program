<script setup lang="ts">
/**
 * Admin v2 - 圈内话题管理视图（社区论坛域）。
 *
 * 对应后端 com.campuslove.api.admin.AdminCircleController：
 * - GET    /api/v1/admin/forum/circles/{id}/topics        （圈内话题分页列表）
 * - POST   /api/v1/admin/forum/circles/topics/{id}/pin    （置顶）
 * - POST   /api/v1/admin/forum/circles/topics/{id}/unpin  （取消置顶）
 * - DELETE /api/v1/admin/forum/circles/topics/{id}        （硬删除，回复级联清理）
 *
 * 进入方式：从 InterestCircles 页「查看话题」跳转（router.push({ name: 'CircleTopics', query: { circleId } })），
 * 也可在页内手输活动 ID 或从下拉选择圈子加载。
 */
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import {
  listCircles,
  listCircleTopics,
  pinTopic,
  unpinTopic,
  deleteTopic,
  type CircleView,
  type TopicSummary,
} from "../../api/forum";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

const { t } = useI18n();
const route = useRoute();

/** 圈子 ID 输入（从路由 query 初始化，可手输/下拉选择） */
const circleIdInput = ref("");

/** 当前圈子 ID（合法数字时才非空） */
const currentId = (): number | null => {
  const n = Number(circleIdInput.value.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
};

// ===== 圈子下拉选项（用 listCircles 加载，最多取前 100 个） =====
const circleOptions = ref<CircleView[]>([]);

/** 当前选中圈子的名称（列表头部展示） */
const selectedCircleName = computed(
  () => circleOptions.value.find((c) => String(c.id) === circleIdInput.value.trim())?.name ?? "",
);

async function loadCircleOptions(): Promise<void> {
  try {
    const result = await listCircles({ page: 1, pageSize: 100 });
    circleOptions.value = result.items;
  } catch (err: unknown) {
    // 圈下拉为辅助功能，加载失败不阻塞主流程，仅记录错误
    errorMsg.value = err instanceof ApiError ? err.message : t("circleTopics.loadCirclesFailed");
  }
}

/** 下拉选择圈子：填充输入框并加载 */
function handleCircleSelect(): void {
  page.value = 1;
  void fetchTopics();
}

// ===== 列表状态 =====
const topics = ref<TopicSummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");

// ===== 分页状态 =====
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

/** 请求竞态防护 */
let reqSeq = 0;

/** 加载圈内话题列表（依赖当前圈子 ID） */
async function fetchTopics(): Promise<void> {
  const id = currentId();
  if (id === null) {
    topics.value = [];
    total.value = 0;
    totalPages.value = 1;
    errorMsg.value = t("circleTopics.invalidCircleId");
    return;
  }
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listCircleTopics(id, { page: page.value, pageSize: pageSize.value });
    if (seq !== reqSeq) return;
    topics.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("circleTopics.loadFailed");
    topics.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

function handleLoad(): void {
  page.value = 1;
  void fetchTopics();
}

function handlePageChange(): void {
  void fetchTopics();
}

// ===== 置顶/取消置顶（行内操作，可逆无需二次确认） =====
const pinningId = ref<number | null>(null);

async function togglePin(topic: TopicSummary): Promise<void> {
  if (pinningId.value !== null) return;
  pinningId.value = topic.id;
  errorMsg.value = "";
  try {
    if (topic.isPinned) {
      await unpinTopic(topic.id);
    } else {
      await pinTopic(topic.id);
    }
    await fetchTopics();
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : t("circleTopics.pinFailed");
  } finally {
    pinningId.value = null;
  }
}

// ===== 删除确认（硬删除，不可恢复） =====
const deleteVisible = ref(false);
const deleteTarget = ref<TopicSummary | null>(null);
const deleting = ref(false);

function askDelete(topic: TopicSummary): void {
  deleteTarget.value = topic;
  deleteVisible.value = true;
}

async function handleConfirmDelete(): Promise<void> {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  try {
    await deleteTopic(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    await fetchTopics();
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : t("circleTopics.deleteFailed");
  } finally {
    deleting.value = false;
  }
}

function handleCancelDelete(): void {
  deleteTarget.value = null;
  deleting.value = false;
}

/** 作者昵称兜底展示 */
function authorDisplay(topic: TopicSummary): string {
  return topic.authorNickname || t("circleTopics.authorFallback", { id: topic.authorId });
}

// 初始化：加载圈子选项 + 从路由 query 读取 circleId
onMounted(async () => {
  await loadCircleOptions();
  const raw = route.query.circleId;
  circleIdInput.value = typeof raw === "string" ? raw : "";
  if (circleIdInput.value) {
    void fetchTopics();
  } else {
    errorMsg.value = t("circleTopics.invalidCircleId");
  }
});

// 监听路由 query 变化（InterestCircles 页跳转时复用组件，需重新加载）
watch(
  () => route.query.circleId,
  (raw) => {
    const next = typeof raw === "string" ? raw : "";
    if (next && next !== circleIdInput.value) {
      circleIdInput.value = next;
      page.value = 1;
      void fetchTopics();
    }
  },
);
</script>

<template>
  <view class="circle-topics-page">
    <view class="page-header">
      <text class="page-title">{{ t("layout.navCircleTopics") }}</text>
      <text class="page-subtitle">{{ t("circleTopics.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <select v-model="circleIdInput" class="filter-select" @change="handleCircleSelect">
        <option value="">{{ t("circleTopics.selectCirclePlaceholder") }}</option>
        <option v-for="c in circleOptions" :key="c.id" :value="String(c.id)">
          {{ c.name }}（#{{ c.id }}）
        </option>
      </select>
      <input
        v-model="circleIdInput"
        class="search-input"
        type="text"
        :placeholder="t('circleTopics.inputCirclePlaceholder')"
        @keyup.enter="handleLoad"
      />
      <button class="primary-button" @click="handleLoad">{{ t("common.search") }}</button>
    </view>

    <view v-if="selectedCircleName" class="circle-name-tip">
      {{ t("circleTopics.currentCircle", { name: selectedCircleName, id: circleIdInput }) }}
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchTopics" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("circleTopics.columnId") }}</th>
            <th scope="col">{{ t("circleTopics.columnTitle") }}</th>
            <th scope="col">{{ t("circleTopics.columnAuthor") }}</th>
            <th scope="col">{{ t("circleTopics.columnReplyCount") }}</th>
            <th scope="col">{{ t("circleTopics.columnPinned") }}</th>
            <th scope="col">{{ t("circleTopics.columnCreatedAt") }}</th>
            <th scope="col">{{ t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="topics.length === 0">
            <td colspan="7" class="empty-row">{{ t("circleTopics.noData") }}</td>
          </tr>
          <tr v-for="topic in topics" :key="topic.id">
            <td>{{ topic.id }}</td>
            <td class="title-cell">{{ topic.title }}</td>
            <td>{{ authorDisplay(topic) }}</td>
            <td>{{ topic.replyCount }}</td>
            <td>
              <span v-if="topic.isPinned" class="status-badge badge-pinned">{{ t("circleTopics.pinned") }}</span>
              <span v-else class="status-badge badge-normal">{{ t("circleTopics.notPinned") }}</span>
            </td>
            <td class="time-cell">{{ formatDateTime(topic.createdAt) }}</td>
            <td class="action-cell">
              <button
                class="action-button pin"
                :disabled="pinningId !== null"
                @click="togglePin(topic)"
              >{{ topic.isPinned ? t("circleTopics.actionUnpin") : t("circleTopics.actionPin") }}</button>
              <button class="action-button delete" @click="askDelete(topic)">{{ t("common.delete") }}</button>
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

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="t('circleTopics.deleteTitle')"
      :message="deleteTarget ? t('circleTopics.deleteConfirmMessage', { title: deleteTarget.title }) : ''"
      :danger="true"
      :confirming="deleting"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.circle-topics-page {
  max-width: 1200px;
}

.circle-name-tip {
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-secondary);
}

.title-cell {
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

.badge-pinned {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.badge-normal {
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-quaternary);
}

.action-button.pin {
  background: var(--admin-color-accent-soft);
  color: var(--admin-color-accent);
}

.action-button.pin:hover {
  background: var(--admin-color-bg-hover);
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
