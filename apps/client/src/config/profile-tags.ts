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
  /** 标签展示文案 */
  label: string;
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
export const profileTagGroups: ProfileTagGroup[] = [
  {
    key: "interest",
    labelKey: "groupInterest",
    min: 1,
    max: 5,
    options: [
      { value: "reading", label: "阅读", icon: "/static/assets/icons/common/book.svg" },
      { value: "sports", label: "运动", icon: "/static/assets/icons/common/trend-up.svg" },
      { value: "music", label: "音乐", icon: "/static/assets/icons/common/music.svg" },
      { value: "movie", label: "电影", icon: "/static/assets/icons/common/clapperboard.svg" },
      { value: "travel", label: "旅行", icon: "/static/assets/icons/common/plane.svg" },
      { value: "photography", label: "摄影", icon: "/static/assets/icons/common/camera.svg" },
      { value: "gaming", label: "游戏", icon: "/static/assets/icons/common/gamepad.svg" },
      { value: "cooking", label: "美食", icon: "/static/assets/icons/common/cooking-pot.svg" },
      { value: "painting", label: "绘画", icon: "/static/assets/icons/common/settings-gear.svg" },
      { value: "dance", label: "舞蹈", icon: "/static/assets/icons/common/music.svg" },
    ],
  },
  {
    key: "personality",
    labelKey: "groupPersonality",
    min: 1,
    max: 3,
    options: [
      { value: "introvert", label: "内向" },
      { value: "extrovert", label: "外向" },
      { value: "rational", label: "理性" },
      { value: "emotional", label: "感性" },
      { value: "optimistic", label: "乐观" },
      { value: "calm", label: "沉稳" },
      { value: "humorous", label: "幽默" },
      { value: "gentle", label: "温柔" },
    ],
  },
  {
    key: "lifestyle",
    labelKey: "groupLifestyle",
    min: 1,
    max: 4,
    options: [
      { value: "early_bird", label: "早睡早起" },
      { value: "night_owl", label: "熬夜党" },
      { value: "fitness", label: "健身达人" },
      { value: "foodie", label: "美食家" },
      { value: "pet_lover", label: "宠物控" },
      { value: "tea", label: "喝茶" },
      { value: "coffee", label: "咖啡" },
      { value: "night_run", label: "夜跑" },
    ],
  },
  {
    key: "relationship",
    labelKey: "groupRelationship",
    min: 1,
    max: 3,
    options: [
      { value: "long_term", label: "长期关系" },
      { value: "natural", label: "顺其自然" },
      { value: "marriage", label: "以结婚为目的" },
      { value: "growth", label: "共同成长" },
      { value: "independence", label: "保持独立" },
      { value: "companionship", label: "互相陪伴" },
    ],
  },
];
