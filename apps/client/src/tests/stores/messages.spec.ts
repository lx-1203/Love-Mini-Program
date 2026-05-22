import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock env: forces mock mode for all store data
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
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
    const firstPinned = store.sessions[0];
    const hasPinned = store.sessions.some((s) => s.pinned);
    if (hasPinned) {
      expect(firstPinned.pinned).toBe(true);
    }
  });

  // ------------------------------------------------------------------
  // sendMessage – success
  // ------------------------------------------------------------------
  it("sendMessage appends message to currentMessages and updates session", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();

    const session = store.sessions[0];
    const beforeCount = store.currentMessages.length;

    await store.sendMessage(session.id, "你好！");

    expect(store.currentMessages.length).toBe(beforeCount + 1);
    const lastMsg = store.currentMessages[store.currentMessages.length - 1];
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
      store.sendMessage(store.sessions[0].id, "")
    ).rejects.toThrow("消息内容不能为空");
  });

  it("sendMessage throws when content is whitespace only", async () => {
    const store = useMessagesStore();
    await store.fetchSessions();

    await expect(
      store.sendMessage(store.sessions[0].id, "   ")
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
      store.sendMessage(store.sessions[0].id, tooLong)
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
    for (let i = 1; i < store.notifications.length; i++) {
      expect(
        Date.parse(store.notifications[i - 1].createdAt)
      ).toBeGreaterThanOrEqual(Date.parse(store.notifications[i].createdAt));
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