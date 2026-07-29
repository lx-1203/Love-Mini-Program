<script setup lang="ts">
/**
 * 反馈历史记录页（功能10）
 *
 * 展示当前用户的所有反馈提交记录，支持：
 * - 按类型筛选（全部 / 反馈 / 建议 / 活动提案）
 * - 点击列表项展开查看详情（content + attachments + latestReplyContent）
 * - 详情通过 clientApi.getSubmissionDetail 异步加载，避免列表流量浪费
 * - 支持 URL 参数 ?id=N 自动展开指定记录（从反馈中心跳转入口）
 *
 * 数据来源：
 * - 列表：feedbackStore.load(type) -> SubmissionRecord[]
 * - 详情：clientApi.getSubmissionDetail(id) -> SubmissionDetailView
 *
 * mp-weixin 兼容性：
 * - 使用 @tap（不使用 @click）
 * - 使用 hover-class（不使用 :hover 伪类）
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding（catch 必须带参数）
 * - 不使用 backdrop-filter（仅 H5 条件编译）
 */
import { computed, onMounted, ref, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppShell from "../../components/layout/AppShell.vue";
import SectionCard from "../../components/common/SectionCard.vue";
import StatusState from "../../components/common/StatusState.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import { useFeedbackStore } from "../../stores/feedback";
import { clientApi } from "../../services/api";
import {
  toSubmissionStatusLabel,
  toSubmissionStatusTone,
} from "../../view-models/feedback";
import { errorHaptic, lightHaptic } from "../../utils/haptic";
import type { SubmissionDetailView } from "../../services/generated/api-types-supplement";

/**
 * SubTask 1.5.2：URL 参数 id 自动展开定时器引用，用于卸载时清理。
 *
 * <p>原实现 2 处 {@code setTimeout(..., 300)} 未保存返回值，
 * 用户在 300ms 延迟内快速返回上一页时，定时器仍会触发 toggleExpand
 * 并修改已销毁页面的展开状态。</p>
 */
let autoExpandTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * SubTask 1.5.2：页面卸载时清理未触发的自动展开定时器。
 */
onUnmounted(() => {
  if (autoExpandTimer) {
    clearTimeout(autoExpandTimer);
    autoExpandTimer = null;
  }
});

/** 反馈类型筛选枚举（"all" 表示全部）。
 *  类型值与后端 FeedbackTicketType 枚举保持一致（大写形式）。 */
type FilterType = "all" | "FEEDBACK" | "SUGGESTION" | "ACTIVITY_PROPOSAL";

/** 类型筛选选项（Task 28：label 通过 i18n 计算属性动态切换） */
const FILTER_OPTIONS = computed<{ value: FilterType; label: string }[]>(() => [
  { value: "all", label: t("feedbackHistory.filterAll") },
  { value: "FEEDBACK", label: t("feedbackHistory.filterFeedback") },
  { value: "SUGGESTION", label: t("feedbackHistory.filterSuggestion") },
  { value: "ACTIVITY_PROPOSAL", label: t("feedbackHistory.filterActivityProposal") },
]);

const { t } = useI18n();
const feedbackStore = useFeedbackStore();

/** 当前激活的筛选类型 */
const activeFilter = ref<FilterType>("all");
/** 当前展开的记录 ID（一次只展开一项；为 null 表示全部收起） */
const expandedId = ref<number | null>(null);
/** 详情加载中标志（按记录 ID 索引，支持多记录独立加载状态） */
const detailLoading = ref<Record<number, boolean>>({});
/** 已加载的详情缓存（避免重复请求同一记录） */
const detailCache = ref<Record<number, SubmissionDetailView>>({});
/** 错误信息（用于错误条展示） */
const errorMessage = ref<string | null>(null);

/**
 * 经过筛选后的提交记录列表。
 *
 * "all" 类型返回全部记录，否则按 type 字段筛选。
 */
const filteredSubmissions = computed(() => {
  const list = feedbackStore.submissions;
  if (activeFilter.value === "all") return list;
  return list.filter((item) => item.type === activeFilter.value);
});

/**
 * 加载反馈列表。
 *
 * @param filter - 筛选类型，未传时使用当前 activeFilter
 */
async function loadList(filter?: FilterType): Promise<void> {
  errorMessage.value = null;
  const type = filter ?? activeFilter.value;
  try {
    // feedbackStore.load 接受 SubmissionType | undefined
    // "all" 对应 undefined（不筛选）
    await feedbackStore.load(type === "all" ? undefined : type);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("common.networkError");
    console.error("[feedback/history.loadList]", error);
  }
}

/**
 * 切换筛选类型并重新加载列表。
 *
 * @param filter - 目标筛选类型
 */
async function switchFilter(filter: FilterType): Promise<void> {
  if (filter === activeFilter.value) return;
  activeFilter.value = filter;
  expandedId.value = null;
  lightHaptic();
  await loadList(filter);
}

/**
 * 切换某条记录的展开状态。
 *
 * - 已展开 -> 收起
 * - 未展开 -> 展开，并按需加载详情（首次展开时调用 getSubmissionDetail）
 *
 * @param id - 记录 ID
 */
async function toggleExpand(id: number): Promise<void> {
  // 已展开 -> 收起
  if (expandedId.value === id) {
    expandedId.value = null;
    lightHaptic();
    return;
  }
  // 切换到新记录
  expandedId.value = id;
  lightHaptic();
  // 已缓存详情 -> 直接使用，不再请求
  if (detailCache.value[id]) return;
  // 加载详情
  detailLoading.value = { ...detailLoading.value, [id]: true };
  try {
    const detail = await clientApi.getSubmissionDetail(id);
    detailCache.value = { ...detailCache.value, [id]: detail };
  } catch (error) {
    const msg = error instanceof Error ? error.message : t("feedback.historyLoadFailed");
    errorMessage.value = msg;
    errorHaptic();
    uni.showToast({ title: msg, icon: "none" });
    // 加载失败时收起，避免显示空白
    expandedId.value = null;
  } finally {
    detailLoading.value = { ...detailLoading.value, [id]: false };
  }
}

/**
 * 点击附件图片：全屏预览。
 *
 * @param urls - 附件 URL 数组
 * @param current - 当前点击的 URL
 */
function handleAttachmentTap(urls: string[], current: string): void {
  if (!urls || urls.length === 0) return;
  lightHaptic();
  uni.previewImage({ urls, current });
}

/**
 * 重试加载（错误状态下点击重试按钮）。
 */
function handleRetry(): void {
  errorHaptic();
  void loadList();
}

/**
 * 解析页面 URL 参数中的 id，自动展开指定记录。
 *
 * mp-weixin 与 H5 双端均通过 onLoad 生命周期获取参数。
 */
function loadQueryId(): void {
  // #ifdef MP-WEIXIN
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  const id = (current as { options?: { id?: string } } | undefined)?.options?.id;
  if (id) {
    const numId = Number(id);
    if (!isNaN(numId) && numId > 0) {
      // 异步触发，确保列表已加载后再展开
      // SubTask 1.5.2：保存定时器引用，卸载时统一清理
      if (autoExpandTimer) clearTimeout(autoExpandTimer);
      autoExpandTimer = setTimeout(() => {
        autoExpandTimer = null;
        void toggleExpand(numId);
      }, 300);
    }
  }
  // #endif
  // #ifndef MP-WEIXIN
  // H5 / App 端：通过 URLSearchParams 解析
  try {
    const hash = window.location.hash || window.location.search || "";
    const queryStart = hash.indexOf("?");
    const id = queryStart >= 0
      ? new URLSearchParams(hash.slice(queryStart + 1)).get("id")
      : null;
    if (id) {
      const numId = Number(id);
      if (!isNaN(numId) && numId > 0) {
        // SubTask 1.5.2：保存定时器引用，卸载时统一清理
        if (autoExpandTimer) clearTimeout(autoExpandTimer);
        autoExpandTimer = setTimeout(() => {
          autoExpandTimer = null;
          void toggleExpand(numId);
        }, 300);
      }
    }
  } catch (_e) {
    // H5 端 URL 解析失败时静默处理
  }
  // #endif
}

onMounted(async () => {
  await loadList();
  loadQueryId();
});

// 切换 Tab 返回时刷新数据，确保最新状态
onShow(() => {
  void loadList();
});
</script>

<template>
  <AppShell
    :title="t('feedback.historyTitle')"
    :subtitle="t('feedback.historyEmptyDesc')"
    :show-tab-bar="false"
  >
    <!-- 类型筛选 Tab -->
    <view class="filter-bar">
      <view
        v-for="opt in FILTER_OPTIONS"
        :key="opt.value"
        class="filter-chip press-feedback"
        :class="{ 'filter-chip--active': activeFilter === opt.value }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="switchFilter(opt.value)"
      >
        <text class="filter-chip__text">{{ opt.label }}</text>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-if="errorMessage" class="error-card card-base">
      <text class="error-card__title">{{ errorMessage }}</text>
      <view
        class="error-card__retry press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="handleRetry"
      >
        <text class="error-card__retry-text">{{ t("common.retry") }}</text>
      </view>
    </view>

    <!-- 空状态 -->
    <EmptyState
      v-else-if="filteredSubmissions.length === 0"
      type="no-data"
      :title="t('feedback.historyEmpty')"
      :description="t('feedback.historyEmptyDesc')"
    />

    <!-- 提交记录列表 -->
    <SectionCard v-else :title="t('feedback.historyTitle')" compact>
      <view
        v-for="item in filteredSubmissions"
        :key="item.id"
        class="record"
      >
        <!-- 列表项主体（可点击展开） -->
        <view
          class="record__header press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="toggleExpand(item.id)"
        >
          <view class="record__top">
            <text class="record__title">{{ item.title }}</text>
            <StatusState
              :tone="toSubmissionStatusTone(item.status)"
              :label="toSubmissionStatusLabel(item.status)"
            />
          </view>
          <text class="record__summary">{{ item.latestReplySummary }}</text>
          <view class="record__meta">
            <text class="record__time">{{ item.submittedAt }}</text>
            <text class="record__expand-hint">
              {{ expandedId === item.id ? t("common.collapse") : t("feedback.historyViewDetail") }}
            </text>
          </view>
        </view>

        <!-- 展开后的详情区 -->
        <view v-if="expandedId === item.id" class="record__detail">
          <!-- 详情加载中 -->
          <view v-if="detailLoading[item.id]" class="detail-loading">
            <view class="detail-loading__spinner" />
            <text class="detail-loading__text">{{ t("common.loading") }}</text>
          </view>

          <!-- 详情内容 -->
          <!-- 修复（严格模式 noUncheckedIndexedAccess）：detailCache[item.id] 索引访问返回 T | undefined，
               vue-tsc 不会通过 v-else-if 收窄类型，故下方所有访问统一使用可选链 + 兜底默认值。 -->
          <template v-else-if="detailCache[item.id]">
            <view class="detail-section">
              <text class="detail-section__label">{{ t("feedback.detailContent") }}</text>
              <text class="detail-section__content">{{ detailCache[item.id]?.content }}</text>
            </view>

            <!-- 附件图片 -->
            <view
              v-if="(detailCache[item.id]?.attachments?.length ?? 0) > 0"
              class="detail-section"
            >
              <text class="detail-section__label">{{ t("feedback.detailAttachments") }}</text>
              <view class="attachment-grid">
                <image
                  v-for="(url, idx) in detailCache[item.id]?.attachments ?? []"
                  :key="`att-${idx}`"
                  class="attachment-img"
                  :src="url"
                  mode="aspectFill"
                  lazy-load
                  @tap="handleAttachmentTap(detailCache[item.id]?.attachments ?? [], url)" alt=""
                />
              </view>
            </view>

            <!-- 最新回复 -->
            <view
              v-if="detailCache[item.id]?.latestReplyContent"
              class="detail-section detail-section--reply"
            >
              <text class="detail-section__label">{{ t("feedback.historyLatestReply") }}</text>
              <text class="detail-section__content">
                {{ detailCache[item.id]?.latestReplyContent }}
              </text>
            </view>
          </template>
        </view>
      </view>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
/* ========== 类型筛选条 ========== */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: var(--sp-4);
}

.filter-chip {
  padding: 12rpx 22rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-border-light, rgba(15, 23, 42, 0.04));
}

.filter-chip--active {
  background: var(--c-brand);
  border-color: var(--c-brand);
}

.filter-chip__text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-secondary);
}

.filter-chip--active .filter-chip__text {
  color: var(--c-text-inverse, #ffffff);
  font-weight: 600;
}

/* ========== 错误状态 ========== */
.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-8);
}

.error-card__title {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  text-align: center;
}

.error-card__retry {
  padding: var(--sp-3) var(--sp-6);
  background: var(--c-brand);
  border-radius: var(--r-full);
}

.error-card__retry-text {
  /* 反色文字：使用 token 替代硬编码 #ffffff */
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  font-weight: 600;
}

/* ========== 空状态 ========== */
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-10);
}

.empty-card__title {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.empty-card__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  text-align: center;
}

/* ========== 提交记录列表项 ========== */
.record {
  border-top: 1rpx solid var(--c-border-light, rgba(15, 23, 42, 0.04));
  padding: 18rpx 0;
}

.record:first-child {
  border-top: 0;
  padding-top: 0;
}

.record__header {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 6rpx 4rpx;
}

.record__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.record__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary);
  flex: 1;
}

.record__summary {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-secondary);
  line-height: 1.6;
}

.record__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.record__time {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
}

.record__expand-hint {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-brand);
  font-weight: 500;
}

/* ========== 展开详情区 ========== */
.record__detail {
  margin-top: 12rpx;
  padding: 16rpx;
  background: var(--c-bg-page);
  border-radius: var(--r-lg, 16rpx);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.detail-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 0;
}

.detail-loading__spinner {
  width: 36rpx;
  height: 36rpx;
  border: 3rpx solid var(--c-border-light, rgba(15, 23, 42, 0.08));
  border-top-color: var(--c-brand);
  border-radius: var(--r-circle, 50%);
  animation: feedback-history-spinner var(--d-spinner, 800ms) linear infinite;
}

@keyframes feedback-history-spinner {
  to {
    transform: rotate(360deg);
  }
}

.detail-loading__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.detail-section--reply {
  padding-top: 12rpx;
  border-top: 1rpx dashed var(--c-border-light, rgba(15, 23, 42, 0.06));
}

.detail-section__label {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
  font-weight: 600;
}

.detail-section__content {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-primary);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.attachment-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.attachment-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: var(--r-md, 12rpx);
  background: var(--c-bg-container);
}
</style>
