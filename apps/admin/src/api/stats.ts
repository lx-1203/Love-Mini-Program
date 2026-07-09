/**
 * 管理后台 - 数据统计 API（任务 9）。
 * 对应后端 AdminStatsController（/api/admin/stats/*）。
 */
import { get } from "./http";

/** 字段计数项（用于分布统计的列表展示） */
export interface FieldCount {
  field: string;
  count: number;
}

/** 用户统计视图 */
export interface UserStats {
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  activeUsersToday: number;
  /** 性别比（按 pronouns 字段分组） */
  genderDistribution: Record<string, number>;
  /** 学校分布 */
  campusDistribution: FieldCount[];
}

/** 活跃度统计视图 */
export interface ActiveStats {
  dau: number;
  mau: number;
  interactionsToday: number;
  interactions7d: number;
}

/** 每日匹配趋势项 */
export interface DailyCount {
  date: string;
  count: number;
}

/** 匹配统计视图 */
export interface MatchStats {
  totalMatches: number;
  mutualMatches: number;
  /** 成功率（0~1） */
  successRate: number;
  pendingMatches: number;
  acceptedMatches: number;
  /** 近 30 天每日趋势 */
  dailyTrend: DailyCount[];
}

/**
 * 获取用户统计。
 * GET /api/admin/stats/users
 */
export function getUserStats(): Promise<UserStats> {
  return get<UserStats>("/admin/stats/users");
}

/**
 * 获取活跃度统计。
 * GET /api/admin/stats/active
 */
export function getActiveStats(): Promise<ActiveStats> {
  return get<ActiveStats>("/admin/stats/active");
}

/**
 * 获取匹配统计。
 * GET /api/admin/stats/matches
 */
export function getMatchStats(): Promise<MatchStats> {
  return get<MatchStats>("/admin/stats/matches");
}
