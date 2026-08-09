import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

/**
 * 聊天 Store 消息发送单元测试（Task 1.1）
 *
 * 验证 `stores/chat/actions/messaging.ts` 的核心行为：
 * 1. sendText 在 Mock 模式下追加消息到本地会话并更新投递状态
 * 2. sendText 投递状态持久化到本地存储（sending → sent）
 * 3. sendText 无活跃会话时静默返回（早退保护）
 * 4. sendVoice 在 H5 端（tempFilePath 为空）使用占位 body
 * 5. sendVoice 在 mp-weixin 端（tempFilePath 非空）调用 uni.uploadFile 上传并使用返回 URL
 * 6. _setMessageStatus 更新 state 并持久化到本地存储
 * 7. SendMessageRequest 接口结构契约校验（编译期类型守护）
 *
 * 工程约束：
 * - 不使用 `import.meta.env.DEV`（mp-weixin 不支持）
 * - 不使用 `catch {}` 空绑定（mp-weixin 不兼容），统一 `catch (e) { ... }`
 * - Mock 模式通过 vi.mock("services/env") 控制，避免依赖运行时环境变量
 */

// ------------------------------------------------------------------
// Mock 依赖：services/env（控制 Mock/Real 模式切换）
// ------------------------------------------------------------------
// 通过 vi.mock 替换 env 模块，允许在每个用例中通过 mockReturnValue 控制 useMock() 返回值。
// 默认设为 mock 模式，real 模式用例在用例内单独切换。
const mockIsMockMode = vi.fn(() => true);

vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => mockIsMockMode(),
}));

// ------------------------------------------------------------------
// Stub 全局 uni：setStorageSync / getStorageSync / uploadFile
// ------------------------------------------------------------------
// 使用 Map 模拟 storage，使消息投递状态持久化能正常通过
const storageMap = new Map<string, unknown>();

const uploadFileMock = vi.fn();

vi.stubGlobal("uni", {
  setStorageSync: vi.fn((key: string, value: unknown) => {
    storageMap.set(key, value);
  }),
  getStorageSync: vi.fn((key: string) => storageMap.get(key) ?? ""),
  uploadFile: uploadFileMock,
  request: vi.fn(),
});

// ------------------------------------------------------------------
// 在 mock 设置完成后导入被测模块
// ------------------------------------------------------------------
import { useChatStore } from "../../stores/chat";
import { useMessagesStore } from "../../stores/messages";
import { mockSession1, mockSession2, mockSessionMap } from "../../stores/chat/mock-data";
import type { SendMessageRequest } from "../../stores/chat/types";

/**
 * 辅助：在 mock 模式下加载 mockSession1 为活跃会话。
 *
 * chatStore.loadSession 在 mock 模式下从 mockSessionMap 取数据并设置 activeSession。
 * 测试用例依赖 activeSession 存在才能进入 sendText/sendVoice 主流程。
 */
async function loadMockActiveSession(): Promise<void> {
  const chatStore = useChatStore();
  await chatStore.loadSession(mockSession1.id);
}

describe("chat store - messaging actions (Task 1.1)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    storageMap.clear();
    mockIsMockMode.mockReturnValue(true);
    uploadFileMock.mockReset();
  });

  // ----------------------------------------------------------------
  // 用例 1：sendText（Mock 模式）追加消息并更新投递状态为 sent
  // ----------------------------------------------------------------
  it("sendText in mock mode appends message and marks delivery status as sent", async () => {
    const chatStore = useChatStore();
    await loadMockActiveSession();

    const beforeCount = chatStore.activeSession?.messages.length ?? 0;
    await chatStore.sendText("你好，今晚有空吗？");

    // Mock 模式下消息追加到 mockSessionMap[sessionId].messages
    const sessionId = mockSession1.id;
    const updatedSession = mockSessionMap[sessionId];
    expect(updatedSession).toBeDefined();
    expect(updatedSession!.messages.length).toBe(beforeCount + 1);

    const lastMessage = updatedSession!.messages[updatedSession!.messages.length - 1];
    expect(lastMessage).toBeDefined();
    expect(lastMessage!.sender).toBe("self");
    expect(lastMessage!.kind).toBe("text");
    expect(lastMessage!.body).toBe("你好，今晚有空吗？");
    expect(lastMessage!.deliveryStatus).toBe("sent");

    // 投递状态映射表至少存在一个 sent 状态条目
    const statusValues = Object.values(chatStore.messageDeliveryStatus);
    expect(statusValues).toContain("sent");
  });

  // ----------------------------------------------------------------
  // 用例 1.1：sendText（Mock 模式）发送 kind="emoji" 表情消息（2026-08-09 表情包机制）
  // ----------------------------------------------------------------
  it("sendText with kind=emoji appends emoji message", async () => {
    const chatStore = useChatStore();
    await loadMockActiveSession();

    const beforeCount = chatStore.activeSession?.messages.length ?? 0;
    // 真 4 字节 emoji（U+1F60A）
    await chatStore.sendText("😊", "emoji");

    const sessionId = mockSession1.id;
    const updatedSession = mockSessionMap[sessionId];
    expect(updatedSession!.messages.length).toBe(beforeCount + 1);

    const lastMessage = updatedSession!.messages[updatedSession!.messages.length - 1];
    expect(lastMessage!.sender).toBe("self");
    expect(lastMessage!.kind).toBe("emoji");
    expect(lastMessage!.body).toBe("😊");
    expect(lastMessage!.deliveryStatus).toBe("sent");
  });

  // ----------------------------------------------------------------
  // 用例 2：sendText 投递状态持久化到本地存储（sending → sent）
  // ----------------------------------------------------------------
  it("sendText persists delivery status to local storage", async () => {
    const chatStore = useChatStore();
    await loadMockActiveSession();

    await chatStore.sendText("持久化测试");

    // 验证 messageDeliveryStatus 已写入 uni.setStorageSync
    // storageMap 的 key 为 MESSAGE_STATUS_STORAGE_KEY
    const storageKeys = Array.from(storageMap.keys());
    expect(storageKeys.length).toBeGreaterThan(0);

    // 至少有一个 key 对应的值为包含 sent 状态的 JSON 字符串
    const hasPersistedStatus = storageKeys.some((key) => {
      const raw = storageMap.get(key);
      if (typeof raw !== "string") return false;
      try {
        const parsed = JSON.parse(raw) as Record<string, string>;
        return Object.values(parsed).some((v) => v === "sent");
      } catch {
        return false;
      }
    });
    expect(hasPersistedStatus).toBe(true);
  });

  // ----------------------------------------------------------------
  // 用例 3：sendText 无活跃会话时静默返回（早退保护）
  // ----------------------------------------------------------------
  it("sendText returns early when no active session", async () => {
    const chatStore = useChatStore();
    // 不调用 loadSession，activeSession 为 null
    expect(chatStore.activeSession).toBeNull();

    // sendText 不应抛出错误，也不应修改 messageDeliveryStatus
    await chatStore.sendText("无会话消息");

    // 无活跃会话时 sendText 直接 return，不会进入 _setMessageStatus("sending")
    // 因此 messageDeliveryStatus 不应包含 "sending" 状态
    const statusValues = Object.values(chatStore.messageDeliveryStatus);
    expect(statusValues).not.toContain("sending");
  });

  // ----------------------------------------------------------------
  // 用例 4：sendVoice（tempFilePath 为空）使用占位 body
  // ----------------------------------------------------------------
  it("sendVoice with empty tempFilePath uses placeholder body", async () => {
    const chatStore = useChatStore();
    await loadMockActiveSession();

    const beforeCount = mockSessionMap[mockSession1.id]!.messages.length;

    // H5 端 tempFilePath 为空，应降级为占位 body "语音消息"
    await chatStore.sendVoice(3, undefined);

    const updatedSession = mockSessionMap[mockSession1.id]!;
    expect(updatedSession.messages.length).toBe(beforeCount + 1);

    const lastMessage = updatedSession.messages[updatedSession.messages.length - 1]!;
    expect(lastMessage.kind).toBe("voice");
    expect(lastMessage.body).toBe("语音消息");
    expect(lastMessage.durationSeconds).toBe(3);

    // tempFilePath 为空时不应调用 uni.uploadFile
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 用例 5：sendVoice（tempFilePath 非空）
  // 录音修复（2026-08-09）：Mock 模式即使有 tempFilePath 也不发起真实上传
  // （避免真机 mock 上传），body 使用占位文案；Real 模式才走 uni.uploadFile。
  // ----------------------------------------------------------------
  it("sendVoice with tempFilePath skips upload in mock mode and uses placeholder body", async () => {
    const chatStore = useChatStore();
    await loadMockActiveSession();

    const beforeCount = mockSessionMap[mockSession1.id]!.messages.length;

    await chatStore.sendVoice(5, "wxfile://tmp/voice123.m4a");

    // Mock 模式不应调用 uni.uploadFile
    expect(uploadFileMock).not.toHaveBeenCalled();

    // 消息 body 为占位文案，时长透传
    const updatedSession = mockSessionMap[mockSession1.id]!;
    expect(updatedSession.messages.length).toBe(beforeCount + 1);
    const lastMessage = updatedSession.messages[updatedSession.messages.length - 1]!;
    expect(lastMessage.kind).toBe("voice");
    expect(lastMessage.body).toBe("语音消息");
    expect(lastMessage.durationSeconds).toBe(5);
  });

  // ----------------------------------------------------------------
  // 用例 6：_setMessageStatus 更新 state 并持久化到本地存储
  // ----------------------------------------------------------------
  it("_setMessageStatus updates state and persists to storage", () => {
    const chatStore = useChatStore();

    chatStore._setMessageStatus("send-test-1", "sending");
    expect(chatStore.messageDeliveryStatus["send-test-1"]).toBe("sending");

    chatStore._setMessageStatus("send-test-1", "sent");
    expect(chatStore.messageDeliveryStatus["send-test-1"]).toBe("sent");

    // 验证持久化：storageMap 应包含状态映射
    const storageValues = Array.from(storageMap.values());
    const hasStatusJson = storageValues.some((v) => {
      if (typeof v !== "string") return false;
      try {
        const parsed = JSON.parse(v) as Record<string, string>;
        return parsed["send-test-1"] === "sent";
      } catch {
        return false;
      }
    });
    expect(hasStatusJson).toBe(true);
  });

  // ----------------------------------------------------------------
  // 用例 7：SendMessageRequest 接口结构契约校验
  // ----------------------------------------------------------------
  it("SendMessageRequest enforces correct structure for text messages", () => {
    // 编译期类型守护：以下赋值若字段缺失或类型错误会触发 TS 编译错误
    const textPayload: SendMessageRequest = {
      sender: "self",
      kind: "text",
      body: "类型契约测试",
      durationSeconds: null,
    };

    expect(textPayload.sender).toBe("self");
    expect(textPayload.kind).toBe("text");
    expect(textPayload.body).toBe("类型契约测试");
    expect(textPayload.durationSeconds).toBeNull();
  });

  it("SendMessageRequest enforces correct structure for voice messages", () => {
    const voicePayload: SendMessageRequest = {
      sender: "self",
      kind: "voice",
      body: "https://cdn.example.com/voice/abc.m4a",
      durationSeconds: 8,
    };

    expect(voicePayload.kind).toBe("voice");
    expect(voicePayload.durationSeconds).toBe(8);
  });
});

/**
 * 附加测试套件：验证 Task 1.1.1 单一数据源同步行为
 *
 * chat-session 页面通过 syncChatStoreMessagesToMessagesStore 将 chatStore.activeSession.messages
 * 同步到 messagesStore.currentMessages，确保页面渲染统一从 messagesStore 读取。
 */
describe("chat store - single data source sync (Task 1.1.1)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    storageMap.clear();
    mockIsMockMode.mockReturnValue(true);
  });

  it("messagesStore.setCurrentMessages syncs chatStore messages for rendering", async () => {
    const chatStore = useChatStore();
    const messagesStore = useMessagesStore();

    await loadMockActiveSession();

    // 模拟 chat-session 页面的 syncChatStoreMessagesToMessagesStore 行为
    const chatMessages = chatStore.activeSession?.messages ?? [];
    messagesStore.setCurrentMessages(
      chatMessages.map((m) => ({
        id: String(m.id),
        sessionId: mockSession1.id,
        sender: m.sender,
        kind: m.kind,
        body: m.body,
        sentAt: m.sentAt,
        durationSeconds: m.durationSeconds ?? null,
      }))
    );

    // 验证 messagesStore.currentMessages 与 chatStore.activeSession.messages 数量一致
    expect(messagesStore.currentMessages.length).toBe(chatMessages.length);

    // 验证单一数据源：页面应仅从 messagesStore.currentMessages 读取
    // 而非同时读取 chatStore.activeSession.messages（避免双写/重复渲染）
    if (chatMessages.length > 0) {
      const firstFromMessages = messagesStore.currentMessages[0];
      const firstFromChat = chatMessages[0];
      expect(firstFromMessages).toBeDefined();
      expect(firstFromMessages!.sender).toBe(firstFromChat!.sender);
      expect(firstFromMessages!.body).toBe(firstFromChat!.body);
    }
  });
});

/**
 * 附加测试套件：Task 1.7.1 P1 阶段端到端验证
 *
 * 覆盖聊天核心旅程的端到端场景：
 * 1. 会话切换（mockSession1 ↔ mockSession2）：切换后 activeSession 与 messagesStore.currentMessages 同步刷新
 * 2. 接收对方文本消息：通过 messagesStore.onNewMessage 模拟 WebSocket 推送
 * 3. 接收对方语音消息：onNewMessage 推送 voice 类型消息
 * 4. WebSocket 重连去重：同一 messageId 多次推送只保留一条
 * 5. 多会话消息隔离：切换会话不会串消息
 * 6. 接收系统消息：system 类型消息正确入列
 * 7. 结束会话清理：clearCurrentMessages 后 currentMessages 为空
 *
 * 这些场景对应 P1 Task 1.7.1 子任务"聊天端到端测试（发送/接收/语音/会话切换）"。
 */
describe("chat store - end-to-end scenarios (Task 1.7.1)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    storageMap.clear();
    mockIsMockMode.mockReturnValue(true);
    uploadFileMock.mockReset();
  });

  // ----------------------------------------------------------------
  // 用例 8：会话切换 - 从 mockSession1 切换到 mockSession2 后 activeSession 更新
  // ----------------------------------------------------------------
  it("session switching: loadSession swaps activeSession from session1 to session2", async () => {
    const chatStore = useChatStore();

    // 加载会话 1
    await chatStore.loadSession(mockSession1.id);
    expect(chatStore.activeSession).not.toBeNull();
    expect(chatStore.activeSession!.id).toBe(mockSession1.id);
    expect(chatStore.activeSession!.partnerName).toBe("夏言");
    const session1MessageCount = chatStore.activeSession!.messages.length;
    expect(session1MessageCount).toBeGreaterThan(0);

    // 切换到会话 2
    await chatStore.loadSession(mockSession2.id);
    expect(chatStore.activeSession).not.toBeNull();
    expect(chatStore.activeSession!.id).toBe(mockSession2.id);
    expect(chatStore.activeSession!.partnerName).toBe("顾北");

    // 会话 2 的消息内容与会话 1 不同（验证不是同一份数据）
    const session2FirstMessage = chatStore.activeSession!.messages[0];
    expect(session2FirstMessage).toBeDefined();
    const session1FirstMessage = mockSession1.messages[0];
    expect(session2FirstMessage!.id).not.toBe(session1FirstMessage!.id);
    expect(session2FirstMessage!.body).not.toBe(session1FirstMessage!.body);
  });

  // ----------------------------------------------------------------
  // 用例 9：会话切换后 messagesStore.currentMessages 同步刷新
  // ----------------------------------------------------------------
  it("session switching: messagesStore.currentMessages reflects the latest active session", async () => {
    const chatStore = useChatStore();
    const messagesStore = useMessagesStore();

    // 加载会话 1 并同步到 messagesStore
    await chatStore.loadSession(mockSession1.id);
    const session1Messages = chatStore.activeSession!.messages;
    messagesStore.setCurrentMessages(
      session1Messages.map((m) => ({
        id: String(m.id),
        sessionId: mockSession1.id,
        sender: m.sender,
        kind: m.kind,
        body: m.body,
        sentAt: m.sentAt,
        durationSeconds: m.durationSeconds ?? null,
      }))
    );
    expect(messagesStore.currentMessages.length).toBe(session1Messages.length);
    expect(messagesStore.currentMessages[0]!.sessionId).toBe(mockSession1.id);

    // 切换到会话 2 并重新同步
    await chatStore.loadSession(mockSession2.id);
    const session2Messages = chatStore.activeSession!.messages;
    messagesStore.setCurrentMessages(
      session2Messages.map((m) => ({
        id: String(m.id),
        sessionId: mockSession2.id,
        sender: m.sender,
        kind: m.kind,
        body: m.body,
        sentAt: m.sentAt,
        durationSeconds: m.durationSeconds ?? null,
      }))
    );

    // 验证 currentMessages 已完全替换为会话 2 的消息
    expect(messagesStore.currentMessages.length).toBe(session2Messages.length);
    expect(messagesStore.currentMessages[0]!.sessionId).toBe(mockSession2.id);
    // 确认会话 1 的消息不再残留
    const hasSession1Message = messagesStore.currentMessages.some(
      (m) => m.sessionId === mockSession1.id
    );
    expect(hasSession1Message).toBe(false);
  });

  // ----------------------------------------------------------------
  // 用例 10：接收对方文本消息（模拟 WebSocket 推送）
  // ----------------------------------------------------------------
  it("receiving peer text message: onNewMessage appends to currentMessages and updates session preview", async () => {
    const messagesStore = useMessagesStore();

    // 初始化会话与当前消息列表
    await loadMockActiveSession();
    const chatStore = useChatStore();
    const initialMessages = chatStore.activeSession!.messages;
    messagesStore.setCurrentMessages(
      initialMessages.map((m) => ({
        id: String(m.id),
        sessionId: mockSession1.id,
        sender: m.sender,
        kind: m.kind,
        body: m.body,
        sentAt: m.sentAt,
        durationSeconds: m.durationSeconds ?? null,
      }))
    );
    const beforeCount = messagesStore.currentMessages.length;

    // 2026-08-09 红点修复：标记当前正在查看的会话（会话内推送才进入消息流）
    messagesStore.setActiveSession(mockSession1.id);

    // 模拟对方发送一条文本消息（WebSocket 推送）
    const incomingMessage = {
      id: `msg-peer-${Date.now()}`,
      sessionId: mockSession1.id,
      sender: "peer" as const,
      kind: "text" as const,
      body: "我刚到图书馆门口，你呢？",
      sentAt: new Date().toISOString(),
    };
    messagesStore.onNewMessage(incomingMessage);

    // 验证消息已追加到 currentMessages
    expect(messagesStore.currentMessages.length).toBe(beforeCount + 1);
    const lastMessage = messagesStore.currentMessages[messagesStore.currentMessages.length - 1];
    expect(lastMessage).toBeDefined();
    expect(lastMessage!.id).toBe(incomingMessage.id);
    expect(lastMessage!.sender).toBe("peer");
    expect(lastMessage!.kind).toBe("text");
    expect(lastMessage!.body).toBe("我刚到图书馆门口，你呢？");
  });

  // ----------------------------------------------------------------
  // 用例 11：接收对方语音消息（模拟 WebSocket 推送）
  // ----------------------------------------------------------------
  it("receiving peer voice message: onNewMessage appends voice message with duration", async () => {
    const messagesStore = useMessagesStore();

    await loadMockActiveSession();
    const chatStore = useChatStore();
    const initialMessages = chatStore.activeSession!.messages;
    messagesStore.setCurrentMessages(
      initialMessages.map((m) => ({
        id: String(m.id),
        sessionId: mockSession1.id,
        sender: m.sender,
        kind: m.kind,
        body: m.body,
        sentAt: m.sentAt,
        durationSeconds: m.durationSeconds ?? null,
      }))
    );
    const beforeCount = messagesStore.currentMessages.length;

    // 2026-08-09 红点修复：标记当前正在查看的会话（会话内推送才进入消息流）
    messagesStore.setActiveSession(mockSession1.id);

    // 模拟对方发送一条语音消息
    const voiceUrl = "https://cdn.example.com/voice/peer-voice-001.m4a";
    const incomingVoice = {
      id: `msg-voice-peer-${Date.now()}`,
      sessionId: mockSession1.id,
      sender: "peer" as const,
      kind: "voice" as const,
      body: voiceUrl,
      sentAt: new Date().toISOString(),
      durationSeconds: 7,
    };
    messagesStore.onNewMessage(incomingVoice);

    expect(messagesStore.currentMessages.length).toBe(beforeCount + 1);
    const lastMessage = messagesStore.currentMessages[messagesStore.currentMessages.length - 1];
    expect(lastMessage).toBeDefined();
    expect(lastMessage!.kind).toBe("voice");
    expect(lastMessage!.body).toBe(voiceUrl);
    expect(lastMessage!.durationSeconds).toBe(7);
    expect(lastMessage!.sender).toBe("peer");
  });

  // ----------------------------------------------------------------
  // 用例 12：WebSocket 重连去重 - 同一 messageId 多次推送只保留一条
  // ----------------------------------------------------------------
  it("message deduplication: onNewMessage with duplicate id does not create duplicate entry", async () => {
    const messagesStore = useMessagesStore();

    await loadMockActiveSession();
    const chatStore = useChatStore();
    messagesStore.setCurrentMessages(
      chatStore.activeSession!.messages.map((m) => ({
        id: String(m.id),
        sessionId: mockSession1.id,
        sender: m.sender,
        kind: m.kind,
        body: m.body,
        sentAt: m.sentAt,
        durationSeconds: m.durationSeconds ?? null,
      }))
    );
    const beforeCount = messagesStore.currentMessages.length;

    // 2026-08-09 红点修复：标记当前正在查看的会话（会话内推送才进入消息流）
    messagesStore.setActiveSession(mockSession1.id);

    const duplicateId = `msg-dedup-${Date.now()}`;
    const message = {
      id: duplicateId,
      sessionId: mockSession1.id,
      sender: "peer" as const,
      kind: "text" as const,
      body: "重复推送测试",
      sentAt: new Date().toISOString(),
    };

    // 第一次推送：应成功追加
    messagesStore.onNewMessage(message);
    expect(messagesStore.currentMessages.length).toBe(beforeCount + 1);

    // 第二次推送（重连后重复推送）：应被去重，不追加
    messagesStore.onNewMessage(message);
    expect(messagesStore.currentMessages.length).toBe(beforeCount + 1);

    // 第三次推送：仍然只保留一条
    messagesStore.onNewMessage(message);
    expect(messagesStore.currentMessages.length).toBe(beforeCount + 1);

    // 验证列表中只有一条该 id 的消息
    const occurrences = messagesStore.currentMessages.filter((m) => m.id === duplicateId);
    expect(occurrences.length).toBe(1);
  });

  // ----------------------------------------------------------------
  // 用例 13：多会话消息隔离 - 切换会话后再切回，原会话消息保持完整
  // ----------------------------------------------------------------
  it("multi-session isolation: switching away and back preserves original session messages", async () => {
    const chatStore = useChatStore();

    // 加载会话 1，记录消息数量
    await chatStore.loadSession(mockSession1.id);
    const session1OriginalCount = chatStore.activeSession!.messages.length;
    expect(session1OriginalCount).toBeGreaterThan(0);

    // 切换到会话 2
    await chatStore.loadSession(mockSession2.id);
    expect(chatStore.activeSession!.id).toBe(mockSession2.id);

    // 切回会话 1
    await chatStore.loadSession(mockSession1.id);
    expect(chatStore.activeSession!.id).toBe(mockSession1.id);
    expect(chatStore.activeSession!.messages.length).toBe(session1OriginalCount);

    // 验证第一条消息内容与会话 1 原始数据一致
    const firstMessage = chatStore.activeSession!.messages[0];
    const originalFirst = mockSession1.messages[0];
    expect(firstMessage).toBeDefined();
    expect(firstMessage!.id).toBe(originalFirst!.id);
    expect(firstMessage!.body).toBe(originalFirst!.body);
  });

  // ----------------------------------------------------------------
  // 用例 14：接收系统消息（kind=system）
  // ----------------------------------------------------------------
  it("receiving system message: onNewMessage appends system kind message correctly", async () => {
    const messagesStore = useMessagesStore();

    await loadMockActiveSession();
    const chatStore = useChatStore();
    messagesStore.setCurrentMessages(
      chatStore.activeSession!.messages.map((m) => ({
        id: String(m.id),
        sessionId: mockSession1.id,
        sender: m.sender,
        kind: m.kind,
        body: m.body,
        sentAt: m.sentAt,
        durationSeconds: m.durationSeconds ?? null,
      }))
    );
    const beforeCount = messagesStore.currentMessages.length;

    // 2026-08-09 红点修复：标记当前正在查看的会话（会话内推送才进入消息流）
    messagesStore.setActiveSession(mockSession1.id);

    const systemMessage = {
      id: `msg-system-${Date.now()}`,
      sessionId: mockSession1.id,
      sender: "system" as const,
      kind: "system" as const,
      body: "对方已开启临时会话联系方式交换",
      sentAt: new Date().toISOString(),
    };
    messagesStore.onNewMessage(systemMessage);

    expect(messagesStore.currentMessages.length).toBe(beforeCount + 1);
    const lastMessage = messagesStore.currentMessages[messagesStore.currentMessages.length - 1];
    expect(lastMessage).toBeDefined();
    expect(lastMessage!.sender).toBe("system");
    expect(lastMessage!.kind).toBe("system");
    expect(lastMessage!.body).toContain("联系方式交换");
  });

  // ----------------------------------------------------------------
  // 用例 15：clearCurrentMessages 清空当前消息列表（会话结束清理）
  // ----------------------------------------------------------------
  it("session end: clearCurrentMessages empties the current message list", async () => {
    const messagesStore = useMessagesStore();

    await loadMockActiveSession();
    const chatStore = useChatStore();
    messagesStore.setCurrentMessages(
      chatStore.activeSession!.messages.map((m) => ({
        id: String(m.id),
        sessionId: mockSession1.id,
        sender: m.sender,
        kind: m.kind,
        body: m.body,
        sentAt: m.sentAt,
        durationSeconds: m.durationSeconds ?? null,
      }))
    );
    expect(messagesStore.currentMessages.length).toBeGreaterThan(0);

    // 会话结束/退出聊天页时清理当前消息
    messagesStore.clearCurrentMessages();
    expect(messagesStore.currentMessages.length).toBe(0);
    expect(messagesStore.currentMessages).toEqual([]);
  });

  // ----------------------------------------------------------------
  // 用例 16：发送+接收完整往返 - sendText 后再 onNewMessage 接收对方回复
  // ----------------------------------------------------------------
  it("full round-trip: sendText then receive peer reply via onNewMessage", async () => {
    const chatStore = useChatStore();
    const messagesStore = useMessagesStore();

    await loadMockActiveSession();

    // 同步初始消息到 messagesStore
    const syncToMessagesStore = () => {
      const msgs = chatStore.activeSession?.messages ?? [];
      messagesStore.setCurrentMessages(
        msgs.map((m) => ({
          id: String(m.id),
          sessionId: mockSession1.id,
          sender: m.sender,
          kind: m.kind,
          body: m.body,
          sentAt: m.sentAt,
          durationSeconds: m.durationSeconds ?? null,
        }))
      );
    };
    syncToMessagesStore();
    const initialCount = messagesStore.currentMessages.length;

    // 用户发送一条文本消息
    await chatStore.sendText("今天天气不错，出去走走吗？");
    // 注意：sendText 在 mock 模式下追加到 mockSessionMap[sessionId].messages
    // 重新同步以反映最新消息列表
    syncToMessagesStore();
    expect(messagesStore.currentMessages.length).toBe(initialCount + 1);

    const myMessage = messagesStore.currentMessages[messagesStore.currentMessages.length - 1];
    expect(myMessage!.sender).toBe("self");
    expect(myMessage!.body).toBe("今天天气不错，出去走走吗？");

    // 2026-08-09 红点修复：标记当前正在查看的会话（会话内推送才进入消息流）
    messagesStore.setActiveSession(mockSession1.id);

    // 对方回复一条消息（WebSocket 推送）
    const peerReply = {
      id: `msg-reply-${Date.now()}`,
      sessionId: mockSession1.id,
      sender: "peer" as const,
      kind: "text" as const,
      body: "好呀，去校园湖边走走？",
      sentAt: new Date().toISOString(),
    };
    messagesStore.onNewMessage(peerReply);

    expect(messagesStore.currentMessages.length).toBe(initialCount + 2);
    const lastMessage = messagesStore.currentMessages[messagesStore.currentMessages.length - 1];
    expect(lastMessage!.sender).toBe("peer");
    expect(lastMessage!.body).toBe("好呀，去校园湖边走走？");
  });
});
