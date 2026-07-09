<script setup lang="ts">
/**
 * 聊天详情页 - 支持私信会话和临时匿名聊天会话
 * 支持从兴趣圈"打招呼"跳转，携带预填消息和引用上下文
 */
import { computed, ref, watch, nextTick } from "vue";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import AppShell from "../../components/layout/AppShell.vue";
import SectionCard from "../../components/common/SectionCard.vue";
import StatusState from "../../components/common/StatusState.vue";
import ChatBubble from "../../components/chat/ChatBubble.vue";
import IcebreakerSuggestions from "../../components/chat/IcebreakerSuggestions.vue";
import { useMessagesStore } from "../../stores/messages";
import { useChatStore } from "../../stores/chat";
import { usePageAccess } from "../../composables/usePageAccess";
import { chatPageRequirements } from "../../config/page-access";
import { clientApi } from "../../services/api";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";

const messagesStore = useMessagesStore();
const chatStore = useChatStore();

/** SVG 图标资源路径 */
const iconSrc = {
  heartSignal: IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL,
  message: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
  // Emoji 替换 SVG 图标
  microphone: IMAGE_PATHS.ICONS_EMOJI.MICROPHONE,
  smile: IMAGE_PATHS.ICONS_EMOJI.SMILE,
} as const;

const draft = ref("");
const sessionId = ref<string | null>(null);
const targetUserId = ref<string | null>(null);
const pageErrorMessage = ref<string | null>(null);
const tempCountdown = ref("");
/** 控制页面内容淡入动画 */
const pageVisible = ref(false);

/** 引用上下文（来自兴趣圈回复的破冰场景） */
interface QuoteContext {
  topicTitle: string;
  topicId: string;
  replyId: string;
  replyContent: string;
  replyAuthorName: string;
}
const quoteContext = ref<QuoteContext | null>(null);

/** 引用回复状态（用户长按消息后选择"引用"） */
const quoteReply = ref<{ messageId: string; body: string; sender: string } | null>(null);

/** 长按菜单状态 */
const longPressMenu = ref<{ visible: boolean; messageId: string; isSelf: boolean; x: number; y: number }>({
  visible: false,
  messageId: "",
  isSelf: false,
  x: 0,
  y: 0,
});

let countdownTimer: ReturnType<typeof setInterval> | null = null;

/* ========== 破冰话题 ========== */
/** 输入框是否聚焦（同时作为微信风格输入栏的 isFocused 状态） */
const inputFocused = ref(false);
/** 键盘高度（用于动态调整输入栏 padding-bottom，避免遮挡） */
const keyboardHeight = ref(0);
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
    } catch (_e) {
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
  // 页面过渡动画：先重置再触发淡入
  pageVisible.value = false;
  void nextTick(() => {
    pageVisible.value = true;
  });

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

  // 保存草稿，发送失败时恢复
  const messageToSend = draft.value;
  const quoteRef = quoteReply.value;

  try {
    // 私信和临时会话都统一走 messagesStore 发送
    await messagesStore.sendMessage(sessionId.value, messageToSend, quoteRef?.messageId);

    // 临时会话额外同步到 chatStore 以保持兼容性
    if (isTempSession.value) {
      await chatStore.sendText(messageToSend);
    }

    draft.value = "";
    quoteReply.value = null;
  } catch (error) {
    // 修复：发送失败时给用户明确提示
    const message = error instanceof Error ? error.message : "发送失败，请稍后重试";
    uni.showToast({ title: message, icon: "none" });
  }
}

/** 同意交换联系方式（仅临时匿名会话） */
async function handleAcceptExchange() {
  if (!sessionId.value) return;
  try {
    await chatStore.acceptExchange("self");
    uni.showToast({ title: "已同意交换联系方式", icon: "success" });
  } catch (_e) {
    uni.showToast({ title: chatStore.errorMessage || "操作失败", icon: "none" });
  }
}

/** 结束会话（仅临时匿名会话） */
async function handleEndSession() {
  if (!sessionId.value) return;
  try {
    await chatStore.endSession();
    uni.showToast({ title: "会话已结束", icon: "success" });
  } catch (_e) {
    uni.showToast({ title: chatStore.errorMessage || "操作失败", icon: "none" });
  }
}

/** 发送语音（mock） */
async function sendVoice() {
  if (!sessionId.value || isSessionClosed.value) {
    uni.showToast({ title: "会话已结束，无法发送消息", icon: "none" });
    return;
  }
  try {
    // mock 发送 8 秒语音
    if (isTempSession.value) {
      await chatStore.sendVoice(8);
    } else {
      await messagesStore.sendMessage(sessionId.value, "[语音消息]");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "语音发送失败，请稍后重试";
    uni.showToast({ title: message, icon: "none" });
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

/** 微信风格输入栏：发送按钮点击（委托给 sendText） */
async function onSend() {
  await sendText();
}

/** 键盘高度变化：动态调整输入栏 padding-bottom（mp-weixin 适用） */
function onKeyboardHeightChange(e: { height: number }) {
  keyboardHeight.value = e?.height ?? 0;
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

/* ========== 长按菜单 / 引用回复 / 撤回 ========== */

/** 处理消息长按 */
function handleMessageLongpress(messageId: string) {
  // 查找消息以判断是否是自己的消息
  const allMessages = [
    ...messagesStore.currentMessages,
    ...(chatStore.activeSession?.messages || []),
  ];
  const message = allMessages.find((m) => m.id === messageId);
  if (!message) return;

  longPressMenu.value = {
    visible: true,
    messageId,
    isSelf: message.sender === "self",
    x: 0,
    y: 0,
  };
}

/** 关闭长按菜单 */
function closeLongPressMenu() {
  longPressMenu.value.visible = false;
}

/** 引用消息 */
function handleQuoteMessage() {
  const allMessages = [
    ...messagesStore.currentMessages,
    ...(chatStore.activeSession?.messages || []),
  ];
  const message = allMessages.find((m) => m.id === longPressMenu.value.messageId);
  if (message) {
    quoteReply.value = {
      messageId: message.id,
      body: message.body,
      sender: message.sender,
    };
  }
  closeLongPressMenu();
}

/** 撤回消息 */
async function handleRecallMessage() {
  if (!sessionId.value || !longPressMenu.value.messageId) return;
  try {
    await clientApi.recallTempChatMessage(sessionId.value, longPressMenu.value.messageId);
    uni.showToast({ title: "消息已撤回", icon: "success" });
    // 重新加载会话以获取最新消息
    void messagesStore.fetchSessionMessages(sessionId.value);
    if (isTempSession.value) {
      void chatStore.loadSession(sessionId.value);
    }
  } catch (e) {
    uni.showToast({ title: "撤回失败", icon: "none" });
  }
  closeLongPressMenu();
}

/** 取消引用回复 */
function cancelQuoteReply() {
  quoteReply.value = null;
}

/** 点击引用消息跳转（暂不实现滚动定位，仅取消引用） */
function handleTapQuote(_quoteRef: string) {
  // 后续可实现滚动定位到被引用消息
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
    show-back
    :class="{ 'page-fade-in': pageVisible }"
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
          :recalled="(message as any).recalled"
          :delivery-status="(message as any).deliveryStatus"
          :quote-ref="(message as any).quoteRef"
          :quote-body="(message as any).quoteBody"
          :quote-sender="(message as any).quoteSender"
          :can-interact="true"
          @longpress="handleMessageLongpress(message.id)"
          @tap-quote="handleTapQuote"
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
          :recalled="(message as any).recalled"
          :delivery-status="(message as any).deliveryStatus"
          :can-interact="true"
          @longpress="handleMessageLongpress(message.id)"
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
        <view v-if="quoteContext" class="quote-card card-base">
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

        <!-- 引用回复预览条 -->
        <view v-if="quoteReply" class="quote-reply-bar press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="cancelQuoteReply">
          <view class="quote-reply-bar__content">
            <text class="quote-reply-bar__label">
              引用 {{ quoteReply.sender === 'self' ? '我' : '对方' }}：
            </text>
            <text class="quote-reply-bar__body">{{ quoteReply.body }}</text>
          </view>
          <text class="quote-reply-bar__close">✕</text>
        </view>

        <!-- 微信风格输入栏：语音按钮 + 输入框 + 表情/更多按钮（或发送按钮） -->
        <view
          class="wechat-input-bar"
          :class="{ 'wechat-input-bar--keyboard-up': keyboardHeight > 0 }"
        >
          <view
            class="wechat-input-bar__icon-btn press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="sendVoice"
          >
            <image class="wechat-input-bar__icon-img" :src="iconSrc.microphone" mode="aspectFit" />
          </view>
          <input
            v-model="draft"
            class="wechat-input-bar__input"
            :disabled="isSessionClosed"
            :placeholder="isSessionClosed ? '会话已结束' : (quoteReply ? '输入回复...' : '输入消息...')"
            :adjust-position="true"
            @focus="onInputFocus"
            @blur="onInputBlur"
            @input="onDraftChange"
            @keyboardheightchange="onKeyboardHeightChange"
          />
          <template v-if="!inputFocused">
            <view
              class="wechat-input-bar__icon-btn press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
            >
              <image class="wechat-input-bar__icon-img" :src="iconSrc.smile" mode="aspectFit" />
            </view>
            <view
              class="wechat-input-bar__icon-btn wechat-input-bar__icon-btn--more press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
            >
              <text class="wechat-input-bar__icon-text">+</text>
            </view>
          </template>
          <view
            v-else
            class="wechat-input-bar__send press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="onSend"
          >
            <text class="wechat-input-bar__send-text">发送</text>
          </view>
        </view>

        <!-- 输入框空闲提示（停留 5 秒未输入时展示） -->
        <view v-if="showIdleIcebreakerHint && shouldShowIcebreakers" class="idle-hint">
          <SafeImage :src="iconSrc.heartSignal" custom-class="idle-hint__icon" mode="aspectFit" />
          <text class="idle-hint__text">不知道说什么？试试上面的破冰话题吧</text>
        </view>

        <!-- 临时会话操作按钮（保留同意交换/结束会话入口） -->
        <view v-if="isTempSession" class="temp-action-row">
          <view
            class="temp-action-btn temp-action-btn--secondary press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleAcceptExchange"
          >
            <text class="temp-action-btn__text">同意交换</text>
          </view>
          <view
            class="temp-action-btn temp-action-btn--danger press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleEndSession"
          >
            <text class="temp-action-btn__text temp-action-btn__text--danger">结束会话</text>
          </view>
        </view>
      </template>
    </SectionCard>

    <!-- 长按菜单遮罩 -->
    <view v-if="longPressMenu.visible" class="longpress-overlay" @tap="closeLongPressMenu">
      <view class="longpress-menu" @tap.stop>
        <view class="longpress-menu__item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="handleQuoteMessage">
          <text class="longpress-menu__text">引用</text>
        </view>
        <view v-if="longPressMenu.isSelf" class="longpress-menu__item longpress-menu__item--danger press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="handleRecallMessage">
          <text class="longpress-menu__text longpress-menu__text--danger">撤回</text>
        </view>
        <view class="longpress-menu__item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="closeLongPressMenu">
          <text class="longpress-menu__text">取消</text>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.temp-banner {
  padding: var(--sp-4) var(--sp-6);
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--c-brand-50) 0%, var(--c-romance-50) 100%);
  border: 1rpx solid rgba(63, 207, 142, 0.15);
  text-align: center;
}

.temp-banner__text {
  font-size: var(--fs-base);
  color: var(--c-romance-500);
  font-weight: 600;
}

.meta-copy {
  color: var(--c-text-secondary);
  font-size: var(--fs-base);
  line-height: 1.6;
}

.meta-copy--warning {
  color: var(--c-error);
  font-weight: 600;
  text-align: center;
  padding: var(--sp-4) 0;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* ========== 微信风格输入栏 ========== */
.wechat-input-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: 88rpx;
  padding: var(--sp-3) var(--sp-4);
  padding-bottom: calc(var(--sp-3) + env(safe-area-inset-bottom));
  background: var(--c-bg-container);
  border-top: 1rpx solid var(--c-border-light);
  border-radius: var(--r-lg);
  box-sizing: border-box;
}

.wechat-input-bar--keyboard-up {
  padding-bottom: var(--sp-3);
}

.wechat-input-bar__icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  background: var(--c-neutral-50);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wechat-input-bar__icon-btn--more {
  font-weight: 700;
}

.wechat-input-bar__icon-text {
  font-size: var(--fs-lg);
  line-height: 1;
}

.wechat-input-bar__icon-img {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-text-secondary, #475569);
  flex-shrink: 0;
}

.wechat-input-bar__input {
  flex: 1;
  height: 64rpx;
  border-radius: var(--r-md);
  padding: 0 var(--sp-4);
  background: var(--c-neutral-50);
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  box-sizing: border-box;
}

.wechat-input-bar__send {
  background: var(--c-brand);
  padding: 0 var(--sp-6);
  border-radius: var(--r-md);
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--s-brand-sm);
}

.wechat-input-bar__send-text {
  color: var(--c-text-inverse);
  font-size: var(--fs-lg);
  font-weight: 600;
}

/* ========== 临时会话操作按钮 ========== */
.temp-action-row {
  display: flex;
  gap: var(--sp-3);
  margin-top: var(--sp-3);
}

.temp-action-btn {
  flex: 1;
  height: 80rpx;
  border-radius: var(--r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid var(--c-border-default);
  background: var(--c-bg-container);
}

.temp-action-btn--secondary {
  background: var(--c-brand-50);
  border-color: var(--c-brand-200);
}

.temp-action-btn--danger {
  background: var(--c-romance-50);
  border-color: var(--c-romance-200);
}

.temp-action-btn__text {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  font-weight: 600;
}

.temp-action-btn__text--danger {
  color: var(--c-error);
}

/* ========== 输入框空闲提示 ========== */
.idle-hint {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5);
  margin-top: var(--sp-2);
  border-radius: var(--r-md);
  background: linear-gradient(135deg, rgba(63, 207, 142, 0.05), rgba(236, 72, 153, 0.03));
  border: 1rpx solid rgba(63, 207, 142, 0.1);
  animation: idle-fade-in 0.4s ease;
}

.idle-hint__icon {
  width: var(--sp-7);
  height: var(--sp-7);
  flex-shrink: 0;
}

.idle-hint__text {
  font-size: var(--fs-sm);
  color: var(--c-brand-400);
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
  padding: var(--sp-5) var(--sp-6);
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--c-brand-50) 0%, var(--c-bg-page) 100%);
  border-left: 6rpx solid var(--c-brand-400);
  margin-bottom: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.quote-card__header {
  display: flex;
  align-items: center;
}

.quote-card__label {
  font-size: var(--fs-sm);
  color: var(--c-brand-400);
  font-weight: 600;
}

.quote-card__content {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.quote-card__author {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  align-self: flex-end;
}

/* ========== 引用回复预览条 ========== */
.quote-reply-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-4);
  margin-bottom: var(--sp-3);
  border-radius: var(--r-md);
  background: linear-gradient(135deg, var(--c-romance-50) 0%, var(--c-bg-romance) 100%);
  border-left: 4rpx solid var(--c-romance-500);
  animation: slide-up-in 0.2s ease;
}

.quote-reply-bar__content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
  flex: 1;
}

.quote-reply-bar__label {
  font-size: var(--fs-xs);
  color: var(--c-romance-500);
  font-weight: 600;
}

.quote-reply-bar__body {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quote-reply-bar__close {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
  padding: var(--sp-2);
  flex-shrink: 0;
}

/* ========== 长按菜单 ========== */
.longpress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.longpress-menu {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  overflow: hidden;
  min-width: 240rpx;
  box-shadow: var(--s-lg);
  animation: modal-scale-in 0.2s ease;
}

.longpress-menu__item {
  padding: var(--sp-7) var(--sp-8);
  text-align: center;
  transition: background 0.15s ease;
}

.longpress-menu__item:active {
  background: var(--c-bg-page);
  transform: scale(0.98);
}

.longpress-menu__item--danger:active {
  background: rgba(229, 69, 77, 0.08);
}

.longpress-menu__text {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
}

.longpress-menu__text--danger {
  color: var(--c-error);
}


/* ========== 返回按钮 ========== */
.chat-session-back {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-5) var(--sp-8);
  padding-top: calc(env(safe-area-inset-top) + var(--sp-5));
}

.chat-session-back__arrow {
  font-size: var(--fs-3xl);
  color: var(--c-brand-400);
  font-weight: 700;
}

.chat-session-back__text {
  font-size: var(--fs-lg);
  color: var(--c-brand-400);
  font-weight: 500;
}

</style>
