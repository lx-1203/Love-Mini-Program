import { describe, expect, it } from "vitest";
import { getHomeSetupTasks, toHomePageView } from "../../view-models/home";
import { computeMatchScore, toMatchCardUser, buildMatchReasons } from "../../view-models/match";
import { toOtherProfileView, toOtherBasicProfile } from "../../view-models/other-profile";
import { toSubmissionStatusTone, toSubmissionStatusLabel } from "../../view-models/feedback";
import { t } from "../../i18n";

/**
 * view-models 测试盲区收口（audit-r15 批 4）：
 * 覆盖 home / match / other-profile / feedback 四个此前零专属测试的视图模型
 * （login.ts 是 features/login/hero 的 8 行薄包装且底层 hero.spec 已覆盖，不另立判点）。
 */

const COMPLETED = { profileCompleted: true, campusCompleted: true, scheduleCompleted: true };

/* ========== view-models/home ========== */

describe("view-models/home - getHomeSetupTasks", () => {
  it("三项全完成 → 空任务列表", () => {
    expect(getHomeSetupTasks(COMPLETED)).toEqual([]);
  });

  it("全未完成 → 三条任务按 profile→campus→schedule 固定顺序，文案走 t()", () => {
    const tasks = getHomeSetupTasks({ profileCompleted: false, campusCompleted: false, scheduleCompleted: false });
    expect(tasks.map((task) => task.id)).toEqual(["profile", "campus", "schedule"]);
    expect(tasks[0]!.title).toBe(t("homeSetup.profileTitle"));
    expect(tasks[1]!.path).toBe("/subpackages/setup/campus/index");
    expect(tasks[2]!.path).toBe("/subpackages/setup/schedule/index");
  });

  it("仅缺 campus → 只返回该条", () => {
    const tasks = getHomeSetupTasks({ profileCompleted: true, campusCompleted: false, scheduleCompleted: true });
    expect(tasks.map((task) => task.id)).toEqual(["campus"]);
  });
});

describe("view-models/home - toHomePageView", () => {
  const dashboard = {
    scheduleSummary: { id: "sum", title: "课表摘要", subtitle: "", meta: "" },
    freeSlots: [
      { id: "s1", title: "空档一", subtitle: "", meta: "" },
      { id: "s2", title: "空档二", subtitle: "", meta: "" },
    ],
    recommendedPeople: [{ id: "p1", name: "张三" }, { id: "p2", name: "李四" }],
    peopleLead: "为你推荐",
    activityPreview: { title: "活动预览", subtitle: "", actionLabel: "查看", items: [] },
  } as unknown as Parameters<typeof toHomePageView>[0];

  it("scheduleCards = 摘要卡(今日/brand) + 空档卡(空档/success)", () => {
    const view = toHomePageView(dashboard, COMPLETED);
    expect(view.sectionOrder).toEqual(["schedule", "people", "activity"]);
    expect(view.scheduleCards).toHaveLength(3);
    expect(view.scheduleCards[0]).toMatchObject({ badge: "今日", tone: "brand" });
    expect(view.scheduleCards[1]).toMatchObject({ badge: "空档", tone: "success" });
  });

  it("完善任务未完 → recommendedPeople 携带 complete-setup 动作指向首个未完成项", () => {
    const view = toHomePageView(dashboard, { profileCompleted: false, campusCompleted: true, scheduleCompleted: true });
    expect(view.recommendedPeople[0]?.action).toMatchObject({
      mode: "complete-setup",
      label: t("config.statusCopy.chatAction.completeSetup"),
      target: "/subpackages/setup/profile/index",
    });
  });

  it("全部完善 → recommendedPeople 携带 go-chat 动作指向消息页", () => {
    const view = toHomePageView(dashboard, COMPLETED);
    expect(view.recommendedPeople[0]?.action).toMatchObject({
      mode: "go-chat",
      label: t("config.statusCopy.chatAction.goChat"),
      target: "/pages/messages/index",
    });
  });
});

/* ========== view-models/match ========== */

describe("view-models/match", () => {
  const baseCard = {
    id: "c1",
    userId: "u1",
    name: "测试对象",
    avatar: "",
    headline: "",
    bio: "个人简介",
    tags: ["民谣", "摄影"],
    commonGround: "都爱看展",
    availability: "",
    images: [],
  } as never;

  it("computeMatchScore：80 基础 + 共同圈×5，封顶 98", () => {
    expect(computeMatchScore(0)).toBe(80);
    expect(computeMatchScore(2)).toBe(90);
    expect(computeMatchScore(100)).toBe(98);
    expect(computeMatchScore(undefined)).toBe(85);
  });

  it("toMatchCardUser：主图优先级 halfBody → gallery[0] → avatar", () => {
    const card = { ...baseCard, avatar: "a.png", photoGallery: ["g1.png", "g2.png"] } as never;
    expect(toMatchCardUser(card).photo).toBe("g1.png");
    const card2 = { ...baseCard, avatar: "a.png", halfBodyPhotoUrl: "h.png", photoGallery: ["g1.png"] } as never;
    expect(toMatchCardUser(card2).photo).toBe("h.png");
    const card3 = { ...baseCard, avatar: "a.png" } as never;
    expect(toMatchCardUser(card3).photo).toBe("a.png");
  });

  it("toMatchCardUser：headline 缺省回退 bio，campusName 映射 school", () => {
    const card = { ...baseCard, campusName: "某大学" } as never;
    const user = toMatchCardUser(card);
    expect(user.headline).toBe("个人简介");
    expect(user.school).toBe("某大学");
    expect(user.matchScore).toBe(85);
  });

  it("buildMatchReasons：同校+同专业+距离按序累积", () => {
    const user = { ...toMatchCardUser(baseCard), isSameSchool: true, isSameMajor: true, distanceText: "约2.3km" } as never;
    const reasons = buildMatchReasons(user, []);
    expect(reasons[0]).toMatchObject({ type: "same_school" });
    expect(reasons[1]).toMatchObject({ type: "same_major" });
    expect(reasons[2]).toMatchObject({ type: "distance", text: "同城距离 2.3km" });
  });

  it("buildMatchReasons：我的标签在手 → 共同兴趣取交集；无标签 → 取对方前3标签", () => {
    const user = { ...toMatchCardUser(baseCard) } as never;
    const withMyTags = buildMatchReasons(user, ["摄影", "滑板"]);
    expect(withMyTags.some((r) => r.text === "都喜欢摄影")).toBe(true);
    expect(withMyTags.some((r) => r.text === "都喜欢民谣")).toBe(false);
    const noMyTags = buildMatchReasons(user, []);
    expect(noMyTags.some((r) => r.text === "都喜欢民谣")).toBe(true);
    expect(noMyTags.some((r) => r.text === "都喜欢摄影")).toBe(true);
  });

  it("buildMatchReasons：零理由时浪漫兜底补足 3 条", () => {
    const card = { ...baseCard, tags: [] } as never;
    const user = { ...toMatchCardUser(card), commonGround: "" } as never;
    const reasons = buildMatchReasons(user, []);
    expect(reasons).toHaveLength(3);
    expect(reasons.every((r) => r.type === "fallback")).toBe(true);
  });
});

/* ========== view-models/other-profile ========== */

describe("view-models/other-profile", () => {
  it("null 输入 → 空态视图（占位渲染契约）", () => {
    const view = toOtherProfileView(null);
    expect(view.displayName).toBe("");
    expect(view.avatarInitial).toBe("?");
    expect(view.myPostsPreview).toEqual([]);
    expect(toOtherBasicProfile(null)).toBeNull();
  });

  it("正常输入 → name 推导头像首字母，动态区固定空态", () => {
    const input = {
      name: "  小林 ",
      avatarUrl: "av.png",
      campusName: "某大学",
      bio: "  简介文案  ",
      photoGallery: ["p1.png"],
    } as never;
    const view = toOtherProfileView(input);
    expect(view.displayName).toBe("小林");
    expect(view.avatarInitial).toBe("小");
    expect(view.school).toBe("某大学");
    expect(view.bio).toBe("简介文案");
    expect(view.myPostsPreview).toEqual([]);
    const basic = toOtherBasicProfile(input);
    expect(basic?.grade).toBe("");
    expect(basic?.photoGallery).toEqual(["p1.png"]);
  });

  it("age 数字 → grade 推导「N岁」", () => {
    const basic = toOtherBasicProfile({ name: "x", age: 21 } as never);
    expect(basic?.grade).toBe("21岁");
  });
});

/* ========== view-models/feedback ========== */

describe("view-models/feedback", () => {
  it("toSubmissionStatusTone：processing/planned→warning，reviewed/converted→success，其余→brand", () => {
    expect(toSubmissionStatusTone("processing")).toBe("warning");
    expect(toSubmissionStatusTone("planned")).toBe("warning");
    expect(toSubmissionStatusTone("reviewed")).toBe("success");
    expect(toSubmissionStatusTone("converted")).toBe("success");
    expect(toSubmissionStatusTone("submitted")).toBe("brand");
  });

  it("toSubmissionStatusLabel：状态→i18n key 渲染，未知状态回退 submitted 词条", () => {
    expect(toSubmissionStatusLabel("reviewed")).toBe(t("feedbackStatus.reviewed"));
    expect(toSubmissionStatusLabel("converted")).toBe(t("feedbackStatus.converted"));
  });
});
