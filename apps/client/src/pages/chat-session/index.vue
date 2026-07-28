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
import { computed, ref, nextTick, watch } from "vue";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
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
import SafeImage from "../../components/common/SafeImage.vue";
import { lightHaptic } from "../../utils/haptic";
// Sentry 监控：消息发送失败上报异常，页面切换 / 关键按钮点击记录面包屑
import { captureException, addBreadcrumb } from "../../services/sentry";
import type { RecorderStopResult } from "../../utils/audio-recorder";
import type { ChatMessageView } from "./types";
// 导航工具
import { openAppPath } from "../../utils/navigation";
// 纯逻辑模块导入（页面转场逻辑仍内联在本文件中）
import type {
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

/** SVG 图标资源路径 */
const iconSrc = {
  heartSignal: IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL,
  message: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
  // 顶栏返回箭头（与 AppShell 保持同一套图标资源）
  back: IMAGE_PATHS.ICONS_COMMON.BACK,
  // Emoji 替换 SVG 图标
  microphone: IMAGE_PATHS.ICONS_EMOJI.MICROPHONE,
  smile: IMAGE_PATHS.ICONS_EMOJI.SMILE,
} as const;

/**
 * 点击对方头像 -> 跳转对方个人主页
 */
function goToPeerProfile() {
  // 尝试多个来源获取对方 userId
  let peerId: string | undefined | null;

  // 1. messagesStore 中的会话信息（最可靠，包含真实 userId）
  peerId = currentSession.value?.partnerId;

  // 2. chatStore 中的活跃会话（推荐人 ID 作为 userId）
  if (!peerId) {
    peerId = chatStore.activeSession?.recommendedPersonId;
  }

  // 3. 页面跳转参数携带的 userId
  if (!peerId) {
    peerId = targetUserId.value;
  }

  if (!peerId) {
    uni.showToast({ title: "无法获取对方信息", icon: "none" });
    return;
  }

  // H5 使用 hash 直接跳转（保留 query 参数）；mp-weixin 通过 tabQueryCache 传参
  // #ifdef H5
  window.location.hash = `#/pages/profile/index?userId=${encodeURIComponent(peerId)}`;
  // #endif
  // #ifndef H5
  openAppPath(`/pages/profile/index?userId=${encodeURIComponent(peerId)}`);
  // #endif
}

/**
 * 返回好友列表（聊天会话列表）。
 *
 * 优先尝试 navigateBack 回到上一页，失败时切换 Tab 到好友列表页面。
 * mp-weixin 的 uni.navigateBack 不返回 Promise，必须使用 fail 回调风格。
 */
function handleBack() {
  // #ifdef MP-WEIXIN
  uni.navigateBack({
    delta: 1,
    fail: () => {
      // 无上一页时切换到好友列表
      uni.switchTab({ url: "/pages/chat/index" });
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateBack({ delta: 1 }).catch(() => {
    // navigateBack 失败（如 H5 无历史记录）时切换到好友列表
    uni.switchTab({ url: "/pages/chat/index" });
  });
  // #endif
}

const draft = ref("");
/** 当前是否为语音输入模式 */
const isVoiceMode = ref(false);
const sessionId = ref<string | null>(null);
const targetUserId = ref<string | null>(null);
const pageErrorMessage = ref<string | null>(null);
const tempCountdown = ref("");
/** 控制页面内容淡入动画 */
const pageVisible = ref(false);

/**
 * 消息列表滚动锚点：指向列表末尾的占位元素 id。
 *
 * scroll-view 的 scroll-into-view 只在值发生变化时才重新触发滚动，
 * 因此先置空再于 nextTick 写回锚点 id，确保连续发送消息时每次都能滚到底。
 */
const CHAT_BOTTOM_ANCHOR = "chat-bottom-anchor";
const scrollIntoView = ref("");

/** 滚动到消息列表底部（进入会话 / 新消息到达 / 发送后调用） */
function scrollToBottom() {
  scrollIntoView.value = "";
  void nextTick(() => {
    scrollIntoView.value = CHAT_BOTTOM_ANCHOR;
  });
}

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

/** 用户消息数量（排除 system 类型消息） */
const userMessageCount = computed(() => {
  const fromMessagesStore = countUserMessages(messagesStore.currentMessages);
  const fromChatStore = countUserMessages(chatStore.activeSession?.messages ?? []);
  return Math.max(fromMessagesStore, fromChatStore);
});

/** 是否应该展示破冰话题（消息数为 0 或极少时） */
const shouldShowIcebreakers = computed(() => {
  return shouldShowIcebreakersVm(userMessageCount.value, pageErrorMessage.value);
});

/**
 * 合并后的消息视图模型（按 sentAt 时间排序，时间戳缺失的消息排末尾）
 *
 * 合并 messagesStore.currentMessages（私信链路）与
 * chatStore.activeSession.messages（旧版临时会话兜底），
 * 统一排序后渲染，避免两段顺序渲染导致的时间错乱。
 */
const mergedMessagesView = computed(() => {
  const msgs = [
    ...toChatMessageViewList(messagesStore.currentMessages),
    ...toChatMessageViewList(chatStore.activeSession?.messages ?? []),
  ];
  // 按 sentAt 升序排列（旧→新），无 sentAt 的排末尾
  return msgs.sort((a, b) => {
    const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return ta - tb;
  });
});

/**
 * 消息条数变化时自动滚到底部。
 *
 * 覆盖两条链路：messagesStore（私信）与 chatStore（临时匿名会话），
 * 对方新消息推送、自己发送成功后的乐观更新都会触发。
 */
watch(
  () => mergedMessagesView.value.length,
  (count, prevCount) => {
    if (count > (prevCount ?? 0)) {
      scrollToBottom();
    }
  }
);

usePageAccess(chatPageRequirements);

onLoad((query) => {
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
    // Mock 模式下无现有会话时，使用 userId 作为临时标识
    sessionId.value = `session-${rawUserId}`;
    pageErrorMessage.value = null;
    return;
  }

  pageErrorMessage.value = "缺少会话标识，请从聊天列表或匹配结果进入。";
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

  // 优先从 messagesStore 加载会话信息，加载完成后标记已读并滚动到底部
  void messagesStore.fetchSessionMessages(sessionId.value).then(() => {
    // 标记当前会话所有对方消息为已读
    void messagesStore.markSessionMessagesRead(sessionId.value!);
    scrollToBottom();
  });

  // 如果是临时会话，同时兼容旧 chatStore 的加载逻辑
  const session = messagesStore.sessions.find((s) => s.id === sessionId.value);
  if (!session || session.sessionType === "temp_anonymous") {
    void chatStore.loadSession(sessionId.value).then(() => {
      // 标记临时会话中所有对方消息为已读
      if (chatStore.activeSession) {
        const updatedMessages = chatStore.activeSession.messages.map((msg) => {
          if (msg.sender === "peer" && msg.deliveryStatus !== "read") {
            return { ...msg, deliveryStatus: "read" as const };
          }
          return msg;
        });
        chatStore.activeSession.messages = updatedMessages;
      }
      scrollToBottom();
    });
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

/** 对方头像兜底 */
const peerAvatarFallback = computed(() => {
  return currentSession.value?.partnerAvatar || IMAGE_PATHS.AVATARS.AVATAR_1;
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
    uni.showToast({ title: "会话已结束，无法发送消息", icon: "none" });
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
    } else {
      // 私信会话使用 messagesStore 的标准私信链路
      await messagesStore.sendMessage(currentSessionId, messageToSend, quoteRef?.messageId);
    }

    // 发送成功后清空输入与引用状态、关闭表情面板；失败时保留草稿以便重试
    draft.value = "";
    quoteReply.value = null;
    showEmojiPicker.value = false;
    // 修复（H5 input 显示不同步）：强制清除原生 input 的显示值
    // uni-app H5 中 :value 绑定在清空后不更新原生 <input> 显示，
    // 通过 DOM 直接设置为空确保视觉同步。
    try {
      const el = document.querySelector('.wechat-input-bar__input') as HTMLInputElement | null;
      if (el) el.value = "";
    } catch (_e) { /* H5 专属修复，非 H5 环境忽略 */ }
    // 滚动到底部，让刚发出的消息可见
    scrollToBottom();
  } catch (error) {
    // 消息发送失败：上报到 Sentry，source 标记为 chat.sendText 便于后台筛选
    captureException(error, {
      source: "chat.sendText",
      sessionId: currentSessionId,
    });
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

/**
 * 输入事件处理：同步 draft 值 + 重置空闲计时器
 *
 * 配合 :value + @input 单向数据流使用（替代 v-model），
 * 确保程序化清空 draft 后原生 input 显示同步更新。
 * 注意：函数名避免用 onInput（与 uni-app input 组件内部事件名冲突）。
 */
function handleInput(e: Event) {
  const value = (e as any).detail?.value ?? (e.target as HTMLInputElement)?.value ?? "";
  draft.value = value;
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
  // 查找消息以判断是否是自己的消息
  const allMessages = [
    ...messagesStore.currentMessages,
    ...(chatStore.activeSession?.messages || []),
  ];
  const message = allMessages.find((m) => m.id === messageId);
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
  const allMessages = [
    ...messagesStore.currentMessages,
    ...(chatStore.activeSession?.messages || []),
  ];
  const message = allMessages.find((m) => m.id === messageId);
  if (!message) {
    closeLongPressMenu();
    return;
  }
  // 仅支持文本/emoji 类型消息复制，语音类型不复制
  if (message.kind && message.kind !== "text" && message.kind !== "emoji") {
    uni.showToast({ title: "当前消息类型不支持复制", icon: "none" });
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
      uni.showToast({ title: "复制失败，请重试", icon: "none" });
    },
  });
  closeLongPressMenu();
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
    await recallTempChatMessageApi(sessionId.value, longPressMenu.value.messageId);
    uni.showToast({ title: "消息已撤回", icon: "success" });
    // 重新加载会话以获取最新消息
    void messagesStore.fetchSessionMessages(sessionId.value);
    if (isTempSession.value) {
      void chatStore.loadSession(sessionId.value);
    }
  } catch (_e) {
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

/* ========== "+" 更多菜单：红包 / 视频通话入口 ========== */

/* ========== 表情选择器 ========== */

/** 内置表情列表（按分类分组） */
const EMOJI_CATEGORIES = [
  {
    name: "笑脸",
    items: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🫣","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥴","😵","🤯","🥳","🥺","😢","😭","😤","😡","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾"],
  },
  {
    name: "爱心",
    items: ["❤️","🧡","💛","💚","💙","💜","🖤","🩷","🩵","🩶","🤍","🤎","💕","💞","💗","💖","💘","💝","💟","❣️","💌","❤️‍🔥","❤️‍🩹"],
  },
  {
    name: "手势",
    items: ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄"],
  },
  {
    name: "物品",
    items: ["🎉","🎊","🎀","🎁","🎈","🎂","🍰","🧁","🍦","🍿","🎵","🎶","🎤","🎧","📱","💻","⌚️","📸","🎮","🎯","🎲","🧩","📚","✏️","💰","💎","🔮","💡","🔑","🗝️","📌","🧷","🪄"],
  },
  {
    name: "自然",
    items: ["🌟","⭐️","✨","🔥","🌈","☀️","🌙","⭐","💫","🌸","🌺","🌻","🌹","🌷","🌿","🍀","🌵","🌴","🍁","🍄","🐶","🐱","🦊","🐰","🐼","🐨","🦁","🐯","🐮","🦄","🐧","🦋","🐝","🦄","💐","🌷"],
  },
];

/** 展开的表情分类索引（-1 = 未展开） */
const activeEmojiCategory = ref(0);

/** 是否显示表情选择面板 */
const showEmojiPicker = ref(false);

/** 切换表情面板显示 */
function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value;
  if (showEmojiPicker.value) {
    // 打开表情面板时收起键盘、关闭更多菜单
    inputFocused.value = false;
    moreMenuVisible.value = false;
    uni.hideKeyboard();
    activeEmojiCategory.value = 0;
  }
}

/** 选中表情：插入到输入框草稿 */
function insertEmoji(emoji: string) {
  draft.value += emoji;
  // 同步更新原生 input 显示值（与 handleInput 保持一致）
  try {
    const el = document.querySelector('.wechat-input-bar__input') as HTMLInputElement | null;
    if (el) el.value = draft.value;
  } catch (_e) { /* H5 专属修复 */ }
}

/** 关闭表情面板 */
function closeEmojiPicker() {
  showEmojiPicker.value = false;
}

/* ========== "+" 更多菜单：红包 / 视频通话入口 ========== */

/** 更多菜单是否展开 */
const moreMenuVisible = ref<boolean>(false);

/** 打开"+"更多菜单 */
function openMoreMenu() {
  lightHaptic();
  moreMenuVisible.value = true;
  showEmojiPicker.value = false;
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
    url: `/pages/chat/red-packet?sessionId=${encodeURIComponent(sessionId.value)}`,
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
    url: `/pages/chat/video-call?${params.join("&")}`,
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
    url: `/pages/chat/red-packet?sessionId=${encodeURIComponent(sessionId.value)}&claimId=${redPacketId}`,
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
    url: `/pages/chat/red-packet?sessionId=${encodeURIComponent(sessionId.value)}&claimId=${redPacketId}`,
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
        `[语音消息 ${result.durationSeconds}秒]`
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
</script>

<template>
  <!--
    聊天详情页布局（满屏三段式，参考微信）：
    ┌ chat-page__header  固定顶栏：返回 + 对方昵称/副标题
    ├ chat-page__body    flex:1 滚动消息区（scroll-view，新消息自动滚到底）
    └ chat-page__footer  吸底输入栏（引用条 / 破冰话题 / 输入栏 / 临时会话操作）

    修复：原实现用 AppShell + SectionCard("消息"/"操作") 把聊天塞进普通文档流，
    导致消息区无法撑满、输入栏不吸底，且暴露"消息""操作"两个突兀的卡片标题。
  -->
  <view class="chat-page" :class="{ 'page-fade-in': pageVisible }" role="main" :aria-label="pageTitle">
    <!-- ===== 固定顶栏 ===== -->
    <view class="chat-page__header" role="banner">
      <view
        class="chat-header__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="handleBack"
        role="button"
        :aria-label="t('common.back')"
      >
        <image
          class="chat-header__back-icon"
          :src="iconSrc.back"
          mode="aspectFit"
          alt=""
        />
      </view>
      <view class="chat-header__titles">
        <text class="chat-header__title">{{ pageTitle }}</text>
        <text v-if="pageSubtitle" class="chat-header__subtitle">{{ pageSubtitle }}</text>
      </view>
      <view class="chat-header__spacer" />
    </view>

    <!-- 临时匿名会话顶部提示（含联系方式交换状态，替代原"会话状态"卡片） -->
    <view v-if="isTempSession" class="temp-banner">
      <text class="temp-banner__text">
        {{ tempCountdown === "已结束" ? "会话已结束" : "24小时临时聊天，双方身份匿名" }}
      </text>
      <text v-if="chatStore.activeSession" class="temp-banner__state">
        {{ chatStore.activeSession.contactExchangeLabel }}
      </text>
    </view>

    <!-- ===== 滚动消息区 ===== -->
    <view v-if="pageErrorMessage" class="chat-page__body chat-page__body--state">
      <text class="meta-copy">{{ pageErrorMessage }}</text>
    </view>
    <view v-else-if="messagesStore.loading" class="chat-page__body chat-page__body--state">
      <text class="meta-copy">正在加载聊天详情...</text>
    </view>
    <view v-else-if="messagesStore.errorMessage" class="chat-page__body chat-page__body--state">
      <text class="meta-copy">{{ messagesStore.errorMessage }}</text>
    </view>
    <scroll-view
      v-else
      class="chat-page__body"
      scroll-y
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
      :show-scrollbar="false"
    >
      <view class="chat-list" role="list">
        <!--
          合并消息列表（按 sentAt 时间升序排列）。
          合并 messagesStore（私信链路）与 chatStore（旧版临时会话兜底），
          统一排序后渲染，避免两段顺序渲染导致的时间错乱。
        -->
        <!-- 红包消息：使用 RedPacketBubble 渲染（基于 body 前缀模式识别） -->
        <template v-for="message in mergedMessagesView" :key="`msg-${message.id}`">
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
            :is-read="message.isRead"
            :quote-ref="message.quoteRef"
            :quote-body="message.quoteBody"
            :quote-sender="message.quoteSender"
            :peer-avatar="peerAvatarFallback"
            :can-interact="true"
            @longpress="handleMessageLongpress(message.id)"
            @tap-quote="handleTapQuote"
            @avatar-tap="goToPeerProfile"
          />
        </template>
        <!-- 空态：居中展示，避免顶在滚动区最上方 -->
        <view
          v-if="!mergedMessagesView.length"
          class="chat-empty"
        >
          <text class="chat-empty__text">会话刚建立，打个招呼吧</text>
        </view>
        <text v-if="isSessionClosed" class="meta-copy meta-copy--warning">
          会话已结束，无法继续发送消息。
        </text>
        <!-- 滚动锚点：始终位于消息流末尾，供 scroll-into-view 定位到底部 -->
        <view :id="CHAT_BOTTOM_ANCHOR" class="chat-list__anchor" />
      </view>
    </scroll-view>

    <!-- ===== 吸底操作区 ===== -->
    <view
      v-if="!pageErrorMessage"
      class="chat-page__footer"
      :class="{ 'chat-page__footer--keyboard-up': keyboardHeight > 0 }"
    >
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

      <!-- 表情选择面板 -->
      <view
        v-if="showEmojiPicker"
        class="emoji-picker"
        role="region"
        aria-label="表情选择面板"
      >
        <!-- 表情分类标签页 -->
        <view class="emoji-picker__tabs">
          <view
            v-for="(category, idx) in EMOJI_CATEGORIES"
            :key="idx"
            class="emoji-picker__tab"
            :class="{ 'emoji-picker__tab--active': activeEmojiCategory === idx }"
            @tap="activeEmojiCategory = idx"
            role="tab"
            :aria-selected="activeEmojiCategory === idx"
          >
            <text class="emoji-picker__tab-text">{{ category.name }}</text>
          </view>
        </view>
        <!-- 表情网格 -->
        <scroll-view
          class="emoji-picker__grid"
          scroll-y
          :show-scrollbar="false"
        >
          <view class="emoji-picker__items">
            <view
              v-for="(emoji, eidx) in EMOJI_CATEGORIES[activeEmojiCategory]?.items"
              :key="`emoji-${activeEmojiCategory}-${eidx}`"
              class="emoji-picker__item press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="80"
              @tap="insertEmoji(emoji)"
              role="button"
              :aria-label="emoji"
            >
              <text class="emoji-picker__emoji">{{ emoji }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 微信风格输入栏：语音/键盘切换 + 输入框/按住说话 + 表情/更多/发送 -->
      <view class="wechat-input-bar">
        <!-- 语音/文字模式切换按钮 -->
        <view
          class="wechat-input-bar__icon-btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="toggleVoiceMode"
        >
          <image v-if="!isVoiceMode" class="wechat-input-bar__icon-img" :src="iconSrc.microphone" mode="aspectFit" alt="" />
          <text v-else class="wechat-input-bar__icon-text wechat-input-bar__icon-text--keyboard">文</text>
        </view>

        <!-- 文字模式：输入框 -->
        <!--
          修复（H5 v-model 不同步）：使用 :value + @input 替代 v-model。
          uni-app H5 中 v-model 在程序化清空值（draft.value = ""）后，
          原生 <input> 的显示值不更新，导致用户误认为消息未发出。
          改为单向数据流 + 手动更新，确保 model→view 始终同步。
        -->
        <input
          v-if="!isVoiceMode"
          :value="draft"
          class="wechat-input-bar__input"
          :disabled="isSessionClosed"
          :placeholder="isSessionClosed ? '会话已结束' : (quoteReply ? '输入回复...' : '输入消息...')"
          :adjust-position="true"
          confirm-type="send"
          :confirm-hold="true"
          @confirm="onSend"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @input="handleInput"
          @keyboardheightchange="onKeyboardHeightChange"
          :aria-label="isSessionClosed ? '会话已结束' : (quoteReply ? '输入回复' : '输入消息')"
        />

        <!-- 语音模式：按住说话按钮（使用 VoiceRecorder 组件） -->
        <VoiceRecorder
          v-else
          :disabled="isSessionClosed"
          @recorded="handleVoiceRecorded"
          @cancel="handleVoiceRecordCancel"
          @state-change="handleVoiceStateChange"
        />

        <!-- 表情按钮：语音模式下隐藏，避免与录音条挤在一行 -->
        <view
          v-if="!isVoiceMode"
          class="wechat-input-bar__icon-btn press-feedback"
          :class="{ 'wechat-input-bar__icon-btn--active': showEmojiPicker }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="toggleEmojiPicker"
          role="button"
          aria-label="表情"
        >
          <image class="wechat-input-bar__icon-img" :src="iconSrc.smile" mode="aspectFit" alt="" />
        </view>

        <!-- 有草稿时显示发送按钮，否则显示"+"更多入口（不再依赖聚焦态，避免按钮闪烁跳动） -->
        <view
          v-if="!isVoiceMode && canSend"
          class="wechat-input-bar__send press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="onSend"
          role="button"
          aria-label="发送消息"
        >
          <text class="wechat-input-bar__send-text">发送</text>
        </view>
        <view
          v-else-if="!isVoiceMode"
          class="wechat-input-bar__icon-btn wechat-input-bar__icon-btn--more press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="openMoreMenu"
          role="button"
          :aria-label="t('chat.moreMenuTitle')"
        >
          <text class="wechat-input-bar__icon-text">+</text>
        </view>
      </view>
    </view>

    <!-- 长按菜单遮罩：遮罩点击关闭，内容区 @tap.stop 阻止冒泡（P2 弹窗遮罩点击关闭） -->
    <view
      v-if="longPressMenu.visible"
      class="longpress-overlay"
      @tap="closeLongPressMenu"
      role="dialog"
      aria-modal="true"
      aria-label="消息操作菜单"
    >
      <view class="longpress-menu" @tap.stop>
        <!-- 复制：将消息正文写入剪贴板（P2 长按复制支持） -->
        <view
          class="longpress-menu__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleCopyMessage"
          role="button"
          aria-label="复制该消息"
        >
          <text class="longpress-menu__text">复制</text>
        </view>
        <view
          class="longpress-menu__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleQuoteMessage"
          role="button"
          aria-label="引用该消息"
        >
          <text class="longpress-menu__text">引用</text>
        </view>
        <view
          v-if="longPressMenu.isSelf"
          class="longpress-menu__item longpress-menu__item--danger press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleRecallMessage"
          role="button"
          aria-label="撤回该消息"
        >
          <text class="longpress-menu__text longpress-menu__text--danger">撤回</text>
        </view>
        <view
          class="longpress-menu__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="closeLongPressMenu"
          role="button"
          :aria-label="t('common.cancel')"
        >
          <text class="longpress-menu__text">取消</text>
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
      <view class="more-menu-sheet" @tap.stop>
        <view class="more-menu-sheet__title">
          <text class="more-menu-sheet__title-text">{{ t('chat.moreMenuTitle') }}</text>
        </view>
        <view class="more-menu-sheet__grid">
          <view
            class="more-menu-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="goRedPacket"
            role="button"
            :aria-label="t('chatRedPacket.entryLabel')"
          >
            <view class="more-menu-item__icon more-menu-item__icon--red">
              <text class="more-menu-item__icon-emoji">🧧</text>
            </view>
            <text class="more-menu-item__label">{{ t('chatRedPacket.entryLabel') }}</text>
          </view>
          <view
            class="more-menu-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="goVideoCall"
            role="button"
            :aria-label="t('videoCall.entryLabel')"
          >
            <view class="more-menu-item__icon more-menu-item__icon--blue">
              <text class="more-menu-item__icon-emoji">📹</text>
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
  </view>
</template>

<style scoped lang="scss">
/* ==========================================================
   页面骨架：满屏三段式（顶栏固定 / 消息区滚动 / 输入栏吸底）
   ========================================================== */
.chat-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  background: var(--c-bg-page, #F4F6FA);
  overflow: hidden;
}

/* ========== 固定顶栏 ========== */
.chat-page__header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-shrink: 0;
  padding: calc(env(safe-area-inset-top) + var(--sp-3)) var(--sp-5) var(--sp-3);
  background: var(--c-bg-container);
  border-bottom: 1rpx solid var(--c-border-light);
}

.chat-header__back {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 触摸目标 ≥88rpx（44px @2x），满足 iOS HIG / Material Design 标准 */
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
  border-radius: var(--r-full);
}

.chat-header__back-icon {
  width: 40rpx;
  height: 40rpx;
}

/* 标题区：居中收敛，昵称单行省略，避免长昵称把副标题挤走 */
.chat-header__titles {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.chat-header__title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.chat-header__subtitle {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 右侧占位：与返回按钮等宽，保证标题视觉居中 */
.chat-header__spacer {
  width: 88rpx;
  flex-shrink: 0;
}

/* ========== 滚动消息区 ========== */
.chat-page__body {
  flex: 1;
  /* min-height:0 必需：否则 flex 子项会被内容撑高，滚动失效 */
  min-height: 0;
  padding: var(--sp-5) var(--sp-5) var(--sp-6);
  box-sizing: border-box;
}

/* 加载 / 错误 / 缺参等状态：居中展示，不再顶在左上角 */
.chat-page__body--state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-8);
  text-align: center;
}

/* ========== 吸底操作区 ========== */
.chat-page__footer {
  flex-shrink: 0;
  background: var(--c-bg-container);
  border-top: 1rpx solid var(--c-border-light);
  padding: var(--sp-3) var(--sp-4);
  padding-bottom: calc(var(--sp-3) + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 键盘弹起时收掉底部安全区留白，避免输入栏与键盘之间出现空档 */
.chat-page__footer--keyboard-up {
  padding-bottom: var(--sp-3);
}

/* 键盘弹起时：底部安全区留白由键盘本身占据，去掉多余内边距 */
.chat-page__footer--keyboard-up {
  padding-bottom: var(--sp-3);
}

/* ========== 临时会话提示条 ========== */
.temp-banner {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: var(--sp-3) var(--sp-6);
  background: linear-gradient(135deg, var(--c-brand-50) 0%, var(--c-romance-50) 100%);
  border-bottom: 1rpx solid var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.15));
  text-align: center;
}

.temp-banner__text {
  font-size: var(--fs-sm);
  color: var(--c-romance-500);
  font-weight: 600;
}

.temp-banner__state {
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
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

/* 消息流：气泡之间留出呼吸感，左右内边距由滚动区提供 */
.chat-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  min-height: 100%;
  /* 消息不足一屏时贴住底部，视觉上更接近真实聊天 */
  justify-content: flex-end;
}

/* 滚动锚点：零高度占位，仅用于 scroll-into-view 定位 */
.chat-list__anchor {
  height: 1rpx;
}

/* 空态：会话刚建立时居中提示 */
.chat-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-10) 0;
}

.chat-empty__text {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

/* ========== 微信风格输入栏 ==========
   吸底容器 .chat-page__footer 已负责背景 / 分隔线 / 安全区，
   这里只排列控件，避免出现"卡片里套输入框"的割裂感。 */
.wechat-input-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 88rpx;
  box-sizing: border-box;
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

/* 录音中状态 */
.wechat-input-bar__icon-btn--recording {
  background: var(--c-error, #ef4444);
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
  border-radius: 50%;
  background: var(--c-neutral-0, #fff);
  animation: recording-pulse 0.8s ease-in-out infinite;
}

@keyframes recording-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

.wechat-input-bar__recording-text {
  font-size: 22rpx;
  color: var(--c-neutral-0, #fff);
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
  background: var(--c-brand-600, #22c55e);
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
  background: var(--c-error, #ef4444);
  border-color: var(--c-error, #ef4444);
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
  background: linear-gradient(135deg, var(--c-brand-bg-tint, var(--c-brand-bg-tint, rgba(63, 207, 142, 0.05))), var(--c-romance-bg-tint, var(--c-romance-bg-tint, rgba(236, 72, 153, 0.03))));
  border: 1rpx solid var(--c-location-bg, var(--c-location-bg, rgba(63, 207, 142, 0.1)));
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
  background: var(--c-black-overlay-mid, var(--c-black-overlay-mid, rgba(0, 0, 0, 0.4)));
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

/* #ifdef H5 */
.longpress-menu__item:active {
  background: var(--c-bg-page);
  transform: scale(0.98);
}
/* #endif */

/* #ifdef H5 */
.longpress-menu__item--danger:active {
  background: var(--c-error-bg-tint, var(--c-error-bg-tint, rgba(229, 69, 77, 0.08)));
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
  background: var(--c-black-overlay-mid, rgba(0, 0, 0, 0.4));
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: more-menu-fade-in 200ms ease-out;
}

@keyframes more-menu-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.more-menu-sheet {
  width: 100%;
  background: var(--c-bg-container, #ffffff);
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom, 0));
  box-sizing: border-box;
  animation: more-menu-slide-up 240ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes more-menu-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.more-menu-sheet__title {
  text-align: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid var(--c-border-light, #e5e7eb);
}

.more-menu-sheet__title-text {
  font-size: var(--fs-md, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary, #1a1a2e);
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
  transition: background 160ms ease-out;
}

.more-menu-item__icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-menu-item__icon--red {
  background: linear-gradient(135deg, #FF7A8A 0%, #EC4899 100%);
  box-shadow: 0 4rpx 16rpx rgba(236, 72, 153, 0.25);
}

.more-menu-item__icon--blue {
  background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
  box-shadow: 0 4rpx 16rpx rgba(59, 130, 246, 0.25);
}

.more-menu-item__icon-emoji {
  font-size: 44rpx;
  line-height: 1;
}

.more-menu-item__label {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-primary, #1a1a2e);
  line-height: 1.4;
}

.more-menu-sheet__cancel {
  margin-top: 16rpx;
  height: 88rpx;
  border-radius: var(--r-md, 16rpx);
  background: var(--c-bg-hover, #f5f5f7);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 160ms ease-out;
}

.more-menu-sheet__cancel-text {
  font-size: var(--fs-md, 28rpx);
  color: var(--c-text-primary, #1a1a2e);
  font-weight: 500;
}


/* ========== 表情选择面板 ========== */
.emoji-picker {
  border-top: 1rpx solid var(--c-border-light);
  background: var(--c-bg-container);
  animation: emoji-slide-up 200ms ease-out;
  overflow: hidden;
}

@keyframes emoji-slide-up {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.emoji-picker__tabs {
  display: flex;
  gap: 0;
  padding: 0 var(--sp-3);
  border-bottom: 1rpx solid var(--c-border-light);
  flex-shrink: 0;
}

.emoji-picker__tab {
  flex: 1;
  text-align: center;
  padding: var(--sp-3) var(--sp-2);
  cursor: pointer;
  position: relative;
  transition: color 180ms ease;
}

.emoji-picker__tab-text {
  font-size: 24rpx;
  color: var(--c-text-tertiary);
  font-weight: 500;
  transition: color 180ms ease;
}

.emoji-picker__tab--active .emoji-picker__tab-text {
  color: var(--c-brand);
  font-weight: 600;
}

.emoji-picker__tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 4rpx;
  background: var(--c-brand);
  border-radius: 4rpx 4rpx 0 0;
}

.emoji-picker__grid {
  max-height: 420rpx;
  padding: var(--sp-3);
  box-sizing: border-box;
}

.emoji-picker__items {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  justify-content: flex-start;
}

.emoji-picker__item {
  width: 12.5%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-md);
  transition: background 120ms ease;
  cursor: pointer;
}

.emoji-picker__emoji {
  font-size: 44rpx;
  line-height: 1;
}

/* 表情按钮激活态 */
.wechat-input-bar__icon-btn--active {
  background: var(--c-brand-50);
  box-shadow: inset 0 0 0 2rpx var(--c-brand-200);
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
