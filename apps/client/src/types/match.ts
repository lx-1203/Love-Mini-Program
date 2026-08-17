/**
 * 寻觅 V1 匹配卡 DTO。
 *
 * UI 层只依赖本文件定义的展示模型，不直接消费后端 RecommendedPerson 或
 * stores/discover 的 DiscoverCard，从而隔离后端字段变化与组件扩展。
 */

export interface MatchCardUser {
  /** 卡片内部稳定标识（前端使用） */
  id: string;
  /** 后端用户 ID */
  userId: string;
  name: string;
  age?: number;
  /** 性别 male/female（可选，后端未提供时省略） */
  gender?: 'male' | 'female' | 'unknown';
  avatar: string;
  /** 大图/半身照 */
  photo: string;
  onlineStatus?: "online" | "away" | "offline";
  school?: string;
  occupation?: string;
  tags: string[];
  /** 一句话介绍 */
  headline: string;
  /** 匹配度 0-100 */
  matchScore: number;
  commonGround: string;
  isSameSchool?: boolean;
  isSameMajor?: boolean;
  /** 认证徽章级别（用于基础信息行展示） */
  verificationBadgeLevel?: string;
  /** 距离文案（如 "2.3km"） */
  distanceText?: string;
  /** 活跃状态文案（如 "在线" / "刚刚活跃"） */
  activeStatusText?: string;
  /** 年级标签（如 "大三"） */
  gradeLabel?: string;
}

export type MatchStatus =
  | "idle"
  | "checking"
  | "matched"
  | "failed"
  | "chat_ready";

export type MatchActionType = "like" | "superLike";

export type MatchReasonType =
  | "common_interest"
  | "same_school"
  | "same_major"
  | "fallback";

export interface MatchReason {
  type: MatchReasonType;
  text: string;
}