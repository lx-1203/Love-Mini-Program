<script setup lang="ts">
/**
 * 聊天详情页 - 支持私信会话和临时匿名聊天会话
 */
import { computed, ref } from "vue";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import BottomActionBar from "../../src/components/common/BottomActionBar.vue";
import StatusState from "../../src/components/common/StatusState.vue";
import ChatBubble from "../../src/components/chat/ChatBubble.vue";
import { useMessagesStore } from "../../src/stores/messages";
import { useChatStore } from "../../src/stores/chat";
import { usePageAccess } from "../../src/composables/usePageAccess";
import { chatPageRequirements } from "../../src/config/page-access";

const messagesStore = useMessagesStore();
const chatStore = useChatStore();

const draft = ref("");
const sessionId = ref<string | null>(null);
const pageErrorMessage = ref<string | null>(null);
const tempCountdown = ref("");
let countdownTimer: ReturnType<typeof setInterval> | null = null;

usePageAccess(chatPageRequirements);

onLoad((query) => {
  if (query && typeof query.sessionId === "string" && query.sessionId.trim().length > 0) {
    sessionId.value = query.sessionId;
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
});

onUnload(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
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
        <textarea
          v-model="draft"
          class="draft"
          maxlength="240"
          :disabled="isSessionClosed"
          :placeholder="isSessionClosed ? '会话已结束' : '输入消息...'"
        />
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
</style>
