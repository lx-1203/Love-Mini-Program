import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChatTransport } from "../features/chat/transport";

type UniRequestOptions = {
  url: string;
  method?: "GET" | "POST" | "PUT";
  data?: {
    recommendedPersonId?: string;
    kind?: string;
    body?: string;
    durationSeconds?: number | null;
  };
  success: (result: { statusCode: number; data: unknown }) => void;
};

describe("chat transport real mode", () => {
  const requestMock = vi.fn();

  beforeEach(() => {
    requestMock.mockReset();
    vi.stubGlobal("uni", {
      request: requestMock,
    });
  });

  it("calls the temp chat endpoints used by the user session flow", async () => {
    const transport = createChatTransport("real");

    requestMock.mockImplementation(({ url, method, data, success }: UniRequestOptions) => {
      const payload = data ?? {};

      if (url.endsWith("/temp-chat/sessions") && method === "POST") {
        success({
          statusCode: 200,
          data: {
            id: "session-real",
            recommendedPersonId: payload.recommendedPersonId,
            partnerName: "林夏",
            partnerHeadline: "喜欢先从轻松问题聊起。",
            availabilityHint: "今晚 19:00 后有空",
            phase: "matching",
            closesAt: "2026-05-21T10:00:00.000Z",
            closedReason: null,
            messages: [],
            contactExchange: {
              proposer: null,
              status: "idle",
            },
          },
        });
        return;
      }

      if (url.endsWith("/temp-chat/sessions/session-real/messages") && method === "POST") {
        success({
          statusCode: 200,
          data: {
            id: "session-real",
            recommendedPersonId: "person-2",
            partnerName: "林夏",
            partnerHeadline: "喜欢先从轻松问题聊起。",
            availabilityHint: "今晚 19:00 后有空",
            phase: "active",
            closesAt: "2026-05-21T10:00:00.000Z",
            closedReason: null,
            messages: [
              {
                id: "m-1",
                sender: "self",
                kind: payload.kind,
                body: payload.body,
                sentAt: "2026-05-20T10:05:00.000Z",
                durationSeconds: payload.durationSeconds ?? null,
              },
            ],
            contactExchange: {
              proposer: null,
              status: "idle",
            },
          },
        });
        return;
      }

      if (url.endsWith("/temp-chat/sessions/session-real/contact-exchange/respond")) {
        success({
          statusCode: 200,
          data: {
            id: "session-real",
            recommendedPersonId: "person-2",
            partnerName: "林夏",
            partnerHeadline: "喜欢先从轻松问题聊起。",
            availabilityHint: "今晚 19:00 后有空",
            phase: "active",
            closesAt: "2026-05-21T10:00:00.000Z",
            closedReason: null,
            messages: [],
            contactExchange: {
              proposer: "self",
              status: "accepted-by-self",
            },
          },
        });
        return;
      }

      if (url.endsWith("/temp-chat/sessions/session-real/end") && method === "POST") {
        success({
          statusCode: 200,
          data: {
            id: "session-real",
            recommendedPersonId: "person-2",
            partnerName: "林夏",
            partnerHeadline: "喜欢先从轻松问题聊起。",
            availabilityHint: "今晚 19:00 后有空",
            phase: "closed",
            closesAt: "2026-05-20T10:15:00.000Z",
            closedReason: "ended",
            messages: [],
            contactExchange: {
              proposer: "self",
              status: "accepted-by-self",
            },
          },
        });
        return;
      }

      if (url.endsWith("/temp-chat/sessions/session-real") && (!method || method === "GET")) {
        success({
          statusCode: 200,
          data: {
            id: "session-real",
            recommendedPersonId: "person-2",
            partnerName: "林夏",
            partnerHeadline: "喜欢先从轻松问题聊起。",
            availabilityHint: "今晚 19:00 后有空",
            phase: "active",
            closesAt: "2026-05-21T10:00:00.000Z",
            closedReason: null,
            messages: [
              {
                id: "m-1",
                sender: "self",
                kind: "text",
                body: "你好，先聊聊你今天最轻松的一段时间。",
                sentAt: "2026-05-20T10:05:00.000Z",
                durationSeconds: null,
              },
            ],
            contactExchange: {
              proposer: null,
              status: "idle",
            },
          },
        });
        return;
      }

      throw new Error(`unexpected request: ${method ?? "GET"} ${url}`);
    });

    const created = await transport.createSession({ recommendedPersonId: "person-2" });
    const messaged = await transport.pushMessage(created.id, {
      sender: "self",
      kind: "text",
      body: "你好，先聊聊你今天最轻松的一段时间。",
      durationSeconds: null,
    });
    const loaded = await transport.loadSession(created.id);
    const exchanged = await transport.respondToContactExchange(created.id, {
      actor: "self",
      decision: "accepted",
    });
    const ended = await transport.endSession(created.id);

    expect(created.phase).toBe("matching");
    expect(messaged.phase).toBe("active");
    expect(loaded.messages[0]?.body).toContain("最轻松");
    expect(exchanged.contactExchange.status).toBe("accepted-by-self");
    expect(ended.phase).toBe("closed");

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: "http://127.0.0.1:8080/api/temp-chat/sessions",
        method: "POST",
        data: { recommendedPersonId: "person-2" },
      })
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: "http://127.0.0.1:8080/api/temp-chat/sessions/session-real/messages",
        method: "POST",
      })
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        url: "http://127.0.0.1:8080/api/temp-chat/sessions/session-real",
        method: "GET",
      })
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        url: "http://127.0.0.1:8080/api/temp-chat/sessions/session-real/contact-exchange/respond",
        method: "POST",
      })
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        url: "http://127.0.0.1:8080/api/temp-chat/sessions/session-real/end",
        method: "POST",
      })
    );
  });
});
