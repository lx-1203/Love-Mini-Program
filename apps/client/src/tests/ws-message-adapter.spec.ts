import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WebSocket 载荷转换层单元测试（2026-08-09 未读红点修复 BUG 1）
 *
 * 验证 fromWsPayload 对三种载荷形态的转换：
 * - 形态 A（私信 MessageView）：{id, conversationId, senderId, content, messageKind, isRead, createdAt}
 * - 形态 B（temp ChatMessageView）：字段名与 MessageItem 一致但无 sessionId（归因兜底）
 * - 形态 C（mock 模拟）：已接近 MessageItem，透传
 */

// Mock stores（adapter 运行时读取当前用户 ID / activeSession 用于归因）
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

import {
  fromWsPayload,
  mapWsKind,
  resolveWsSessionId,
} from "../services/websocket/ws-message-adapter";

describe("ws-message-adapter - 三形态载荷转换", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // 形态 A：私信 MessageView
  // ------------------------------------------------------------------
  it("形态 A：自己发送的消息 → sender=self，字段字符串化", () => {
    const item = fromWsPayload(
      {
        id: 123,
        conversationId: 456,
        senderId: 1001, // 当前用户 1001
        content: "你好呀",
        messageKind: "TEXT",
        isRead: false,
        createdAt: "2026-08-09T10:00:00",
      },
      "/user/queue/messages"
    );
    expect(item).toEqual({
      id: "123",
      sessionId: "456",
      sender: "self",
      kind: "text",
      body: "你好呀",
      sentAt: "2026-08-09T10:00:00",
      durationSeconds: null,
    });
  });

  it("形态 A：对方消息（senderId ≠ 当前用户）→ sender=peer", () => {
    const item = fromWsPayload(
      {
        id: 1,
        conversationId: 2,
        senderId: 999,
        content: "在吗",
        messageKind: "text",
        isRead: false,
        createdAt: "2026-08-09T10:00:00",
      },
      "/user/queue/messages"
    );
    expect(item?.sender).toBe("peer");
    expect(item?.sessionId).toBe("2");
  });

  it("形态 A：kind 映射（voice/emoji/activity 保留，未知回退 text）", () => {
    const base = {
      id: 1,
      conversationId: 2,
      senderId: 999,
      content: "x",
      isRead: false,
      createdAt: "2026-08-09T10:00:00",
    };
    expect(fromWsPayload({ ...base, messageKind: "VOICE" }, "/user/queue/messages")?.kind).toBe("voice");
    expect(fromWsPayload({ ...base, messageKind: "EMOJI" }, "/user/queue/messages")?.kind).toBe("emoji");
    expect(fromWsPayload({ ...base, messageKind: "ACTIVITY" }, "/user/queue/messages")?.kind).toBe("activity");
    expect(fromWsPayload({ ...base, messageKind: "UNKNOWN" }, "/user/queue/messages")?.kind).toBe("text");
  });

  it("形态 A：语音时长透传", () => {
    const item = fromWsPayload(
      {
        id: 1,
        conversationId: 2,
        senderId: 999,
        content: "url",
        messageKind: "VOICE",
        isRead: false,
        createdAt: "2026-08-09T10:00:00",
        durationSeconds: 15,
      },
      "/user/queue/messages"
    );
    expect(item?.durationSeconds).toBe(15);
  });

  // ------------------------------------------------------------------
  // 形态 B：temp ChatMessageView（无 sessionId）
  // ------------------------------------------------------------------
  it("形态 B：peer 消息 → 归因 chatStore.activeSession", () => {
    const item = fromWsPayload(
      {
        id: "m1",
        sender: "peer",
        kind: "text",
        body: "在吗",
        sentAt: "2026-08-09T10:00:00",
      },
      "/user/queue/temp-chat/messages"
    );
    expect(item?.sessionId).toBe("session-a-b-abc123");
    expect(item?.body).toBe("在吗");
  });

  it("形态 B：self 消息不归因 → sessionId 为空（由调用方丢弃）", () => {
    const item = fromWsPayload(
      {
        id: "m1",
        sender: "self",
        kind: "text",
        body: "hi",
        sentAt: "2026-08-09T10:00:00",
      },
      "/user/queue/temp-chat/messages"
    );
    expect(item?.sessionId).toBe("");
  });

  it("形态 B：数字时间戳 → ISO 字符串（与 dto.ts 规则一致）", () => {
    const ts = Date.UTC(2026, 7, 9, 10, 0, 0); // 2026-08-09T10:00:00Z
    const item = fromWsPayload(
      {
        id: "m1",
        sender: "peer",
        kind: "text",
        body: "hi",
        sentAt: ts,
      },
      "/user/queue/temp-chat/messages"
    );
    expect(item?.sentAt).toBe("2026-08-09T10:00:00.000Z");
  });

  // ------------------------------------------------------------------
  // 形态 C：mock 模拟形状（含 sessionId，透传）
  // ------------------------------------------------------------------
  it("形态 C：mock 载荷（含 sessionId）原样透传", () => {
    const item = fromWsPayload(
      {
        id: "msg-123",
        sessionId: "session-private-2",
        sender: "peer",
        kind: "text",
        body: "哈哈",
        sentAt: "2026-08-09T10:00:00",
      },
      "/user/queue/messages"
    );
    expect(item).toEqual({
      id: "msg-123",
      sessionId: "session-private-2",
      sender: "peer",
      kind: "text",
      body: "哈哈",
      sentAt: "2026-08-09T10:00:00",
      durationSeconds: null,
    });
  });

  // ------------------------------------------------------------------
  // 非法载荷
  // ------------------------------------------------------------------
  it("非对象/缺关键字段 → 返回 null", () => {
    expect(fromWsPayload(null, "/user/queue/messages")).toBeNull();
    expect(fromWsPayload("string", "/user/queue/messages")).toBeNull();
    expect(fromWsPayload({ id: 1 }, "/user/queue/messages")).toBeNull();
    expect(fromWsPayload({ id: "1", body: "x" }, "/user/queue/messages")).toBeNull();
  });
});

describe("mapWsKind - kind 映射", () => {
  it("已知类型映射，未知回退 text", () => {
    expect(mapWsKind("voice")).toBe("voice");
    expect(mapWsKind("emoji")).toBe("emoji");
    expect(mapWsKind("activity")).toBe("activity");
    expect(mapWsKind("system")).toBe("text");
    expect(mapWsKind("")).toBe("text");
  });
});

describe("resolveWsSessionId - temp 消息归因兜底", () => {
  it("载荷自带 sessionId 时优先使用", () => {
    expect(resolveWsSessionId({ sessionId: "session-x" }, "/user/queue/temp-chat/messages")).toBe("session-x");
  });

  it("temp 队列 + peer 消息 → activeSession.id", () => {
    expect(
      resolveWsSessionId({ sender: "peer" }, "/user/queue/temp-chat/messages")
    ).toBe("session-a-b-abc123");
  });

  it("非 temp 队列 / 非 peer → 空串", () => {
    expect(resolveWsSessionId({ sender: "peer" }, "/user/queue/messages")).toBe("");
    expect(resolveWsSessionId({ sender: "self" }, "/user/queue/temp-chat/messages")).toBe("");
  });
});
