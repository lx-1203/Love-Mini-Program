import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WebSocket Store 分发单元测试（2026-08-09 未读红点修复 BUG 2）
 *
 * 验证 dispatchToStore 的队列匹配与分发：
 * - /user/queue/temp-chat/messages（含 "-" 与 "/"）不再被正则丢弃
 * - real 私信载荷（MessageView 形状）经转换层进入 onNewMessage
 * - 无法归因的 temp 消息静默忽略（不报 Sentry）
 * - typing 分支（后端推送预留）不抛错
 */

// ---- Mock stores（hoisted 单例：dispatchToStore 内部与测试断言共用同一实例） ----
const storeMock = vi.hoisted(() => ({
  currentMessages: [],
  sessions: [],
  heartSignals: [],
  notifications: [],
  onNewMessage: vi.fn(),
  fetchSessions: vi.fn(),
  fetchStatus: vi.fn(),
  activeSessionId: null,
}));

vi.mock("../stores/messages", () => ({
  useMessagesStore: () => storeMock,
}));

vi.mock("../stores/likes", () => ({
  useLikesStore: () => ({
    heartSignals: [],
    onNewHeartSignal: vi.fn(),
  }),
}));

vi.mock("../stores/checkin", () => ({
  useCheckInStore: () => ({
    fetchStatus: vi.fn(),
  }),
}));

vi.mock("../stores/session", () => ({
  useSessionStore: () => ({
    userSession: { userId: "1001" },
  }),
}));

vi.mock("../stores/chat", () => ({
  useChatStore: () => ({
    activeSession: { id: "session-a-b-abc123" },
  }),
}));

vi.mock("../services/sentry", () => ({
  captureException: vi.fn(),
}));

vi.mock("../config/env", () => ({
  isDev: false,
}));

import { dispatchToStore } from "../services/websocket/store-dispatch";
import { captureException } from "../services/sentry";

describe("dispatchToStore - 队列分发（BUG 2 正则修复）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("私信 real 载荷（MessageView 形状）经转换层进入 onNewMessage", () => {
    dispatchToStore("/user/queue/messages", {
      id: 1,
      conversationId: 2,
      senderId: 999,
      content: "hi",
      messageKind: "text",
      isRead: false,
      createdAt: "2026-08-09T10:00:00",
    });
    expect(storeMock.onNewMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        sessionId: "2",
        sender: "peer",
        kind: "text",
        body: "hi",
      })
    );
  });

  it("/user/queue/temp-chat/messages 不再被正则丢弃，进入 onNewMessage", () => {
    dispatchToStore("/user/queue/temp-chat/messages", {
      id: "m1",
      sender: "peer",
      kind: "text",
      body: "在吗",
      sentAt: "2026-08-09T10:00:00",
    });
    expect(storeMock.onNewMessage).toHaveBeenCalledTimes(1);
  });

  it("无法归因的 temp 消息（无 sessionId 且无 activeSession 命中）静默忽略，不报 Sentry", () => {
    // 模拟 chatStore.activeSession 为 null 场景：用 self 消息（resolveWsSessionId 返回空）
    dispatchToStore("/user/queue/temp-chat/messages", {
      id: "m1",
      sender: "self",
      kind: "text",
      body: "hi",
      sentAt: "2026-08-09T10:00:00",
    });
    expect(storeMock.onNewMessage).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("非法形状仍走 Sentry 上报（原守卫行为保留）", () => {
    dispatchToStore("/user/queue/messages", { foo: "bar" });
    expect(storeMock.onNewMessage).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalled();
  });

  it("/user/queue/temp-chat 会话事件行为不变（fetchSessions 刷新）", () => {
    dispatchToStore("/user/queue/temp-chat", { type: "session_created", sessionId: "s1" });
    expect(storeMock.fetchSessions).toHaveBeenCalledTimes(1);
    expect(storeMock.onNewMessage).not.toHaveBeenCalled();
  });

  it("typing 分支（后端推送预留）：合法形状不抛错", () => {
    expect(() =>
      dispatchToStore("/user/queue/typing", { sessionId: "2", typing: true })
    ).not.toThrow();
    expect(storeMock.onNewMessage).not.toHaveBeenCalled();
  });

  it("未知队列类型上报 Sentry（行为保持）", () => {
    dispatchToStore("/user/queue/unknown-queue", {});
    expect(captureException).toHaveBeenCalled();
  });
});
