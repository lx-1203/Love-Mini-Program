<script setup lang="ts">
/**
 * 聊天详情页 - 支持私信会话和临时匿名聊天会话
 * 支持从兴趣圈"打招呼"跳转，携带预填消息和引用上下文
 */
import { computed, ref, watch } from "vue";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import AppShell from "../../components/layout/AppShell.vue";
import SectionCard from "../../components/common/SectionCard.vue";
import BottomActionBar from "../../components/common/BottomActionBar.vue";
import StatusState from "../../components/common/StatusState.vue";
import ChatBubble from "../../components/chat/ChatBubble.vue";
import IcebreakerSuggestions from "../../components/chat/IcebreakerSuggestions.vue";
import { useMessagesStore } from "../../stores/messages";
import { useChatStore } from "../../stores/chat";
import { usePageAccess } from "../../composables/usePageAccess";
import { chatPageRequirements } from "../../config/page-access";

const messagesStore = useMessagesStore();
const chatStore = useChatStore();

const draft = ref("");
const sessionId = ref<string | null>(null);
const targetUserId = ref<string | null>(null);
const pageErrorMessage = ref<string | null>(null);
const tempCountdown = ref("");

/** 引用上下文（来自兴趣圈回复的破冰场景） */
interface QuoteContext {
  topicTitle: string;
  topicId: string;
  replyId: string;
  replyContent: string;
  replyAuthorName: string;
}
const quoteContext = ref<QuoteContext | null>(null);

let countdownTimer: ReturnType<typeof setInterval> | null = null;

/* ========== 破冰话题 ========== */
/** 输入框是否聚焦 */
const inputFocused = ref(false);
/** 空闲计时器 ID */
let idleTimer: ReturnType<typeof setTimeout> | null = null;
/** 是否显示空闲提示（5 秒未输入则展示） */
const showIdleIcebreakerHint = ref(false);

/** 用户消息数量（排除 system 类型消息） */
const userMessageCount = computed(() => {
  const fromMessagesStore = messagesStore.currentMessages.filter(
    (m) => m.sender !== "system" && m.kind !== "system"
  ).length;
  const fromChatStore = chatStore.activeSession?.messages?.filter(
    (m) => m.sender !== "system" && m.kind !== "system"
  ).length ?? 0;
  return Math.max(fromMessagesStore, fromChatStore);
});

/** 是否应该展示破冰话题（消息数为 0 或极少时） */
const shouldShowIcebreakers = computed(() => {
  return userMessageCount.value <= 1 && !pageErrorMessage.value;
});

usePageAccess(chatPageRequirements);

onLoad((query) => {
  // ---- 预填消息参数（来自兴趣圈"打招呼"跳转） ----
  if (query && typeof query.prefillMessage === "string" && query.prefillMessage.trim().length > 0) {
    draft.value = decodeURIComponent(query.prefillMessage);
  }

  // ---- 引用上下文参数 ----
  if (query && typeof query.quoteContext === "string" && query.quoteContext.trim().length > 0) {
    try {
      quoteContext.value = JSON.parse(decodeURIComponent(query.quoteContext));
    } catch {
      // 解析失败时静默忽略
      quoteContext.value = null;
    }
  }

  if (query && typeof query.sessionId === "string" && query.sessionId.trim().length > 0) {
    sessionId.value = query.sessionId;
    pageErrorMessage.value = null;
    return;
  }

  // 支持通过 userId 参数查找或创建会话
  if (query && typeof query.userId === "string" && query.userId.trim().length > 0) {
    const rawUserId = query.userId.trim();
    targetUserId.value = rawUserId;
    const existingSession = messagesStore.sessions.find(
      (s) => s.partnerId === rawUserId && s.sessionType === "private"
    );
    if (existingSession) {
      sessionId.value = existingSession.id;
      pageErrorMessage.value = null;
      return;
    }
    // Mock 模式下无现有会话时，使用 userId 作为临时标识
    sessionId.value = `session-${rawUserId}`;
    pageErrorMessage.value = null;
    return;
  }

  pageErrorMessage.value = "缺少会话标识，请从聊天列表或匹配结果进入。";
});

onShow(() => {
  if (!sessionId.value) {
    return;
  }

  // 优先从 messagesStore 加载会话信息
  void messagesStore.fetchSessionMessages(sessionId.value);

  // 如果是临时会话，同时兼容旧 chatStore 的加载逻辑
  const session = messagesStore.sessions.find((s) => s.id === sessionId.value);
  if (!session || session.sessionType === "temp_anonymous") {
    void chatStore.loadSession(sessionId.value);
  }

  startTempCountdown();
  void loadIcebreakers();
});

onUnload(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  clearIdleTimer();
});

/** 当前会话信息（优先从 messagesStore 获取） */
const currentSession = computed(() => {
  return messagesStore.sessions.find((s) => s.id === sessionId.value) || null;
});

/** 是否为临时匿名会话 */
const isTempSession = computed(() => currentSession.value?.sessionType === "temp_anonymous");

/** 是否为私信会话 */
const isPrivateSession = computed(() => currentSession.value?.sessionType === "private");

/** 会话是否已关闭 */
const isSessionClosed = computed(() => {
  if (currentSession.value) {
    return currentSession.value.phase === "closed";
  }
  return chatStore.activeSession?.phase === "closed";
});

/** 页面标题 */
const pageTitle = computed(() => {
  if (isTempSession.value) return "24小时临时聊天";
  if (isPrivateSession.value) return currentSession.value?.partnerName || "私信";
  // 通过 userId 导航但无现有会话时，标明目标用户
  if (targetUserId.value) {
    const partnerName = messagesStore.sessions.find(
      (s) => s.partnerId === targetUserId.value && s.sessionType === "private"
    )?.partnerName;
    return partnerName || "对话中";
  }
  return chatStore.activeSession?.partnerName || "聊天";
});

/** 页面副标题 */
const pageSubtitle = computed(() => {
  if (isTempSession.value) {
    return tempCountdown.value
      ? `剩余时间：${tempCountdown.value}`
      : currentSession.value?.partnerHeadline || "双方身份匿名，24小时后自动结束";
  }
  if (isPrivateSession.value) return currentSession.value?.partnerHeadline || "";
  return chatStore.activeSession?.partnerHeadline || "";
});

/** 启动临时会话倒计时 */
function startTempCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  updateTempCountdown();

  const session = currentSession.value;
  if (session?.sessionType === "temp_anonymous" && session.closesAt) {
    countdownTimer = setInterval(updateTempCountdown, 1000);
  }
}

function updateTempCountdown() {
  const session = currentSession.value;
  if (!session || session.sessionType !== "temp_anonymous" || !session.closesAt) {
    tempCountdown.value = "";
    return;
  }

  const now = Date.now();
  const closesAt = Date.parse(session.closesAt);
  const diff = closesAt - now;

  if (diff <= 0) {
    tempCountdown.value = "已结束";
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    return;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  tempCountdown.value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** 发送消息 */
async function sendText() {
  if (!draft.value.trim() || !sessionId.value) {
    return;
  }

  if (isSessionClosed.value) {
    uni.showToast({ title: "会话已结束，无法发送消息", icon: "none" });
    return;
  }

  // 私信和临时会话都统一走 messagesStore 发送
  await messagesStore.sendMessage(sessionId.value, draft.value);

  // 临时会话额外同步到 chatStore 以保持兼容性
  if (isTempSession.value) {
    await chatStore.sendText(draft.value);
  }

  draft.value = "";
}

/** 同意交换联系方式（仅临时匿名会话） */
async function handleAcceptExchange() {
  if (!sessionId.value) return;
  try {
    await chatStore.acceptExchange("self");
    uni.showToast({ title: "已同意交换联系方式", icon: "success" });
  } catch {
    uni.showToast({ title: chatStore.errorMessage || "操作失败", icon: "none" });
  }
}

/** 结束会话（仅临时匿名会话） */
async function handleEndSession() {
  if (!sessionId.value) return;
  try {
    await chatStore.endSession();
    uni.showToast({ title: "会话已结束", icon: "success" });
  } catch {
    uni.showToast({ title: chatStore.errorMessage || "操作失败", icon: "none" });
  }
}

/** 发送语音（mock） */
async function sendVoice() {
  if (!sessionId.value || isSessionClosed.value) {
    uni.showToast({ title: "会话已结束，无法发送消息", icon: "none" });
    return;
  }
  // mock 发送 8 秒语音
  if (isTempSession.value) {
    await chatStore.sendVoice(8);
  } else {
    await messagesStore.sendMessage(sessionId.value, "[语音消息]");
  }
}

/* ========== 破冰话题事件处理 ========== */

/** 输入框聚焦：启动空闲计时器，清除提示 */
function onInputFocus() {
  inputFocused.value = true;
  showIdleIcebreakerHint.value = false;
  resetIdleTimer();
}

/** 输入框失焦：清除计时器和提示 */
function onInputBlur() {
  inputFocused.value = false;
  clearIdleTimer();
  showIdleIcebreakerHint.value = false;
}

/** 输入内容变化：重置空闲计时器 */
function onDraftChange() {
  if (inputFocused.value) {
    showIdleIcebreakerHint.value = false;
    resetIdleTimer();
  }
}

/** 重置空闲计时器：5 秒后显示破冰话题提示 */
function resetIdleTimer() {
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    if (inputFocused.value && draft.value.trim().length === 0) {
      showIdleIcebreakerHint.value = true;
    }
  }, 5000);
}

/** 清除空闲计时器 */
function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

/** 选中破冰话题：将话题文本填入输入框 */
function handleIcebreakerSelect(content: string) {
  draft.value = content;
  showIdleIcebreakerHint.value = false;
}

/** 换话题：重新请求破冰话题 */
async function handleRefreshIcebreakers() {
  const peerIdNum = resolvePeerUserId();
  if (peerIdNum === null) return;
  await chatStore.fetchIcebreakers(peerIdNum);
}

/** 解析对方用户 ID 为数字，用于 API 调用 */
function resolvePeerUserId(): number | null {
  if (currentSession.value?.partnerId) {
    const num = Number(currentSession.value.partnerId);
    if (!Number.isNaN(num)) return num;
  }
  // 从 sessionId 中尝试解析（例如 "session-123"）
  if (sessionId.value) {
    const match = sessionId.value.match(/\d+/);
    if (match) return Number(match[0]);
  }
  if (targetUserId.value) {
    const num = Number(targetUserId.value);
    if (!Number.isNaN(num)) return num;
  }
  return null;
}

/** 加载破冰话题 */
async function loadIcebreakers() {
  if (!shouldShowIcebreakers.value) return;
  const peerIdNum = resolvePeerUserId();
  if (peerIdNum === null) return;
  // 避免重复加载
  if (chatStore.icebreakerItems.length > 0) return;
  await chatStore.fetchIcebreakers(peerIdNum);
}
</script>

<template>
  <AppShell
    :title="pageTitle"
    :subtitle="pageSubtitle"
    :show-tab-bar="false"
  >
    <!-- 临时匿名会话顶部提示 -->
    <view v-if="isTempSession" class="temp-banner">
      <text class="temp-banner__text">
        {{ tempCountdown === "已结束" ? "会话已结束" : "24小时临时聊天，双方身份匿名" }}
      </text>
    </view>

    <!-- 会话状态 -->
    <SectionCard v-if="isTempSession" title="会话状态" compact>
      <StatusState
        v-if="chatStore.activeSession"
        tone="brand"
        :label="chatStore.activeSession.contactExchangeLabel"
      />
      <text class="meta-copy">
        {{ chatStore.activeSession?.availabilityHint || '24 小时倒计时和联系方式交换都由状态机驱动。' }}
      </text>
    </SectionCard>

    <!-- 消息列表 -->
    <SectionCard title="消息" compact>
      <view v-if="pageErrorMessage" class="meta-copy">{{ pageErrorMessage }}</view>
      <view v-else-if="messagesStore.loading" class="meta-copy">正在加载聊天详情...</view>
      <view v-else-if="messagesStore.errorMessage" class="meta-copy">{{ messagesStore.errorMessage }}</view>
      <view v-else class="chat-list">
        <!-- 优先展示 messagesStore 的消息 -->
        <ChatBubble
          v-for="message in messagesStore.currentMessages"
          :key="message.id"
          :sender="message.sender"
          :kind="message.kind"
          :body="message.body"
          :sent-at="message.sentAt"
          :duration-seconds="message.durationSeconds"
        />
        <!-- 兼容旧 chatStore 的消息（兜底） -->
        <ChatBubble
          v-for="message in chatStore.activeSession?.messages || []"
          :key="`legacy-${message.id}`"
          :sender="message.sender"
          :kind="message.kind"
          :body="message.body"
          :sent-at="message.sentAt"
          :duration-seconds="message.durationSeconds"
        />
        <text v-if="!messagesStore.currentMessages.length && !chatStore.activeSession?.messages.length" class="meta-copy">
          会话刚建立，还没有消息。
        </text>
        <text v-if="isSessionClosed" class="meta-copy meta-copy--warning">
          会话已结束，无法继续发送消息。
        </text>
      </view>
    </SectionCard>

    <!-- 操作区 -->
    <SectionCard title="操作" compact>
      <view v-if="pageErrorMessage" class="meta-copy">{{ pageErrorMessage }}</view>
      <template v-else>
        <!-- 引用上下文卡片（来自兴趣圈"打招呼"） -->
        <view v-if="quoteContext" class="quote-card">
          <view class="quote-card__header">
            <text class="quote-card__label">引用自「{{ quoteContext.topicTitle }}」</text>
          </view>
          <text class="quote-card__content">"{{ quoteContext.replyContent }}"</text>
          <text class="quote-card__author">-- {{ quoteContext.replyAuthorName }}</text>
        </view>

        <!-- 破冰话题建议（消息数极少时展示） -->
        <IcebreakerSuggestions
          v-if="shouldShowIcebreakers"
          :items="chatStore.icebreakerItems"
          :loading="chatStore.loadingIcebreakers"
          @select="handleIcebreakerSelect"
          @refresh="handleRefreshIcebreakers"
        />

        <textarea
          v-model="draft"
          class="draft"
          maxlength="240"
          :disabled="isSessionClosed"
          :placeholder="isSessionClosed ? '会话已结束' : '输入消息...'"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @input="onDraftChange"
        />

        <!-- 输入框空闲提示（停留 5 秒未输入时展示） -->
        <view v-if="showIdleIcebreakerHint && shouldShowIcebreakers" class="idle-hint">
          <text class="idle-hint__icon">&#128161;</text>
          <text class="idle-hint__text">不知道说什么？试试上面的破冰话题吧</text>
        </view>

        <BottomActionBar
          primary-label="发送文字"
          :secondary-label="isTempSession ? '同意交换' : undefined"
          @primary="sendText"
          @secondary="isTempSession && handleAcceptExchange()"
        />
        <BottomActionBar
          primary-label="发送语音"
          :secondary-label="isTempSession ? '结束会话' : undefined"
          @primary="sendVoice"
          @secondary="isTempSession && handleEndSession()"
        />
      </template>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.temp-banner {
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #fef3f2 0%, #fff1f2 100%);
  border: 1px solid rgba(244, 63, 94, 0.12);
  text-align: center;
}

.temp-banner__text {
  font-size: 24rpx;
  color: var(--td-error-color);
  font-weight: 600;
}

.meta-copy {
  color: var(--td-text-color-secondary);
  font-size: 24rpx;
  line-height: 1.6;
}

.meta-copy--warning {
  color: var(--td-warning-color);
  font-weight: 600;
  text-align: center;
  padding: 16rpx 0;
}

.chat-list {
  display: grid;
  gap: 16rpx;
}

.draft {
  width: 100%;
  min-height: 180rpx;
  padding: 18rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: var(--td-bg-app-page);
  font-size: 28rpx;
  color: var(--td-text-color-primary);
}

.draft:disabled {
  background: var(--td-bg-color-component-disabled);
  color: var(--td-text-color-disabled);
}

/* ========== 输入框空闲提示 ========== */
.idle-hint {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 18rpx;
  margin-top: 8rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(244, 63, 94, 0.03));
  border: 1px solid rgba(37, 99, 235, 0.08);
  animation: idle-fade-in 0.4s ease;
}

.idle-hint__icon {
  font-size: 26rpx;
  flex-shrink: 0;
}

.idle-hint__text {
  font-size: 22rpx;
  color: var(--td-brand-color-6);
  line-height: 1.4;
}

@keyframes idle-fade-in {
  from {
    opacity: 0;
    transform: translateY(-4rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 引用上下文卡片 ========== */
.quote-card {
  padding: 18rpx 22rpx;
  border-radius: 14rpx;
  background: linear-gradient(135deg, #f0f5ff 0%, #f8faff 100%);
  border-left: 6rpx solid var(--td-brand-color-5);
  margin-bottom: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.quote-card__header {
  display: flex;
  align-items: center;
}

.quote-card__label {
  font-size: 22rpx;
  color: var(--td-brand-color-7);
  font-weight: 600;
}

.quote-card__content {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.quote-card__author {
  font-size: 20rpx;
  color: var(--td-text-color-placeholder);
  align-self: flex-end;
}

</style>
