import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WebSocket 客户端单元测试（Phase 3 任务 15）
 *
 * 验证 token 传递方式重构:
 * 1. WebSocket URL 不再包含 ?token= 查询参数
 * 2. 通过 WebSocket 子协议（Sec-WebSocket-Protocol 头）传递 bearer.{token}
 * 3. STOMP CONNECT 帧包含 Authorization: Bearer {token} header
 *
 * 这些测试确保 token 不会泄漏到 URL（避免出现在访问日志、Referer、浏览器历史），
 * 同时保证后端能通过子协议和 STOMP header 两种方式提取 token。
 */

// Mock 依赖模块，避免触发真实的 Pinia store / 网络请求初始化
vi.mock("../services/env", () => ({
  appEnv: {
    apiBaseUrl: "http://127.0.0.1:8080/api",
    apiMode: "real" as const,
  },
}));

vi.mock("../services/http", () => ({
  getToken: () => "fallback-token",
}));

vi.mock("../stores/messages", () => ({
  useMessagesStore: () => ({
    currentMessages: [],
    sessions: [],
    heartSignals: [],
    notifications: [],
  }),
}));

vi.mock("../stores/likes", () => ({
  useLikesStore: () => ({
    heartSignals: [],
  }),
}));

// 导入被测模块（在 mock 之后导入，确保 mock 生效）
import { wsClient } from "../services/websocket";

/** uni.connectSocket 调用时接收到的参数 */
type ConnectSocketArgs = {
  url: string;
  protocols?: string[];
  success?: () => void;
  fail?: (err: unknown) => void;
};

/** 模拟的 SocketTask，记录 send 调用并暴露事件回调 */
type MockSocketTask = {
  sentData: string[];
  onOpenCallback: (() => void) | null;
  onMessageCallback:
    | ((res: { data: string | ArrayBuffer }) => void)
    | null;
  onCloseCallback: ((res: { code: number; reason: string }) => void) | null;
  onErrorCallback: ((err: unknown) => void) | null;
  onOpen: (cb: () => void) => void;
  onMessage: (cb: (res: { data: string | ArrayBuffer }) => void) => void;
  onClose: (cb: (res: { code: number; reason: string }) => void) => void;
  onError: (cb: (err: unknown) => void) => void;
  send: (opts: { data: string; success?: () => void; fail?: () => void }) => void;
  close: (opts?: { code?: number; reason?: string }) => void;
};

describe("websocket client - token 传递方式（Phase 3 任务 15）", () => {
  let capturedArgs: ConnectSocketArgs | null = null;
  let mockTask: MockSocketTask | null = null;

  beforeEach(() => {
    capturedArgs = null;
    mockTask = null;

    const task: MockSocketTask = {
      sentData: [],
      onOpenCallback: null,
      onMessageCallback: null,
      onCloseCallback: null,
      onErrorCallback: null,
      onOpen(cb: () => void) {
        this.onOpenCallback = cb;
      },
      onMessage(cb: (res: { data: string | ArrayBuffer }) => void) {
        this.onMessageCallback = cb;
      },
      onClose(cb: (res: { code: number; reason: string }) => void) {
        this.onCloseCallback = cb;
      },
      onError(cb: (err: unknown) => void) {
        this.onErrorCallback = cb;
      },
      send(opts: { data: string; success?: () => void; fail?: () => void }) {
        this.sentData.push(opts.data);
        if (opts.success) opts.success();
      },
      close() {
        // 模拟关闭
      },
    };
    mockTask = task;

    const connectSocketMock = vi.fn((args: ConnectSocketArgs) => {
      capturedArgs = args;
      if (args.success) {
        args.success();
      }
      return task;
    });

    vi.stubGlobal("uni", {
      connectSocket: connectSocketMock,
    });

    // 每个测试前断开已有连接，确保状态干净
    try {
      wsClient.disconnect();
    } catch (_e) {
      // 忽略未连接时的断开错误
    }
  });

  it("WebSocket URL 不应包含 ?token= 查询参数", () => {
    wsClient.connect("test-jwt-token-abc123");

    expect(capturedArgs).not.toBeNull();
    const url = capturedArgs!.url;
    expect(url).not.toMatch(/[?&]token=/);
    expect(url).not.toContain("?token=");
    expect(url).not.toContain("&token=");
  });

  it("WebSocket URL 应以 /ws/websocket 结尾（无查询参数）", () => {
    wsClient.connect("test-jwt-token-abc123");

    expect(capturedArgs).not.toBeNull();
    expect(capturedArgs!.url).toBe("ws://127.0.0.1:8080/api/ws/websocket");
  });

  it("应通过 WebSocket 子协议（protocols）传递 bearer.{token}", () => {
    const token = "my-jwt-token-xyz789";
    wsClient.connect(token);

    expect(capturedArgs).not.toBeNull();
    expect(capturedArgs!.protocols).toBeDefined();
    expect(Array.isArray(capturedArgs!.protocols)).toBe(true);
    expect(capturedArgs!.protocols).toContain(`bearer.${token}`);
  });

  it("子协议应使用 bearer. 前缀，便于后端识别 token 协议", () => {
    wsClient.connect("token-123");

    expect(capturedArgs!.protocols?.[0]).toMatch(/^bearer\./);
  });

  it("STOMP CONNECT 帧应包含 Authorization: Bearer {token} header", () => {
    const token = "stomp-jwt-token-456";
    wsClient.connect(token);

    // 触发 WebSocket onOpen，使客户端发送 STOMP CONNECT 帧
    expect(mockTask).not.toBeNull();
    mockTask!.onOpenCallback?.();

    // 验证 send 被调用，且发送的数据包含 STOMP CONNECT 帧
    expect(mockTask!.sentData.length).toBeGreaterThan(0);
    const connectFrame = mockTask!.sentData[0];
    expect(connectFrame).toContain("CONNECT");
    expect(connectFrame).toContain(`Authorization:Bearer ${token}`);
  });

  it("STOMP CONNECT 帧应包含 accept-version 和 heart-beat header", () => {
    wsClient.connect("token-with-headers");

    mockTask!.onOpenCallback?.();

    const connectFrame = mockTask!.sentData[0];
    expect(connectFrame).toContain("accept-version:1.2");
    expect(connectFrame).toContain("heart-beat:");
  });

  it("空 token 应拒绝建立连接，不调用 uni.connectSocket", () => {
    wsClient.connect("");

    expect(capturedArgs).toBeNull();
  });

  it("空白 token 应拒绝建立连接", () => {
    wsClient.connect("   ");

    expect(capturedArgs).toBeNull();
  });

  it("重复调用 connect 应跳过第二次连接请求", () => {
    wsClient.connect("first-token");
    const firstUrl = capturedArgs!.url;

    // 第二次调用应被跳过（已处于 connecting 状态）
    wsClient.connect("second-token");

    expect(capturedArgs!.url).toBe(firstUrl);
    expect(capturedArgs!.protocols).toContain("bearer.first-token");
  });
});
