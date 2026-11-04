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


  it("filters recommended people by age range (2026-08-08)", () => {
    const people = mockFixtures.getRecommendations({
      heightMin: undefined,
      heightMax: undefined,
      educationLevel: undefined,
      relationshipStatus: undefined,
      hometownProvince: undefined,
      hometownCity: undefined,
      futureCity: undefined,
      keyword: undefined,
      gender: undefined,
      ageMin: 22,
      ageMax: 24,
      schools: undefined,
      distanceMax: undefined,
      interests: undefined,
      onlineOnly: undefined,
    });

    expect(people.length).toBeGreaterThan(0);
    for (const person of people) {
      expect(person.age).toBeGreaterThanOrEqual(22);
      expect(person.age).toBeLessThanOrEqual(24);
    }

    // 全量 person 应至少有一个超出该区间（证明过滤真实生效）
    const all = mockFixtures.getRecommendations({});
    expect(all.some((p) => (p.age ?? 0) < 22 || (p.age ?? 99) > 24)).toBe(true);
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

  it("R8: sendWhisper 填充发送者昵称，收件箱视图携带可渲染的发送者资料", () => {
    const view = mockFixtures.sendWhisper({
      receiverId: 2,
      content: "晚安，想听听你最喜欢的一道菜。",
      clientRequestId: "spec-r8-1",
    });
    expect(view.senderNickname).toBe("我");
    expect(view.senderAvatar).toBeNull();

    const inbox = mockFixtures.getWhisperInbox();
    expect(inbox.find((w) => w.id === view.id)?.senderNickname).toBe("我");
  });

  it("R9-b: 未读数只数当前用户收到的非 READ 行（发出的不计）", () => {
    const before = mockFixtures.getWhisperUnreadCount();
    // 发出的悄悄话（senderId=1）不应影响「我」的未读数
    mockFixtures.sendWhisper({
      receiverId: 2,
      content: "这条是我发出的，不计我的未读",
      clientRequestId: "spec-r9b-1",
    });
    expect(mockFixtures.getWhisperUnreadCount()).toBe(before);
  });
});
