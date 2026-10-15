/**
 * 管理后台 - 数据统计 API（任务 9 / Task 13 真实数据接入）。
 *
 * 对应后端 AdminStatsController（@RequestMapping("/api/v1/admin/stats")）。
 * 前端 API_BASE_URL 默认为 "/api"，因此 path 参数以 "/v1/admin/stats/*" 开头，
 * 拼接后实际请求 URL 为 "/api/v1/admin/stats/*"，与后端映射一致。
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
 * 社区运营总览（后台首页「待办清单」数据源，2026-10-06 新增）。
 *
 * 对应后端 CommunityOverviewView。校区口径：除 disabledOfficialAccountCount
 * （官方账号是平台级全局资源，official_accounts 无校区列）外，其余计数都按当前
 * 管理员管辖校区过滤——校区管理员只见本校区。
 */
export interface CommunityOverview {
  /** 待审核帖子数（posts.audit_status=pending） */
  pendingPostCount: number;
  /** 置顶帖子数（posts.is_pinned=true） */
  pinnedPostCount: number;
  /** 帖子总数（含各状态，与后台帖子列表口径一致） */
  totalPostCount: number;
  /** 帖子按分类分布（key 为 PostCategory 枚举名：all/interest/sincere/...） */
  postsByCategory: Record<string, number>;
  /** 近 7 天发帖趋势（后端已按业务时区补 0，恒为 7 项，日期升序） */
  postsLast7Days: DailyCount[];
  /** 用户按角色分布（key 为 users.role 原值：USER/GUEST/SUPER_ADMIN/...） */
  userCountsByRole: Record<string, number>;
  /** 尚未归属圈子（owner_circle_path 为空）的帖子数 */
  unassignedCirclePostCount: number;
  /** 已停用官方号数（平台级全局计数） */
  disabledOfficialAccountCount: number;
  /** 待审核媒体资产数 */
  pendingMediaCount: number;
  /** 待处理举报数（reports.status=PENDING） */
  openReportCount: number;
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
 * 获取社区运营总览（首页「待办清单」）。
 * GET /api/v1/admin/stats/community-overview
 *
 * 后端为单次聚合请求（内部走 GROUP BY / CASE 聚合 + 5 分钟进程内缓存），
 * 前端不要再拆成多个 count 接口逐个拉取。
 */
export function getCommunityOverview(): Promise<CommunityOverview> {
  return get<CommunityOverview>("/v1/admin/stats/community-overview");
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
