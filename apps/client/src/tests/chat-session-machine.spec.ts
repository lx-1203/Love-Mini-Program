import { describe, expect, it } from "vitest";
import {
  createSessionState,
  proposeContactExchange,
  respondToContactExchange,
  sendSystemTimeout,
  sendUserMessage,
} from "../features/chat/session-machine";

describe("chat session machine", () => {
  it("transitions from matching to active conversation and keeps messages", () => {
    const initial = createSessionState("session-1");
    const active = sendUserMessage(initial, {
      id: "m-1",
      kind: "text",
      sender: "self",
      body: "Hi",
      sentAt: "2026-05-18T12:00:00Z",
    });

    expect(active.phase).toBe("active");
    expect(active.messages).toHaveLength(1);
  });

  it("requires both sides to accept contact exchange", () => {
    const pending = proposeContactExchange(createSessionState("session-2"), "self");
    const partial = respondToContactExchange(pending, "peer", "accepted");

    expect(partial.contactExchange.status).toBe("accepted-by-peer");

    const complete = respondToContactExchange(partial, "self", "accepted");
    expect(complete.contactExchange.status).toBe("completed");
  });

  it("expires the session into closed state on timeout", () => {
    const expired = sendSystemTimeout(createSessionState("session-3"), "2026-05-19T12:00:00Z");
    expect(expired.phase).toBe("closed");
    expect(expired.closedReason).toBe("expired");
  });
});
