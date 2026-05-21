import { describe, expect, it } from "vitest";
import { toHomePageView } from "../view-models/home";

const dashboard = {
  scheduleSummary: {
    id: "schedule-summary",
    title: "今天有 2 节固定课程",
    subtitle: "你大部分的空闲时间会从 18:30 之后开始。",
    meta: "偏好区域：图书馆附近",
    actionLabel: "更新课表",
  },
  freeSlots: [
    {
      id: "free-1",
      title: "今晚 19:00-20:30",
      subtitle: "适合轻松聊天",
      meta: "北草坪",
      actionLabel: "用于推荐",
    },
  ],
  aiPlan: {
    id: "ai-plan",
    title: "今日安排",
    subtitle: "基于课表空闲时段",
    meta: "规则引擎驱动",
    actionLabel: null,
  },
  recommendedPeople: [],
  recommendations: [
    {
      userId: "ru-1",
      displayName: "同学A",
      avatarInitials: "A",
      headline: "大三，喜欢咖啡散步",
      score: 85,
      matchedTopics: ["同校", "同城"],
      school: "南校区",
      city: "广州",
    },
    {
      userId: "ru-2",
      displayName: "同学B",
      avatarInitials: "B",
      headline: "大二，热爱电影",
      score: 78,
      matchedTopics: ["同城"],
      school: "北校区",
      city: "广州",
    },
  ],
  peopleLead: "把推荐位作为进入聊天的主入口。",
  activityPreview: {
    title: "活动入口",
    subtitle: "近期小活动",
    actionLabel: "查看活动",
    items: [],
    pulseTitle: null,
    pulseMeta: null,
  },
};

describe("toHomePageView", () => {
  it("rebuilds the home surface into schedule cards and recommendation cards", () => {
    const view = toHomePageView(dashboard, {
      profileCompleted: false,
      campusCompleted: false,
      scheduleCompleted: false,
    });

    expect(view.setupTasks.map((task) => task.id)).toEqual([
      "profile",
      "campus",
      "schedule",
    ]);
    // schedule cards include schedule summary + free slots (without aiPlan)
    expect(view.scheduleCards).toHaveLength(2);
    expect(view.recommendationCards).toHaveLength(2);
    expect(view.recommendationCards[0]?.displayName).toBe("同学A");
    expect(view.recommendationCards[0]?.score).toBe(85);
    expect(view.recommendationCards[0]?.matchedTopics).toEqual(["同校", "同城"]);
  });

  it("returns empty recommendation cards when array is empty", () => {
    const emptyDashboard = { ...dashboard, recommendations: [] };
    const view = toHomePageView(emptyDashboard, {
      profileCompleted: true,
      campusCompleted: true,
      scheduleCompleted: true,
    });

    expect(view.setupTasks).toEqual([]);
    expect(view.recommendationCards).toEqual([]);
  });
});