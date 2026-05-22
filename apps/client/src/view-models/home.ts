import type { components } from "../services/generated/api-types";

type Schemas = components["schemas"];

export interface HomeSetupTaskView {
  id: "profile" | "campus" | "schedule";
  title: string;
  subtitle: string;
  path: string;
}

export interface HomeSectionItemView {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  badge: string;
  tone: "brand" | "success" | "warning";
}

export interface HomeRecommendationActionView {
  label: string;
  mode: "complete-setup" | "go-chat";
  target: string;
}

export type HomeRecommendedPersonView = Schemas["RecommendedPersonSummary"] & {
  action: HomeRecommendationActionView;
};

export interface HomeActivityPreviewView {
  title: string;
  subtitle: string;
  actionLabel: string;
  items: Schemas["ActivityPreviewItem"][];
  pulseTitle: string | null;
  pulseMeta: string | null;
}

export interface HomePageView {
  sectionOrder: Array<"schedule" | "people" | "activity">;
  setupTasks: HomeSetupTaskView[];
  scheduleCards: HomeSectionItemView[];
  recommendedPeople: HomeRecommendedPersonView[];
  peopleLead: string;
  activityPreview: HomeActivityPreviewView;
}

export interface HomeCompletionState {
  profileCompleted: boolean;
  campusCompleted: boolean;
  scheduleCompleted: boolean;
}

function toCardItem(
  item: Schemas["HomeCard"],
  badge: string,
  tone: "brand" | "success" | "warning"
): HomeSectionItemView {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    meta: item.meta,
    badge,
    tone,
  };
}

export function getHomeSetupTasks(completion: HomeCompletionState): HomeSetupTaskView[] {
  const tasks: HomeSetupTaskView[] = [];

  if (!completion.profileCompleted) {
    tasks.push({
      id: "profile",
      title: "补全基础资料",
      subtitle: "开始聊天前，至少需要昵称、简介和年级。",
      path: "/subpackages/setup/profile/index",
    });
  }

  if (!completion.campusCompleted) {
    tasks.push({
      id: "campus",
      title: "填写学校信息",
      subtitle: "学校和院系信息会在你准备进入聊天前作为必要门槛。",
      path: "/subpackages/setup/campus/index",
    });
  }

  if (!completion.scheduleCompleted) {
    tasks.push({
      id: "schedule",
      title: "设置真实空闲时段",
      subtitle: "空闲时间越准确，推荐链路就越可靠。",
      path: "/subpackages/setup/schedule/index",
    });
  }

  return tasks;
}

function getRecommendationAction(completion: HomeCompletionState): HomeRecommendationActionView {
  const tasks = getHomeSetupTasks(completion);

  if (tasks.length > 0) {
    return {
      label: "先完成设置",
      mode: "complete-setup",
      target: tasks[0]!.path,
    };
  }

  return {
    label: "去聊天",
    mode: "go-chat",
    target: "/pages/chat/index",
  };
}

export function toHomePageView(
  dashboard: Schemas["HomeDashboard"],
  completion: HomeCompletionState
): HomePageView {
  const action = getRecommendationAction(completion);

  return {
    sectionOrder: ["schedule", "people", "activity"],
    setupTasks: getHomeSetupTasks(completion),
    scheduleCards: [
      toCardItem(dashboard.scheduleSummary, "今日", "brand"),
      ...dashboard.freeSlots.map((item) => toCardItem(item, "空档", "success")),
      // AI 计划卡片已移除（Phase 7），由规则引擎推荐（discover）替代
    ],
    recommendedPeople: dashboard.recommendedPeople.map((person) => ({
      ...person,
      action,
    })),
    peopleLead: dashboard.peopleLead,
    activityPreview: {
      title: dashboard.activityPreview.title,
      subtitle: dashboard.activityPreview.subtitle,
      actionLabel: dashboard.activityPreview.actionLabel,
      items: dashboard.activityPreview.items,
      pulseTitle: dashboard.activityPreview.pulseTitle ?? null,
      pulseMeta: dashboard.activityPreview.pulseMeta ?? null,
    },
  };
}
