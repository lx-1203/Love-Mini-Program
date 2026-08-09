import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock env: forces mock mode for all store data
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => true,
}));

import { useMessagesStore } from "../../stores/messages";

describe("messages store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // fetchSessions
  // ------------------------------------------------------------------
  it("fetchSessions loads sessions sorted by pinned first then recency", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();

    expect(store.sessions.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
    // pinned sessions should come first
    // 修复（严格模式 noUncheckedIndexedAccess）：store.sessions[0] 索引访问返回 T | undefined，
    // 测试场景已通过 fetchSessions 加载非空数据，此处使用非空断言 ! 简化类型。
    const firstPinned = store.sessions[0]!;
    const hasPinned = store.sessions.some((s) => s.pinned);
    if (hasPinned) {
      expect(firstPinned.pinned).toBe(true);
    }
  });

  // Phase 4.3 验收：长按置顶/取消置顶
  it("toggleSessionPin toggles pinned state", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();

    const target = store.sessions[0]!;
    const before = target.pinned;
    store.toggleSessionPin(target.id);
    expect(target.pinned).toBe(!before);
    store.toggleSessionPin(target.id);
    expect(target.pinned).toBe(before);
  });

  // ------------------------------------------------------------------
  // sendMessage – success
  // ------------------------------------------------------------------
  it("sendMessage appends message to currentMessages and updates session", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();

    // 修复（严格模式 noUncheckedIndexedAccess）：store.sessions[0] 同上，使用非空断言 !。
    const session = store.sessions[0]!;
    const beforeCount = store.currentMessages.length;

    await store.sendMessage(session.id, "你好！");

    expect(store.currentMessages.length).toBe(beforeCount + 1);
    // 修复（严格模式 noUncheckedIndexedAccess）：currentMessages[length - 1] 索引访问返回 T | undefined，
    // 前面 length 断言已确保非空，此处使用非空断言 !。
    const lastMsg = store.currentMessages[store.currentMessages.length - 1]!;
    expect(lastMsg.body).toBe("你好！");
    expect(lastMsg.sender).toBe("self");
    expect(lastMsg.kind).toBe("text");

    // session should be updated with last message preview
    const updatedSession = store.sessions.find((s) => s.id === session.id);
    expect(updatedSession?.lastMessagePreview).toBe("你好！");
  });

  // ------------------------------------------------------------------
  // sendMessage – empty content check
  // ------------------------------------------------------------------
  it("sendMessage throws when content is empty", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();

    await expect(
      store.sendMessage(store.sessions[0]!.id, "")
    ).rejects.toThrow("消息内容不能为空");
  });

  it("sendMessage throws when content is whitespace only", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();

    await expect(
      store.sendMessage(store.sessions[0]!.id, "   ")
    ).rejects.toThrow("消息内容不能为空");
  });

  // ------------------------------------------------------------------
  // sendMessage – length check
  // ------------------------------------------------------------------
  it("sendMessage throws when content exceeds max length", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();

    const tooLong = "a".repeat(5001);
    await expect(
      store.sendMessage(store.sessions[0]!.id, tooLong)
    ).rejects.toThrow("消息内容过长，请分段发送");
  });

  // ------------------------------------------------------------------
  // sendMessage – invalid sessionId
  // ------------------------------------------------------------------
  it("sendMessage throws when sessionId is empty", async () => {
    const store = useMessagesStore();
    await expect(store.sendMessage("", "test")).rejects.toThrow(
      "会话 ID 无效"
    );
  });

  // ------------------------------------------------------------------
  // acceptHeartSignal – success
  // ------------------------------------------------------------------
  it("acceptHeartSignal accepts a pending signal and creates a session", async () => {
    const store = useMessagesStore();

    // set a fresh pending signal directly (avoid mock data mutation issues)
    store.heartSignals = [
      {
        id: "signal-accept-test",
        fromUserId: "user-2003",
        fromUserName: "苏晴",
        fromUserAvatar: "",
        status: "pending",
        sentAt: "2026-05-20T16:45:00Z",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        school: "南校区",
        age: 20,
        city: "广州",
        bioHighlight: "ta的介绍很丰富",
      },
    ];

    const pendingSignal = store.heartSignals.find(
      (s) => s.status === "pending"
    );
    expect(pendingSignal).toBeDefined();

    const beforeSessionCount = store.sessions.length;
    await store.acceptHeartSignal(pendingSignal!.id);

    const updatedSignal = store.heartSignals.find(
      (s) => s.id === pendingSignal!.id
    );
    expect(updatedSignal?.status).toBe("accepted");

    // a new session should be created
    expect(store.sessions.length).toBeGreaterThan(beforeSessionCount);
  });

  // ------------------------------------------------------------------
  // acceptHeartSignal – already processed
  // ------------------------------------------------------------------
  it("acceptHeartSignal throws when signal is not pending", async () => {
    const store = useMessagesStore();

    // set a fresh pending signal
    store.heartSignals = [
      {
        id: "signal-reject-test",
        fromUserId: "user-2003",
        fromUserName: "苏晴",
        fromUserAvatar: "",
        status: "pending",
        sentAt: "2026-05-20T16:45:00Z",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ];

    const pendingSignal = store.heartSignals.find(
      (s) => s.status === "pending"
    );
    expect(pendingSignal).toBeDefined();

    // accept once
    await store.acceptHeartSignal(pendingSignal!.id);

    // try again
    await expect(
      store.acceptHeartSignal(pendingSignal!.id)
    ).rejects.toThrow("心动信号已处理");
  });

  // ------------------------------------------------------------------
  // acceptHeartSignal – expired
  // ------------------------------------------------------------------
  it("acceptHeartSignal throws when signal is expired", async () => {
    const store = useMessagesStore();

    // manually set an expired signal
    store.heartSignals = [
      {
        id: "signal-expired",
        fromUserId: "user-x",
        fromUserName: "过期用户",
        fromUserAvatar: "",
        status: "pending",
        sentAt: "2026-05-01T00:00:00Z",
        expiresAt: "2026-05-02T00:00:00Z", // already past
      },
    ];

    await expect(
      store.acceptHeartSignal("signal-expired")
    ).rejects.toThrow("心动信号已过期");

    const signal = store.heartSignals.find((s) => s.id === "signal-expired");
    expect(signal?.status).toBe("expired");
  });

  // ------------------------------------------------------------------
  // acceptHeartSignal – invalid signalId
  // ------------------------------------------------------------------
  it("acceptHeartSignal throws when signalId is empty", async () => {
    const store = useMessagesStore();
    await expect(store.acceptHeartSignal("")).rejects.toThrow(
      "心动信号 ID 无效"
    );
  });

  // ------------------------------------------------------------------
  // acceptHeartSignal – not found
  // ------------------------------------------------------------------
  it("acceptHeartSignal throws when signal does not exist", async () => {
    const store = useMessagesStore();
    await store.fetchHeartSignals();
    await expect(
      store.acceptHeartSignal("nonexistent-signal")
    ).rejects.toThrow("心动信号不存在");
  });

  // ------------------------------------------------------------------
  // fetchHeartSignals
  // ------------------------------------------------------------------
  it("fetchHeartSignals loads signals from mock data", async () => {
    const store = useMessagesStore();
    await store.fetchHeartSignals();

    expect(store.heartSignals.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
  });

  // ------------------------------------------------------------------
  // fetchNotifications
  // ------------------------------------------------------------------
  it("fetchNotifications loads notifications sorted by recency", async () => {
    const store = useMessagesStore();
    await store.fetchNotifications();

    expect(store.notifications.length).toBeGreaterThan(0);
    // verify descending order by createdAt
    // 修复（严格模式 noUncheckedIndexedAccess）：notifications[i - 1] / notifications[i] 索引访问返回 T | undefined，
    // 循环边界 i < length 已确保不越界，此处使用非空断言 ! 简化类型。
    for (let i = 1; i < store.notifications.length; i++) {
      expect(
        Date.parse(store.notifications[i - 1]!.createdAt)
      ).toBeGreaterThanOrEqual(Date.parse(store.notifications[i]!.createdAt));
    }
  });

  // ------------------------------------------------------------------
  // totalUnreadCount getter
  // ------------------------------------------------------------------
  it("totalUnreadCount sums all session unread counts", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();

    const expectedSum = store.sessions.reduce(
      (sum, s) => sum + s.unreadCount,
      0
    );
    expect(store.totalUnreadCount).toBe(expectedSum);
  });

  it("totalUnreadCount is zero when no sessions are loaded", () => {
    const store = useMessagesStore();
    expect(store.totalUnreadCount).toBe(0);
  });

  // ------------------------------------------------------------------
  // sendMessage kind="emoji"（2026-08-09 表情包机制：私信链路发送表情消息）
  // ------------------------------------------------------------------
  it("sendMessage with kind=emoji appends emoji message and updates preview", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();

    const session = store.sessions[0]!;
    const beforeCount = store.currentMessages.length;

    await store.sendMessage(session.id, "🎉", undefined, "emoji");

    expect(store.currentMessages.length).toBe(beforeCount + 1);
    const lastMsg = store.currentMessages[store.currentMessages.length - 1]!;
    expect(lastMsg.kind).toBe("emoji");
    expect(lastMsg.body).toBe("🎉");
    expect(lastMsg.sender).toBe("self");

    // 列表预览应直接显示 emoji 字符（而非 "[emoji]" 占位）
    const updatedSession = store.sessions.find((s) => s.id === session.id);
    expect(updatedSession?.lastMessagePreview).toBe("🎉");
  });

  // ------------------------------------------------------------------
  // onNewMessage 未读规则（2026-08-09 未读红点修复）
  // 仅统计「对方发送的、非当前查看会话的」消息；self 消息、活跃会话消息不计入
  // ------------------------------------------------------------------
  it("非活跃会话收到 peer 消息 → unreadCount +1", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();
    const session = store.sessions.find((s) => s.unreadCount > 0)!;
    const before = session.unreadCount;
    store.onNewMessage({
      id: "ws-1",
      sessionId: session.id,
      sender: "peer",
      kind: "text",
      body: "你好",
      sentAt: "2026-08-09T10:00:00",
    });
    expect(session.unreadCount).toBe(before + 1);
    // 非活跃会话的消息不进入当前消息流
    expect(store.currentMessages.find((m) => m.id === "ws-1")).toBeUndefined();
  });

  it("self 消息（我方发送）不累加未读", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();
    const session = store.sessions[0]!;
    const before = session.unreadCount;
    store.onNewMessage({
      id: "ws-2",
      sessionId: session.id,
      sender: "self",
      kind: "text",
      body: "我自己发的",
      sentAt: "2026-08-09T10:00:00",
    });
    expect(session.unreadCount).toBe(before);
  });

  it("活跃会话（正在查看）收到 peer 消息 → 不累加未读，进入当前消息流", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();
    const session = store.sessions[0]!;
    const before = session.unreadCount;
    store.setActiveSession(session.id);
    store.onNewMessage({
      id: "ws-3",
      sessionId: session.id,
      sender: "peer",
      kind: "text",
      body: "正在聊天收到",
      sentAt: "2026-08-09T10:00:00",
    });
    expect(session.unreadCount).toBe(before);
    expect(store.currentMessages.find((m) => m.id === "ws-3")?.body).toBe("正在聊天收到");
    store.setActiveSession(null);
  });

  it("同一消息 ID 重复推送去重（重连场景）", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();
    const session = store.sessions[0]!;
    store.setActiveSession(session.id);
    const message = {
      id: "ws-dup",
      sessionId: session.id,
      sender: "peer",
      kind: "text",
      body: "重复消息",
      sentAt: "2026-08-09T10:00:00",
    };
    store.onNewMessage(message);
    store.onNewMessage(message);
    expect(store.currentMessages.filter((m) => m.id === "ws-dup")).toHaveLength(1);
    store.setActiveSession(null);
  });

  // ------------------------------------------------------------------
  // unreadNotificationCount getter
  // ------------------------------------------------------------------
  it("unreadNotificationCount counts unread notifications only", async () => {
    const store = useMessagesStore();
    await store.fetchNotifications();

    const unreadCount = store.notifications.filter((n) => !n.isRead).length;
    expect(store.unreadNotificationCount).toBe(unreadCount);
  });

  // ------------------------------------------------------------------
  // markNotificationRead / markAllNotificationsRead
  // ------------------------------------------------------------------
  it("markNotificationRead toggles a single notification to read", async () => {
    const store = useMessagesStore();
    await store.fetchNotifications();

    const unread = store.notifications.find((n) => !n.isRead);
    expect(unread).toBeDefined();

    store.markNotificationRead(unread!.id);
    const updated = store.notifications.find((n) => n.id === unread!.id);
    expect(updated?.isRead).toBe(true);
  });

  it("markAllNotificationsRead sets all notifications to read", async () => {
    const store = useMessagesStore();
    await store.fetchNotifications();

    store.markAllNotificationsRead();
    expect(store.notifications.every((n) => n.isRead)).toBe(true);
  });
});