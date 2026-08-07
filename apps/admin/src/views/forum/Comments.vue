<script setup lang="ts">
/**
 * Admin v2 - 统一评论管理视图（社区论坛域）。
 *
 * 对应后端 com.campuslove.api.admin.AdminCommentController：
 * - GET    /api/v1/admin/comments        （分页列表）
 * - DELETE /api/v1/admin/comments/{id}   （删除评论，硬删除不可恢复）
 *
 * 交互参考旧后台 Comments.vue：分页列表（Pagination）+ 删除前 ConfirmDialog 二次确认。
 */
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  listComments,
  deleteComment,
  type PostCommentView,
} from "../../api/forum";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

const { t } = useI18n();

const comments = ref<PostCommentView[]>([]);
const loading = ref(false);
const errorMsg = ref("");

const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

// 删除确认弹窗状态
const deleteVisible = ref(false);
const deleteTarget = ref<PostCommentView | null>(null);
const deleting = ref(false);

/** 请求竞态防护：快速翻页时旧响应不覆盖新数据 */
let reqSeq = 0;

/**
 * 分页加载评论列表。
 */
async function fetchComments(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listComments({ page: page.value, pageSize: pageSize.value });
    if (seq !== reqSeq) return; // 丢弃过期响应
    comments.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (seq !== reqSeq) return;
    errorMsg.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("comments.loadFailed");
    comments.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

function handlePageChange(): void {
  void fetchComments();
}

/** 点击删除：打开确认弹窗 */
function handleDeleteClick(comment: PostCommentView): void {
  deleteTarget.value = comment;
  deleteVisible.value = true;
}

/** ConfirmDialog 确认回调：执行删除 */
async function handleConfirmDelete(): Promise<void> {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  errorMsg.value = "";
  try {
    await deleteComment(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    await fetchComments();
  } catch (err: unknown) {
    errorMsg.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("comments.deleteFailed");
  } finally {
    deleting.value = false;
  }
}

/** ConfirmDialog 取消回调 */
function handleCancelDelete(): void {
  deleteTarget.value = null;
  deleting.value = false;
}

/** 作者展示：昵称缺失时回退到 用户#{id} */
function authorLabel(comment: PostCommentView): string {
  return comment.authorNickname || t("comments.authorFallback", { id: comment.authorId });
}

onMounted(() => {
  void fetchComments();
});
</script>

<template>
  <view class="comments-page">
    <view class="page-header">
      <text class="page-title">{{ t("comments.title") }}</text>
      <text class="page-subtitle">{{ t("comments.subtitle") }}</text>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchComments" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("comments.columnId") }}</th>
            <th scope="col">{{ t("comments.columnPostId") }}</th>
            <th scope="col">{{ t("comments.columnAuthorId") }}</th>
            <th scope="col">{{ t("comments.columnAuthor") }}</th>
            <th scope="col">{{ t("comments.columnContent") }}</th>
            <th scope="col">{{ t("comments.columnCreatedAt") }}</th>
            <th scope="col">{{ t("comments.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="comments.length === 0">
            <td colspan="7" class="empty-row">{{ t("comments.noData") }}</td>
          </tr>
          <tr v-for="comment in comments" :key="comment.id">
            <td>{{ comment.id }}</td>
            <td>{{ comment.postId ?? t("common.emptyPlaceholder") }}</td>
            <td>{{ comment.authorId }}</td>
            <td>{{ authorLabel(comment) }}</td>
            <td class="content-cell">{{ comment.content }}</td>
            <td class="time-cell">{{ formatDateTime(comment.createdAt) }}</td>
            <td class="action-cell">
              <button class="action-button delete" @click="handleDeleteClick(comment)">
                {{ t("comments.actionDelete") }}
              </button>
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

    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="t('comments.deleteTitle')"
      :message="deleteTarget ? t('comments.deleteConfirmMessage', { id: deleteTarget.id }) : ''"
      :danger="true"
      :confirming="deleting"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.comments-page {
  max-width: 1400px;
}

.content-cell {
  max-width: 360px;
  word-break: break-all;
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}
</style>
