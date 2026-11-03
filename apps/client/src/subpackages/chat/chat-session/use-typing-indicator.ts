/**
 * 会话页「正在输入」指示器 composable（N-5 首期拆分，2026-11-03）。
 *
 * <p>从 {@code chat-session/index.vue} 抽出的内聚块之二：双向 typing 状态——</p>
 * <ul>
 *   <li><b>对方输入态</b>：real 由 WS /user/queue/typing 事件（messagesStore.typingMap）驱动；
 *       mock 由随机 1.5~3s 开始、2~4s 停止的本地模拟驱动（增强实时感）；</li>
 *   <li><b>我方输入态推送</b>（real）：STOMP {@code /app/chat/typing}，
 *       输入时立即 typing=true、停顿 2.5s 后 typing=false、离页补发 false。</li>
 * </ul>
 *
 * <p>逻辑与抽取前逐行等价；wsClient/store 全部经回调注入，composable 零依赖、可单测。</p>
 */
import { computed, ref } from "vue";

/** 我方输入停止多久后发 typing=false（毫秒） */
const TYPING_STOP_DELAY_MS = 2500;

export interface UseTypingIndicatorOptions {
  /** 当前会话 ID（null=未就绪，推送跳过） */
  sessionId: () => string | null;
  /** 是否临时匿名会话（mock 模拟输入仅限私信会话，避免误导） */
  isTempSession: () => boolean;
  /** 是否 mock 档（页面注入 useMock，保持 composable 零依赖） */
  isMock: () => boolean;
  /** 对方输入态（real：messagesStore.typingMap[sessionId] 的读取包装） */
  peerTypingFromStore: (sessionId: string) => boolean;
  /** 对方用户 ID 解析（null=解析不出，推送跳过） */
  resolvePeerUserId: () => number | null;
  /** WS 发送包装（wsClient.send；未连接时 send 自身静默排队，语义不变） */
  send: (destination: string, body: Record<string, unknown>) => void;
}

export function useTypingIndicator(options: UseTypingIndicatorOptions) {
  /** mock 模式演示输入态（仅 mock 使用；real 由 store typingMap 驱动） */
  const peerTypingLocal = ref(false);
  /** typing 演示计时器 ID */
  let typingTimer: ReturnType<typeof setTimeout> | null = null;
  /** 输入停止通知定时器（输入停顿后发 typing=false） */
  let typingStopTimer: ReturnType<typeof setTimeout> | null = null;

  /** 对方是否正在输入（real 走 store / mock 走本地模拟） */
  const peerTyping = computed(() => {
    if (options.isMock()) return peerTypingLocal.value;
    const sid = options.sessionId();
    return sid ? options.peerTypingFromStore(sid) : false;
  });

  /**
   * mock 模式演示：发送成功后随机 1.5~3s 模拟对方开始输入，2~4s 后停止。
   * 仅私信会话演示（临时会话不模拟，避免误导）。
   */
  function scheduleTypingSimulation() {
    if (!options.isMock() || options.isTempSession()) return;
    clearTypingTimer();
    typingTimer = setTimeout(() => {
      peerTypingLocal.value = true;
      typingTimer = setTimeout(() => {
        peerTypingLocal.value = false;
        typingTimer = null;
      }, 2000 + Math.floor(Math.random() * 2000));
    }, 1500 + Math.floor(Math.random() * 1500));
  }

  /** 复位本地演示输入态（onHide 调用：切后台后回来不残留「对方正在输入」） */
  function resetLocalTyping() {
    peerTypingLocal.value = false;
  }

  /** 清理演示计时器（onHide/onUnload 调用，避免切后台后误触） */
  function clearTypingTimer() {
    if (typingTimer) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
  }

  /**
   * 通知对方「我正在输入」（real 模式）。
   * 载荷与后端契约对齐：{conversationId, recipientId, typing}。
   * mock 模式不发（本地演示由 scheduleTypingSimulation 模拟）。
   */
  function notifyTyping() {
    if (options.isMock() || !options.sessionId()) return;
    const peerId = options.resolvePeerUserId();
    if (peerId === null) return;
    const sessionId = options.sessionId()!;
    options.send("/app/chat/typing", {
      conversationId: sessionId,
      recipientId: String(peerId),
      typing: true,
    });
    if (typingStopTimer) clearTimeout(typingStopTimer);
    typingStopTimer = setTimeout(() => {
      options.send("/app/chat/typing", {
        conversationId: options.sessionId()!,
        recipientId: String(peerId),
        typing: false,
      });
      typingStopTimer = null;
    }, TYPING_STOP_DELAY_MS);
  }

  /** 离开页面时发送 typing=false 并清理定时器（onHide/onUnload 调用） */
  function clearTypingStopTimer() {
    if (typingStopTimer) {
      clearTimeout(typingStopTimer);
      typingStopTimer = null;
    }
    if (!options.isMock() && options.sessionId()) {
      const peerId = options.resolvePeerUserId();
      if (peerId !== null) {
        options.send("/app/chat/typing", {
          conversationId: options.sessionId()!,
          recipientId: String(peerId),
          typing: false,
        });
      }
    }
  }

  return {
    peerTyping,
    scheduleTypingSimulation,
    notifyTyping,
    clearTypingTimer,
    resetLocalTyping,
    clearTypingStopTimer,
  };
}
