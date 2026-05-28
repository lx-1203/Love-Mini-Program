package com.campuslove.api.discover;

import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.Activity.ActivityStatus;
import com.campuslove.api.entity.ActivityEnrollment;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.CircleTopic;
import com.campuslove.api.entity.DailyAnswer;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.PassRecord;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.ActivityEnrollmentRepository;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.CircleTopicRepository;
import com.campuslove.api.repository.DailyAnswerRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PassRecordRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.RecommendationPreferenceRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实推荐服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 * 提供人物推荐、偏好管理、推荐历史等功能。
 */
@Profile("real")
@Service
public class RealRecommendationService implements RecommendationService {

    private final RecommendationConfig recommendationConfig;

    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final RecommendationPreferenceRepository recommendationPreferenceRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final ActivityRepository activityRepository;
    private final ActivityEnrollmentRepository activityEnrollmentRepository;
    private final CircleTopicRepository circleTopicRepository;
    private final PostRepository postRepository;
    private final HeartSignalRepository heartSignalRepository;
    private final PassRecordRepository passRecordRepository;
    private final CircleMembershipRepository circleMembershipRepository;
    private final DailyAnswerRepository dailyAnswerRepository;
    private final ObjectMapper objectMapper;

    public RealRecommendationService(
            RecommendationConfig recommendationConfig,
            UserRepository userRepository,
            LikeRepository likeRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            RecommendationPreferenceRepository recommendationPreferenceRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            ActivityRepository activityRepository,
            ActivityEnrollmentRepository activityEnrollmentRepository,
            CircleTopicRepository circleTopicRepository,
            PostRepository postRepository,
            HeartSignalRepository heartSignalRepository,
            PassRecordRepository passRecordRepository,
            CircleMembershipRepository circleMembershipRepository,
            DailyAnswerRepository dailyAnswerRepository,
            ObjectMapper objectMapper) {
        this.recommendationConfig = recommendationConfig;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.recommendationPreferenceRepository = recommendationPreferenceRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.activityRepository = activityRepository;
        this.activityEnrollmentRepository = activityEnrollmentRepository;
        this.circleTopicRepository = circleTopicRepository;
        this.postRepository = postRepository;
        this.heartSignalRepository = heartSignalRepository;
        this.passRecordRepository = passRecordRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.dailyAnswerRepository = dailyAnswerRepository;
        this.objectMapper = objectMapper;
    }

    // ---- Phase 1 存根方法（暂未实现，后续迭代补充） ----

    /**
     * 获取推荐讨论列表。
     * 基于 CircleTopic 和 Post 的热门内容，按回复数和点赞数加权排序。
     * 热度计算公式: replyCount * 3 + likesCount * 2（回复权重更高）。
     * 合并两类内容后按热度降序排列，取前 DISCUSSION_LIMIT 个。
     */
    @Override
    @Transactional(readOnly = true)
    public List<DiscussionRecommendationView> getDiscussions() {
        List<ScoredDiscussion> scoredDiscussions = new ArrayList<>();

        // 1. 从 CircleTopic 获取热门话题（分页查询，按创建时间倒序，默认每页20条）
        try {
            List<CircleTopic> topics = circleTopicRepository.findAll(
                    PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt")))
                    .getContent();
            for (CircleTopic topic : topics) {
                // 话题热度 = 回复数 * 3（话题没有点赞数，以回复数为主要指标）
                int heatScore = (topic.getReplyCount() != null ? topic.getReplyCount() : 0) * 3;
                String summary = truncateContent(topic.getContent(), 60);
                String heatLabel = buildHeatLabel(topic.getReplyCount(), 0);
                scoredDiscussions.add(new ScoredDiscussion(
                        String.valueOf(topic.getId()),
                        topic.getTitle(),
                        summary,
                        heatLabel,
                        heatScore
                ));
            }
        } catch (Exception e) {
            // CircleTopic 查询失败时忽略，继续从 Post 获取
        }

        // 2. 从 Post 获取热门帖子
        try {
            List<Post> posts = postRepository.findByStatusOrderByCreatedAtDesc(
                    PostStatus.active,
                    org.springframework.data.domain.PageRequest.of(0, 50))
                    .getContent();
            for (Post post : posts) {
                // 帖子热度 = 评论数 * 3 + 点赞数 * 2
                int commentsCount = post.getCommentsCount() != null ? post.getCommentsCount() : 0;
                int likesCount = post.getLikesCount() != null ? post.getLikesCount() : 0;
                int heatScore = commentsCount * 3 + likesCount * 2;
                String summary = truncateContent(post.getContent(), 60);
                String heatLabel = buildHeatLabel(commentsCount, likesCount);
                // Post 没有 title 字段，用内容前 30 字作为标题
                String title = truncateContent(post.getContent(), 30);
                scoredDiscussions.add(new ScoredDiscussion(
                        String.valueOf(post.getId()),
                        title,
                        summary,
                        heatLabel,
                        heatScore
                ));
            }
        } catch (Exception e) {
            // Post 查询失败时忽略
        }

        // 3. 按热度降序排序，取前 DISCUSSION_LIMIT 个
        scoredDiscussions.sort(Comparator.comparingInt(ScoredDiscussion::heatScore).reversed());

        return scoredDiscussions.stream()
                .limit(recommendationConfig.getDiscussionLimit())
                .map(sd -> new DiscussionRecommendationView(sd.id(), sd.title(), sd.summary(), sd.heatLabel()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ActivityRecommendationView> getActivities() {
        // 从 ActivityRepository 加载 upcoming 状态的活动，取前 10 个
        List<Activity> activities = activityRepository
                .findByStatusOrderByActivityDateAsc(ActivityStatus.upcoming,
                        org.springframework.data.domain.PageRequest.of(0, 10))
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

        // 查找活动，不存在则抛异常
        Activity activity = activityRepository.findById(activityIdLong)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

        if (enrolled) {
            // 报名操作：检查是否已报名
            if (activityEnrollmentRepository.existsByActivityIdAndUserId(activityIdLong, userId)) {
                // 已报名，返回当前状态
                return new ActivityEnrollmentView(activityId, true, activity.getEnrollmentCount());
            }

            // 创建报名记录
            LocalDateTime now = LocalDateTime.now();
            ActivityEnrollment enrollment = new ActivityEnrollment();
            enrollment.setActivityId(activityIdLong);
            enrollment.setUserId(userId);
            enrollment.setEnrolledAt(now);
            enrollment.setCreatedAt(now);
            activityEnrollmentRepository.save(enrollment);

            // 更新报名人数 +1
            activity.setEnrollmentCount(activity.getEnrollmentCount() + 1);
            activity.setUpdatedAt(LocalDateTime.now());
            activityRepository.save(activity);

            return new ActivityEnrollmentView(activityId, true, activity.getEnrollmentCount());
        } else {
            // 取消报名操作：查找并删除已存在的报名记录
            Optional<ActivityEnrollment> enrollmentOpt =
                    activityEnrollmentRepository.findByActivityIdAndUserId(activityIdLong, userId);

            if (enrollmentOpt.isEmpty()) {
                // 未报名，返回当前状态
                return new ActivityEnrollmentView(activityId, false, activity.getEnrollmentCount());
            }

            // 删除报名记录
            activityEnrollmentRepository.delete(enrollmentOpt.get());

            // 更新报名人数 -1（最小为 0）
            activity.setEnrollmentCount(Math.max(0, activity.getEnrollmentCount() - 1));
            activity.setUpdatedAt(LocalDateTime.now());
            activityRepository.save(activity);

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

        // 查找活动，不存在则抛异常
        Activity activity = activityRepository.findById(activityIdLong)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + activityId));

        // 判断当前用户是否已报名
        boolean isEnrolled = false;
        if (userId != null) {
            isEnrolled = activityEnrollmentRepository.existsByActivityIdAndUserId(activityIdLong, userId);
        }

        // 解析参与者头像列表
        List<String> avatars = parseParticipantAvatars(activity.getParticipantAvatars());

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

    /**
     * 获取推荐偏好设置（无用户上下文版本）。
     * @deprecated 无法获取用户特定偏好，仅返回默认值。
     *             请使用 {@link #getPreferences(Long)} 从数据库读取用户持久化偏好。
     */
    @Override
    @Deprecated
    public RecommendationPreferencesView getPreferences() {
        // 无用户上下文，返回默认偏好（同校优先 / 中午12点刷新 / 启用校园优先）
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

    /**
     * 更新指定用户的推荐偏好设置（持久化到数据库）。
     * 根据用户 ID 查找已有偏好记录，存在则更新，不存在则新建后保存。
     * 偏好会影响推荐排序：同校优先(campus_first)时校区匹配用户排序靠前。
     *
     * @param userId 用户 ID，不能为空
     * @param data   推荐偏好实体数据，包含 preferredTime 和 scope 字段
     * @return 更新后的推荐偏好视图
     * @throws IllegalArgumentException 参数校验失败时抛出
     */
    @Override
    @Transactional
    public RecommendationPreferencesView updatePreferences(Long userId, RecommendationPreference data) {
        // 参数校验
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }
        if (data == null) {
            throw new IllegalArgumentException("偏好数据不能为空");
        }
        if (data.getPreferredTime() == null || data.getPreferredTime().isBlank()) {
            throw new IllegalArgumentException("推荐时间偏好(preferredTime)不能为空");
        }
        if (data.getScope() == null || data.getScope().isBlank()) {
            throw new IllegalArgumentException("推荐范围(scope)不能为空");
        }

        // 校验 scope 取值范围
        Set<String> validScopes = Set.of("campus_first", "city", "unlimited");
        if (!validScopes.contains(data.getScope())) {
            throw new IllegalArgumentException(
                    "推荐范围(scope)无效，有效值: campus_first, city, unlimited，当前值: " + data.getScope());
        }

        LocalDateTime now = LocalDateTime.now();

        try {
            // 查找已有偏好记录，存在则更新，不存在则新建
            RecommendationPreference pref = recommendationPreferenceRepository.findByUserId(userId)
                    .orElseGet(() -> {
                        RecommendationPreference newPref = new RecommendationPreference();
                        newPref.setUserId(userId);
                        newPref.setCreatedAt(now);
                        return newPref;
                    });

            // 更新偏好字段
            pref.setPreferredTime(data.getPreferredTime());
            pref.setScope(data.getScope());
            // campusPriority 可为 null，保持数据库已有值不变
            if (data.getCampusPriority() != null) {
                pref.setCampusPriority(data.getCampusPriority());
            }
            pref.setUpdatedAt(now);

            // 持久化到数据库
            recommendationPreferenceRepository.save(pref);

            return new RecommendationPreferencesView(
                    pref.getPreferredTime(), pref.getScope(), pref.getCampusPriority());
        } catch (Exception e) {
            // 数据库操作异常时，包装为运行时异常向上抛出
            throw new RuntimeException("保存推荐偏好失败，用户ID: " + userId, e);
        }
    }

    // ---- Phase 2 核心实现：人物推荐 ----

    /**
     * 获取推荐人物列表。
     * 加权排序逻辑：
     * - 同校区 (campus_first): +50 权重
     * - 同城市: +20 权重
     * - 兴趣标签匹配: +10 每个匹配
     * - 同专业: +20 权重
     * - 共同兴趣圈: +5 每个
     * - 共同每日一问: +3 每个
     * - 日程重叠: +15 权重
     * - 校园优先: 同校用户总分+30%
     * - 根据用户 RecommendationPreference.scope 设置过滤范围
     * - 每日最多返回 10 个推荐
     */
    @Override
    @Transactional(readOnly = true)
    public List<RecommendedPersonView> getRecommendations(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 1. 获取当前用户的校区、城市和专业信息
        Optional<UserCampusProfile> myCampusOpt = userCampusProfileRepository.findByUserId(userId);
        String myCampusName = myCampusOpt.map(UserCampusProfile::getCampusName).orElse("");
        String myCityName = myCampusOpt.map(UserCampusProfile::getCityName).orElse("");
        String myDepartmentName = myCampusOpt.map(UserCampusProfile::getDepartmentName).orElse("");

        // 2. 获取当前用户的日程偏好
        Optional<UserScheduleProfile> myScheduleOpt = userScheduleProfileRepository.findByUserId(userId);
        String myTimeWindow = myScheduleOpt.map(UserScheduleProfile::getPreferredTimeWindowJson).orElse("{}");

        // 3. 获取当前用户的兴趣标签（从 UserBasicProfile 的 interest_tags 字段）
        Set<String> myTags = userBasicProfileRepository.findByUserId(userId)
                .map(profile -> parseInterestTags(profile.getInterestTags()))
                .orElse(Collections.emptySet());

        // 4. 批量查询当前用户加入的兴趣圈 ID 列表（用于计算共同圈）
        Set<Long> tempMyCircleIds;
        try {
            List<CircleMembership> myMemberships = circleMembershipRepository.findByUserId(userId);
            tempMyCircleIds = myMemberships.stream()
                    .map(m -> m.getCircle().getId())
                    .collect(Collectors.toSet());
        } catch (Exception e) {
            tempMyCircleIds = Collections.emptySet();
        }
        final Set<Long> myCircleIds = tempMyCircleIds;

        // 5. 批量查询当前用户回答过的每日一问 questionId 列表（用于计算共同回答）
        Set<Long> tempAnswerQuestionIds;
        try {
            List<DailyAnswer> myAnswers = dailyAnswerRepository.findByUserIdOrderByCreatedAtDesc(userId);
            tempAnswerQuestionIds = myAnswers.stream()
                    .map(a -> a.getQuestion().getId())
                    .collect(Collectors.toSet());
        } catch (Exception e) {
            tempAnswerQuestionIds = Collections.emptySet();
        }
        final Set<Long> myAnswerQuestionIds = tempAnswerQuestionIds;

        // 6. 获取推荐偏好
        RecommendationPreference pref = recommendationPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    RecommendationPreference defaultPref = new RecommendationPreference();
                    defaultPref.setUserId(userId);
                    defaultPref.setPreferredTime("12:00");
                    defaultPref.setScope("campus_first");
                    return defaultPref;
                });
        boolean campusPriorityEnabled = pref.getCampusPriority() != null ? pref.getCampusPriority() : true;

        // 7. 获取已喜欢/已跳过的用户 ID 列表（排除这些用户）
        List<Like> myLikes = likeRepository.findByUserIdAndStatusIn(userId,
                List.of(LikeStatus.active));
        Set<Long> excludedUserIds = myLikes.stream()
                .map(Like::getTargetUserId)
                .collect(Collectors.toSet());
        excludedUserIds.add(userId); // 排除自己

        // 7.1 获取已有心动信号的用户 ID 列表（排除已产生双向信号的用户，避免重复推荐）
        try {
            List<HeartSignal> mySignals = heartSignalRepository
                    .findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.accepted);
            for (HeartSignal signal : mySignals) {
                Long partnerId = signal.getUserAId().equals(userId)
                        ? signal.getUserBId()
                        : signal.getUserAId();
                excludedUserIds.add(partnerId);
            }
        } catch (Exception e) {
            // HeartSignal 查询失败时忽略，不影响主流程
        }

        // 7.2 获取已 pass 的用户 ID 列表（排除左滑跳过的用户）
        try {
            List<PassRecord> passRecords = passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId);
            for (PassRecord record : passRecords) {
                excludedUserIds.add(record.getPassedUserId());
            }
        } catch (Exception e) {
            // PassRecord 查询失败时忽略，不影响主流程
        }

        // 8. 使用分页查询候选用户，避免全表扫描
        List<User> allUsers = userRepository.findAll(
                PageRequest.of(0, recommendationConfig.getCandidatePageSize())).getContent();

        // 9. 根据推荐范围过滤
        String scope = pref.getScope();
        List<User> candidates = allUsers.stream()
                .filter(u -> !excludedUserIds.contains(u.getId()))
                .filter(u -> filterByScope(u.getId(), scope, myCampusName, myCityName))
                .toList();

        // 10. 加权排序
        List<ScoredUser> scoredUsers = new ArrayList<>();
        for (User candidate : candidates) {
            int score = calculateScore(
                    candidate.getId(), myCampusName, myCityName, myTags, myTimeWindow,
                    myDepartmentName, myCircleIds, myAnswerQuestionIds, campusPriorityEnabled);
            scoredUsers.add(new ScoredUser(candidate, score));
        }

        // 按分数降序排序
        scoredUsers.sort(Comparator.comparingInt(ScoredUser::score).reversed());

        // 11. 取前 DAILY_LIMIT 个
        List<ScoredUser> topResults = scoredUsers.stream()
                .limit(recommendationConfig.getDailyLimit())
                .toList();

        // 12. 转换为视图，携带同校/同专业/共同圈等标记
        return topResults.stream()
                .map(su -> toRecommendedPersonView(su.user(), myCampusName, myDepartmentName, myCircleIds))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RecommendationPreferencesView getPreferences(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return recommendationPreferenceRepository.findByUserId(userId)
                .map(pref -> new RecommendationPreferencesView(
                        pref.getPreferredTime(), pref.getScope(), pref.getCampusPriority()))
                .orElse(new RecommendationPreferencesView("12:00", "campus_first", true));
    }

    @Override
    @Transactional
    public RecommendationPreferencesView savePreferences(Long userId, String preferredTime, String scope, Boolean campusPriority) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (preferredTime == null || preferredTime.isBlank()) {
            throw new IllegalArgumentException("preferredTime is required");
        }
        if (scope == null || scope.isBlank()) {
            throw new IllegalArgumentException("scope is required");
        }

        LocalDateTime now = LocalDateTime.now();
        RecommendationPreference pref = recommendationPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    RecommendationPreference newPref = new RecommendationPreference();
                    newPref.setUserId(userId);
                    newPref.setCreatedAt(now);
                    return newPref;
                });

        pref.setPreferredTime(preferredTime);
        pref.setScope(scope);
        pref.setCampusPriority(campusPriority != null ? campusPriority : true);
        pref.setUpdatedAt(now);

        recommendationPreferenceRepository.save(pref);
        return new RecommendationPreferencesView(preferredTime, scope, pref.getCampusPriority());
    }

    /**
     * 获取推荐历史列表。
     * 基于用户的 Like 记录和 HeartSignal 记录，返回用户曾经互动过的推荐人物。
     * Like 记录表示用户曾经喜欢过的人，HeartSignal 记录表示产生过心动信号的人。
     * 按互动时间倒序排列，最多返回 DAILY_LIMIT 个。
     */
    @Override
    @Transactional(readOnly = true)
    public List<RecommendedPersonView> getHistory(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 预加载当前用户的校区和专业信息（用于标记同校/同专业）
        Optional<UserCampusProfile> myCampusOpt = userCampusProfileRepository.findByUserId(userId);
        String myCampusName = myCampusOpt.map(UserCampusProfile::getCampusName).orElse("");
        String myDepartmentName = myCampusOpt.map(UserCampusProfile::getDepartmentName).orElse("");

        // 预加载当前用户的兴趣圈 ID（用于计算共同圈）
        Set<Long> myCircleIds;
        try {
            List<CircleMembership> myMemberships = circleMembershipRepository.findByUserId(userId);
            myCircleIds = myMemberships.stream()
                    .map(m -> m.getCircle().getId())
                    .collect(Collectors.toSet());
        } catch (Exception e) {
            myCircleIds = Collections.emptySet();
        }

        // 用于去重，避免同一用户出现多次
        Set<Long> seenUserIds = new HashSet<>();
        List<User> historyUsers = new ArrayList<>();

        // 1. 从 HeartSignal 记录获取（优先级高，表示有深层互动）
        try {
            List<HeartSignal> signals = heartSignalRepository
                    .findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.accepted);
            for (HeartSignal signal : signals) {
                Long partnerId = signal.getUserAId().equals(userId)
                        ? signal.getUserBId()
                        : signal.getUserAId();
                if (seenUserIds.add(partnerId)) {
                    userRepository.findById(partnerId).ifPresent(historyUsers::add);
                }
            }
        } catch (Exception e) {
            // HeartSignal 查询失败时忽略
        }

        // 2. 从 Like 记录获取（表示用户喜欢过的人）
        try {
            List<Like> likes = likeRepository.findByUserIdAndStatus(userId, LikeStatus.active);
            for (Like like : likes) {
                if (seenUserIds.add(like.getTargetUserId())) {
                    userRepository.findById(like.getTargetUserId()).ifPresent(historyUsers::add);
                }
            }
        } catch (Exception e) {
            // Like 查询失败时忽略
        }

        // 3. 转换为视图，限制返回数量
        final String fMyCampusName = myCampusName;
        final String fMyDepartmentName = myDepartmentName;
        final Set<Long> fMyCircleIds = myCircleIds;
        return historyUsers.stream()
                .limit(recommendationConfig.getDailyLimit())
                .map(u -> toRecommendedPersonView(u, fMyCampusName, fMyDepartmentName, fMyCircleIds))
                .toList();
    }

    // ---- 私有辅助方法 ----

    /**
     * 根据推荐范围过滤候选用户。
     * - campus_first: 仅同校区
     * - city: 同城市
     * - unlimited: 不限
     */
    private boolean filterByScope(Long candidateUserId, String scope,
                                   String myCampusName, String myCityName) {
        if ("unlimited".equals(scope)) {
            return true;
        }

        Optional<UserCampusProfile> candidateCampusOpt = userCampusProfileRepository.findByUserId(candidateUserId);
        if (candidateCampusOpt.isEmpty()) {
            // 没有校区资料的用户在 campus_first/city 模式下不推荐
            return "unlimited".equals(scope);
        }

        UserCampusProfile candidateCampus = candidateCampusOpt.get();

        if ("campus_first".equals(scope)) {
            return myCampusName.equals(candidateCampus.getCampusName());
        }

        if ("city".equals(scope)) {
            return myCityName.equals(candidateCampus.getCityName());
        }

        return true;
    }

    /**
     * 计算候选用户的推荐权重分数。
     * 加权维度包括：同校区、同城市、同专业、兴趣标签匹配、共同兴趣圈、
     * 共同每日一问、日程重叠，以及校园优先的同校百分比加成。
     *
     * @param candidateUserId        候选用户 ID
     * @param myCampusName           当前用户校区名称
     * @param myCityName             当前用户城市名称
     * @param myTags                 当前用户兴趣标签集合
     * @param myTimeWindow           当前用户时间窗口 JSON
     * @param myDepartmentName       当前用户专业/院系名称
     * @param myCircleIds            当前用户加入的兴趣圈 ID 集合
     * @param myAnswerQuestionIds    当前用户回答过的每日一问 questionId 集合
     * @param campusPriorityEnabled  校园优先开关
     * @return 加权后的推荐分数
     */
    private int calculateScore(Long candidateUserId, String myCampusName,
                                String myCityName, Set<String> myTags, String myTimeWindow,
                                String myDepartmentName, Set<Long> myCircleIds,
                                Set<Long> myAnswerQuestionIds, boolean campusPriorityEnabled) {
        int score = 0;
        boolean isSameCampus = false;

        // 同校区 + 同城市 + 同专业
        Optional<UserCampusProfile> campusOpt = userCampusProfileRepository.findByUserId(candidateUserId);
        if (campusOpt.isPresent()) {
            UserCampusProfile campus = campusOpt.get();

            // 同校区判断并加分
            if (myCampusName != null && !myCampusName.isBlank()
                    && myCampusName.equals(campus.getCampusName())) {
                score += recommendationConfig.getCampusWeight();
                isSameCampus = true;
            }

            // 同城市
            if (myCityName != null && !myCityName.isBlank()
                    && myCityName.equals(campus.getCityName())) {
                score += recommendationConfig.getCityWeight();
            }

            // 同专业：比较 departmentName（院系/专业）
            if (myDepartmentName != null && !myDepartmentName.isBlank()
                    && myDepartmentName.equals(campus.getDepartmentName())) {
                score += recommendationConfig.getSameMajorWeight();
            }
        }

        // 兴趣标签匹配
        // 从候选用户的 UserBasicProfile 中解析 interest_tags JSON 字段
        if (!myTags.isEmpty()) {
            Set<String> candidateTags = userBasicProfileRepository.findByUserId(candidateUserId)
                    .map(profile -> parseInterestTags(profile.getInterestTags()))
                    .orElse(Collections.emptySet());
            // 计算两个标签集合的交集数量，每个共同标签加分
            long commonTagCount = myTags.stream()
                    .filter(candidateTags::contains)
                    .count();
            score += (int) commonTagCount * recommendationConfig.getInterestWeight();
        }

        // 共同兴趣圈：查询候选用户加入的圈子，计算交集
        if (!myCircleIds.isEmpty()) {
            try {
                List<CircleMembership> candidateMemberships =
                        circleMembershipRepository.findByUserId(candidateUserId);
                Set<Long> candidateCircleIds = candidateMemberships.stream()
                        .map(m -> m.getCircle().getId())
                        .collect(Collectors.toSet());
                // 计算交集
                long commonCircleCount = myCircleIds.stream()
                        .filter(candidateCircleIds::contains)
                        .count();
                score += (int) commonCircleCount * recommendationConfig.getCommonCircleWeight();
            } catch (Exception e) {
                // 查询失败不影响主流程
            }
        }

        // 共同每日一问回答：查询候选用户的回答，计算共同问题数
        if (!myAnswerQuestionIds.isEmpty()) {
            try {
                List<DailyAnswer> candidateAnswers =
                        dailyAnswerRepository.findByUserIdOrderByCreatedAtDesc(candidateUserId);
                Set<Long> candidateQuestionIds = candidateAnswers.stream()
                        .map(a -> a.getQuestion().getId())
                        .collect(Collectors.toSet());
                // 计算交集
                long commonAnswerCount = myAnswerQuestionIds.stream()
                        .filter(candidateQuestionIds::contains)
                        .count();
                score += (int) commonAnswerCount * recommendationConfig.getCommonDailyAnswerWeight();
            } catch (Exception e) {
                // 查询失败不影响主流程
            }
        }

        // 日程重叠
        Optional<UserScheduleProfile> scheduleOpt = userScheduleProfileRepository.findByUserId(candidateUserId);
        if (scheduleOpt.isPresent() && hasScheduleOverlap(myTimeWindow, scheduleOpt.get().getPreferredTimeWindowJson())) {
            score += recommendationConfig.getScheduleWeight();
        }

        // 校园优先：同校用户总分加成+30%
        if (campusPriorityEnabled && isSameCampus
                && recommendationConfig.isSameSchoolBoostEnabled()) {
            score = (int) Math.round(score * (1.0 + recommendationConfig.getSameSchoolBoostPercent()));
        }

        return score;
    }

    /**
     * 检查两个用户的日程时间窗口是否有重叠。
     * 简化实现：比较 JSON 字符串是否有交集。
     */
    private boolean hasScheduleOverlap(String myTimeWindow, String candidateTimeWindow) {
        if (myTimeWindow == null || myTimeWindow.isBlank() ||
                candidateTimeWindow == null || candidateTimeWindow.isBlank()) {
            return false;
        }
        try {
            Map<String, Object> myMap = objectMapper.readValue(myTimeWindow, new TypeReference<>() {});
            Map<String, Object> candidateMap = objectMapper.readValue(candidateTimeWindow, new TypeReference<>() {});
            // 简化判断：如果两个时间窗口有相同的键，则认为有重叠
            for (String key : myMap.keySet()) {
                if (candidateMap.containsKey(key)) {
                    return true;
                }
            }
        } catch (Exception e) {
            // JSON 解析失败，默认无重叠
            return false;
        }
        return false;
    }

    /**
     * 解析兴趣标签 JSON 字符串为 Set 集合。
     * JSON 格式示例: ["摄影", "篮球", "阅读", "编程"]
     * 解析失败时返回空集合，不影响推荐算法正常运行。
     *
     * @param interestTagsJson 兴趣标签 JSON 字符串
     * @return 兴趣标签集合
     */
    private Set<String> parseInterestTags(String interestTagsJson) {
        if (interestTagsJson == null || interestTagsJson.isBlank()) {
            return Collections.emptySet();
        }
        try {
            List<String> tags = objectMapper.readValue(interestTagsJson, new TypeReference<List<String>>() {});
            return new HashSet<>(tags);
        } catch (JsonProcessingException e) {
            // JSON 解析失败，返回空集合，避免影响推荐算法
            return Collections.emptySet();
        }
    }

    /**
     * 将 User 实体转换为 RecommendedPersonView。
     * 携带同校/同专业/共同兴趣圈等推荐维度的标记信息。
     *
     * @param user             用户实体
     * @param myCampusName     当前用户校区名称
     * @param myDepartmentName 当前用户专业/院系名称
     * @param myCircleIds      当前用户加入的兴趣圈 ID 集合
     * @return 推荐人物视图
     */
    private RecommendedPersonView toRecommendedPersonView(User user,
            String myCampusName, String myDepartmentName, Set<Long> myCircleIds) {
        String name = user.getNickname() != null ? user.getNickname() : "";
        String initials = extractInitials(name);
        String headline = user.getBio() != null ? user.getBio() : "";

        // 获取校区名称
        String campusName = userCampusProfileRepository.findByUserId(user.getId())
                .map(UserCampusProfile::getCampusName)
                .orElse("");

        // 获取用户标签（从 UserBasicProfile 的 interest_tags 字段解析）
        List<String> tags = userBasicProfileRepository.findByUserId(user.getId())
                .map(profile -> parseInterestTags(profile.getInterestTags()))
                .map(Set::stream)
                .map(stream -> stream.toList())
                .orElse(List.of());

        // 获取个人简介（从 UserBasicProfile 的 bio 字段获取，若为空则使用 User 的 bio）
        String bio = userBasicProfileRepository.findByUserId(user.getId())
                .map(profile -> profile.getBio() != null ? profile.getBio() : "")
                .orElse(user.getBio() != null ? user.getBio() : "");

        // 获取用户图片列表（暂传空列表，后续迭代补充图片存储功能）
        List<String> images = Collections.emptyList();

        // 计算共同点（简化实现）
        String commonGround = "";

        // 计算可用时间（简化实现）
        String availability = userScheduleProfileRepository.findByUserId(user.getId())
                .map(UserScheduleProfile::getPreferredCampusArea)
                .orElse("");

        // ---- 新增推荐维度标记 ----

        // 同校判断：比较 campusName
        boolean isSameSchool = false;
        Optional<UserCampusProfile> campusOpt = userCampusProfileRepository.findByUserId(user.getId());
        if (campusOpt.isPresent() && myCampusName != null && !myCampusName.isBlank()) {
            isSameSchool = myCampusName.equals(campusOpt.get().getCampusName());
        }

        // 同专业判断：比较 departmentName
        boolean isSameMajor = false;
        if (campusOpt.isPresent() && myDepartmentName != null && !myDepartmentName.isBlank()) {
            isSameMajor = myDepartmentName.equals(campusOpt.get().getDepartmentName());
        }

        // 共同兴趣圈数量
        int commonCircleCount = 0;
        if (!myCircleIds.isEmpty()) {
            try {
                List<CircleMembership> memberships = circleMembershipRepository.findByUserId(user.getId());
                Set<Long> candidateCircleIds = memberships.stream()
                        .map(m -> m.getCircle().getId())
                        .collect(Collectors.toSet());
                commonCircleCount = (int) myCircleIds.stream()
                        .filter(candidateCircleIds::contains)
                        .count();
            } catch (Exception e) {
                // 查询失败时保持为 0
            }
        }

        return new RecommendedPersonView(
                user.getId(),
                name,
                initials,
                headline,
                commonGround,
                availability,
                campusName,
                user.getAvatarUrl(),
                tags,
                bio,
                images,
                isSameSchool,
                isSameMajor,
                commonCircleCount
        );
    }

    /**
     * 提取姓名首字母（简化实现：取第一个字符）。
     */
    private String extractInitials(String name) {
        if (name == null || name.isBlank()) {
            return "";
        }
        return name.substring(0, 1);
    }

    /**
     * 将 Activity 实体转换为 ActivityRecommendationView。
     */
    private ActivityRecommendationView toActivityRecommendationView(Activity activity) {
        List<String> avatars = parseParticipantAvatars(activity.getParticipantAvatars());

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

    /**
     * 解析参与者头像 JSON 字符串为列表。
     *
     * @param json JSON 字符串
     * @return 头像 URL 列表
     */
    private List<String> parseParticipantAvatars(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    /**
     * 加权排序用的内部记录。
     */
    private record ScoredUser(User user, int score) {}

    /**
     * 讨论热度排序用的内部记录。
     */
    private record ScoredDiscussion(String id, String title, String summary, String heatLabel, int heatScore) {}

    /**
     * 截断内容到指定最大长度，超出部分用省略号代替。
     *
     * @param content   原始内容
     * @param maxLength 最大长度
     * @return 截断后的内容
     */
    private String truncateContent(String content, int maxLength) {
        if (content == null || content.isBlank()) {
            return "";
        }
        if (content.length() <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength) + "...";
    }

    /**
     * 构建热度标签文本。
     * 根据回复数和点赞数生成人类可读的热度描述。
     *
     * @param replyCount 回复数
     * @param likesCount 点赞数
     * @return 热度标签文本
     */
    private String buildHeatLabel(Integer replyCount, int likesCount) {
        int replies = replyCount != null ? replyCount : 0;
        int total = replies + likesCount;
        if (total >= 100) {
            return total + " 人参与";
        } else if (total >= 20) {
            return "热度上升";
        } else if (total > 0) {
            return total + " 人参与";
        }
        return "新发布";
    }
}
