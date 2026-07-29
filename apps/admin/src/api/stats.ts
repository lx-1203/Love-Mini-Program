/**
 * 管理后台 - 数据统计 API（任务 9 / Task 13 真实数据接入）。
 *
 * 对应后端 AdminStatsController（@RequestMapping("/api/v1/admin/stats")）。
 * 前端 API_BASE_URL 默认为 "/api"，因此 path 参数以 "/v1/admin/stats/*" 开头，
 * 拼接后实际请求 URL 为 "/api/v1/admin/stats/*"，与后端映射一致。
 *
 * Task 13 改造点：
 * - 修正路径前缀：旧代码使用 "/admin/stats/*"（实际命中 /api/admin/stats/*，404），
 *   改为 "/v1/admin/stats/*" 与后端 @RequestMapping 对齐
 * - 新增 getStats() 聚合接口：一次调用拉取三类统计，供 Dashboard 统一消费
 * - 移除所有 Mock 引用（本文件本无 Mock，仅做路径修正与聚合函数补齐）
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
 * 聚合统计视图（Task 13 新增）。
 *
 * 由 getStats() 在前端聚合三个子接口返回，便于 Dashboard 一次性消费。
 * 任意子接口失败时，对应字段为 null，由调用方做降级处理。
 */
export interface StatsOverview {
  userStats: UserStats | null;
  activeStats: ActiveStats | null;
  matchStats: MatchStats | null;
  /** 聚合过程中发生的错误信息（按子接口顺序），无错误时为空数组 */
  errors: string[];
}

/**
 * 获取用户统计。
 * GET /api/v1/admin/stats/users
 */
export function getUserStats(): Promise<UserStats> {
  return get<UserStats>("/v1/admin/stats/users");
}

/**
 * 获取活跃度统计。
 * GET /api/v1/admin/stats/active
 */
export function getActiveStats(): Promise<ActiveStats> {
  return get<ActiveStats>("/v1/admin/stats/active");
}

/**
 * 获取匹配统计。
 * GET /api/v1/admin/stats/matches
 */
export function getMatchStats(): Promise<MatchStats> {
  return get<MatchStats>("/v1/admin/stats/matches");
}

/**
 * 聚合获取仪表盘全量统计（Task 13 新增）。
 *
 * 并行调用三个子接口（users / active / matches），使用 Promise.allSettled
 * 保证单个失败不阻塞其他。返回的 StatsOverview 中，失败的子接口对应字段为 null，
 * errors 数组按 [userStats, activeStats, matchStats] 顺序记录错误 message。
 *
 * 调用方可基于 errors.length 判断是否触发 ErrorState 降级展示。
 */
export async function getStats(): Promise<StatsOverview> {
  const results = await Promise.allSettled([
    getUserStats(),
    getActiveStats(),
    getMatchStats(),
  ]);

  const errors: string[] = [];

  let userStats: UserStats | null = null;
  if (results[0].status === "fulfilled") {
    userStats = results[0].value;
  } else {
    const reason = results[0].reason;
    errors.push(reason instanceof Error ? reason.message : String(reason));
  }

  let activeStats: ActiveStats | null = null;
  if (results[1].status === "fulfilled") {
    activeStats = results[1].value;
  } else {
    const reason = results[1].reason;
    errors.push(reason instanceof Error ? reason.message : String(reason));
  }

  let matchStats: MatchStats | null = null;
  if (results[2].status === "fulfilled") {
    matchStats = results[2].value;
  } else {
    const reason = results[2].reason;
    errors.push(reason instanceof Error ? reason.message : String(reason));
  }

  return { userStats, activeStats, matchStats, errors };
}
