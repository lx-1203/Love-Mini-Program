<script setup lang="ts">
/**
 * 话题详情页
 * 展示话题完整内容、作者信息、回复列表，底部回复输入框
 * 支持从回复直接"打招呼"跳转到私信会话
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCircleStore, formatCircleTime, type ReplyItem } from "../../stores/circle";
import { useSessionStore } from "../../stores/session";
import { useReportStore } from "../../stores/report";
import { openAppPath } from "../../utils/navigation";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../utils/media";
import EmptyState from "../../components/common/EmptyState.vue";

const { t } = useI18n();
const circleStore = useCircleStore();
const sessionStore = useSessionStore();
const reportStore = useReportStore();
const { currentTopic, replies, loading } = storeToRefs(circleStore);

/** 回复内容 */
const replyContent = ref("");
/** 是否正在提交回复 */
const isSubmitting = ref(false);
/** 话题 ID */
const topicId = ref("");

/** 当前登录用户 ID */
const currentUserId = computed(() => sessionStore.userSession?.userId ?? "");

const pageVisible = ref(false);
/** SubTask 1.5.2：页面进入淡入定时器引用，用于卸载时清理 */
let pageEnterTimer: ReturnType<typeof setTimeout> | null = null;

onShow(() => {
  pageVisible.value = false;
  if (pageEnterTimer) clearTimeout(pageEnterTimer);
  pageEnterTimer = setTimeout(() => {
    pageEnterTimer = null;
    pageVisible.value = true;
  }, 30);
});

/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 */
onUnmounted(() => {
  if (pageEnterTimer) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
  }
});

/**
 * 提交回复
 */
async function submitReply() {
  if (!topicId.value || !replyContent.value.trim()) return;

  isSubmitting.value = true;
  try {
    await circleStore.replyToTopic(topicId.value, replyContent.value.trim());
    replyContent.value = "";
    uni.showToast({ title: t("circle.topicDetailReplySuccess"), icon: "success" });
  } catch (_e) {
    uni.showToast({
      title: circleStore.errorMessage || t("circle.topicDetailReplyFailed"),
      icon: "none",
    });
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * 向回复者发起"打招呼"，跳转到私信会话页并预填破冰文案
 * @param reply - 目标回复项
 */
function sayHello(reply: ReplyItem) {
  if (!currentTopic.value || !reply.author.userId) return;

  const topicTitle = currentTopic.value.title;

  // 基于话题上下文生成破冰文案
  const prefillMessage = t("circle.topicDetailSayHelloPrefill", { topic: topicTitle });

  // 引用上下文：话题标题 + 回复内容 + 回复者名
  const quoteContext = JSON.stringify({
    topicTitle,
    topicId: topicId.value,
    replyId: reply.id,
    replyContent: reply.content,
    replyAuthorName: reply.author.name,
  });

  // 跳转到私信会话页，携带目标用户 ID、预填消息和引用上下文
  openAppPath(
    `/pages/chat-session/index?userId=${reply.author.userId}&prefillMessage=${encodeURIComponent(prefillMessage)}&quoteContext=${encodeURIComponent(quoteContext)}`
  );
}

/**
 * 跳转到作者 / 回复者个人主页（F1.3）
 * 头像点击事件使用 catchtap 阻止冒泡，避免触发外层卡片或长按事件
 * @param authorId - 作者 userId
 */
function goToAuthorProfile(authorId: string) {
  if (!authorId) return;
  openAppPath(`/pages/profile/index?userId=${encodeURIComponent(authorId)}`);
}

/**
 * 返回上一页
 */
function goBack() {
  circleStore.clearCurrentTopic();
  uni.navigateBack();
}

/** 举报原因选项（与产品约定，覆盖常见违规场景；Task 28：i18n 化计算属性） */
const REPORT_REASONS = computed<string[]>(() => [
  t("circle.topicDetailReportSpam"),
  t("circle.topicDetailReportAbuse"),
  t("circle.topicDetailReportPorn"),
  t("circle.topicDetailReportIllegal"),
  t("circle.topicDetailReportOther"),
]);

/**
 * 长按话题触发举报流程。
 * 1. 弹出 ActionSheet 选择举报原因
 * 2. 弹出 Modal 收集可选补充描述
 * 3. 调用后端举报接口持久化
 */
async function handleReportTopic() {
  if (!topicId.value) return;

  // 1. 选择举报原因
  let reason: string;
  try {
    const res = await uni.showActionSheet({ itemList: REPORT_REASONS.value });
    // 修复（严格模式 noUncheckedIndexedAccess）：REPORT_REASONS[res.tapIndex] 索引访问返回 string | undefined，
    // 此处兜底取第一项，确保 reason 始终为 string（与 showActionSheet 的 itemList 一一对应，正常流程不会越界）。
    reason = REPORT_REASONS.value[res.tapIndex] ?? REPORT_REASONS.value[0] ?? "";
  } catch (_e) {
    // 用户取消选择，静默退出
    return;
  }

  // 2. 收集可选补充描述
  let description: string | undefined;
  try {
    const res = await uni.showModal({
      title: t("circle.topicDetailReportSupplementTitle"),
      editable: true,
      placeholderText: t("circle.topicDetailReportSupplementPlaceholder"),
      confirmText: t("circle.topicDetailReportSubmit"),
      cancelText: t("circle.topicDetailReportSkip"),
    });
    if (res.confirm && res.content) {
      description = res.content;
    }
  } catch (_e) {
    // 取消则不附加描述，继续提交
  }

  // 3. 调用举报接口
  try {
    await reportStore.reportTarget("TOPIC", topicId.value, reason, description);
    uni.showToast({ title: t("circle.topicDetailReportSubmitted"), icon: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("circle.topicDetailReportFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

onMounted(() => {
  // 获取页面参数
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as { options?: Record<string, string> })?.options ?? {};
  topicId.value = options.topicId || "";

  if (topicId.value) {
    void circleStore.fetchTopicDetail(topicId.value);
    void circleStore.fetchReplies(topicId.value, 1);
  }
});

// 修复（严格模式 noUnusedLocals）：sayHello/goToAuthorProfile 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ sayHello, goToAuthorProfile });
</script>

<template>
  <view class="detail-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航栏 -->
    <view class="detail-header">
      <view class="detail-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">{{ t("circle.topicDetailBack") }}</text>
      </view>
      <text class="detail-header__title">{{ t("circle.topicDetailNavTitle") }}</text>
      <view class="detail-header__spacer" />
    </view>

    <!-- 话题内容 -->
    <scroll-view v-if="currentTopic" class="detail-body" scroll-y>
      <!-- 作者信息 -->
      <view class="topic-author">
        <view
          class="author-avatar"
          catchtap="goToAuthorProfile(currentTopic.author.userId)"
        >
          <image
            v-if="currentTopic.author.avatar"
            class="author-avatar__img"
            :src="resolveMediaUrl(currentTopic.author.avatar)"
            mode="aspectFill" lazy-load alt=""
          />
          <text v-else class="author-avatar__char">{{ currentTopic.author.name[0] }}</text>
        </view>
        <view class="author-info">
          <text class="author-info__name">{{ currentTopic.author.name }}</text>
          <text class="author-info__headline">{{ currentTopic.author.headline }}</text>
        </view>
        <text class="topic-time">{{ formatCircleTime(currentTopic.createdAt) }}</text>
      </view>

      <!-- 话题正文 -->
      <view class="topic-content" @longpress="handleReportTopic">
        <text class="topic-title">{{ currentTopic.title }}</text>
        <text class="topic-text">{{ currentTopic.content }}</text>

        <!-- 图片展示 -->
        <view v-if="currentTopic.images.length > 0" class="topic-images">
          <view
            v-for="(img, idx) in currentTopic.images" :key="idx"
            class="topic-image-wrap"
          >
            <image
              class="topic-image"
              :src="img"
              mode="aspectFill"
              lazy-load alt=""
            />
          </view>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="replies-section">
        <view class="replies-header">
          <text class="replies-title">{{ t("circle.topicDetailRepliesTitle") }}</text>
          <text class="replies-count">{{ replies.length }}</text>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="replies-loading">
          <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('circle.topicDetailLoadingAria')" />
          <text class="loading-text">{{ t("circle.topicDetailLoadingReplies") }}</text>
        </view>

        <!-- 回复列表 -->
        <view v-else-if="replies.length > 0" class="replies-list" role="list">
          <view
            v-for="reply in replies" :key="reply.id"
            class="reply-item list-item"
          >
            <view
              class="reply-avatar"
              catchtap="goToAuthorProfile(reply.author.userId)"
            >
              <image
                v-if="reply.author.avatar"
                class="reply-avatar__img"
                :src="resolveMediaUrl(reply.author.avatar)"
                mode="aspectFill" lazy-load alt=""
              />
              <text v-else class="reply-avatar__char">{{ reply.author.name[0] }}</text>
            </view>
            <view class="reply-body">
              <view class="reply-content">
                <view class="reply-header">
                  <text class="reply-author">{{ reply.author.name }}</text>
                  <text class="reply-time">{{ formatCircleTime(reply.createdAt) }}</text>
                </view>
                <text class="reply-text">{{ reply.content }}</text>
              </view>
              <!-- 打招呼按钮：不显示在自己回复上 -->
              <view
                v-if="reply.author.userId !== currentUserId"
                class="reply-say-hello"
                catchtap="sayHello(reply)"
              >
                <text class="reply-say-hello__text">{{ t("circle.topicDetailSayHello") }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else class="replies-empty">
          <text class="replies-empty__text">{{ t("circle.topicDetailEmptyReplies") }}</text>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="body-footer" />
    </scroll-view>

    <!-- 话题不存在 -->
    <EmptyState
      v-else-if="!loading"
      :title="t('circle.topicDetailNotExist')"
      :action-text="t('circle.topicDetailBack')"
      type="no-data"
      @action="goBack"
    />

    <!-- 底部回复栏 -->
    <view v-if="currentTopic" class="detail-footer">
      <view class="reply-input-wrap">
        <input
          v-model="replyContent"
          class="reply-input"
          :placeholder="t('circle.topicDetailReplyPlaceholder')"
          confirm-type="send"
          @confirm="submitReply" :aria-label="t('circle.topicDetailReplyPlaceholder')"
        />
      </view>
      <view
        class="reply-btn press-feedback"
        :class="{ 'reply-btn--disabled': !replyContent.trim() || isSubmitting }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="submitReply"
      >
        <text class="reply-btn__text">{{ isSubmitting ? t("circle.topicDetailReplySending") : t("circle.topicDetailReplySend") }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: linear-gradient(180deg, var(--c-bg-brand) 0%, var(--c-bg-page) 20%);
}

/* ========== 顶部导航栏 ========== */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + var(--sp-6)) var(--sp-8) var(--sp-6);
  background: var(--c-gradient-brand);
  z-index: 10;
}

.detail-header__back {
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-full);
  background: var(--c-overlay-white-bg-mid-strong, var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.25)));
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.detail-header__back:active {
  transform: scale(0.96);
  background: var(--c-overlay-white-bg-stronger, var(--c-overlay-white-bg-stronger, rgba(255, 255, 255, 0.4)));
}
/* #endif */

.back-icon {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 500;
}

.detail-header__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-neutral-0);
}

.detail-header__spacer {
  min-width: 80rpx;
}

/* ========== 内容区 ========== */
.detail-body {
  flex: 1;
  padding: var(--sp-6);
}

/* 作者信息 */
.topic-author {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-7);
  background: var(--c-neutral-0);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  box-shadow: var(--s-card-soft);
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.topic-author:active {
  transform: scale(0.98);
}
/* #endif */

.author-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.author-avatar__img {
  width: 100%;
  height: 100%;
}

.author-avatar__char {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-brand-500);
}

.author-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.author-info__name {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.author-info__headline {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-time {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

/* 话题正文 */
.topic-content {
  padding: var(--sp-7);
  background: var(--c-neutral-0);
  border-radius: 0 0 var(--r-xl) var(--r-xl);
  margin-bottom: var(--sp-5);
  box-shadow: var(--s-card-soft);
}

.topic-title {
  display: block;
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1.5;
  margin-bottom: var(--sp-5);
}

.topic-text {
  font-size: var(--fs-lg);
  color: var(--c-text-secondary);
  line-height: 1.8;
  display: block;
  margin-bottom: var(--sp-5);
  white-space: pre-wrap;
}

.topic-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.topic-image-wrap {
  width: calc((100% - 20rpx) / 3);
}

.topic-image {
  width: 100%;
  height: 200rpx;
  border-radius: var(--r-md);
  background: var(--c-bg-page);
}

/* ========== 评论区 ========== */
.replies-section {
  background: var(--c-neutral-0);
  padding: var(--sp-7);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
}

.replies-header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-6);
}

.replies-title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.replies-count {
  font-size: var(--fs-base);
  color: var(--c-brand-500);
  background: var(--c-bg-brand);
  padding: 6rpx 18rpx;
  border-radius: var(--r-full);
  font-weight: 600;
}

.replies-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  padding: 40rpx 0;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid var(--c-border-default);
  border-top-color: var(--c-brand-500);
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
}

.reply-item {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-5);
  background: var(--c-bg-page);
  border-radius: var(--r-lg);
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.reply-item:active {
  transform: scale(0.98);
}
/* #endif */

.reply-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reply-avatar__img {
  width: 100%;
  height: 100%;
}

.reply-avatar__char {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-brand-500);
}

.reply-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: 10rpx;
}

.reply-author {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.reply-time {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.reply-text {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.6;
}

/* ========== 打招呼按钮 ========== */
.reply-say-hello {
  align-self: flex-start;
  padding: 10rpx var(--sp-6);
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.reply-say-hello:active {
  transform: scale(0.96);
  background: var(--c-gradient-float-btn);
}
/* #endif */

/* #ifdef H5 */
.reply-say-hello:active .reply-say-hello__text {
  color: var(--c-neutral-0);
}
/* #endif */

.reply-say-hello__text {
  font-size: var(--fs-sm);
  color: var(--c-brand-500);
  font-weight: 600;
}

.replies-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.replies-empty__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

.body-footer {
  height: 40rpx;
}

/* ========== 空状态 ========== */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
}

.empty-state__text {
  font-size: var(--fs-xl);
  color: var(--c-text-tertiary);
}

.empty-state__back {
  padding: 18rpx 48rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  box-shadow: var(--s-brand);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.empty-state__back:active {
  transform: scale(0.96);
}
/* #endif */

.back-text {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 600;
}

/* ========== 底部回复栏 ========== */
.detail-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-5) var(--sp-8);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-5));
  background: var(--c-neutral-0);
  box-shadow: 0 -4rpx 16rpx var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
}

.reply-input-wrap {
  flex: 1;
}

.reply-input {
  padding: var(--sp-5) var(--sp-7);
  border-radius: var(--r-full);
  background: var(--c-bg-page);
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  border: 2rpx solid transparent;
  transition: all var(--d-normal, 200ms) ease;
}

.reply-input:focus {
  border-color: var(--c-brand-500);
  background: var(--c-neutral-0);
}

.reply-btn {
  padding: 18rpx var(--sp-8);
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  flex-shrink: 0;
  box-shadow: var(--s-brand-md);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.reply-btn:active {
  transform: scale(0.96);
}
/* #endif */

.reply-btn--disabled {
  background: var(--c-border-default);
  box-shadow: none;
  pointer-events: none;
}

.reply-btn__text {
  font-size: var(--fs-md);
  color: var(--c-neutral-0);
  font-weight: 600;
  white-space: nowrap;
}

.reply-btn--disabled .reply-btn__text {
  color: var(--c-text-tertiary);
}
</style>
