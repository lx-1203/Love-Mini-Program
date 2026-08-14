package com.campuslove.api.discover;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import com.campuslove.api.entity.ActivityEnrollment;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.repository.ActivityEnrollmentRepository;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserBlockRepository;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.growth.AppConfigService;
import com.campuslove.api.growth.SocialProgressService;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实推荐服务实现（real profile）。
 *
 * <p>Task 4.1.5 重构：原 1368 行 God Class 已拆分为 4 个组件：
 * {@link RecommendationStrategy}（算法）、{@link UserPreferenceCalculator}（偏好）、
 * {@link RecommendationCacheManager}（缓存）、{@link RecommendationRanker}（排序）。
 * 本类保留讨论/活动推荐、筛选过滤及委托逻辑。所有 public 方法签名保持向后兼容。</p>
 */
@Profile("real")
@Service
public class RealRecommendationService implements RecommendationService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RealRecommendationService.class);

    private final ActivityRepository activityRepository;
    private final ActivityEnrollmentRepository activityEnrollmentRepository;
    private final CircleTopicRepository circleTopicRepository;
    private final PostRepository postRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;

    // 拆分后的 4 个组件
    private final RecommendationStrategy recommendationStrategy;
    private final UserPreferenceCalculator preferenceCalculator;
    private final RecommendationCacheManager cacheManager;
    private final RecommendationRanker ranker;

    /**
     * JPA 实体管理器（FIN-00040 修复：报名计数原子更新）。
     * 为兼容既有单元测试（直接 new 构造器），可为 null：null 时回退实体读-改-写。
     */
    private final EntityManager entityManager;

    // R4-00325：推荐配额扣减已移入 RecommendationCacheManager 的缓存 miss 路径，
    // 本类不再持有 RecommendQuotaService（配额查询端点走 RecommendationController 注入）。

    /**
     * 社交升温漏斗服务（R4-00327：活动参与埋点）。
     * real profile 注入；单元测试 / mock 场景为 null 时跳过埋点。
     * 采用字段注入（required=false）而非构造器参数，避免破坏既有单测构造器。
     */
    @Autowired(required = false)
    private SocialProgressService socialProgressService;

    /**
     * 拉黑关系数据访问层（3-F 拉黑：推荐候选排除）。
     * real profile 注入；单元测试 / mock 场景为 null 时跳过拉黑过滤。
     * 采用字段注入（required=false）而非构造器参数，避免破坏既有单测构造器。
     */
    @Autowired(required = false)
    private UserBlockRepository blockRepository;

    /**
     * 应用配置服务（B6：匹配/推荐功能开关强制点）。
     * real profile 注入；单元测试 / mock 场景为 null 时跳过开关检查（视为开启）。
     * 采用字段注入（required=false）而非构造器参数，避免破坏既有单测构造器。
     */
    @Autowired(required = false)
    private AppConfigService appConfigService;

    @org.springframework.beans.factory.annotation.Autowired
    public RealRecommendationService(
            ActivityRepository activityRepository,
            ActivityEnrollmentRepository activityEnrollmentRepository,
            CircleTopicRepository circleTopicRepository,
            PostRepository postRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            RecommendationStrategy recommendationStrategy,
            UserPreferenceCalculator preferenceCalculator,
            RecommendationCacheManager cacheManager,
            RecommendationRanker ranker,
            EntityManager entityManager) {
        this.activityRepository = activityRepository;
        this.activityEnrollmentRepository = activityEnrollmentRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.postRepository = postRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.recommendationStrategy = recommendationStrategy;
        this.preferenceCalculator = preferenceCalculator;
        this.cacheManager = cacheManager;
        this.ranker = ranker;
        this.entityManager = entityManager;
    }

    /**
     * 兼容旧测试的构造器（entityManager 为 null，计数更新回退实体读-改-写）。
     *
     * @deprecated 仅单元测试使用；Spring 注入请使用带 EntityManager 的构造器。
     */
    @Deprecated
    public RealRecommendationService(
            ActivityRepository activityRepository,
            ActivityEnrollmentRepository activityEnrollmentRepository,
            CircleTopicRepository circleTopicRepository,
            PostRepository postRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            RecommendationStrategy recommendationStrategy,
            UserPreferenceCalculator preferenceCalculator,
            RecommendationCacheManager cacheManager,
            RecommendationRanker ranker) {
        this(activityRepository, activityEnrollmentRepository, circleTopicRepository,
                postRepository, userBasicProfileRepository, recommendationStrategy,
                preferenceCalculator, cacheManager, ranker, null);
    }

    // ---- 讨论推荐 ----

    /** 获取推荐讨论列表：基于 CircleTopic + Post 热度（reply*3 + like*2）排序。 */
    @Override
    @Transactional(readOnly = true)
    public List<DiscussionRecommendationView> getDiscussions() {
        List<ScoredDiscussion> scoredDiscussions = new ArrayList<>();

        // 1. 从 CircleTopic 获取热门话题
        try {
            List<CircleTopic> topics = circleTopicRepository.findAll(
                    PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt")))
                    .getContent();
            for (CircleTopic topic : topics) {
                int heatScore = (topic.getReplyCount() != null ? topic.getReplyCount() : 0) * 3;
                String summary = ranker.truncateContent(topic.getContent(), 60);
                String heatLabel = ranker.buildHeatLabel(topic.getReplyCount(), 0);
                scoredDiscussions.add(new ScoredDiscussion(
                        String.valueOf(topic.getId()),
                        topic.getTitle(),
                        summary,
                        heatLabel,
                        heatScore
                ));
            }
        } catch (DataAccessException e) {
            // FIN-00041 修复：原实现静默吞异常，补充 warn 日志便于排查
            log.warn("查询 CircleTopic 热门话题失败，降级跳过：error={}", e.getMessage());
        }

        // 2. 从 Post 获取热门帖子
        try {
            List<Post> posts = postRepository.findByStatusOrderByCreatedAtDesc(
                    PostStatus.active,
                    PageRequest.of(0, 50))
                    .getContent();
            for (Post post : posts) {
                int commentsCount = post.getCommentsCount() != null ? post.getCommentsCount() : 0;
                int likesCount = post.getLikesCount() != null ? post.getLikesCount() : 0;
                int heatScore = commentsCount * 3 + likesCount * 2;
                String summary = ranker.truncateContent(post.getContent(), 60);
                String heatLabel = ranker.buildHeatLabel(commentsCount, likesCount);
                String title = ranker.truncateContent(post.getContent(), 30);
                scoredDiscussions.add(new ScoredDiscussion(
                        String.valueOf(post.getId()),
                        title,
                        summary,
                        heatLabel,
                        heatScore
                ));
            }
        } catch (DataAccessException e) {
            // FIN-00041 修复：原实现静默吞异常，补充 warn 日志便于排查
            log.warn("查询 Post 热门帖子失败，降级跳过：error={}", e.getMessage());
        }

        // 3. 按热度降序排序
        scoredDiscussions.sort(Comparator.comparingInt(ScoredDiscussion::heatScore).reversed());

        return scoredDiscussions.stream()
                .limit(recommendationConfigDiscussionLimit())
                .map(sd -> new DiscussionRecommendationView(sd.id(), sd.title(), sd.summary(), sd.heatLabel()))
                .toList();
    }

    // ---- 活动推荐 ----

    @Override
    @Transactional(readOnly = true)
    public List<ActivityRecommendationView> getActivities() {
        List<Activity> activities = activityRepository
                .findByStatusOrderByActivityDateAsc(ActivityStatus.upcoming,
                        PageRequest.of(0, 10))
                .getContent();

        return activities.stream()
                .map(this::toActivityRecommendationView)
                .toList();
    }

    @Override
    @Transactional
    public ActivityEnrollmentView enrollActivity(String activityId, boolean enrolled, Long userId) {
        if (activityId == null || activityId.isBlank()) {
            throw new IllegalArgumentException("activityId is required");
        }
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        Long activityIdLong;
        try {
            activityIdLong = Long.parseLong(activityId);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid activityId format: " + activityId);
        }

        Activity activity = activityRepository.findById(activityIdLong)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

        if (enrolled) {
            if (activityEnrollmentRepository.existsByActivityIdAndUserId(activityIdLong, userId)) {
                return new ActivityEnrollmentView(activityId, true, activity.getEnrollmentCount());
            }

            LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
            ActivityEnrollment enrollment = new ActivityEnrollment();
            enrollment.setActivityId(activityIdLong);
            enrollment.setUserId(userId);
            enrollment.setEnrolledAt(now);
            enrollment.setCreatedAt(now);
            activityEnrollmentRepository.save(enrollment);

            // FIN-00040 修复：enrollmentCount 改为数据库侧原子递增，消除并发报名丢失计数；
            // entityManager 为 null（单元测试直接 new）时回退实体读-改-写
            // infra R2-00239: bulk UPDATE 后 detach 并重查实体，避免事务提交时 flush
            // 用陈旧值覆盖原子递增结果（脏写覆盖）
            if (entityManager != null) {
                entityManager.createQuery(
                                "UPDATE Activity a SET a.enrollmentCount = a.enrollmentCount + 1, "
                                        + "a.updatedAt = :now WHERE a.id = :activityId")
                        .setParameter("now", now)
                        .setParameter("activityId", activityIdLong)
                        .executeUpdate();
                entityManager.detach(activity);
                Activity fresh = activityRepository.findById(activityIdLong).orElse(null);
                if (fresh != null) {
                    activity = fresh;
                }
            } else {
                activity.setEnrollmentCount(activity.getEnrollmentCount() + 1);
            }
            activity.setUpdatedAt(now);

            // R4-00327：社交升温漏斗埋点——活动参与（L6_SCENE 计数）；
            // 埋点失败不影响报名主流程（仅记录日志）
            if (socialProgressService != null) {
                try {
                    socialProgressService.recordActivityParticipation(userId);
                } catch (RuntimeException e) {
                    log.debug("社交升温埋点（activity）失败：userId={}, error={}", userId, e.getMessage());
                }
            }

            return new ActivityEnrollmentView(activityId, true, activity.getEnrollmentCount());
        } else {
            Optional<ActivityEnrollment> enrollmentOpt =
                    activityEnrollmentRepository.findByActivityIdAndUserId(activityIdLong, userId);

            if (enrollmentOpt.isEmpty()) {
                return new ActivityEnrollmentView(activityId, false, activity.getEnrollmentCount());
            }

            activityEnrollmentRepository.delete(enrollmentOpt.orElseThrow(() ->
                    new IllegalStateException("enrollmentOpt 已确认非空但 orElseThrow 触发，数据不一致")));

            // FIN-00040 修复：enrollmentCount 改为数据库侧原子递减（下限 0）
            // infra R2-00239: bulk UPDATE 后 detach 并重查实体，避免脏写覆盖原子结果
            if (entityManager != null) {
                entityManager.createQuery(
                                "UPDATE Activity a SET a.enrollmentCount = CASE "
                                        + "WHEN a.enrollmentCount > 0 THEN a.enrollmentCount - 1 ELSE 0 END, "
                                        + "a.updatedAt = :now WHERE a.id = :activityId")
                        .setParameter("now", LocalDateTime.now(TimeZones.BUSINESS))
                        .setParameter("activityId", activityIdLong)
                        .executeUpdate();
                entityManager.detach(activity);
                Activity fresh = activityRepository.findById(activityIdLong).orElse(null);
                if (fresh != null) {
                    activity = fresh;
                }
            } else {
                activity.setEnrollmentCount(Math.max(0, activity.getEnrollmentCount() - 1));
            }
            activity.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

            return new ActivityEnrollmentView(activityId, false, activity.getEnrollmentCount());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ActivityDetailView getActivityDetail(String activityId, Long userId) {
        if (activityId == null || activityId.isBlank()) {
            throw new IllegalArgumentException("activityId is required");
        }

        Long activityIdLong;
        try {
            activityIdLong = Long.parseLong(activityId);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid activityId format: " + activityId);
        }

        Activity activity = activityRepository.findById(activityIdLong)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

        boolean isEnrolled = false;
        if (userId != null) {
            isEnrolled = activityEnrollmentRepository.existsByActivityIdAndUserId(activityIdLong, userId);
        }

        List<String> avatars = preferenceCalculator.parseStringList(activity.getParticipantAvatars());

        return new ActivityDetailView(
                activity.getId(),
                activity.getTitle(),
                activity.getLocation(),
                activity.getScheduleText(),
                activity.getDescription(),
                activity.getEnrollmentCount(),
                avatars,
                activity.getStatus().name(),
                activity.getActivityDate(),
                isEnrolled,
                activity.getCategory(),
                activity.getCoverImage()
        );
    }

    // ---- 推荐偏好（委托 UserPreferenceCalculator） ----

    /**
     * 获取推荐偏好设置（无用户上下文版本）。
     * @deprecated 无法获取用户特定偏好，仅返回默认值。
     *             请使用 {@link #getPreferences(Long)} 从数据库读取用户持久化偏好。
     */
    @Override
    @Deprecated
    public RecommendationPreferencesView getPreferences() {
        return new RecommendationPreferencesView("12:00", "campus_first", true);
    }

    /**
     * 更新推荐偏好设置（无用户上下文版本）。
     * @deprecated 无法持久化偏好，因为没有用户 ID。
     *             请使用 {@link #updatePreferences(Long, RecommendationPreference)} 持久化用户偏好。
     * @throws UnsupportedOperationException 始终抛出，提示使用带 userId 的版本
     */
    @Override
    @Deprecated
    public RecommendationPreferencesView updatePreferences(RecommendationPreferencesView prefs) {
        throw new UnsupportedOperationException(
                "无用户上下文，无法持久化偏好。请使用 updatePreferences(Long userId, RecommendationPreference data) 方法");
    }

    @Override
    @Transactional
    public RecommendationPreferencesView updatePreferences(Long userId, RecommendationPreference data) {
        return preferenceCalculator.updatePreferences(userId, data);
    }

    @Override
    @Transactional(readOnly = true)
    public RecommendationPreferencesView getPreferences(Long userId) {
        return preferenceCalculator.getPreferences(userId);
    }

    @Override
    @Transactional
    public RecommendationPreferencesView savePreferences(Long userId, String preferredTime, String scope, Boolean campusPriority) {
        return preferenceCalculator.savePreferences(userId, preferredTime, scope, campusPriority);
    }

    // ---- 人物推荐（委托 CacheManager / Strategy / Ranker） ----

    @Override
    @Transactional(readOnly = true)
    public List<RecommendedPersonView> getRecommendations(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        // B6：后台关闭匹配/推荐功能（match_open / recommend_open 任一为 false）时
        // 优雅降级为空列表（不抛 403，浏览不中断；客户端按开关展示关闭提示）
        if (isRecommendationClosed()) {
            return List.of();
        }
        // P0-20 修复：去除此处与外层 RecommendationCacheManager.getCachedRecommendations
        // 的双重 @Cacheable 冗余。有效缓存层保留在 RecommendationCacheManager（带
        // unless 空结果保护 + 主动失效方法），此处仅做委托，避免同键嵌套缓存。
        //
        // R4-00325 修复：推荐配额扣减移入 RecommendationCacheManager 的缓存 miss 路径
        // （见 getCachedRecommendations 内 tryConsume 调用）。原实现在此处先扣减再查缓存，
        // 首页/聊天概览/发现页多个入口每次拉取（含缓存命中）都扣配额，缓存期内翻页
        // 重复扣减导致配额经济失真。现在仅当真实计算新推荐（缓存 miss）时扣减一次，
        // 并按入口去重（同一缓存 TTL 内所有入口共享一次计算/一次扣减）。
        List<RecommendedPersonView> recommendations = cacheManager.getCachedRecommendations(userId);

        // 3-F 拉黑：推荐候选排除拉黑双方（我拉黑的 + 拉黑我的）。
        // 内存过滤在缓存结果之上执行，不影响缓存结构与命中率。
        if (blockRepository != null) {
            Set<Long> blockedRelationUserIds = new HashSet<>(blockRepository.findBlockedRelationUserIds(userId));
            if (!blockedRelationUserIds.isEmpty()) {
                return recommendations.stream()
                        .filter(view -> view.id() == null || !blockedRelationUserIds.contains(view.id()))
                        .toList();
            }
        }
        return recommendations;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecommendedPersonView> getRecommendations(Long userId, RecommendationFilter filter) {
        List<RecommendedPersonView> recommendations = getRecommendations(userId);
        if (filter == null || filter.isEmpty()) {
            return recommendations;
        }
        // infra R2-00238: 批量预加载候选用户基本资料，避免筛选逐条查库（N+1）
        Map<Long, UserBasicProfile> basicProfileMap = loadBasicProfileMap(
                recommendations.stream().map(RecommendedPersonView::id).toList());
        return recommendations.stream()
                .filter(view -> matchesFilter(view, filter, basicProfileMap))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecommendedPersonView> getRecommendationsForGuest(RecommendationFilter filter) {
        // B6：后台关闭匹配/推荐功能时游客推荐流同样降级为空列表
        if (isRecommendationClosed()) {
            return List.of();
        }
        // 游客推荐：委托 CacheManager 的游客缓存（60s TTL，2026-08-12 卡顿修复——
        // 原每次全量重算 ~8 次 SQL 是未登录切页卡顿主因，缓存后降为 1 次 Redis GET），
        // 再应用与登录用户一致的 in-memory 筛选（matchesFilter）。
        List<RecommendedPersonView> views = cacheManager.getCachedGuestRecommendations();
        if (filter == null || filter.isEmpty()) {
            // 2026-08-12 卡顿修复：游客无分页/无个人上下文，返回全部 200 条
            // 导致响应体 ~200KB + 前端解析耗时（实测缓存命中仍 300ms+）。
            // 截断到前端卡片展示所需上限（与登录 dailyLimit 同量级），
            // 响应体降为 ~1/7，缓存命中应 <50ms。
            return views.size() > GUEST_LIST_LIMIT ? views.subList(0, GUEST_LIST_LIMIT) : views;
        }
        // infra R2-00238: 批量预加载候选用户基本资料，避免筛选逐条查库（N+1）
        Map<Long, UserBasicProfile> basicProfileMap = loadBasicProfileMap(
                views.stream().map(RecommendedPersonView::id).toList());
        return views.stream()
                .filter(view -> matchesFilter(view, filter, basicProfileMap))
                .toList();
    }

    /** 游客推荐列表返回上限（2026-08-12：与登录 dailyLimit 同量级，避免响应体过大）。 */
    private static final int GUEST_LIST_LIMIT = 30;

    /**
     * B6：匹配/推荐功能是否被后台关闭（match_open / recommend_open 任一为 false）。
     *
     * <p>任一关闭时推荐流优雅降级为空列表（不抛 403，浏览不中断），
     * 客户端按开关状态展示关闭提示。单元测试未注入 AppConfigService 时跳过检查。</p>
     *
     * @return true=推荐功能关闭（返回空列表）
     */
    private boolean isRecommendationClosed() {
        return appConfigService != null
                && (!appConfigService.isSwitchEnabled(AppConfigService.SWITCH_MATCH_OPEN)
                    || !appConfigService.isSwitchEnabled(AppConfigService.SWITCH_RECOMMEND_OPEN));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecommendedPersonView> getHistory(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return cacheManager.buildHistory(userId);
    }

    // ---- 筛选匹配（视图层 in-memory 过滤，包级可见以便单元测试） ----

    boolean matchesFilter(RecommendedPersonView view, RecommendationFilter filter) {
        // 单测兼容入口：无批量 Map 时回退逐条查库
        return matchesFilter(view, filter, Collections.emptyMap());
    }

    private boolean matchesFilter(RecommendedPersonView view, RecommendationFilter filter,
                                  Map<Long, UserBasicProfile> basicProfileMap) {
        if (filter.heightMin() != null && (view.height() == null || view.height() < filter.heightMin())) return false;
        if (filter.heightMax() != null && (view.height() == null || view.height() > filter.heightMax())) return false;
        // V2026.08.08.0015：年龄筛选（闭区间，年龄由出生年份推导；无年龄视为不满足该维度）
        if (filter.ageMin() != null && (view.age() == null || view.age() < filter.ageMin())) return false;
        if (filter.ageMax() != null && (view.age() == null || view.age() > filter.ageMax())) return false;
        if (!filter.educationLevels().isEmpty()
                && (view.educationLevel() == null || !filter.educationLevels().contains(view.educationLevel()))) {
            return false;
        }
        if (filter.keyword() != null) {
            String kw = filter.keyword().toLowerCase();
            boolean hitName = view.name() != null && view.name().toLowerCase().contains(kw);
            boolean hitBio = view.bio() != null && view.bio().toLowerCase().contains(kw);
            boolean hitTags = view.tags() != null && view.tags().stream()
                    .anyMatch(t -> t != null && t.toLowerCase().contains(kw));
            if (!(hitName || hitBio || hitTags)) return false;
        }
        boolean needDbLookup = !filter.relationshipStatuses().isEmpty()
                || filter.hometownProvince() != null
                || filter.hometownCity() != null
                || filter.futureCity() != null;
        if (needDbLookup) {
            // infra R2-00238: 优先从批量 Map 取基本资料；Map 为空（单测直接调用）时回退查库
            UserBasicProfile bp = (basicProfileMap == null || basicProfileMap.isEmpty())
                    ? userBasicProfileRepository.findByUserId(view.id()).orElse(null)
                    : basicProfileMap.get(view.id());
            if (bp == null) return false;
            if (!filter.relationshipStatuses().isEmpty()
                    && (bp.getRelationshipStatus() == null
                        || !filter.relationshipStatuses().contains(bp.getRelationshipStatus()))) {
                return false;
            }
            if (filter.hometownProvince() != null && !filter.hometownProvince().equals(bp.getHometownProvince())) return false;
            if (filter.hometownCity() != null && !filter.hometownCity().equals(bp.getHometownCity())) return false;
            if (filter.futureCity() != null && !filter.futureCity().equals(bp.getFutureCity())) return false;
        }
        return true;
    }

    /**
     * 批量加载用户基本资料 Map（userId → UserBasicProfile），避免筛选逐条查库（N+1）。
     *
     * @param userIds 用户 ID 列表
     * @return 基本资料映射
     */
    private Map<Long, UserBasicProfile> loadBasicProfileMap(List<Long> userIds) {
        List<Long> distinct = userIds.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return Collections.emptyMap();
        }
        return userBasicProfileRepository.findByUserIdIn(distinct).stream()
                .collect(Collectors.toMap(UserBasicProfile::getUserId, p -> p, (a, b) -> a));
    }

    // ---- 私有辅助方法 ----

    private ActivityRecommendationView toActivityRecommendationView(Activity activity) {
        List<String> avatars = preferenceCalculator.parseStringList(activity.getParticipantAvatars());
        return new ActivityRecommendationView(
                String.valueOf(activity.getId()),
                activity.getTitle(),
                activity.getLocation(),
                activity.getScheduleText(),
                activity.getDescription(),
                activity.getEnrollmentCount(),
                avatars
        );
    }

    /** 讨论推荐数量上限：委托 ranker 持有的 RecommendationConfig，避免重复注入。 */
    private int recommendationConfigDiscussionLimit() {
        return ranker.getDiscussionLimit();
    }

    private record ScoredDiscussion(String id, String title, String summary, String heatLabel, int heatScore) {}
}
