import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

/**
 * messages store 未读红点修复单元测试（2026-08-09，BUG 3）
 *
 * real 模式下验证 markConversationRead 显式已读回执：
 * - temp 会话（非数字 ID）早退防误请求 404
 * - force 已读发送 PUT /messages/conversations/{id}/read
 * - 2s 节流：停留期间连收 N 条只发一次；force 跳过节流
 * - 请求失败静默返回 false（不抛错、不阻塞消息流）
 * - markSessionRead 后端回执成功后才本地清零
 */

// ---- real 模式（isMockMode=false），HTTP 层全部 mock ----
// 注意：useMock() 的真相源是 config/env.ts 的 isMockMode（R4-00205 迁移），
// 不是 services/env.ts——mock 错模块会导致 useMock() 仍返回 true（apiMode: mock）
vi.mock("../../config/env", () => ({
  isMockMode: () => false,
}));

const requestMock = vi.fn();

vi.mock("../../services/http", () => ({
  request: (...args: unknown[]) => requestMock(...args),
  // messages.ts 本地 withTimeout 委托 http.ts 的实现，测试中直接透传 promise
  withTimeout: <T>(promise: Promise<T>) => promise,
  EnhancedApiError: class EnhancedApiError extends Error {},
}));

vi.mock("../../constants/growth", () => ({
  ASYNC_TIMEOUT_MS: 10000,
}));

vi.mock("@/i18n", () => ({
  t: (key: string) => key,
}));

vi.mock("../../stores/session", () => ({
  useSessionStore: () => ({
    userSession: { userId: "1001" },
  }),
}));

vi.mock("../../services/voice-upload", () => ({
  uploadVoiceFile: vi.fn(),
}));

import { useMessagesStore } from "../../stores/messages";

describe("markConversationRead - 私信显式已读回执（BUG 3 修复）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("temp 会话（非数字 ID）早退，不发请求", async () => {
    const store = useMessagesStore();
    const ok = await store.markConversationRead("session-a-b-hex");
    expect(ok).toBe(true);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("force 已读发送 PUT 请求并返回 true", async () => {
    requestMock.mockResolvedValue(undefined);
    const store = useMessagesStore();
    const ok = await store.markConversationRead("123", true);
    expect(ok).toBe(true);
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/messages/conversations/123/read",
        method: "PUT",
      })
    );
  });

  it("2s 节流：连续调用只发一次请求；force 跳过节流", async () => {
    requestMock.mockResolvedValue(undefined);
    const store = useMessagesStore();
    // 使用独立 sessionId（节流 Map 为模块级、跨用例共享，避免与前一用例的 "123" 冲突）
    await store.markConversationRead("456"); // 第一次：发送
    await store.markConversationRead("456"); // 节流命中：不发送
    await store.markConversationRead("456"); // 节流命中：不发送
    expect(requestMock).toHaveBeenCalledTimes(1);
    await store.markConversationRead("456", true); // force：跳过 2s 节流
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("不同会话节流相互独立", async () => {
    requestMock.mockResolvedValue(undefined);
    const store = useMessagesStore();
    await store.markConversationRead("111");
    await store.markConversationRead("222");
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("请求失败：静默返回 false，不抛错", async () => {
    requestMock.mockRejectedValue(new Error("network"));
    const store = useMessagesStore();
    const ok = await store.markConversationRead("123", true);
    expect(ok).toBe(false);
  });
});

describe("markSessionRead - 后端同步后才本地清零（BUG 4 修复）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("后端回执成功 → 本地清零并返回 true", async () => {
    requestMock.mockResolvedValue(undefined);
    const store = useMessagesStore();
    store.sessions = [
      {
        id: "123",
        partnerId: "999",
        partnerName: "测试",
        partnerAvatar: "",
        partnerHeadline: "",
        lastMessagePreview: "hi",
        lastMessageSentAt: "2026-08-09T10:00:00",
        unreadCount: 5,
        pinned: false,
        phase: "active",
        sessionType: "private",
      },
    ];
    const ok = await store.markSessionRead("123");
    expect(ok).toBe(true);
    expect(store.sessions[0]!.unreadCount).toBe(0);
  });

  it("后端回执失败 → 本地保留未读并返回 false", async () => {
    requestMock.mockRejectedValue(new Error("network"));
    const store = useMessagesStore();
    store.sessions = [
      {
        id: "123",
        partnerId: "999",
        partnerName: "测试",
        partnerAvatar: "",
        partnerHeadline: "",
        lastMessagePreview: "hi",
        lastMessageSentAt: "2026-08-09T10:00:00",
        unreadCount: 5,
        pinned: false,
        phase: "active",
        sessionType: "private",
      },
    ];
    const ok = await store.markSessionRead("123");
    expect(ok).toBe(false);
    expect(store.sessions[0]!.unreadCount).toBe(5);
  });

  it("会话不存在时返回 false", async () => {
    const store = useMessagesStore();
    const ok = await store.markSessionRead("not-exists");
    expect(ok).toBe(false);
  });
});
