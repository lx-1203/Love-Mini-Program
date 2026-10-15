package com.campuslove.api.admin;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Post.AuditStatus;
import com.campuslove.api.repository.FieldCountProjection;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.InteractionEventRepository;
import com.campuslove.api.repository.MediaAssetRepository;
import com.campuslove.api.repository.OfficialAccountRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.ReportRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserOnlineStatusRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * 管理后台 - 数据统计服务真实实现。
 * 在 real profile 下激活，从数据库查询用户/活跃度/匹配统计数据。
 *
 * <p>实现要点：
 * <ul>
 *     <li>用户统计：从 users 表查总数/新增/性别比，从 user_campus_profile 表查学校分布</li>
 *     <li>活跃度统计：从 user_online_status 表查 DAU/MAU（基于 last_heartbeat），从 interaction_events 表查互动数</li>
 *     <li>匹配统计：从 heart_signals 表查总数/双向匹配数/每日趋势</li>
 *     <li>查询异常时返回零值，避免影响后台首页渲染</li>
 * </ul>
 *
 * <p>R4-00392：缓存策略——三类统计方法使用进程内短 TTL 缓存（5 分钟）。
 * 原实现每次请求实时 count() 全表（后台首页 30s 轮询频繁触发多表全量 COUNT，
 * 数据量大时拖垮主库）；不使用 @Cacheable(ADMIN_STATS) 的原因：Redis 序列化器
 * （NON_FINAL default typing）对顶层 final record 类型不写 @class，缓存命中
 * 反序列化为 LinkedHashMap 抛 ClassCastException（SubTask 5.3.4 实测 500），
 * 进程内缓存规避该问题且满足「后台轮询命中缓存」的目标。</p>
 *
 * <p>R4-00393：校区隔离——校区管理员（ADMIN + campusName 非空）的统计仅覆盖
 * 其管辖校区（用户/活跃度/匹配查询按校区 EXISTS 过滤，学校分布仅保留本校区），
 * 平台级经营数据不再对校区管理员开放。</p>
 *
 * <p>2026-10-06 新增 {@link #getCommunityOverview()}：后台首页「待办清单」的只读聚合
 * （帖子待审核/置顶/总数/分类分布/近 7 日发帖、用户角色分布、未归属圈子的帖子数、
 * 停用官方号数、待审核媒体数、待处理举报数）。计数全部走 GROUP BY / CASE 聚合或
 * 既有分页查询的 count 投影，单请求 8 条 SQL；缓存 key 额外带校区名，避免跨校区命中。
 * 官方账号是平台级全局资源，该字段恒为全平台计数。</p>
 */
@Profile("real")
@Service
public class RealAdminStatsService implements AdminStatsService {

    private static final Logger log = LoggerFactory.getLogger(RealAdminStatsService.class);

    /** 匹配类型：互相喜欢（双向匹配） */
    private static final String MATCH_TYPE_MUTUAL = "mutual_like";

    /** 每日趋势查询天数 */
    private static final int DAILY_TREND_DAYS = 30;

    /** 社区总览：发帖趋势天数（含今日） */
    private static final int POST_TREND_DAYS = 7;

    /** 社区总览：帖子待审核状态（以枚举入参传入 JPQL，避免写枚举字面量） */
    private static final AuditStatus POST_AUDIT_PENDING = AuditStatus.pending;

    /** 社区总览：媒体资产待审核状态（media_assets.audit_status 为字符串列） */
    private static final String MEDIA_AUDIT_PENDING = "pending";

    /** 社区总览：举报待处理状态（reports.status 为字符串列，口径见 AdminReportController） */
    private static final String REPORT_STATUS_PENDING = "PENDING";

    /**
     * 社区总览：只为读取 {@code totalElements} 的最小分页。
     *
     * <p>复用 {@code MediaAssetRepository#searchForAdmin} 与
     * {@code ReportRepository#findByStatusAndTargetType} 两个<b>既有</b>分页查询做计数
     * （Spring Data 为其生成 count 查询，页内容仅取 1 行），
     * 从而不必给这两个 Repository 新增 countBy 方法。</p>
     */
    private static final Pageable COUNT_ONLY_PAGE = PageRequest.of(0, 1);

    private final UserRepository userRepository;
    private final UserCampusProfileRepository campusProfileRepository;
    private final UserOnlineStatusRepository onlineStatusRepository;
    private final InteractionEventRepository interactionEventRepository;
    private final HeartSignalRepository heartSignalRepository;
    /** 社区总览：帖子待办数 / 分类分布 / 近 7 日发帖趋势聚合 */
    private final PostRepository postRepository;
    /** 社区总览：待审核媒体数 */
    private final MediaAssetRepository mediaAssetRepository;
    /** 社区总览：待处理举报数 */
    private final ReportRepository reportRepository;
    /** 社区总览：停用官方号数 */
    private final OfficialAccountRepository officialAccountRepository;
    /** R4-00393：管理端数据隔离（校区管理员统计仅覆盖本校区） */
    private final AdminDataScope adminDataScope;

    /**
     * R4-00392：统计结果进程内短 TTL 缓存（key -> [时间戳, 值]）。
     *
     * <p>后台首页 30s~60s 轮询，原实现每次请求实时 count() 全表（多表全量 COUNT
     * 频繁执行，数据量大时拖垮主库）。恢复 5 分钟缓存口径——注意不使用
     * {@code @Cacheable(ADMIN_STATS)}：Redis 序列化器（NON_FINAL default typing）
     * 对顶层 final record 类型不写 @class，缓存命中反序列化为 LinkedHashMap 抛
     * ClassCastException（SubTask 5.3.4 实测 500），进程内缓存规避该问题。</p>
     */
    private final java.util.concurrent.ConcurrentHashMap<String, Object[]> statsCache =
            new java.util.concurrent.ConcurrentHashMap<>();

    /** R4-00392：统计缓存 TTL（毫秒）：5 分钟 */
    private static final long STATS_CACHE_TTL_MS = 5L * 60 * 1000;

    public RealAdminStatsService(
            UserRepository userRepository,
            UserCampusProfileRepository campusProfileRepository,
            UserOnlineStatusRepository onlineStatusRepository,
            InteractionEventRepository interactionEventRepository,
            HeartSignalRepository heartSignalRepository,
            PostRepository postRepository,
            MediaAssetRepository mediaAssetRepository,
            ReportRepository reportRepository,
            OfficialAccountRepository officialAccountRepository,
            AdminDataScope adminDataScope) {
        this.userRepository = userRepository;
        this.campusProfileRepository = campusProfileRepository;
        this.onlineStatusRepository = onlineStatusRepository;
        this.interactionEventRepository = interactionEventRepository;
        this.heartSignalRepository = heartSignalRepository;
        this.postRepository = postRepository;
        this.mediaAssetRepository = mediaAssetRepository;
        this.reportRepository = reportRepository;
        this.officialAccountRepository = officialAccountRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * R4-00392：按 key 读取/写入进程内缓存（TTL 5 分钟）。
     *
     * @param key    缓存 key（按统计类型区分）
     * @param loader 缓存未命中时的统计计算逻辑
     * @return 统计结果
     */
    private <T> T cached(String key, java.util.function.Supplier<T> loader) {
        long now = System.currentTimeMillis();
        Object[] entry = statsCache.get(key);
        if (entry != null && now - (long) entry[0] < STATS_CACHE_TTL_MS) {
            @SuppressWarnings("unchecked")
            T cachedValue = (T) entry[1];
            return cachedValue;
        }
        T value = loader.get();
        statsCache.put(key, new Object[]{System.currentTimeMillis(), value});
        return value;
    }

    /**
     * R4-00393：当前管理员是否校区管理员（返回其管辖校区，null 表示全局管理员）。
     */
    private String scopedCampusName() {
        try {
            return adminDataScope.getCurrentAdminCampusName();
        } catch (RuntimeException e) {
            log.debug("获取当前管理员校区失败，按全局统计：{}", e.getMessage());
            return null;
        }
    }

    /**
     * SubTask 5.3.4 注：原实现 {@code @Cacheable(ADMIN_STATS)} 5 分钟 TTL。
     * 联调修复：Redis 反序列化(Jackson2JsonRedisSerializer+default typing)对
     * 顶层具体 DTO 不写入 @class,缓存命中后抛 ClassCastException(实测 500)。
     * 统计接口数据量极小(users.count + 少量 count),改为每次实时计算,去除缓存。
     */
    @Override
    public UserStatsView getUserStats() {
        return cached("userStats", () -> computeUserStats(scopedCampusName()));
    }

    /**
     * 计算用户统计（R4-00393：校区管理员仅统计本校区，全局管理员统计全平台）。
     *
     * @param campusName 管辖校区（null 表示全局）
     */
    private UserStatsView computeUserStats(String campusName) {
        try {
            boolean scoped = campusName != null && !campusName.isBlank();
            long total = scoped
                    ? userRepository.countByCampusName(campusName)
                    : userRepository.count();

            LocalDateTime startOfToday = LocalDate.now(TimeZones.BUSINESS).atStartOfDay();
            LocalDateTime startOf7d = startOfToday.minusDays(6);

            long newToday = scoped
                    ? userRepository.countByCreatedAtAfterAndCampusName(startOfToday, campusName)
                    : userRepository.countByCreatedAtAfter(startOfToday);
            long new7d = scoped
                    ? userRepository.countByCreatedAtAfterAndCampusName(startOf7d, campusName)
                    : userRepository.countByCreatedAtAfter(startOf7d);

            // 今日活跃：今天有心跳记录的用户数（校区隔离）
            long activeToday = scoped
                    ? onlineStatusRepository.countByLastHeartbeatAfterAndCampusName(startOfToday, campusName)
                    : onlineStatusRepository.countByLastHeartbeatAfter(startOfToday);

            // 性别比（按 pronouns 字段分组，null 归为 unknown；校区隔离）
            Map<String, Long> genderDist = new LinkedHashMap<>();
            try {
                List<FieldCountProjection> rows = scoped
                        ? userRepository.countGroupByPronounsByCampus(campusName)
                        : userRepository.countGroupByPronouns();
                if (rows != null) {
                    for (FieldCountProjection row : rows) {
                        String field = row.getField();
                        String key = (field == null || field.isBlank()) ? "unknown" : field;
                        genderDist.merge(key, safeCnt(row.getCnt()), Long::sum);
                    }
                }
            } catch (DataAccessException e) {
                log.warn("查询性别比统计失败，降级返回空分布", e);
            }

            // 学校分布（按 campus_name 分组；校区管理员仅可见本校区一行，
            // 避免平台级全校分布对校区管理员暴露）
            List<UserStatsView.FieldCount> campusDist = new ArrayList<>();
            try {
                List<FieldCountProjection> rows = campusProfileRepository.countGroupByCampusName();
                if (rows != null) {
                    for (FieldCountProjection row : rows) {
                        String field = row.getField();
                        String name = (field == null || field.isBlank()) ? "未填写" : field;
                        if (scoped && !campusName.equals(name)) {
                            continue;
                        }
                        campusDist.add(new UserStatsView.FieldCount(name, safeCnt(row.getCnt())));
                    }
                }
            } catch (DataAccessException e) {
                log.warn("查询学校分布统计失败，降级返回空列表", e);
            }

            return new UserStatsView(
                    total,
                    newToday,
                    new7d,
                    activeToday,
                    genderDist,
                    campusDist
            );
        } catch (DataAccessException e) {
            log.error("查询用户统计失败，降级返回零值", e);
            return new UserStatsView(0L, 0L, 0L, 0L, Map.of(), List.of());
        }
    }

    /**
     * SubTask 5.3.4 注：同 {@link #getUserStats()}，去除 @Cacheable(联调修复)。
     */
    @Override
    public ActiveStatsView getActiveStats() {
        return cached("activeStats", () -> computeActiveStats(scopedCampusName()));
    }

    /**
     * 计算活跃度统计（R4-00393：校区管理员仅统计本校区）。
     *
     * @param campusName 管辖校区（null 表示全局）
     */
    private ActiveStatsView computeActiveStats(String campusName) {
        try {
            boolean scoped = campusName != null && !campusName.isBlank();
            LocalDateTime startOfToday = LocalDate.now(TimeZones.BUSINESS).atStartOfDay();
            LocalDateTime startOf30d = startOfToday.minusDays(29);

            long dau = scoped
                    ? onlineStatusRepository.countByLastHeartbeatAfterAndCampusName(startOfToday, campusName)
                    : onlineStatusRepository.countByLastHeartbeatAfter(startOfToday);
            long mau = scoped
                    ? onlineStatusRepository.countByLastHeartbeatAfterAndCampusName(startOf30d, campusName)
                    : onlineStatusRepository.countByLastHeartbeatAfter(startOf30d);

            long interactionsToday = scoped
                    ? interactionEventRepository.countByCreatedAtAfterAndCampusName(startOfToday, campusName)
                    : interactionEventRepository.countByCreatedAtAfter(startOfToday);
            long interactions7d = scoped
                    ? interactionEventRepository.countByCreatedAtAfterAndCampusName(startOfToday.minusDays(6), campusName)
                    : interactionEventRepository.countByCreatedAtAfter(startOfToday.minusDays(6));

            return new ActiveStatsView(dau, mau, interactionsToday, interactions7d);
        } catch (DataAccessException e) {
            log.error("查询活跃度统计失败，降级返回零值", e);
            return new ActiveStatsView(0L, 0L, 0L, 0L);
        }
    }

    /**
     * SubTask 5.3.4 注：同 {@link #getUserStats()}，去除 @Cacheable(联调修复)。
     */
    @Override
    public MatchStatsView getMatchStats() {
        return cached("matchStats", () -> computeMatchStats(scopedCampusName()));
    }

    /**
     * 计算匹配统计（R4-00393：校区管理员仅统计本校区用户参与的匹配，任一方属于
     * 该校区即计入）。
     *
     * @param campusName 管辖校区（null 表示全局）
     */
    private MatchStatsView computeMatchStats(String campusName) {
        try {
            boolean scoped = campusName != null && !campusName.isBlank();
            long total = scoped
                    ? heartSignalRepository.countByCampusName(campusName)
                    : heartSignalRepository.count();
            long mutual = scoped
                    ? heartSignalRepository.countByMatchTypeAndCampusName(MATCH_TYPE_MUTUAL, campusName)
                    : heartSignalRepository.countByMatchType(MATCH_TYPE_MUTUAL);
            long pending = scoped
                    ? heartSignalRepository.countByStatusAndCampusName(SignalStatus.pending, campusName)
                    : heartSignalRepository.countByStatus(SignalStatus.pending);
            long accepted = scoped
                    ? heartSignalRepository.countByStatusAndCampusName(SignalStatus.accepted, campusName)
                    : heartSignalRepository.countByStatus(SignalStatus.accepted);

            double successRate = total > 0 ? (double) mutual / total : 0.0;

            // 每日趋势：近 30 天（校区隔离）
            List<MatchStatsView.DailyCount> trend = new ArrayList<>();
            try {
                LocalDateTime from = LocalDate.now(TimeZones.BUSINESS).atStartOfDay().minusDays(DAILY_TREND_DAYS - 1);
                LocalDateTime to = LocalDateTime.now(TimeZones.BUSINESS);
                List<FieldCountProjection> rows = scoped
                        ? heartSignalRepository.countDailyBetweenAndCampusName(from, to, campusName)
                        : heartSignalRepository.countDailyBetween(from, to);
                if (rows != null) {
                    for (FieldCountProjection row : rows) {
                        if (row.getField() != null) {
                            trend.add(new MatchStatsView.DailyCount(
                                    row.getField().toString(),
                                    safeCnt(row.getCnt())
                            ));
                        }
                    }
                }
            } catch (DataAccessException e) {
                log.warn("查询每日匹配趋势失败，降级返回空列表", e);
            }

            return new MatchStatsView(total, mutual, successRate, pending, accepted, trend);
        } catch (DataAccessException e) {
            log.error("查询匹配统计失败，降级返回零值", e);
            return new MatchStatsView(0L, 0L, 0.0, 0L, 0L, List.of());
        }
    }

    /**
     * 社区运营总览（后台首页「待办清单」+ 数字卡 + 图表数据源）。
     *
     * <p>缓存 key <b>含校区名</b>：既有三个统计方法的 key 不含校区，理论上会让
     * 校区管理员命中全局管理员算出的缓存；本接口按「接口 + 校区」分 key，
     * 避免缓存击穿校区隔离。TTL 沿用 R4-00392 的 5 分钟进程内缓存。</p>
     */
    @Override
    public CommunityOverviewView getCommunityOverview() {
        String campusName = scopedCampusName();
        String cacheKey = "communityOverview:" + (campusName == null ? "GLOBAL" : campusName);
        return cached(cacheKey, () -> computeCommunityOverview(campusName));
    }

    /**
     * 计算社区运营总览（R4-00393：校区管理员仅统计本校区，全局管理员统计全平台）。
     *
     * <p>全部计数走 GROUP BY / CASE 聚合或既有分页查询的 count 投影，
     * 一次请求共 8 条 SQL，不存在「按分类/角色循环 count」的 N+1。
     * 任一数据源异常仅降级该项为 0/空，不影响其余字段（首页不能因单表查询失败白屏）。</p>
     *
     * @param campusName 管辖校区（null 表示全局）
     */
    private CommunityOverviewView computeCommunityOverview(String campusName) {
        long totalPosts = 0L;
        long pendingPosts = 0L;
        long pinnedPosts = 0L;
        try {
            List<Object[]> rows = postRepository.countAdminPostFlags(POST_AUDIT_PENDING, campusName);
            if (rows != null && !rows.isEmpty()) {
                Object[] row = rows.get(0);
                totalPosts = toLong(at(row, 0));
                pendingPosts = toLong(at(row, 1));
                pinnedPosts = toLong(at(row, 2));
            }
        } catch (DataAccessException e) {
            log.warn("查询帖子聚合（总数/待审核/置顶）失败，降级返回 0", e);
        }

        Map<String, Long> postsByCategory = new LinkedHashMap<>();
        try {
            List<Object[]> rows = postRepository.countAdminPostsGroupedByCategory(campusName);
            if (rows != null) {
                for (Object[] row : rows) {
                    String category = toText(at(row, 0));
                    postsByCategory.merge(category.isEmpty() ? "unknown" : category,
                            toLong(at(row, 1)), Long::sum);
                }
            }
        } catch (DataAccessException e) {
            log.warn("查询帖子分类分布失败，降级返回空分布", e);
        }

        // 近 7 天发帖趋势：先按业务时区补 0，保证图表 X 轴连续（无发帖的日期不缺席）
        LocalDate today = LocalDate.now(TimeZones.BUSINESS);
        Map<String, Long> dailyPosts = new LinkedHashMap<>();
        for (int i = POST_TREND_DAYS - 1; i >= 0; i--) {
            dailyPosts.put(today.minusDays(i).toString(), 0L);
        }
        try {
            LocalDateTime from = today.minusDays(POST_TREND_DAYS - 1L).atStartOfDay();
            LocalDateTime to = today.plusDays(1).atStartOfDay();
            List<Object[]> rows = postRepository.countAdminPostsDaily(from, to, campusName);
            if (rows != null) {
                for (Object[] row : rows) {
                    String day = toDayKey(at(row, 0));
                    if (day != null && dailyPosts.containsKey(day)) {
                        dailyPosts.merge(day, toLong(at(row, 1)), Long::sum);
                    }
                }
            }
        } catch (DataAccessException e) {
            log.warn("查询近 7 天发帖趋势失败，降级返回补 0 序列", e);
        }
        List<CommunityOverviewView.DailyCount> postsLast7Days = new ArrayList<>();
        dailyPosts.forEach((day, cnt) -> postsLast7Days.add(new CommunityOverviewView.DailyCount(day, cnt)));

        Map<String, Long> userCountsByRole = new LinkedHashMap<>();
        try {
            List<FieldCountProjection> rows = userRepository.countGroupByRole(campusName);
            if (rows != null) {
                for (FieldCountProjection row : rows) {
                    String role = row.getField();
                    String key = (role == null || role.isBlank()) ? "unknown" : role.trim();
                    userCountsByRole.merge(key, safeCnt(row.getCnt()), Long::sum);
                }
            }
        } catch (DataAccessException e) {
            log.warn("查询用户角色分布失败，降级返回空分布", e);
        }

        long unassignedCirclePosts = 0L;
        try {
            // 原生 SQL 以空串表示「不过滤校区」（见 PostRepository#countAdminPostsWithoutOwnerCircle）
            List<Object[]> rows = postRepository.countAdminPostsWithoutOwnerCircle(
                    campusName == null ? "" : campusName);
            if (rows != null && !rows.isEmpty()) {
                unassignedCirclePosts = toLong(at(rows.get(0), 0));
            }
        } catch (DataAccessException e) {
            // owner_circle_path 由圈子分层工作流补列/回填，实体尚未映射该列；
            // 列缺失或本接口与迁移并行上线时按 0 处理，不影响其余待办项。
            log.warn("查询未归属圈子的帖子数失败，降级返回 0", e);
        }

        long pendingMedia = 0L;
        try {
            pendingMedia = mediaAssetRepository
                    .searchForAdmin(MEDIA_AUDIT_PENDING, null, null, campusName, COUNT_ONLY_PAGE)
                    .getTotalElements();
        } catch (DataAccessException e) {
            log.warn("查询待审核媒体数失败，降级返回 0", e);
        }

        long openReports = 0L;
        try {
            openReports = reportRepository
                    .findByStatusAndTargetType(REPORT_STATUS_PENDING, null, campusName, COUNT_ONLY_PAGE)
                    .getTotalElements();
        } catch (DataAccessException e) {
            log.warn("查询待处理举报数失败，降级返回 0", e);
        }

        // 官方账号是平台级全局资源（official_accounts 表无校区列）→ 恒为全平台计数，
        // 校区管理员看到的停用官方号数与全局一致，属预期口径（见 CommunityOverviewView 注释）。
        long disabledAccounts = 0L;
        try {
            long total = officialAccountRepository.count();
            long enabled = officialAccountRepository.findByEnabledTrueOrderBySortOrderAsc().size();
            disabledAccounts = Math.max(0L, total - enabled);
        } catch (DataAccessException e) {
            log.warn("查询停用官方号数失败，降级返回 0", e);
        }

        return new CommunityOverviewView(
                pendingPosts,
                pinnedPosts,
                totalPosts,
                postsByCategory,
                postsLast7Days,
                userCountsByRole,
                unassignedCirclePosts,
                disabledAccounts,
                pendingMedia,
                openReports
        );
    }

    /** 取聚合结果行的第 index 列（列缺失/行为 null 时返回 null，交由 toLong/toText 兜底） */
    private static Object at(Object[] row, int index) {
        return row == null || row.length <= index ? null : row[index];
    }

    /** JDBC 聚合值转 long（不同驱动 COUNT/SUM 可能返回 Long / BigDecimal / BigInteger） */
    private static long toLong(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    /** 聚合列转文本：枚举取 {@code name()}（Post.category），null 转空串 */
    private static String toText(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof Enum<?> enumValue) {
            return enumValue.name();
        }
        return String.valueOf(value).trim();
    }

    /** 日期列归一为 yyyy-MM-dd（驱动可能返回 java.sql.Date / LocalDate / Timestamp / String） */
    private static String toDayKey(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate localDate) {
            return localDate.toString();
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        return text.length() >= 10 ? text.substring(0, 10) : text;
    }

    /** 安全转换 Long（投影接口可能返回 null） */
    private static long safeCnt(Long v) {
        return v == null ? 0L : v;
    }
}
