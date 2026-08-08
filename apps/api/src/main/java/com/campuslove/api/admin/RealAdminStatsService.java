package com.campuslove.api.admin;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.repository.FieldCountProjection;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.InteractionEventRepository;
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
 */
@Profile("real")
@Service
public class RealAdminStatsService implements AdminStatsService {

    private static final Logger log = LoggerFactory.getLogger(RealAdminStatsService.class);

    /** 匹配类型：互相喜欢（双向匹配） */
    private static final String MATCH_TYPE_MUTUAL = "mutual_like";

    /** 每日趋势查询天数 */
    private static final int DAILY_TREND_DAYS = 30;

    private final UserRepository userRepository;
    private final UserCampusProfileRepository campusProfileRepository;
    private final UserOnlineStatusRepository onlineStatusRepository;
    private final InteractionEventRepository interactionEventRepository;
    private final HeartSignalRepository heartSignalRepository;
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
            AdminDataScope adminDataScope) {
        this.userRepository = userRepository;
        this.campusProfileRepository = campusProfileRepository;
        this.onlineStatusRepository = onlineStatusRepository;
        this.interactionEventRepository = interactionEventRepository;
        this.heartSignalRepository = heartSignalRepository;
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

    /** 安全转换 Long（投影接口可能返回 null） */
    private static long safeCnt(Long v) {
        return v == null ? 0L : v;
    }
}
