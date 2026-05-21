import { describe, expect, it } from "vitest";
import type { components } from "../services/generated/api-types";
import { filterChatSessions, toChatOverviewView } from "../view-models/chat";

type Schemas = components["schemas"];

const overview: Schemas["ChatOverview"] = {
  sessions: [
    {
      id: "session-1",
      recommendedPersonId: "person-1",
      partnerName: "林安",
      partnerHeadline: "工业设计大三，偏好低压力的第一轮聊天。",
      availabilityHint: "合适时间：今晚 19:00 之后",
      phase: "matching",
      closesAt: "2026-05-19T19:00:00Z",
      closedReason: null,
      lastMessagePreview: "刚建立临时会话，等你开场。",
      lastMessageSentAt: null,
      contactExchangeStatus: "idle",
      pinned: false,
      unreadCount: 0,
    },
  ],
  emptyStateLead: "还没有临时会话时，继续从推荐的人进入。",
  recommendedPeople: [
    {
      id: "person-1",
      name: "林安",
      initials: "林",
      headline: "工业设计大三，偏好低压力的第一轮聊天。",
      commonGround: "共同兴趣：电影夜和安静的咖啡馆路线",
      availability: "合适时间：今晚 19:00 之后",
    },
  ],
};

describe("toChatOverviewView", () => {
  it("keeps recommendation actions on setup until profile data is complete", () => {
    const view = toChatOverviewView(overview, {
      profileCompleted: false,
      campusCompleted: false,
      scheduleCompleted: false,
    });

    expect(view.recommendedPeople[0]?.action.mode).toBe("complete-setup");
    expect(view.sessions[0]?.statusLabel).toBe("等待你开场");
  });

  it("switches recommendation actions to chat when setup is complete", () => {
    const view = toChatOverviewView(overview, {
      profileCompleted: true,
      campusCompleted: true,
      scheduleCompleted: true,
    });

    expect(view.recommendedPeople[0]?.action.mode).toBe("go-chat");
  });

  it("filters sessions by name, message preview, and status label", () => {
    const view = toChatOverviewView(
      {
        ...overview,
        sessions: [
          overview.sessions[0]!,
          {
            ...overview.sessions[0]!,
            id: "session-2",
            partnerName: "沈念",
            lastMessagePreview: "今晚图书馆门口见。",
            phase: "active",
            contactExchangeStatus: "accepted-by-self",
            pinned: true,
            unreadCount: 2,
          },
        ],
      },
      {
        profileCompleted: true,
        campusCompleted: true,
        scheduleCompleted: true,
      }
    );

    expect(filterChatSessions(view.sessions, "图书馆")).toHaveLength(1);
    expect(filterChatSessions(view.sessions, "等待你开场")).toHaveLength(1);
    expect(filterChatSessions(view.sessions, "沈念")[0]?.unreadCount).toBe(2);
  });
});
