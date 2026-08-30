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

import { isDev } from "./env";

/**
 * 热门话题定义。
 */
export interface PopularTopic {
  /** 话题唯一标识 */
  id: string;
  /** 话题名称（不含 # 前缀，由组件渲染时拼接）。中文值用于搜索/去重匹配（p.name === name），不得改动；展示层用 nameKey 经 t() 渲染 */
  name: string;
  /** 话题名的 i18n key（config.popularTopics.{id}.name，zh/en 同步） */
  nameKey?: string;
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
// 展示文案 i18n 化（i18n-data-review #9）：12 个话题名已抽为 i18n key（config.popularTopics.*，zh/en 同步）。
// 注意：name 保留中文——TopicSelector 用 name 做搜索过滤、已选话题去重与用户自定义话题比对，
// 若改为 key 会破坏匹配逻辑；展示层（TopicSelector 模板）经 nameKey 用 t() 映射。
export const popularTopics: PopularTopic[] = [
  { id: "topic-campus-daily", name: "校园日常", nameKey: "config.popularTopics.topicCampusDaily.name", usageCount: 1280, category: "life" },
  { id: "topic-confession", name: "表白墙", nameKey: "config.popularTopics.topicConfession.name", usageCount: 1024, category: "love" },
  { id: "topic-find-buddy", name: "找搭子", nameKey: "config.popularTopics.topicFindBuddy.name", usageCount: 856, category: "social" },
  { id: "topic-interest-share", name: "兴趣分享", nameKey: "config.popularTopics.topicInterestShare.name", usageCount: 712, category: "interest" },
  { id: "topic-help", name: "求助", nameKey: "config.popularTopics.topicHelp.name", usageCount: 634, category: "life" },
  { id: "topic-alumni", name: "校友动态", nameKey: "config.popularTopics.topicAlumni.name", usageCount: 521, category: "social" },
  { id: "topic-life-record", name: "生活记录", nameKey: "config.popularTopics.topicLifeRecord.name", usageCount: 489, category: "life" },
  { id: "topic-tech-talk", name: "技术交流", nameKey: "config.popularTopics.topicTechTalk.name", usageCount: 412, category: "interest" },
  { id: "topic-exam", name: "期末考试", nameKey: "config.popularTopics.topicExam.name", usageCount: 367, category: "study" },
  { id: "topic-graduation", name: "毕业季", nameKey: "config.popularTopics.topicGraduation.name", usageCount: 298, category: "life" },
  { id: "topic-sports", name: "运动健身", nameKey: "config.popularTopics.topicSports.name", usageCount: 256, category: "interest" },
  { id: "topic-food", name: "美食探店", nameKey: "config.popularTopics.topicFood.name", usageCount: 234, category: "life" },
];

/**
 * 解析话题展示名称。
 *
 * infra R2-00136: 优先使用 nameKey 经 translate() 渲染；nameKey 缺失或
 * 翻译结果等于 key 原文（i18n 数据未同步）时，输出告警并回退中文 name，
 * 避免“key 缺失静默展示中文”无法被发现。
 *
 * @param topic 话题定义
 * @param translate i18n 翻译函数（如 i18n.global.t / useI18n().t）
 * @returns 展示名称
 */
export function getTopicDisplayName(
  topic: PopularTopic,
  translate: (key: string) => string
): string {
  if (topic.nameKey) {
    const translated = translate(topic.nameKey);
    if (translated && translated !== topic.nameKey) {
      return translated;
    }
    // 配置缺失回退诊断仅在开发环境输出（R4-00531）
    if (isDev) {
      console.warn(
        `[popular-topics] i18n key 缺失或未翻译: ${topic.nameKey}，回退中文 name`
      );
    }
  }
  return topic.name;
}

/**
 * 话题选择最大数量约束。
 * 与 village/post.vue 的 MAX_PRESET_TAGS 保持一致。
 */
export const MAX_TOPIC_SELECTION = 3;

/**
 * 默认热门话题数量（首次加载展示数量）。
 */
export const DEFAULT_HOT_TOPICS_LIMIT = 8;
