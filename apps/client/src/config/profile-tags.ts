/**
 * 资料编辑标签数据源（功能3：资料编辑标签选择）。
 *
 * 设计说明：
 * - 集中管理用户资料标签的可选项，按 4 大分组组织：
 *   1. 兴趣（interest）—— 阅读 / 运动 / 音乐 / 电影 等
 *   2. 性格（personality）—— 内向 / 外向 / 理性 / 感性 等
 *   3. 生活方式（lifestyle）—— 早睡 / 熬夜 / 健身 / 美食 等
 *   4. 感情观（relationship）—— 长期关系 / 顺其自然 等
 * - 每个分组定义 min / max 选择数约束，由 TagSelector 组件校验
 * - 标签 emoji 可选，用于视觉增强
 *
 * mp-weixin 兼容性：
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding
 * - 数据为纯静态配置，无运行时副作用
 */

/**
 * 标签分组标识。
 * 与后端字段名保持一致（如 interestTags / personalityTags）。
 */
export type ProfileTagGroupKey =
  | "interest"
  | "personality"
  | "lifestyle"
  | "relationship";

/**
 * 单个标签定义。
 */
export interface ProfileTagOption {
  /** 标签唯一值（用于存储与比较，建议用英文 key） */
  value: string;
  /** 标签展示文案（静态中文兜底，展示层请优先用 labelKey 经 t() 渲染以支持多语言） */
  label: string;
  /** 标签展示文案的 i18n key（config.profileTags.{groupKey}.{value}，zh/en 同步） */
  labelKey?: string;
  /** 可选图标（SVG 路径，替换原 emoji 字符） */
  icon?: string;
}

/**
 * 标签分组定义。
 */
export interface ProfileTagGroup {
  /** 分组标识 */
  key: ProfileTagGroupKey;
  /** 分组展示文案（i18n key 后缀，由组件拼接为 tagSelector.group{Key}） */
  labelKey: string;
  /** 最少选择数 */
  min: number;
  /** 最多选择数 */
  max: number;
  /** 该分组下的标签列表 */
  options: ProfileTagOption[];
}

/**
 * 标签分组数据源。
 *
 * 当前为本地静态数据，后续可无缝切换为后端 API 返回：
 *   const groups = await request<ProfileTagGroup[]>({ url: "/profile/tag-options" });
 */
// 展示文案 i18n 化（i18n-data-review #8）：32 个标签 label 已抽为 i18n key（config.profileTags.*，zh/en 同步）。
// 注意：value 保持英文 key（用于资料存储/localStorage 序列化与后端比对），禁止改为中文；
// 展示层（TagSelector / AdvancedFilter 等）通过 labelKey 经 t() 映射，勿直接渲染 label。
export const profileTagGroups: ProfileTagGroup[] = [
  {
    key: "interest",
    labelKey: "groupInterest",
    min: 1,
    max: 5,
    options: [
      { value: "reading", label: "阅读", labelKey: "config.profileTags.interest.reading", icon: "/static/assets/icons/common/book.svg" },
      { value: "sports", label: "运动", labelKey: "config.profileTags.interest.sports", icon: "/static/assets/icons/common/trend-up.svg" },
      { value: "music", label: "音乐", labelKey: "config.profileTags.interest.music", icon: "/static/assets/icons/common/music.svg" },
      { value: "movie", label: "电影", labelKey: "config.profileTags.interest.movie", icon: "/static/assets/icons/common/clapperboard.svg" },
      { value: "travel", label: "旅行", labelKey: "config.profileTags.interest.travel", icon: "/static/assets/icons/common/plane.svg" },
      { value: "photography", label: "摄影", labelKey: "config.profileTags.interest.photography", icon: "/static/assets/icons/common/camera.svg" },
      { value: "gaming", label: "游戏", labelKey: "config.profileTags.interest.gaming", icon: "/static/assets/icons/common/gamepad.svg" },
      { value: "cooking", label: "美食", labelKey: "config.profileTags.interest.cooking", icon: "/static/assets/icons/common/cooking-pot.svg" },
      { value: "painting", label: "绘画", labelKey: "config.profileTags.interest.painting", icon: "/static/assets/icons/common/pencil.svg" },
      { value: "dance", label: "舞蹈", labelKey: "config.profileTags.interest.dance", icon: "/static/assets/icons/common/star.svg" },
    ],
  },
  {
    key: "personality",
    labelKey: "groupPersonality",
    min: 1,
    max: 3,
    options: [
      { value: "introvert", label: "内向", labelKey: "config.profileTags.personality.introvert" },
      { value: "extrovert", label: "外向", labelKey: "config.profileTags.personality.extrovert" },
      { value: "rational", label: "理性", labelKey: "config.profileTags.personality.rational" },
      { value: "emotional", label: "感性", labelKey: "config.profileTags.personality.emotional" },
      { value: "optimistic", label: "乐观", labelKey: "config.profileTags.personality.optimistic" },
      { value: "calm", label: "沉稳", labelKey: "config.profileTags.personality.calm" },
      { value: "humorous", label: "幽默", labelKey: "config.profileTags.personality.humorous" },
      { value: "gentle", label: "温柔", labelKey: "config.profileTags.personality.gentle" },
    ],
  },
  {
    key: "lifestyle",
    labelKey: "groupLifestyle",
    min: 1,
    max: 4,
    options: [
      { value: "early_bird", label: "早睡早起", labelKey: "config.profileTags.lifestyle.early_bird" },
      { value: "night_owl", label: "熬夜党", labelKey: "config.profileTags.lifestyle.night_owl" },
      { value: "fitness", label: "健身达人", labelKey: "config.profileTags.lifestyle.fitness" },
      { value: "foodie", label: "美食家", labelKey: "config.profileTags.lifestyle.foodie" },
      { value: "pet_lover", label: "宠物控", labelKey: "config.profileTags.lifestyle.pet_lover" },
      { value: "tea", label: "喝茶", labelKey: "config.profileTags.lifestyle.tea" },
      { value: "coffee", label: "咖啡", labelKey: "config.profileTags.lifestyle.coffee" },
      { value: "night_run", label: "夜跑", labelKey: "config.profileTags.lifestyle.night_run" },
    ],
  },
  {
    key: "relationship",
    labelKey: "groupRelationship",
    min: 1,
    max: 3,
    options: [
      { value: "long_term", label: "长期关系", labelKey: "config.profileTags.relationship.long_term" },
      { value: "natural", label: "顺其自然", labelKey: "config.profileTags.relationship.natural" },
      { value: "marriage", label: "以结婚为目的", labelKey: "config.profileTags.relationship.marriage" },
      { value: "growth", label: "共同成长", labelKey: "config.profileTags.relationship.growth" },
      { value: "independence", label: "保持独立", labelKey: "config.profileTags.relationship.independence" },
      { value: "companionship", label: "互相陪伴", labelKey: "config.profileTags.relationship.companionship" },
    ],
  },
];

/**
 * 解析标签展示文案。
 *
 * infra R2-00135: 优先使用 labelKey 经 translate() 渲染；labelKey 缺失或
 * 翻译结果等于 key 原文（i18n 数据未同步）时，输出告警并回退中文 label，
 * 避免“key 缺失静默展示中文”无法被发现。
 *
 * @param tag 标签选项
 * @param translate i18n 翻译函数（如 i18n.global.t / useI18n().t）
 * @returns 展示文案
 */
export function getProfileTagLabel(
  tag: ProfileTagOption,
  translate: (key: string) => string
): string {
  if (tag.labelKey) {
    const translated = translate(tag.labelKey);
    if (translated && translated !== tag.labelKey) {
      return translated;
    }
    console.warn(
      `[profile-tags] i18n key 缺失或未翻译: ${tag.labelKey}，回退中文 label`
    );
  }
  return tag.label;
}
