package com.campuslove.api.admin;

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
import org.springframework.cache.annotation.Cacheable;
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
 * <p>SubTask 5.3.4：缓存策略
 * <ul>
 *     <li>三类统计方法（{@link #getUserStats} / {@link #getActiveStats} / {@link #getMatchStats}）
 *         均添加 {@code @Cacheable(ADMIN_STATS)}，TTL 5 分钟</li>
 *     <li>等价于 Redis 计数器方案：5 分钟内重复查询直接返回缓存，避免全表 COUNT 频繁触发</li>
 *     <li>Admin 后台首页自动刷新（默认 30s~60s）命中缓存，DB 压力下降 90%+</li>
 *     <li>缓存 key 固定为方法名（无参数方法），保证不同统计类型互不干扰</li>
 * </ul>
 * </p>
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

    public RealAdminStatsService(
            UserRepository userRepository,
            UserCampusProfileRepository campusProfileRepository,
            UserOnlineStatusRepository onlineStatusRepository,
            InteractionEventRepository interactionEventRepository,
            HeartSignalRepository heartSignalRepository) {
        this.userRepository = userRepository;
        this.campusProfileRepository = campusProfileRepository;
        this.onlineStatusRepository = onlineStatusRepository;
        this.interactionEventRepository = interactionEventRepository;
        this.heartSignalRepository = heartSignalRepository;
    }

    /**
     * SubTask 5.3.4：{@code @Cacheable(ADMIN_STATS)} 5 分钟 TTL，
     * 等价 Redis 计数器方案，避免每次后台首页刷新都触发全表 COUNT。
     */
    @Override
    @Cacheable(cacheNames = CacheNames.ADMIN_STATS, key = "'userStats'")
    public UserStatsView getUserStats() {
        try {
            long total = userRepository.count();

            LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
            LocalDateTime startOf7d = startOfToday.minusDays(6);

            long newToday = userRepository.countByCreatedAtAfter(startOfToday);
            long new7d = userRepository.countByCreatedAtAfter(startOf7d);

            // 今日活跃：今天有心跳记录的用户数
            long activeToday = onlineStatusRepository.countByLastHeartbeatAfter(startOfToday);

            // 性别比（按 pronouns 字段分组，null 归为 unknown）
            Map<String, Long> genderDist = new LinkedHashMap<>();
            try {
                List<FieldCountProjection> rows = userRepository.countGroupByPronouns();
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

            // 学校分布（按 campus_name 分组）
            List<UserStatsView.FieldCount> campusDist = new ArrayList<>();
            try {
                List<FieldCountProjection> rows = campusProfileRepository.countGroupByCampusName();
                if (rows != null) {
                    for (FieldCountProjection row : rows) {
                        String field = row.getField();
                        String name = (field == null || field.isBlank()) ? "未填写" : field;
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
     * SubTask 5.3.4：{@code @Cacheable(ADMIN_STATS)} 5 分钟 TTL，
     * 缓存 DAU/MAU/互动数，避免高频心跳表与互动事件表 COUNT。
     */
    @Override
    @Cacheable(cacheNames = CacheNames.ADMIN_STATS, key = "'activeStats'")
    public ActiveStatsView getActiveStats() {
        try {
            LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
            LocalDateTime startOf30d = startOfToday.minusDays(29);

            long dau = onlineStatusRepository.countByLastHeartbeatAfter(startOfToday);
            long mau = onlineStatusRepository.countByLastHeartbeatAfter(startOf30d);

            long interactionsToday = interactionEventRepository.countByCreatedAtAfter(startOfToday);
            long interactions7d = interactionEventRepository.countByCreatedAtAfter(startOfToday.minusDays(6));

            return new ActiveStatsView(dau, mau, interactionsToday, interactions7d);
        } catch (DataAccessException e) {
            log.error("查询活跃度统计失败，降级返回零值", e);
            return new ActiveStatsView(0L, 0L, 0L, 0L);
        }
    }

    /**
     * SubTask 5.3.4：{@code @Cacheable(ADMIN_STATS)} 5 分钟 TTL，
     * 缓存匹配总数/双向匹配数/每日趋势，避免心信号表 GROUP BY 频繁触发。
     */
    @Override
    @Cacheable(cacheNames = CacheNames.ADMIN_STATS, key = "'matchStats'")
    public MatchStatsView getMatchStats() {
        try {
            long total = heartSignalRepository.count();
            long mutual = heartSignalRepository.countByMatchType(MATCH_TYPE_MUTUAL);
            long pending = heartSignalRepository.countByStatus(SignalStatus.pending);
            long accepted = heartSignalRepository.countByStatus(SignalStatus.accepted);

            double successRate = total > 0 ? (double) mutual / total : 0.0;

            // 每日趋势：近 30 天
            List<MatchStatsView.DailyCount> trend = new ArrayList<>();
            try {
                LocalDateTime from = LocalDate.now().atStartOfDay().minusDays(DAILY_TREND_DAYS - 1);
                LocalDateTime to = LocalDateTime.now();
                List<FieldCountProjection> rows = heartSignalRepository.countDailyBetween(from, to);
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
