/**
 * 频道配置（2026-08-08 频道化重构：参考 QQ 频道手机版顶部横向频道 Tab）
 *
 * 圈子页顶部横向滑动的频道定义：关注 / 今日广场 / 兴趣圈 / 学校圈 / 活动。
 * 每个频道对应独立数据源与 UI 内容，学校圈带认证门槛（requiresCampus）。
 */
import { IMAGE_PATHS } from "./images";
// R4-00232：存储键统一纳入 constants/storage-keys.ts 管理
import { STORAGE_KEYS } from "../constants/storage-keys";

/** 频道 ID */
export type ChannelId = "follow" | "today" | "interest" | "school" | "activity" | "hot";

/** 频道数据源类型 */
export type ChannelDataSource =
  | "post-feed" // 帖子信息流（关注 / 今日广场 / 学校圈 / 活动帖）
  | "interest-hub" // 兴趣圈宫格 + 热门话题 + 精选话题
  | "activity-feed" // 活动卡片列表 + 关联活动帖子流
  | "hot-board"; // 热度榜（2026-08-11：按热度分排序）

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

/** 频道持久化 key（R4-00232：值统一由 STORAGE_KEYS.VILLAGE_LAST_CHANNEL 管理） */
export const LAST_CHANNEL_KEY = STORAGE_KEYS.VILLAGE_LAST_CHANNEL;

/** 频道列表（顺序即展示顺序） */
export const CHANNEL_CONFIGS: ChannelConfig[] = [
  {
    // MP-R1-VILLAGE-INDEX-REQ-001（P1）：需求「三入口（关注/同城/发现）」之「关注」流
    // 此前只有 store 侧能力、无 UI 入口：
    //   · 前端分类常量 stores/village/constants.ts:48 FOLLOWING_CATEGORY_ID = "cat-following"
    //   · 筛选实现 stores/village/utils.ts:290（result.filter(p => p.isFollowed)）
    //   · 参数透传 stores/village/utils.ts:362 toBackendCategory（剥 cat- 前缀）
    //     → stores/village/api.ts:150 params.category = "following"
    //   · 后端 VillageController.java:94/98 + VillageQueryService.java:213/401 已支持 following
    // village/index.vue:137 currentFilters 用 `cat-${postCategory}` 拼 categoryId，
    // 故 postCategory 必须写 "following"（不得带 cat- 前缀）。
    // 文案 key village.channelFollow 待 A13 收口（zh「关注」/ en「Following」）。
    id: "follow",
    labelKey: "village.channelFollow",
    icon: IMAGE_PATHS.ICONS_EMOJI.GROUP,
    dataSource: "post-feed",
    postCategory: "following",
    defaultSort: "latest",
  },
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
  {
    id: "hot",
    labelKey: "village.channelHot",
    icon: IMAGE_PATHS.ICONS_EMOJI.FIRE,
    dataSource: "hot-board",
    postCategory: "all",
    defaultSort: "hot",
  },
];

/** 频道 ID → 配置 查询 */
export function getChannelConfig(id: string): ChannelConfig | undefined {
  return CHANNEL_CONFIGS.find((c) => c.id === id);
}
