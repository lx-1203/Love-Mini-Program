import { describe, expect, it } from "vitest";
import { createChatTransport } from "../features/chat/transport";

describe("chat transport", () => {
  it("creates and reuses mock temporary chat sessions", async () => {
    const transport = createChatTransport("mock");

    const created = await transport.createSession({ matchId: "match-transport" });
    const repeated = await transport.createSession({ matchId: "match-transport" });

    expect(created.id).toBe("session-match-transport");
    expect(repeated.id).toBe(created.id);
    expect(repeated.phase).toBe("matching");
  });

  it("persists messages through the mock transport lifecycle", async () => {
    const transport = createChatTransport("mock");
    const session = await transport.createSession({ recommendedPersonId: "person-2" });

    await transport.pushMessage(session.id, {
      sender: "self",
      kind: "text",
      body: "你好，先从今天的安排开始聊吧。",
      durationSeconds: null,
    });

    const loaded = await transport.loadSession(session.id);

    expect(loaded.phase).toBe("active");
    expect(loaded.messages).toHaveLength(1);
    expect(loaded.messages[0]?.body).toBe("你好，先从今天的安排开始聊吧。");
  });
});
