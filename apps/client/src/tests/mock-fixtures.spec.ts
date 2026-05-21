import { reactive } from "vue";
import { describe, expect, it } from "vitest";
import { mockFixtures } from "../services/mocks/fixtures";

describe("mock fixtures", () => {
  it("accepts reactive schedule payloads from the setup form", () => {
    const form = reactive({
      preferredCampusArea: "教学楼和图书馆",
      preferredTimeWindows: ["今晚", "周三下午"],
      courseBlocks: [
        { id: "b-1", weekday: "周一", start: "09:00", end: "10:30", label: "设计课" },
      ],
    });

    expect(() =>
      mockFixtures.saveScheduleProfile({ ...form })
    ).not.toThrow();

    expect(mockFixtures.getScheduleProfile()).toEqual({
      preferredCampusArea: "教学楼和图书馆",
      preferredTimeWindows: ["今晚", "周三下午"],
      courseBlocks: [
        { id: "b-1", weekday: "周一", start: "09:00", end: "10:30", label: "设计课" },
      ],
    });
  });

  it("creates or reuses temporary chat sessions from recommended people", () => {
    const session = mockFixtures.createTempChatSession({
      recommendedPersonId: "person-1",
    });

    const repeated = mockFixtures.createTempChatSession({
      recommendedPersonId: "person-1",
    });

    expect(repeated.id).toBe(session.id);
    expect(mockFixtures.getChatOverview().sessions[0]?.recommendedPersonId).toBe("person-1");
  });

  it("supports pinned ordering and unread clearing in the chat overview", () => {
    const first = mockFixtures.createTempChatSession({
      recommendedPersonId: "person-1",
    });
    const second = mockFixtures.createTempChatSession({
      recommendedPersonId: "person-2",
    });

    mockFixtures.sendTempChatMessage(first.id, {
      sender: "peer",
      kind: "text",
      body: "今晚要不要先绕操场走一圈？",
    });
    mockFixtures.sendTempChatMessage(first.id, {
      sender: "peer",
      kind: "text",
      body: "我 19:30 之后有空。",
    });
    mockFixtures.pinTempChatSession(first.id);

    const pinnedOverview = mockFixtures.getChatOverview();

    expect(pinnedOverview.sessions[0]).toMatchObject({
      id: first.id,
      pinned: true,
      unreadCount: 2,
    });
    expect(pinnedOverview.sessions[1]?.id).toBe(second.id);

    mockFixtures.markTempChatSessionRead(first.id);

    expect(mockFixtures.getChatOverview().sessions[0]?.unreadCount).toBe(0);
  });

  it("can stage queued match results and read them back by id", () => {
    mockFixtures.setNextMatchQueueStatus("queued");

    const match = mockFixtures.createQuickMatch({
      durationMinutes: 30,
    });

    expect(match.queueStatus).toBe("queued");
    expect(match.tempChatSessionId).toBeNull();
    expect(mockFixtures.getMatchResult(match.id)).toMatchObject({
      id: match.id,
      queueStatus: "queued",
    });
  });
});
