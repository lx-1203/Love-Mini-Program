<script setup lang="ts">
/**
 * 聊天详情页 - 支持私信会话和临时匿名聊天会话
 * 支持从兴趣圈"打招呼"跳转，携带预填消息和引用上下文
 *
 * 模块拆分结构（硬约束：页面转场逻辑必须内联在 .vue，仅拆出纯逻辑）：
 * - ./types            类型定义（QuoteContext / QuoteReply / LongPressMenuState / ChatMessageView）
 * - ./dto              DTO 转换层（toChatMessageView / getMessageRecalled 等）
 * - ./view-models      纯视图模型逻辑（resolvePeerUserId / formatTempCountdown 等）
 * - ./api              纯 API 调用（recallTempChatMessageApi）
 * - ./index.vue        本文件：页面转场 / 生命周期 / UI 事件 / 状态管理
 */
// 修复（严格模式 noUnusedLocals）：watch 导入后未使用，已移除。
import { computed, ref, nextTick } from "vue";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { featureFlags } from "../../config/feature-flags";
import AppShell from "../../components/layout/AppShell.vue";
import SectionCard from "../../components/common/SectionCard.vue";
import StatusState from "../../components/common/StatusState.vue";
import ChatBubble from "../../components/chat/ChatBubble.vue";
import IcebreakerSuggestions from "../../components/chat/IcebreakerSuggestions.vue";
import VoiceMessageBubble from "../../components/chat/VoiceMessageBubble.vue";
import VoiceRecorder from "../../components/chat/VoiceRecorder.vue";
import RedPacketBubble from "../../components/chat/RedPacketBubble.vue";
import { useMessagesStore } from "../../stores/messages";
import { useChatStore } from "../../stores/chat";
import { useVipRedPacketStore } from "../../stores/vip-red-packet";
import { usePageAccess } from "../../composables/usePageAccess";
import { chatPageRequirements } from "../../config/page-access";
import { IMAGE_PATHS } from "../../config/images";
import { ROUTES } from "../../constants/routes";
import { lightHaptic } from "../../utils/haptic";
// Sentry 监控：消息发送失败上报异常，页面切换 / 关键按钮点击记录面包屑
import { captureException, addBreadcrumb } from "../../services/sentry";
import type { RecorderStopResult } from "../../utils/audio-recorder";
// 修复 no-duplicate-imports：合并 ./types 的重复 import
import type {
  ChatMessageView,
  LongPressMenuState,
  QuoteContext,
  QuoteReply,
} from "./types";
import {
  toChatMessageViewList,
} from "./dto";
import {
  buildInitialLongPressMenu,
  buildVisibleLongPressMenu,
  computeIdleIcebreakerVisible,
  countUserMessages,
  formatTempCountdown,
  isMessageSelf,
  parsePrefillMessage,
  parseQuoteContext,
  resolvePeerUserId as resolvePeerUserIdVm,
  shouldShowIcebreakers as shouldShowIcebreakersVm,
  toChatBubbleDeliveryStatus,
} from "./view-models";
import { recallTempChatMessageApi } from "./api";
// 统一常量：空闲破冰延迟、倒计时计时器间隔
// 修复（严格模式 noUnusedLocals）：RECORDING_TICK_MS / RECORDER_MAX_DURATION_MS / RECORDER_MIN_DURATION_SECONDS
// 仅在已移除的 startVoiceRecord / initRecorder 中使用，已从导入中移除。
import {
  IDLE_ICEBREAKER_DELAY_MS,
  COUNTDOWN_TICK_MS,
} from "../../constants/chat";

const messagesStore = useMessagesStore();
const chatStore = useChatStore();
const redPacketStore = useVipRedPacketStore();
const { t } = useI18n();

/** 会话页更多菜单图标（emoji 替换为 SVG） */
const chatMenuIcons = {
  redPacket: IMAGE_PATHS.ICONS_EMOJI.GIFT,
  videoCall: IMAGE_PATHS.ICONS_EMOJI.VIDEO,
} as const;

/** SVG 图标资源路径 */
const iconSrc = {
  message: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
  // Emoji 替换 SVG 图标
  microphone: IMAGE_PATHS.ICONS_EMOJI.MICROPHONE,
  smile: IMAGE_PATHS.ICONS_EMOJI.SMILE,
} as const;

const draft = ref("");
/** 当前是否为语音输入模式 */
const isVoiceMode = ref(false);
const sessionId = ref<string | null>(null);
const targetUserId = ref<string | null>(null);
const pageErrorMessage = ref<string | null>(null);
const tempCountdown = ref("");
/** 控制页面内容淡入动画 */
const pageVisible = ref(false);

/** 引用上下文（来自兴趣圈回复的破冰场景） */
const quoteContext = ref<QuoteContext | null>(null);

/** 引用回复状态（用户长按消息后选择"引用"） */
const quoteReply = ref<QuoteReply | null>(null);

/** 长按菜单状态 */
const longPressMenu = ref<LongPressMenuState>(buildInitialLongPressMenu());

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

/**
 * 用户消息数量（排除 system 类型消息）
 *
 * Task 1.1.1：统一以 `messagesStore.currentMessages` 为单一数据源，
 * 移除对 `chatStore.activeSession.messages` 的双写读取，
 * 避免两个 store 数据不同步时计数闪烁。
 */
const userMessageCount = computed(() =>
  countUserMessages(messagesStore.currentMessages)
);

/** 是否应该展示破冰话题（消息数为 0 或极少时） */
const shouldShowIcebreakers = computed(() => {
  return shouldShowIcebreakersVm(userMessageCount.value, pageErrorMessage.value);
});

/**
 * 当前会话消息视图模型（DTO 转换层应用）
 *
 * 将 store 中的 MessageItem[] 转换为 ChatMessageView[]，
 * 补充 recalled / deliveryStatus / quoteRef 等扩展字段（默认 undefined），
 * 消除模板中 `(message as any).xxx` 的类型断言。
 *
 * Task 1.1.1：单一数据源 - 仅消费 `messagesStore.currentMessages`，
 * 临时匿名会话由 `chatStore` 管理生命周期，但其消息通过
 * `messagesStore.setCurrentMessages()` 同步到 currentMessages 后再渲染。
 */
const currentMessagesView = computed(() =>
  toChatMessageViewList(messagesStore.currentMessages)
);

usePageAccess(chatPageRequirements);

/**
 * 同步 chatStore.activeSession.messages 到 messagesStore.currentMessages
 *
 * Task 1.1.1：临时匿名会话由 `chatStore` 管理生命周期，
 * 但页面渲染统一从 `messagesStore.currentMessages` 读取。
 * 该函数在 chatStore 操作（loadSession / sendText / sendVoice / acceptExchange /
 * endSession / recallMessage）完成后调用，确保单一数据源同步。
 */
function syncChatStoreMessagesToMessagesStore(): void {
  const chatMessages = chatStore.activeSession?.messages ?? [];
  // 将 ChatMessage[] 转换为 MessageItem[] 形态后写入 messagesStore
  // ChatMessage 与 MessageItem 字段语义一致（id/sender/kind/body/sentAt/durationSeconds）
  messagesStore.setCurrentMessages(
    chatMessages.map((m) => ({
      id: String(m.id),
      sessionId: sessionId.value ?? "",
      sender: m.sender,
      kind: m.kind,
      body: m.body,
      sentAt: m.sentAt,
      durationSeconds: m.durationSeconds ?? null,
    }))
  );
}

/**
 * 加载会话消息（Task 1.1.6：改为 await 等待数据加载完成）
 *
 * 统一封装 messagesStore.fetchSessionMessages + chatStore.loadSession 的同步逻辑：
 * - 私信会话：仅调用 messagesStore.fetchSessionMessages
 * - 临时匿名会话：先调用 chatStore.loadSession，再同步消息到 messagesStore
 *
 * 防止 onShow 与 onLoad 异步创建会话竞态：仅在 sessionId 就绪时执行。
 */
async function loadSessionData(): Promise<void> {
  if (!sessionId.value) {
    return;
  }

  // Task 1.1.6：等待 messagesStore 数据加载完成，避免页面渲染空消息列表
  await messagesStore.fetchSessionMessages(sessionId.value);

  // 临时匿名会话需要额外加载 chatStore 数据并同步消息
  const session = messagesStore.sessions.find((s) => s.id === sessionId.value);
  if (!session || session.sessionType === "temp_anonymous") {
    await chatStore.loadSession(sessionId.value);
    syncChatStoreMessagesToMessagesStore();
  }
}

onLoad(async (query) => {
  // ---- 预填消息参数（来自兴趣圈"打招呼"跳转） ----
  if (query && typeof query.prefillMessage === "string" && query.prefillMessage.trim().length > 0) {
    draft.value = parsePrefillMessage(query.prefillMessage);
  }

  // ---- 引用上下文参数 ----
  if (query && typeof query.quoteContext === "string" && query.quoteContext.trim().length > 0) {
    quoteContext.value = parseQuoteContext(query.quoteContext);
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

    // Task 1.1.3：移除硬编码 `session-${rawUserId}`，
    // 调用 POST /api/messages/conversations 创建/复用真实会话 ID。
    // 后端 PrivateMessageController.createConversation 入参 { userBId: Long }，
    // 返回 ConversationView（含真实 id / partnerId / partnerName 等）。
    // Mock 模式下 messagesStore.createSession 内部构造本地占位会话，保证 dev 流程可走通。
    try {
      const session = await messagesStore.createSession(rawUserId);
      if (session) {
        sessionId.value = session.id;
        pageErrorMessage.value = null;
        // 创建会话后立即加载消息（onShow 可能在 createSession 完成前已触发并 return）
        await loadSessionData();
      } else {
        pageErrorMessage.value = t("chat.createSessionFailed");
      }
    } catch (e) {
      pageErrorMessage.value = e instanceof Error ? e.message : t("chat.createSessionFailedShort");
    }
    return;
  }

  pageErrorMessage.value = t("chat.missingSessionId");
});

onShow(() => {
  // 记录页面进入面包屑，便于在异常发生时回溯用户跳转路径
  addBreadcrumb("navigation", "page_enter", {
    url: "/pages/chat-session/index",
    sessionId: sessionId.value,
  });

  // 页面过渡动画：先重置再触发淡入
  pageVisible.value = false;
  void nextTick(() => {
    pageVisible.value = true;
  });

  if (!sessionId.value) {
    return;
  }

  // Task 1.1.6：等待消息加载完成后再启动倒计时与破冰话题加载，
  // 避免页面渲染空消息列表导致破冰话题过早出现。
  // 注：onShow 为同步生命周期，使用 void 不阻塞页面渲染，
  // loadSessionData 内部已通过 await 确保 messagesStore.currentMessages 就绪。
  void loadSessionData();

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

/** 发送按钮是否可高亮（输入框非空且会话未结束） */
const canSend = computed(() => draft.value.trim().length > 0 && !isSessionClosed.value);

/** 页面标题 */
const pageTitle = computed(() => {
  if (isTempSession.value) return t("chat.tempSessionTitle");
  if (isPrivateSession.value) return currentSession.value?.partnerName || t("chat.privateMessageTitle");
  // 通过 userId 导航但无现有会话时，标明目标用户
  if (targetUserId.value) {
    const partnerName = messagesStore.sessions.find(
      (s) => s.partnerId === targetUserId.value && s.sessionType === "private"
    )?.partnerName;
    return partnerName || t("chat.conversationTitle");
  }
  return chatStore.activeSession?.partnerName || t("chat.chatTitle");
});

/** 页面副标题 */
const pageSubtitle = computed(() => {
  if (isTempSession.value) {
    return tempCountdown.value
      ? t("chat.remainingTimeLabel", { time: tempCountdown.value })
      : currentSession.value?.partnerHeadline || t("chat.tempSessionSubtitle");
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
    countdownTimer = setInterval(updateTempCountdown, COUNTDOWN_TICK_MS);
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

  // 使用纯函数格式化倒计时
  tempCountdown.value = formatTempCountdown(diff);

  // 已结束时清理计时器
  if (diff <= 0 && countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

/** 发送文字消息
 * 私信会话走 messagesStore.sendMessage，临时会话走 chatStore.sendText
 */
async function sendText() {
  if (!draft.value.trim() || !sessionId.value) {
    return;
  }

  if (isSessionClosed.value) {
    uni.showToast({ title: t("chat.sessionClosedCannotSend"), icon: "none" });
    return;
  }

  // 记录关键按钮点击面包屑，便于在发送失败时定位用户操作节点
  addBreadcrumb("ui", "button_click", {
    id: "chat.sendText",
    sessionId: sessionId.value,
  });

  const messageToSend = draft.value;
  const quoteRef = quoteReply.value;
  const currentSessionId = sessionId.value;

  try {
    if (isTempSession.value) {
      // 临时匿名会话使用 chatStore 的临时聊天链路
      await chatStore.sendText(messageToSend);
      // Task 1.1.1：单一数据源 - chatStore 操作后同步消息到 messagesStore
      syncChatStoreMessagesToMessagesStore();
    } else {
      // 私信会话使用 messagesStore 的标准私信链路
      await messagesStore.sendMessage(currentSessionId, messageToSend, quoteRef?.messageId);
    }

    // 发送成功后清空输入与引用状态；失败时保留草稿以便重试
    draft.value = "";
    quoteReply.value = null;
  } catch (error) {
    // 消息发送失败：上报到 Sentry，source 标记为 chat.sendText 便于后台筛选
    captureException(error, {
      source: "chat.sendText",
      sessionId: currentSessionId,
    });
    const message = error instanceof Error ? error.message : t("chat.sendFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/** 同意交换联系方式（仅临时匿名会话） */
async function handleAcceptExchange() {
  if (!sessionId.value) return;
  try {
    await chatStore.acceptExchange("self");
    uni.showToast({ title: t("chat.exchangeAccepted"), icon: "success" });
  } catch (_e) {
    uni.showToast({ title: chatStore.errorMessage || t("chat.operationFailed"), icon: "none" });
  }
}

/** 结束会话（仅临时匿名会话） */
async function handleEndSession() {
  if (!sessionId.value) return;
  try {
    await chatStore.endSession();
    uni.showToast({ title: t("chat.sessionEnded"), icon: "success" });
  } catch (_e) {
    uni.showToast({ title: chatStore.errorMessage || t("chat.operationFailed"), icon: "none" });
  }
}

/** 切换语音/文字输入模式 */
function toggleVoiceMode() {
  isVoiceMode.value = !isVoiceMode.value;
  if (isVoiceMode.value) {
    // 切换到语音模式时取消输入框聚焦，避免键盘遮挡
    inputFocused.value = false;
  }
}

// 修复（严格模式 noUnusedLocals）：以下录音相关类型（RecorderStopCallbackResult /
// RecorderErrorCallbackResult / RecorderManager）仅在已移除的 initRecorder 中使用，
// 属于历史遗留死代码，已一并移除。语音录制统一通过 VoiceRecorder 组件处理。

// 修复（严格模式 noUnusedLocals）：以下录音相关变量与 initRecorder 函数均为历史遗留代码，
// 语音录制已统一由 VoiceRecorder 组件处理（通过 @recorded / @cancel / @state-change 事件）。
// 已移除：recorderManager / recordingSeconds / recordingTimer / recorderListenersRegistered / initRecorder。
// 保留：isRecording（由 handleVoiceStateChange 写入，用于页面录音状态同步）。
const isRecording = ref(false);

/** 初始化录音管理器（只注册一次监听器，避免重复注册）
 *
 * 修复（严格模式 noUnusedLocals）：initRecorder 函数定义后未被调用（原唯一调用方
 * startVoiceRecord 已移除），语音录制统一通过 VoiceRecorder 组件处理，已移除。
 */

/** 开始语音录制
 * mp-weixin 调用 uni.getRecorderManager 真实录音
 * H5 等环境进入模拟录音状态，用于流程演示与 UI 验证
 *
 * 修复（严格模式 noUnusedLocals）：startVoiceRecord 函数定义后未被模板/脚本调用，
 * 属于历史遗留死代码，已移除。语音录制统一通过 VoiceRecorder 组件处理。
 */

/** 结束语音录制
 * mp-weixin 停止录音并在 onStop 回调中发送
 * H5 直接根据模拟时长判断并发送
 *
 * 修复（严格模式 noUnusedLocals）：stopVoiceRecord 函数定义后未被模板/脚本调用，
 * 属于历史遗留死代码，已移除。mp-weixin 录音停止由 VoiceRecorder 组件内部
 * 通过 recorderManager.stop() 触发，并在 onStop 回调中调用 sendVoiceMessage。
 */

/* 修复（严格模式 noUnusedLocals）：sendVoiceMessage 函数定义后未被调用（原唯一调用方
   initRecorder 的 onStop 回调已移除），语音发送统一通过 handleVoiceRecorded 处理，已移除。 */

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

/** 重置空闲计时器：IDLE_ICEBREAKER_DELAY_MS 后显示破冰话题提示 */
function resetIdleTimer() {
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    // 使用纯函数判断是否展示空闲提示
    if (computeIdleIcebreakerVisible(inputFocused.value, draft.value)) {
      showIdleIcebreakerHint.value = true;
    }
  }, IDLE_ICEBREAKER_DELAY_MS);
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

/** 解析对方用户 ID 为数字，用于 API 调用（委托给 view-models 纯函数） */
function resolvePeerUserId(): number | null {
  return resolvePeerUserIdVm(
    currentSession.value?.partnerId,
    sessionId.value,
    targetUserId.value
  );
}

/* ========== 长按菜单 / 引用回复 / 撤回 ========== */

/** 处理消息长按 */
function handleMessageLongpress(messageId: string) {
  // Task 1.1.1：单一数据源 - 仅从 messagesStore.currentMessages 查找消息
  const message = messagesStore.currentMessages.find((m) => m.id === messageId);
  if (!message) return;

  // 使用纯函数构建长按菜单状态
  longPressMenu.value = buildVisibleLongPressMenu(
    messageId,
    isMessageSelf(message.sender)
  );
}

/** 关闭长按菜单 */
function closeLongPressMenu() {
  longPressMenu.value.visible = false;
}

/**
 * 空操作函数，用于 catchtap 阻止冒泡时的占位 handler。
 *
 * 源码层面直接使用 catchtap="noop" 阻止冒泡：
 * mp-weixin 端 catchtap 原生阻止冒泡且必须绑定 handler，故需 noop 占位；
 * H5 端 catchtap 不生效，需在 noop 内调用 event.stopPropagation()（此处 noop 不接收 event，
 * 由 catchtap 的原生语义保证 mp-weixin 端冒泡阻止；H5 端冒泡由外层遮罩 @tap 兜底关闭）。
 */
const noop = () => {};

/**
 * 复制当前长按选中的消息内容到剪贴板。
 * P2 修复（长按复制支持）：用户长按聊天消息后选择"复制"，
 * 调用 uni.setClipboardData 写入消息正文，复制成功后 toast 提示。
 * 兼容性：H5 / mp-weixin 均支持 uni.setClipboardData。
 */
function handleCopyMessage() {
  const messageId = longPressMenu.value.messageId;
  if (!messageId) {
    closeLongPressMenu();
    return;
  }
  // Task 1.1.1：单一数据源 - 仅从 messagesStore.currentMessages 查找
  const message = messagesStore.currentMessages.find((m) => m.id === messageId);
  if (!message) {
    closeLongPressMenu();
    return;
  }
  // 仅支持文本/emoji 类型消息复制，语音类型不复制
  if (message.kind && message.kind !== "text" && message.kind !== "emoji") {
    uni.showToast({ title: t("chat.copyNotSupported"), icon: "none" });
    closeLongPressMenu();
    return;
  }
  uni.setClipboardData({
    data: message.body || "",
    success: () => {
      // H5 端 uni.setClipboardData 内部已弹 toast，这里仅兜底
      // mp-weixin 端 success 后会自动展示内置 toast，无需重复
    },
    fail: () => {
      uni.showToast({ title: t("chat.copyFailed"), icon: "none" });
    },
  });
  closeLongPressMenu();
}

/** 引用消息 */
function handleQuoteMessage() {
  // Task 1.1.1：单一数据源 - 仅从 messagesStore.currentMessages 查找
  const message = messagesStore.currentMessages.find(
    (m) => m.id === longPressMenu.value.messageId
  );
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
    await recallTempChatMessageApi(sessionId.value, longPressMenu.value.messageId);
    uni.showToast({ title: t("chat.recalledSuccess"), icon: "success" });
    // 重新加载会话以获取最新消息
    await messagesStore.fetchSessionMessages(sessionId.value);
    // Task 1.1.1：临时会话需同步 chatStore 消息到 messagesStore 单一数据源
    if (isTempSession.value) {
      await chatStore.loadSession(sessionId.value);
      syncChatStoreMessagesToMessagesStore();
    }
  } catch (_e) {
    uni.showToast({ title: t("chat.recallFailed"), icon: "none" });
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

/* ========== "+" 更多菜单：红包 / 视频通话入口 ========== */

/** 更多菜单是否展开 */
const moreMenuVisible = ref<boolean>(false);

/** 打开"+"更多菜单 */
function openMoreMenu() {
  lightHaptic();
  moreMenuVisible.value = true;
}

/** 关闭"+"更多菜单 */
function closeMoreMenu() {
  moreMenuVisible.value = false;
}

/**
 * 跳转到红包页：
 * - 临时匿名会话不支持红包（避免欺诈风险）
 * - 携带 sessionId，红包创建后由 chat-session 刷新消息流
 */
function goRedPacket() {
  closeMoreMenu();
  if (!sessionId.value) {
    uni.showToast({ title: t("chat.moreMenuSessionMissing"), icon: "none" });
    return;
  }
  if (isTempSession.value) {
    uni.showToast({ title: t("chat.moreMenuTempNotSupported"), icon: "none" });
    return;
  }
  uni.navigateTo({
    url: `${ROUTES.CHAT.RED_PACKET}?sessionId=${encodeURIComponent(sessionId.value)}`,
  });
}

/**
 * 跳转到视频通话页：
 * - 临时匿名会话不支持视频通话
 * - 携带 sessionId 与对方 userId
 */
function goVideoCall() {
  closeMoreMenu();
  if (!sessionId.value) {
    uni.showToast({ title: t("chat.moreMenuSessionMissing"), icon: "none" });
    return;
  }
  if (isTempSession.value) {
    uni.showToast({ title: t("chat.moreMenuTempNotSupported"), icon: "none" });
    return;
  }
  const peerId = resolvePeerUserId();
  const params: string[] = [`sessionId=${encodeURIComponent(sessionId.value)}`];
  if (peerId !== null) {
    params.push(`peerUserId=${encodeURIComponent(String(peerId))}`);
  }
  uni.navigateTo({
    url: `${ROUTES.CHAT.VIDEO_CALL}?${params.join("&")}`,
  });
}

/* ========== 红包消息渲染与领取（RedPacketBubble 集成） ========== */

/**
 * 红包消息体前缀格式：[red-packet:{redPacketId}:{blessing}]
 *
 * 由于 MessageItem.kind 仅支持 text/voice/emoji/system，
 * 红包消息通过 body 前缀模式识别，避免扩展消息类型破坏既有契约。
 *
 * 例：body = "[red-packet:123:祝你天天开心]" 表示红包 ID=123、祝福语"祝你天天开心"
 */
const RED_PACKET_BODY_PATTERN = /^\[red-packet:(\d+):([^\]]*)\]$/;

/**
 * 判断消息是否为红包消息（基于 body 前缀模式匹配）
 *
 * @param message 消息视图
 * @returns 是否为红包消息
 */
function isRedPacketMessage(message: ChatMessageView): boolean {
  if (message.kind !== "text") return false;
  return RED_PACKET_BODY_PATTERN.test(message.body);
}

/**
 * 解析红包消息体，提取红包 ID 与祝福语
 *
 * @param message 消息视图
 * @returns 解析结果：{ redPacketId, blessing } 或 null（非红包消息）
 */
function parseRedPacketMessage(
  message: ChatMessageView
): { redPacketId: number; blessing: string } | null {
  const match = message.body.match(RED_PACKET_BODY_PATTERN);
  if (!match) return null;
  // 修复（严格模式 noUncheckedIndexedAccess）：match[1] 索引访问返回 string | undefined，
  // 此处提取后做非空校验，确保 parseInt 入参为 string。
  const idStr = match[1];
  if (!idStr) return null;
  const id = parseInt(idStr, 10);
  if (isNaN(id) || id <= 0) return null;
  return {
    redPacketId: id,
    blessing: match[2] || "",
  };
}

/**
 * 获取红包状态（用于 RedPacketBubble 组件）
 *
 * 优先从 vip-red-packet store 的 sessionPackets 中查找匹配的红包，
 * 未找到时回退为 PENDING 状态（保守策略，允许用户点击查看详情）。
 *
 * @param message 消息视图
 * @returns 红包状态：PENDING / DEPLETED / EXPIRED / CLAIMED
 */
function getRedPacketStatus(
  message: ChatMessageView
): "PENDING" | "DEPLETED" | "EXPIRED" | "CLAIMED" {
  const parsed = parseRedPacketMessage(message);
  if (!parsed) return "PENDING";
  const packet = redPacketStore.sessionPackets.find(
    (p) => p.id === parsed.redPacketId
  );
  if (!packet) return "PENDING";
  // 已被领完
  if (packet.claimedCount >= packet.totalCount) return "DEPLETED";
  // 已过期
  if (packet.expireAt && Date.parse(packet.expireAt) < Date.now()) {
    return "EXPIRED";
  }
  return packet.status;
}

/**
 * 获取红包总金额（分），用于详情跳转参数
 *
 * @param message 消息视图
 * @returns 总金额（分），未找到时返回 0
 */
function getRedPacketAmount(message: ChatMessageView): number {
  const parsed = parseRedPacketMessage(message);
  if (!parsed) return 0;
  const packet = redPacketStore.sessionPackets.find(
    (p) => p.id === parsed.redPacketId
  );
  return packet?.totalAmount ?? 0;
}

/**
 * 获取红包已领取个数
 *
 * @param message 消息视图
 * @returns 已领取个数，未找到时返回 0
 */
function getRedPacketClaimedCount(message: ChatMessageView): number {
  const parsed = parseRedPacketMessage(message);
  if (!parsed) return 0;
  const packet = redPacketStore.sessionPackets.find(
    (p) => p.id === parsed.redPacketId
  );
  return packet?.claimedCount ?? 0;
}

/**
 * 判断红包是否已被当前用户领取
 *
 * 通过 sessionStore.userSession.userId 与红包 claims 列表比对，
 * 匹配到则视为已领取。
 *
 * @param message 消息视图
 * @returns 是否已被当前用户领取
 */
function isRedPacketClaimedByMe(message: ChatMessageView): boolean {
  const parsed = parseRedPacketMessage(message);
  if (!parsed) return false;
  const packet = redPacketStore.sessionPackets.find(
    (p) => p.id === parsed.redPacketId
  );
  if (!packet || !packet.claims || packet.claims.length === 0) return false;
  // sessionStore 在 messages.ts 内部使用，此处通过 messagesStore 间接获取
  // 由于此处只需要判断"是否领取过"，使用 store 中 currentDetail 的 claims 是不足的，
  // 真实场景由后端在 RedPacketView 中返回 claims，mock 模式默认 false。
  return false;
}

/**
 * 处理红包点击：领取红包
 * 跳转到红包页，并通过 claimId 参数触发领取流程
 *
 * @param redPacketId 红包 ID
 */
function handleClaimRedPacket(redPacketId: number) {
  if (!sessionId.value) {
    uni.showToast({ title: t("chat.moreMenuSessionMissing"), icon: "none" });
    return;
  }
  uni.navigateTo({
    url: `${ROUTES.CHAT.RED_PACKET}?sessionId=${encodeURIComponent(sessionId.value)}&claimId=${redPacketId}`,
  });
}

/**
 * 处理红包点击：查看领取详情
 * 跳转到红包详情页（复用 vip-red-packet store 的详情查询能力）
 *
 * @param redPacketId 红包 ID
 */
function handleViewRedPacketDetail(redPacketId: number) {
  if (!sessionId.value) return;
  uni.navigateTo({
    url: `${ROUTES.CHAT.RED_PACKET}?sessionId=${encodeURIComponent(sessionId.value)}&claimId=${redPacketId}`,
  });
}

/* ========== VoiceRecorder 集成（语音消息录制） ========== */

/**
 * VoiceRecorder 录音完成回调：发送语音消息
 *
 * 流程：
 * 1. mp-weixin：拿到 tempFilePath 后通过 chatStore.sendVoice 或 messagesStore.sendMessage 发送
 * 2. H5：tempFilePath 为空，仅发送时长占位文本
 *
 * 错误处理：发送失败时 toast 提示，不阻塞用户继续操作
 *
 * @param result 录音结果（含临时文件路径与时长）
 */
async function handleVoiceRecorded(result: RecorderStopResult) {
  if (!sessionId.value) {
    uni.showToast({ title: t("chat.voiceSessionClosed"), icon: "none" });
    return;
  }
  if (isSessionClosed.value) {
    uni.showToast({ title: t("chat.voiceSessionClosed"), icon: "none" });
    return;
  }

  const currentSessionId = sessionId.value;
  try {
    if (isTempSession.value) {
      // 临时匿名会话使用 chatStore 的临时聊天链路
      await chatStore.sendVoice(result.durationSeconds);
    } else {
      // 私信会话使用 messagesStore 的标准私信链路（暂以占位文本发送）
      await messagesStore.sendMessage(
        currentSessionId,
        t("chat.voiceMessagePlaceholder", { n: result.durationSeconds })
      );
    }
    uni.showToast({ title: t("chat.voiceSendSuccess"), icon: "success" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("chat.voiceSendFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/**
 * VoiceRecorder 取消录音回调（用户上滑取消）
 * 静默处理，无需提示（VoiceRecorder 内部已提示"说话时间太短"）
 */
function handleVoiceRecordCancel() {
  // 静默处理：取消录音无需额外操作
}

/**
 * VoiceRecorder 状态变化回调
 * 用于同步页面状态，便于在录音时禁用其他操作
 *
 * @param recording 是否正在录音
 */
function handleVoiceStateChange(recording: boolean) {
  isRecording.value = recording;
}

// 修复（严格模式 noUnusedLocals）：noop 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ noop });
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
        {{ tempCountdown === "已结束" ? t("chat.sessionEndedLabel") : t("chat.tempBannerText") }}
      </text>
    </view>

    <!-- 会话状态 -->
    <SectionCard v-if="isTempSession" :title="t('chat.sessionStatusTitle')" compact>
      <StatusState
        v-if="chatStore.activeSession"
        tone="brand"
        :label="chatStore.activeSession.contactExchangeLabel"
      />
      <text class="meta-copy">
        {{ chatStore.activeSession?.availabilityHint || t('chat.defaultAvailabilityHint') }}
      </text>
    </SectionCard>

    <!-- 消息列表 -->
    <SectionCard :title="t('chat.messagesTitle')" compact>
      <view v-if="pageErrorMessage" class="meta-copy">{{ pageErrorMessage }}</view>
      <view v-else-if="messagesStore.loading" class="meta-copy">{{ t('chat.loadingSessionDetail') }}</view>
      <view v-else-if="messagesStore.errorMessage" class="meta-copy">{{ messagesStore.errorMessage }}</view>
      <view v-else class="chat-list" role="list">
        <!-- 优先展示 messagesStore 的消息（经 DTO 转换层映射为 ChatMessageView） -->
        <!-- 红包消息：使用 RedPacketBubble 渲染（基于 body 前缀模式识别） -->
        <template v-for="message in currentMessagesView" :key="message.id">
          <RedPacketBubble
            v-if="isRedPacketMessage(message)"
            :red-packet-id="parseRedPacketMessage(message)?.redPacketId ?? 0"
            :blessing="parseRedPacketMessage(message)?.blessing ?? ''"
            :status="getRedPacketStatus(message)"
            :sender="message.sender === 'self' ? 'self' : 'peer'"
            :total-amount="getRedPacketAmount(message)"
            :total-count="1"
            :claimed-count="getRedPacketClaimedCount(message)"
            :claimed-by-me="isRedPacketClaimedByMe(message)"
            @claim="handleClaimRedPacket"
            @view-detail="handleViewRedPacketDetail"
          />
          <!-- 语音消息：使用 VoiceMessageBubble 渲染 -->
          <VoiceMessageBubble
            v-else-if="message.kind === 'voice'"
            :audio-url="''"
            :duration-seconds="message.durationSeconds ?? 0"
            :expired="false"
            :sender="message.sender === 'self' ? 'self' : 'peer'"
          />
          <!-- 普通文本/表情/系统消息：使用 ChatBubble 渲染 -->
          <ChatBubble
            v-else
            :sender="message.sender"
            :kind="message.kind"
            :body="message.body"
            :sent-at="message.sentAt"
            :duration-seconds="message.durationSeconds"
            :recalled="message.recalled"
            :delivery-status="toChatBubbleDeliveryStatus(message.deliveryStatus)"
            :quote-ref="message.quoteRef"
            :quote-body="message.quoteBody"
            :quote-sender="message.quoteSender"
            :can-interact="true"
            @longpress="handleMessageLongpress(message.id)"
            @tap-quote="handleTapQuote"
          />
        </template>
        <!--
          Task 1.1.2：移除重复 v-for 渲染块。
          原实现存在两套消息渲染：
            1. currentMessagesView（基于 messagesStore.currentMessages，主数据源）
            2. legacyMessagesView（基于 chatStore.activeSession.messages，兜底）
          两套渲染会导致消息重复显示，且 legacyMessagesView 在 <script setup> 中
          未定义（运行时为 undefined），存在运行时错误风险。
          现统一以 messagesStore 为单一数据源（Task 1.1.1），删除兜底渲染块。
        -->
        <text v-if="!messagesStore.currentMessages.length" class="meta-copy">
          {{ t('chat.emptySessionCreated') }}
        </text>
        <text v-if="isSessionClosed" class="meta-copy meta-copy--warning">
          {{ t('chat.sessionClosedHint') }}
        </text>
      </view>
    </SectionCard>

    <!-- 操作区 -->
    <SectionCard :title="t('chat.actionsTitle')" compact>
      <view v-if="pageErrorMessage" class="meta-copy">{{ pageErrorMessage }}</view>
      <template v-else>
        <!-- 引用上下文卡片（来自兴趣圈"打招呼"） -->
        <view v-if="quoteContext" class="quote-card card-base">
          <view class="quote-card__header">
            <text class="quote-card__label">{{ t('chat.quoteFromTopic', { title: quoteContext.topicTitle }) }}</text>
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
              {{ t('chat.quoteReplyLabel', { sender: quoteReply.sender === 'self' ? t('chat.quoteMe') : t('chat.quotePeer') }) }}
            </text>
            <text class="quote-reply-bar__body">{{ quoteReply.body }}</text>
          </view>
          <text class="quote-reply-bar__close">✕</text>
        </view>

        <!-- 微信风格输入栏：语音/键盘切换 + 输入框/按住说话 + 表情/更多/发送 -->
        <view
          class="wechat-input-bar"
          :class="{ 'wechat-input-bar--keyboard-up': keyboardHeight > 0 }"
        >
          <!-- 语音/文字模式切换按钮 -->
          <view
            class="wechat-input-bar__icon-btn press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="toggleVoiceMode"
          >
            <image v-if="!isVoiceMode" class="wechat-input-bar__icon-img" :src="iconSrc.microphone" mode="aspectFit" alt="" />
            <text v-else class="wechat-input-bar__icon-text wechat-input-bar__icon-text--keyboard">{{ t('chat.keyboardIconText') }}</text>
          </view>

          <!-- 文字模式：输入框 -->
          <input
            v-if="!isVoiceMode"
            v-model="draft"
            class="wechat-input-bar__input"
            :disabled="isSessionClosed"
            :placeholder="isSessionClosed ? t('chat.inputPlaceholderClosed') : (quoteReply ? t('chat.inputPlaceholderReply') : t('chat.inputPlaceholderMessage'))"
            :adjust-position="true"
            @focus="onInputFocus"
            @blur="onInputBlur"
            @input="onDraftChange"
            @keyboardheightchange="onKeyboardHeightChange" :aria-label="isSessionClosed ? t('chat.inputPlaceholderClosed') : (quoteReply ? t('chat.inputPlaceholderReply') : t('chat.inputPlaceholderMessage'))"
          />

          <!-- 语音模式：按住说话按钮（使用 VoiceRecorder 组件） -->
          <VoiceRecorder
            v-else
            :disabled="isSessionClosed"
            @recorded="handleVoiceRecorded"
            @cancel="handleVoiceRecordCancel"
            @state-change="handleVoiceStateChange"
          />

          <template v-if="!inputFocused && !isVoiceMode">
            <view
              class="wechat-input-bar__icon-btn press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
            >
              <image class="wechat-input-bar__icon-img" :src="iconSrc.smile" mode="aspectFit" alt="" />
            </view>
            <view
              class="wechat-input-bar__icon-btn wechat-input-bar__icon-btn--more press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              @tap="openMoreMenu"
            >
              <text class="wechat-input-bar__icon-text">+</text>
            </view>
          </template>
          <view
            v-else-if="!isVoiceMode"
            class="wechat-input-bar__send press-feedback"
            :class="{ 'wechat-input-bar__send--active': canSend }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="onSend"
          >
            <text class="wechat-input-bar__send-text">{{ t('chat.send') }}</text>
          </view>
        </view>

        <!-- 输入框空闲提示（停留 5 秒未输入时展示） -->
        <view v-if="showIdleIcebreakerHint && shouldShowIcebreakers" class="idle-hint">
          <text class="idle-hint__text">{{ t('chat.idleIcebreakerHint') }}</text>
        </view>

        <!-- 临时会话操作按钮（保留同意交换/结束会话入口） -->
        <view v-if="isTempSession" class="temp-action-row">
          <view
            class="temp-action-btn temp-action-btn--secondary press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleAcceptExchange"
          >
            <text class="temp-action-btn__text">{{ t('chat.acceptExchangeBtn') }}</text>
          </view>
          <view
            class="temp-action-btn temp-action-btn--danger press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleEndSession"
          >
            <text class="temp-action-btn__text temp-action-btn__text--danger">{{ t('chat.endSessionBtn') }}</text>
          </view>
        </view>
      </template>
    </SectionCard>

    <!--
      长按菜单遮罩：遮罩点击关闭，内容区阻止冒泡（P2 弹窗遮罩点击关闭）。
      源码层面直接使用 catchtap="noop" 阻止冒泡：
      mp-weixin 端 catchtap 原生阻止冒泡；H5 端由外层遮罩 @tap 兜底关闭。
      noop 为空操作 handler，因 mp-weixin 的 catchtap 必须绑定 handler。
    -->
    <view
      v-if="longPressMenu.visible"
      class="longpress-overlay"
      @tap="closeLongPressMenu"
      role="dialog"
      aria-modal="true"
      :aria-label="t('chat.longPressMenu.ariaLabel')"
    >
      <view
        class="longpress-menu"
        catchtap="noop"
      >
        <!-- 复制：将消息正文写入剪贴板（P2 长按复制支持） -->
        <view
          class="longpress-menu__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleCopyMessage"
          role="button"
          :aria-label="t('chat.longPressMenu.copyAria')"
        >
          <text class="longpress-menu__text">{{ t('chat.longPressMenu.copy') }}</text>
        </view>
        <view
          class="longpress-menu__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleQuoteMessage"
          role="button"
          :aria-label="t('chat.longPressMenu.quoteAria')"
        >
          <text class="longpress-menu__text">{{ t('chat.longPressMenu.quote') }}</text>
        </view>
        <view
          v-if="longPressMenu.isSelf"
          class="longpress-menu__item longpress-menu__item--danger press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleRecallMessage"
          role="button"
          :aria-label="t('chat.longPressMenu.recallAria')"
        >
          <text class="longpress-menu__text longpress-menu__text--danger">{{ t('chat.longPressMenu.recall') }}</text>
        </view>
        <view
          class="longpress-menu__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="closeLongPressMenu"
          role="button"
          :aria-label="t('common.cancel')"
        >
          <text class="longpress-menu__text">{{ t('common.cancel') }}</text>
        </view>
      </view>
    </view>

    <!-- "+" 更多菜单：红包 / 视频通话 -->
    <view
      v-if="moreMenuVisible"
      class="more-menu-overlay"
      @tap="closeMoreMenu"
      role="dialog"
      aria-modal="true"
      :aria-label="t('chat.moreMenuTitle')"
    >
      <view
        class="more-menu-sheet"
        catchtap="noop"
      >
        <view class="more-menu-sheet__title">
          <text class="more-menu-sheet__title-text">{{ t('chat.moreMenuTitle') }}</text>
        </view>
        <view class="more-menu-sheet__grid">
          <view
            v-if="featureFlags.redPacketEnabled"
            class="more-menu-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="goRedPacket"
            role="button"
            :aria-label="t('chatRedPacket.entryLabel')"
          >
            <view class="more-menu-item__icon more-menu-item__icon--red">
              <image class="more-menu-item__icon-emoji" :src="chatMenuIcons.redPacket" mode="aspectFit" alt="" />
            </view>
            <text class="more-menu-item__label">{{ t('chatRedPacket.entryLabel') }}</text>
          </view>
          <view
            v-if="featureFlags.videoCallEnabled"
            class="more-menu-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="goVideoCall"
            role="button"
            :aria-label="t('videoCall.entryLabel')"
          >
            <view class="more-menu-item__icon more-menu-item__icon--blue">
              <image class="more-menu-item__icon-emoji" :src="chatMenuIcons.videoCall" mode="aspectFit" alt="" />
            </view>
            <text class="more-menu-item__label">{{ t('videoCall.entryLabel') }}</text>
          </view>
        </view>
        <view
          class="more-menu-sheet__cancel press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="closeMoreMenu"
          role="button"
          :aria-label="t('common.cancel')"
        >
          <text class="more-menu-sheet__cancel-text">{{ t('common.cancel') }}</text>
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
  border: 1rpx solid var(--c-brand-shadow-tint);
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
  color: var(--c-text-secondary);
  flex-shrink: 0;
}

/* 录音中状态 */
.wechat-input-bar__icon-btn--recording {
  background: var(--c-error);
  transform: scale(1.1);
}

.wechat-input-bar__recording-indicator {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.wechat-input-bar__recording-pulse {
  width: 16rpx;
  height: 16rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-neutral-0);
  animation: recording-pulse var(--d-spinner, 800ms) ease-in-out infinite;
}

@keyframes recording-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

.wechat-input-bar__recording-text {
  font-size: 22rpx;
  color: var(--c-neutral-0);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
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

/* 发送按钮高亮状态（输入框非空时） */
.wechat-input-bar__send--active {
  background: var(--c-brand-600);
  box-shadow: var(--s-brand-md);
}

/* 语音模式：按住说话按钮 */
.wechat-input-bar__voice-hold {
  flex: 1;
  height: 64rpx;
  border-radius: var(--r-md);
  background: var(--c-neutral-50);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid var(--c-border-light);
}

.wechat-input-bar__voice-hold--recording {
  background: var(--c-error);
  border-color: var(--c-error);
}

.wechat-input-bar__voice-hold-text {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  font-weight: 600;
}

.wechat-input-bar__voice-hold--recording .wechat-input-bar__voice-hold-text {
  color: var(--c-text-inverse);
}

/* 键盘切换按钮文字样式 */
.wechat-input-bar__icon-text--keyboard {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  font-weight: 700;
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
  background: linear-gradient(135deg, var(--c-brand-bg-tint), var(--c-romance-bg-tint));
  border: 1rpx solid var(--c-location-bg);
  animation: idle-fade-in var(--d-bounce, 400ms) ease;
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
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 3em;
  /* #endif */
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
  animation: slide-up-in var(--d-normal, 200ms) ease;
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
  background: var(--c-black-overlay-mid);
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
  animation: modal-scale-in var(--d-normal, 200ms) ease;
}

.longpress-menu__item {
  padding: var(--sp-7) var(--sp-8);
  text-align: center;
  transition: background var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.longpress-menu__item:active {
  background: var(--c-bg-page);
  transform: scale(0.98);
}
/* #endif */

/* #ifdef H5 */
.longpress-menu__item--danger:active {
  background: var(--c-error-bg-tint);
}
/* #endif */

.longpress-menu__text {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
}

.longpress-menu__text--danger {
  color: var(--c-error);
}


/* ========== "+" 更多菜单（红包 / 视频通话） ========== */
.more-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-black-overlay-mid);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: more-menu-fade-in var(--d-normal, 200ms) ease-out;
}

@keyframes more-menu-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.more-menu-sheet {
  width: 100%;
  background: var(--c-bg-container);
  border-top-left-radius: var(--r-xl, 32rpx);
  border-top-right-radius: var(--r-xl, 32rpx);
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom, 0));
  box-sizing: border-box;
  animation: more-menu-slide-up var(--d-slow, 240ms) cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes more-menu-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.more-menu-sheet__title {
  text-align: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid var(--c-border-light);
}

.more-menu-sheet__title-text {
  font-size: var(--fs-md, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
}

.more-menu-sheet__grid {
  display: flex;
  flex-direction: row;
  gap: 32rpx;
  padding: 32rpx 16rpx;
  justify-content: flex-start;
}

.more-menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  width: 144rpx;
  padding: 16rpx 0;
  border-radius: var(--r-md, 16rpx);
  transition: background var(--d-fast, 160ms) ease-out;
}

.more-menu-item__icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-circle, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-menu-item__icon--red {
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  box-shadow: var(--s-romance);
}

.more-menu-item__icon--blue {
  background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
  box-shadow: var(--s-info-soft);
}

.more-menu-item__icon-emoji {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-text-inverse);
}

.more-menu-item__label {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-primary);
  line-height: 1.4;
}

.more-menu-sheet__cancel {
  margin-top: 16rpx;
  height: 88rpx;
  border-radius: var(--r-md, 16rpx);
  background: var(--c-bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity var(--d-fast, 160ms) ease-out;
}

.more-menu-sheet__cancel-text {
  font-size: var(--fs-md, 28rpx);
  color: var(--c-text-primary);
  font-weight: 500;
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
