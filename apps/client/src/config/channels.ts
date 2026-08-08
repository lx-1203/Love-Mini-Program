/**
 * 频道配置（2026-08-08 频道化重构：参考 QQ 频道手机版顶部横向频道 Tab）
 *
 * 圈子页顶部横向滑动的频道定义：今日广场 / 兴趣圈 / 学校圈 / 活动。
 * 每个频道对应独立数据源与 UI 内容，学校圈带认证门槛（requiresCampus）。
 */
import { IMAGE_PATHS } from "./images";

/** 频道 ID */
export type ChannelId = "today" | "interest" | "school" | "activity";

/** 频道数据源类型 */
export type ChannelDataSource =
  | "post-feed" // 帖子信息流（今日广场 / 学校圈 / 活动帖）
  | "interest-hub" // 兴趣圈宫格 + 热门话题 + 精选话题
  | "activity-feed"; // 活动卡片列表 + 关联活动帖子流

/** 频道配置项 */
export interface ChannelConfig {
  id: ChannelId;
  /** i18n key（village.channel{Id}） */
  labelKey: string;
  icon: string;
  dataSource: ChannelDataSource;
  /** 该频道发帖/看帖的 posts.category 值 */
  postCategory: string;
  /** 学校圈：需要校园认证才能进入 */
  requiresCampus?: boolean;
  defaultSort?: "latest" | "hot";
}

/** 频道持久化 key（仿 village_last_category 模式） */
export const LAST_CHANNEL_KEY = "village_last_channel";

/** 频道列表（顺序即展示顺序） */
export const CHANNEL_CONFIGS: ChannelConfig[] = [
  {
    id: "today",
    labelKey: "village.channelToday",
    icon: IMAGE_PATHS.ICONS_EMOJI.SPARKLES,
    dataSource: "post-feed",
    postCategory: "all",
    defaultSort: "latest",
  },
  {
    id: "interest",
    labelKey: "village.channelInterest",
    icon: IMAGE_PATHS.ICONS_EMOJI.HEART,
    dataSource: "interest-hub",
    postCategory: "interest",
    defaultSort: "latest",
  },
  {
    id: "school",
    labelKey: "village.channelSchool",
    icon: IMAGE_PATHS.ICONS_EMOJI.GRAD_CAP,
    dataSource: "post-feed",
    postCategory: "campus",
    requiresCampus: true,
    defaultSort: "latest",
  },
  {
    id: "activity",
    labelKey: "village.channelActivity",
    // 修复：ICONS_COMMON 无 CALENDAR 常量，使用 SVG 变体 CALENDAR_SVG
    icon: IMAGE_PATHS.ICONS_COMMON.CALENDAR_SVG,
    dataSource: "activity-feed",
    postCategory: "activity",
    defaultSort: "latest",
  },
];

/** 频道 ID → 配置 查询 */
export function getChannelConfig(id: string): ChannelConfig | undefined {
  return CHANNEL_CONFIGS.find((c) => c.id === id);
}
