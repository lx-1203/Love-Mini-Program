/**
 * 头像框主题注册表（2026-08-08，参考 QQ 头像框机制设计）。
 *
 * QQ 机制研究结论：
 * - 头像框是「身份外显」体系：会员(红) / 超级会员(金+闪电) / 黄钻(钻石) /
 *   大会员(炫彩+皇冠) 分级佩戴不同头像框，一眼可辨身份与等级；
 * - 同一体系内用颜色/元素递进表达进阶感（会员→SVIP 加闪电，黄钻→豪华黄钻加闪电）；
 * - 来源多样：VIP、校园认证、活动限定、年度限定、商城等；
 * - 不同身份可叠加角标（皇冠、闪电、钻石）增强识别。
 *
 * 本项目实现：**注册表驱动**——新增头像框主题只需在此处追加一条配置
 * （id + 渐变 + 发光 + 角标 + 动画），渲染组件 AvatarFrame 零改动即可支持，
 * 满足「后期都可以添加」的扩展需求。
 */

/** 头像框主题 ID（none 为无框基础态；default 为普通用户默认彩色品牌框） */
export type AvatarFrameId =
  | "none" // 无框（仅未来头像框选择页「不戴框」选项使用）
  | "default" // 普通用户默认：品牌青绿渐变环（卡片/详情/主页第一视觉锚点，无角标无动画）
  | "vip" // VIP：金色渐变环（品牌会员）
  | "svip" // 超级会员：炫彩渐变环 + 皇冠角标
  | "school-verified" // 校园认证：品牌绿认证环 + 认证角标
  | "super-test" // 超级测试账号（活动限定）：紫粉渐变 + 星标
  | "anniversary"; // 周年限定（运营活动预留）：红粉渐变 + 礼花角标

/** 头像框主题配置 */
export interface AvatarFrameTheme {
  /** 主题 ID */
  id: AvatarFrameId;
  /** 主题名称（供未来头像框选择页展示；当前仅注释记录） */
  name: string;
  /** 佩戴优先级：同一用户满足多个身份时取数值最高的主题 */
  priority: number;
  /** 渐变环色列表（2 色或更多，CSS linear-gradient 使用） */
  gradient: string[];
  /** 外发光颜色（可选） */
  glow?: string;
  /** 角标图标（SVG 路径，如 /static/assets/icons/common/crown.svg；可选）
   * 2026-08-08：按需求改为 SVG 图标（不再用 emoji），圆底采用主题渐变 + 白色图标 */
  badgeIcon?: string;
  /** 是否启用旋转动画（VIP 贵族感） */
  animated?: boolean;
}

/** 头像框主题注册表（新增主题 = 在此追加一条配置） */
export const AVATAR_FRAMES: Record<AvatarFrameId, AvatarFrameTheme> = {
  none: {
    id: "none",
    name: "基础白框",
    priority: 0,
    gradient: ["#E5E7EB", "#D1D5DB"],
  },
  /* 2026-08-12 V3：普通用户默认品牌框——浅灰环（none）在朦胧背景上几乎不可见，
   * 新增 default 主题作为卡片/详情/主页「第一视觉锚点」；
   * 仅渐变 + 发光，无角标无动画，与 vip/school 的「身份外显」语义区分 */
  default: {
    id: "default",
    name: "品牌青绿框",
    priority: 5,
    gradient: ["#2DD4BF", "#14B8A6"],
    glow: "rgba(45, 212, 191, 0.35)",
  },
  vip: {
    id: "vip",
    name: "贵族金框",
    priority: 10,
    gradient: ["#FDE68A", "#F59E0B"],
    glow: "rgba(245, 158, 11, 0.45)",
    animated: true,
  },
  svip: {
    id: "svip",
    name: "至尊炫彩框",
    priority: 20,
    gradient: ["#F472B6", "#8B5CF6", "#3B82F6"],
    glow: "rgba(139, 92, 246, 0.5)",
    badgeIcon: "/static/assets/icons/common/crown.svg",
    animated: true,
  },
  "school-verified": {
    id: "school-verified",
    name: "校园认证框",
    priority: 15,
    gradient: ["#3FCF8E", "#2DB97A"],
    glow: "rgba(63, 207, 142, 0.4)",
    badgeIcon: "/static/assets/icons/common/check-circle.svg",
  },
  "super-test": {
    id: "super-test",
    name: "超级体验官框",
    priority: 25,
    gradient: ["#C084FC", "#EC4899"],
    glow: "rgba(192, 132, 252, 0.5)",
    badgeIcon: "/static/assets/icons/common/star.svg",
    animated: true,
  },
  anniversary: {
    id: "anniversary",
    name: "周年限定框",
    priority: 30,
    gradient: ["#FB7185", "#F43F5E", "#F97316"],
    glow: "rgba(244, 63, 94, 0.5)",
    badgeIcon: "/static/assets/icons/common/celebration.svg",
    animated: true,
  },
};

/** 头像框主题列表（按优先级降序，供选择/管理页使用） */
export const AVATAR_FRAME_ORDER: AvatarFrameTheme[] = Object.values(AVATAR_FRAMES).sort(
  (a, b) => b.priority - a.priority
);

/** 按 id 获取主题配置（未知 id 回退 none） */
export function getAvatarFrameTheme(id: AvatarFrameId): AvatarFrameTheme {
  return AVATAR_FRAMES[id] ?? AVATAR_FRAMES.none;
}
