export type HomeSectionId =
  | "schedule-summary"
  | "free-slots"
  | "recommendations"
  | "match-entry"
  | "discussion-feed"
  | "activity-feed";

export interface HomeSectionConfig {
  id: HomeSectionId;
  title: string;
  subtitle: string;
  accent: "brand" | "teal" | "amber" | "rose";
}

export const homeSectionConfigs: HomeSectionConfig[] = [
  {
    id: "schedule-summary",
    title: "课表概览",
    subtitle: "今天已经固定下来的安排",
    accent: "brand",
  },
  {
    id: "free-slots",
    title: "空闲时段",
    subtitle: "你现在真正可用的时间",
    accent: "teal",
  },
  {
    id: "recommendations",
    title: "今日推荐人选",
    subtitle: "基于课表和兴趣偏好，规则引擎匹配",
    accent: "amber",
  },
  {
    id: "match-entry",
    title: "匹配",
    subtitle: "作为中间主按钮，直接进入建联入口",
    accent: "rose",
  },
  {
    id: "discussion-feed",
    title: "讨论圈",
    subtitle: "先看大家最近真的在聊什么",
    accent: "brand",
  },
  {
    id: "activity-feed",
    title: "活动",
    subtitle: "从时间清楚、地点明确的小活动开始",
    accent: "amber",
  },
];