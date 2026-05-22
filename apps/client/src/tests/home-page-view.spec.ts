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
      subtitle: "北草坪和咖啡馆都可以安排。",
      meta: "适合轻松散步或喝杯咖啡",
      actionLabel: "用于推荐",
    },
  ],
  aiPlan: {
    id: "ai-plan",
    title: "人工编辑兜底计划",
    subtitle: "当前 AI 关闭，所以首页展示静态推荐块。",
    meta: "当前开关 chat_ai_enabled = false",
    actionLabel: null,
  },
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
  peopleLead: "把推荐位作为进入聊天的主入口。",
  activityPreview: {
    title: "活动入口",
    subtitle: "先看近期小活动，再决定是否去匹配或提交新的活动提案。",
    actionLabel: "查看活动",
    items: [
      {
        id: "a-1",
        title: "图书馆南门咖啡散步",
        subtitle: "南门咖啡馆",
        meta: "周四 19:00-20:00",
      },
    ],
    pulseTitle: "大家怎么平衡恋爱和考试周？",
    pulseMeta: "412 人收藏",
  },
};

describe("toHomePageView", () => {
  it("rebuilds the home surface into schedule, people, and activity sections", () => {
    const view = toHomePageView(dashboard, {
      profileCompleted: false,
      campusCompleted: false,
      scheduleCompleted: false,
    });

    expect(view.sectionOrder).toEqual(["schedule", "people", "activity"]);
    expect(view.setupTasks.map((task) => task.id)).toEqual([
      "profile",
      "campus",
      "schedule",
    ]);
    expect(view.recommendedPeople).toHaveLength(1);
    expect(view.recommendedPeople[0]?.action.mode).toBe("complete-setup");
    expect(view.peopleLead).toBe("把推荐位作为进入聊天的主入口。");
    expect(view.activityPreview.actionLabel).toBe("查看活动");
  });

  it("switches recommendation actions to chat once setup is complete", () => {
    const view = toHomePageView(dashboard, {
      profileCompleted: true,
      campusCompleted: true,
      scheduleCompleted: true,
    });

    expect(view.setupTasks).toEqual([]);
    expect(view.recommendedPeople.every((person) => person.action.mode === "go-chat")).toBe(true);
    expect(view.recommendedPeople.every((person) => person.action.label === "去聊天")).toBe(
      true
    );
  });
});
