package com.campuslove.api.discover;

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
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SensitiveWordFilter;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.cache.annotation.Cacheable;
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

            LocalDateTime now = LocalDateTime.now();
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
                        .setParameter("now", LocalDateTime.now())
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
            activity.setUpdatedAt(LocalDateTime.now());

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
                isEnrolled
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
    @Cacheable(cacheNames = CacheNames.MATCH_RECOMMEND, key = "#userId")
    public List<RecommendedPersonView> getRecommendations(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return cacheManager.getCachedRecommendations(userId);
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
