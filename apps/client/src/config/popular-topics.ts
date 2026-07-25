/**
 * 帖子创建话题数据源（功能4：帖子创建话题选择）。
 *
 * 设计说明：
 * - 集中管理热门话题数据，供 TopicSelector 组件展示
 * - 每个话题包含 id / 名称 / 使用次数（用于排序与展示热度）
 * - 支持后续无缝切换为后端 API 返回：
 *   const topics = await request<PopularTopic[]>({ url: "/topics/popular" });
 *
 * mp-weixin 兼容性：
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding
 * - 数据为纯静态配置，无运行时副作用
 */

/**
 * 热门话题定义。
 */
export interface PopularTopic {
  /** 话题唯一标识 */
  id: string;
  /** 话题名称（不含 # 前缀，由组件渲染时拼接） */
  name: string;
  /** 使用次数（用于热度排序与展示） */
  usageCount: number;
  /** 话题分类（可选，用于后续筛选） */
  category?: string;
}

/**
 * 热门话题数据源（按 usageCount 倒序排列）。
 *
 * 数据为本地静态数据，后续可由后端 /topics/popular 接口返回。
 */
export const popularTopics: PopularTopic[] = [
  { id: "topic-campus-daily", name: "校园日常", usageCount: 1280, category: "life" },
  { id: "topic-confession", name: "表白墙", usageCount: 1024, category: "love" },
  { id: "topic-find-buddy", name: "找搭子", usageCount: 856, category: "social" },
  { id: "topic-interest-share", name: "兴趣分享", usageCount: 712, category: "interest" },
  { id: "topic-help", name: "求助", usageCount: 634, category: "life" },
  { id: "topic-alumni", name: "校友动态", usageCount: 521, category: "social" },
  { id: "topic-life-record", name: "生活记录", usageCount: 489, category: "life" },
  { id: "topic-tech-talk", name: "技术交流", usageCount: 412, category: "interest" },
  { id: "topic-exam", name: "期末考试", usageCount: 367, category: "study" },
  { id: "topic-graduation", name: "毕业季", usageCount: 298, category: "life" },
  { id: "topic-sports", name: "运动健身", usageCount: 256, category: "interest" },
  { id: "topic-food", name: "美食探店", usageCount: 234, category: "life" },
];

/**
 * 话题选择最大数量约束。
 * 与 village/post.vue 的 MAX_PRESET_TAGS 保持一致。
 */
export const MAX_TOPIC_SELECTION = 3;

/**
 * 默认热门话题数量（首次加载展示数量）。
 */
export const DEFAULT_HOT_TOPICS_LIMIT = 8;
