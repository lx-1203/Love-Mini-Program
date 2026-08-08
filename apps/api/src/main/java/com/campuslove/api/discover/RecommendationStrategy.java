package com.campuslove.api.discover;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.DailyAnswer;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.PassRecord;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.CircleMembershipRepository;
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
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 推荐算法核心组件。
 *
 * <p>职责：实现 {@code doRecommend(userId)} 核心推荐算法，包括：</p>
 * <ul>
 *   <li>加载当前用户的校区/城市/兴趣标签/日程偏好/兴趣圈/每日一问等上下文</li>
 *   <li>计算排除集合（自己 + 已喜欢 + 已 pass + 已产生双向信号）</li>
 *   <li>批量预加载候选用户关联数据，避免 N+1 查询</li>
 *   <li>根据 scope 过滤候选用户</li>
 *   <li>调用 {@link #calculateScoreOptimized} 计算加权分数</li>
 *   <li>返回排序后的 {@link ScoredUser} 列表，由 {@link RecommendationRanker} 完成视图转换</li>
 * </ul>
 *
 * <p>从 RealRecommendationService 拆分而来（Task 4.1.1）。
 * 该组件不直接产生 {@link RecommendedPersonView}，避免与 Ranker 的视图层职责重叠。</p>
 */
@Profile("real")
@Component
public class RecommendationStrategy {

    private final RecommendationConfig recommendationConfig;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final RecommendationPreferenceRepository recommendationPreferenceRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final HeartSignalRepository heartSignalRepository;
    private final PassRecordRepository passRecordRepository;
    private final CircleMembershipRepository circleMembershipRepository;
    private final DailyAnswerRepository dailyAnswerRepository;
    private final PostRepository postRepository;
    private final ObjectMapper objectMapper;
    private final UserPreferenceCalculator preferenceCalculator;

    public RecommendationStrategy(
            RecommendationConfig recommendationConfig,
            UserRepository userRepository,
            LikeRepository likeRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            RecommendationPreferenceRepository recommendationPreferenceRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            HeartSignalRepository heartSignalRepository,
            PassRecordRepository passRecordRepository,
            CircleMembershipRepository circleMembershipRepository,
            DailyAnswerRepository dailyAnswerRepository,
            PostRepository postRepository,
            ObjectMapper objectMapper,
            UserPreferenceCalculator preferenceCalculator) {
        this.recommendationConfig = recommendationConfig;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.recommendationPreferenceRepository = recommendationPreferenceRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.heartSignalRepository = heartSignalRepository;
        this.passRecordRepository = passRecordRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.dailyAnswerRepository = dailyAnswerRepository;
        this.postRepository = postRepository;
        this.objectMapper = objectMapper;
        this.preferenceCalculator = preferenceCalculator;
    }

    /**
     * 推荐算法核心实现。
     *
     * <p>流程：</p>
     * <ol>
     *   <li>加载当前用户上下文（校区/城市/专业/日程/标签/圈/每日一问）</li>
     *   <li>获取推荐偏好（scope, campusPriority）</li>
     *   <li>计算排除集合（自己 + 已喜欢 + 已 pass + 已有双向信号）</li>
     *   <li>分页查询候选用户并按 scope 过滤</li>
     *   <li>批量预加载候选用户的 campusProfile / basicProfile / circleMemberships</li>
     *   <li>对每个候选调用 {@link #calculateScoreOptimized} 计算分数</li>
     *   <li>返回 {@link RecommendResult}，包含 ScoredUser 列表与预加载的 Map</li>
     * </ol>
     *
     * @param userId 当前用户 ID
     * @return 推荐上下文（包含评分后的候选列表 + 预加载数据 + 当前用户上下文）
     */
    @Transactional(readOnly = true)
    public RecommendResult doRecommend(Long userId) {
        // 1. 加载当前用户的校区/城市/专业信息
        Optional<UserCampusProfile> myCampusOpt = userCampusProfileRepository.findByUserId(userId);
        String myCampusName = myCampusOpt.map(UserCampusProfile::getCampusName).orElse("");
        String myCityName = myCampusOpt.map(UserCampusProfile::getCityName).orElse("");
        String myDepartmentName = myCampusOpt.map(UserCampusProfile::getDepartmentName).orElse("");

        // 2. 加载当前用户的日程偏好
        Optional<UserScheduleProfile> myScheduleOpt = userScheduleProfileRepository.findByUserId(userId);
        String myTimeWindow = myScheduleOpt.map(UserScheduleProfile::getPreferredTimeWindowJson).orElse("{}");

        // 3. 加载当前用户的兴趣标签
        Set<String> myTags = userBasicProfileRepository.findByUserId(userId)
                .map(profile -> preferenceCalculator.parseInterestTags(profile.getInterestTags()))
                .orElse(Collections.emptySet());

        // 4. 批量查询当前用户加入的兴趣圈 ID 列表
        Set<Long> myCircleIds = loadMyCircleIds(userId);

        // 5. 批量查询当前用户回答过的每日一问 questionId 列表
        Set<Long> myAnswerQuestionIds = loadMyAnswerQuestionIds(userId);

        // 6. 获取推荐偏好
        RecommendationPreference pref = loadRecommendationPreference(userId);
        boolean campusPriorityEnabled = pref.getCampusPriority() != null ? pref.getCampusPriority() : true;

        // 7. 计算排除集合
        Set<Long> excludedUserIds = getExcludedUserIds(userId);

        // 8. 分页查询候选用户（P0-21：仅查询 status=active 且 role=USER 的普通用户，
        //    排除禁用账号与 ADMIN/SUPER_ADMIN 管理员）
        List<User> allUsers = userRepository.findByStatusAndRole(
                "active", "USER",
                PageRequest.of(0, recommendationConfig.getCandidatePageSize())).getContent();

        // 9. 根据 scope 过滤候选
        String scope = pref.getScope();
        List<User> candidates = allUsers.stream()
                .filter(u -> !excludedUserIds.contains(u.getId()))
                .filter(u -> filterByScope(u.getId(), scope, myCampusName, myCityName))
                .toList();

        // P0-21 空池兜底：campus_first 同校无候选时放宽到同城，再放宽到全国
        // （排除集合已覆盖自己 + 已 like + 已 pass + 已产生双向信号）
        if (candidates.isEmpty() && "campus_first".equals(scope)) {
            candidates = allUsers.stream()
                    .filter(u -> !excludedUserIds.contains(u.getId()))
                    .filter(u -> filterByScope(u.getId(), "city", myCampusName, myCityName))
                    .toList();
        }
        if (candidates.isEmpty() && "campus_first".equals(scope)) {
            candidates = allUsers.stream()
                    .filter(u -> !excludedUserIds.contains(u.getId()))
                    .toList();
        }

        // 10. 批量预加载候选用户的关联数据
        List<Long> candidateIds = candidates.stream().map(User::getId).toList();
        Map<Long, UserCampusProfile> campusProfileMap = userCampusProfileRepository.findByUserIdIn(candidateIds)
                .stream().collect(Collectors.toMap(UserCampusProfile::getUserId, p -> p));
        Map<Long, UserBasicProfile> basicProfileMap = userBasicProfileRepository.findByUserIdIn(candidateIds)
                .stream().collect(Collectors.toMap(UserBasicProfile::getUserId, p -> p));
        Map<Long, List<CircleMembership>> membershipMap = loadMemberships(candidateIds);

        // SubTask 5.1.3：批量预加载候选用户最近 N 天的发帖数（活跃度指标）
        Map<Long, Long> recentPostCountMap = loadRecentPostCounts(candidateIds);

        // 11. 计算分数
        List<ScoredUser> scoredUsers = new ArrayList<>();
        for (User candidate : candidates) {
            UserCampusProfile campusProfile = campusProfileMap.get(candidate.getId());
            UserBasicProfile basicProfile = basicProfileMap.get(candidate.getId());
            List<CircleMembership> memberships = membershipMap.getOrDefault(candidate.getId(), List.of());
            int score = calculateScoreOptimized(
                    candidate.getId(), myCampusName, myCityName, myTags, myTimeWindow,
                    myDepartmentName, myCircleIds, myAnswerQuestionIds, campusPriorityEnabled,
                    campusProfile, basicProfile, memberships);
            // SubTask 5.1.3：活跃度加分（基于最近 N 天发帖数，封顶 activityMaxPosts 条）
            long recentPostCount = recentPostCountMap.getOrDefault(candidate.getId(), 0L);
            int activityBonus = (int) Math.min(recentPostCount, recommendationConfig.getActivityMaxPosts())
                    * recommendationConfig.getActivityWeight();
            score += activityBonus;
            scoredUsers.add(new ScoredUser(candidate, score));
        }

        return new RecommendResult(
                scoredUsers,
                myCampusName,
                myDepartmentName,
                myCircleIds,
                campusProfileMap,
                basicProfileMap,
                membershipMap);
    }

    // ---- 排除集合计算 ----

    /**
     * 获取应排除的用户 ID 集合。
     * 包括：自己 + 已喜欢（active） + 已 pass + 已产生双向信号（accepted）。
     *
     * @param userId 当前用户 ID
     * @return 排除集合
     */
    public Set<Long> getExcludedUserIds(Long userId) {
        Set<Long> excludedUserIds = new HashSet<>();

        // 排除已喜欢/已跳过的用户
        List<Like> myLikes = likeRepository.findByUserIdAndStatusIn(userId, List.of(LikeStatus.active));
        for (Like like : myLikes) {
            excludedUserIds.add(like.getTargetUserId());
        }
        excludedUserIds.add(userId); // 排除自己

        // 排除已产生双向信号的用户
        try {
            List<HeartSignal> mySignals = heartSignalRepository
                    .findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.accepted);
            for (HeartSignal signal : mySignals) {
                Long partnerId = signal.getUserAId().equals(userId)
                        ? signal.getUserBId()
                        : signal.getUserAId();
                excludedUserIds.add(partnerId);
            }
        } catch (DataAccessException e) {
            // HeartSignal 查询失败时忽略，不影响主流程
        }

        // 排除已 pass 的用户
        try {
            List<PassRecord> passRecords = passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId);
            for (PassRecord record : passRecords) {
                excludedUserIds.add(record.getPassedUserId());
            }
        } catch (DataAccessException e) {
            // PassRecord 查询失败时忽略
        }

        return excludedUserIds;
    }

    // ---- Scope 过滤 ----

    /**
     * 根据推荐范围过滤候选用户。
     * - campus_first: 仅同校区
     * - city: 同城市
     * - unlimited: 不限
     *
     * @param candidateUserId 候选用户 ID
     * @param scope           推荐范围
     * @param myCampusName    当前用户校区名称
     * @param myCityName      当前用户城市名称
     * @return true 表示候选用户通过过滤
     */
    public boolean filterByScope(Long candidateUserId, String scope,
                                  String myCampusName, String myCityName) {
        if ("unlimited".equals(scope)) {
            return true;
        }

        Optional<UserCampusProfile> candidateCampusOpt = userCampusProfileRepository.findByUserId(candidateUserId);
        if (candidateCampusOpt.isEmpty()) {
            // 2026-08-07 链路调整：候选用户未完善校区资料时，非 city 严格模式一律放行
            // （原实现直接排除，导致未完善资料的用户在推荐流中永远不可见，
            //   配合评分降级可保证列表非空；city 模式依赖城市信息，无依据时排除）
            return !"city".equals(scope);
        }

        UserCampusProfile candidateCampus = candidateCampusOpt.get();

        if ("campus_first".equals(scope)) {
            // 2026-08-07 链路调整：当前用户未填校区资料（体验账号/未完善资料）时
            // 放宽为同城市匹配，避免空推荐列表；已填校区则保持同校区优先。
            if (myCampusName == null || myCampusName.isBlank()) {
                return myCityName == null || myCityName.isBlank()
                        || myCityName.equals(candidateCampus.getCityName());
            }
            return myCampusName.equals(candidateCampus.getCampusName());
        }

        if ("city".equals(scope)) {
            return myCityName.equals(candidateCampus.getCityName());
        }

        return true;
    }

    // ---- 评分 ----

    /**
     * 优化版本：计算候选用户的推荐权重分数（使用预加载的数据，避免 N+1）。
     * 加权维度：同校区 / 同城市 / 同专业 / 兴趣标签 / 共同圈 / 校园优先加成。
     *
     * @param candidateUserId        候选用户 ID
     * @param myCampusName           当前用户校区名称
     * @param myCityName             当前用户城市名称
     * @param myTags                 当前用户兴趣标签集合
     * @param myTimeWindow           当前用户时间窗口 JSON
     * @param myDepartmentName       当前用户专业/院系名称
     * @param myCircleIds            当前用户加入的兴趣圈 ID 集合
     * @param myAnswerQuestionIds    当前用户回答过的每日一问 questionId 集合（保留参数兼容签名）
     * @param campusPriorityEnabled 校园优先开关
     * @param campusProfile          预加载的候选用户校区资料
     * @param basicProfile           预加载的候选用户基础资料
     * @param memberships            预加载的候选用户圈子成员关系
     * @return 加权后的推荐分数
     */
    public int calculateScoreOptimized(Long candidateUserId, String myCampusName,
                                        String myCityName, Set<String> myTags, String myTimeWindow,
                                        String myDepartmentName, Set<Long> myCircleIds,
                                        Set<Long> myAnswerQuestionIds, boolean campusPriorityEnabled,
                                        UserCampusProfile campusProfile, UserBasicProfile basicProfile,
                                        List<CircleMembership> memberships) {
        int score = 0;

        // 同校区 + 同城市 + 同专业
        if (campusProfile != null) {
            if (myCampusName != null && !myCampusName.isBlank()
                    && myCampusName.equals(campusProfile.getCampusName())) {
                score += recommendationConfig.getCampusWeight();
            }
            if (myCityName != null && !myCityName.isBlank()
                    && myCityName.equals(campusProfile.getCityName())) {
                score += recommendationConfig.getCityWeight();
            }
            if (myDepartmentName != null && !myDepartmentName.isBlank()
                    && myDepartmentName.equals(campusProfile.getDepartmentName())) {
                score += recommendationConfig.getSameMajorWeight();
            }
        }

        // 兴趣标签匹配（使用预加载的 basicProfile）
        if (!myTags.isEmpty() && basicProfile != null) {
            Set<String> candidateTags = preferenceCalculator.parseInterestTags(basicProfile.getInterestTags());
            long commonTagCount = myTags.stream()
                    .filter(candidateTags::contains)
                    .count();
            score += (int) commonTagCount * recommendationConfig.getInterestWeight();
        }

        // 共同兴趣圈（使用预加载的 memberships）
        if (!myCircleIds.isEmpty()) {
            Set<Long> candidateCircleIds = memberships.stream()
                    .map(m -> m.getCircle().getId())
                    .collect(Collectors.toSet());
            long commonCircleCount = myCircleIds.stream()
                    .filter(candidateCircleIds::contains)
                    .count();
            score += (int) commonCircleCount * recommendationConfig.getCircleWeight();
        }

        // 校园优先加成：同校用户总分加成 30%
        if (campusPriorityEnabled && campusProfile != null
                && myCampusName != null && !myCampusName.isBlank()
                && myCampusName.equals(campusProfile.getCampusName())) {
            score = (int) (score * 1.3);
        }

        return score;
    }

    // ---- 日程重叠检测 ----

    /**
     * 检查两个用户的日程时间窗口是否有重叠。
     * 简化实现：JSON 字符串解析后比较键集合是否有交集。
     *
     * @param myTimeWindow       当前用户时间窗口 JSON
     * @param candidateTimeWindow 候选用户时间窗口 JSON
     * @return true 表示有重叠
     */
    public boolean hasScheduleOverlap(String myTimeWindow, String candidateTimeWindow) {
        if (myTimeWindow == null || myTimeWindow.isBlank()
                || candidateTimeWindow == null || candidateTimeWindow.isBlank()) {
            return false;
        }
        try {
            Map<String, Object> myMap = objectMapper.readValue(myTimeWindow, new TypeReference<>() {});
            Map<String, Object> candidateMap = objectMapper.readValue(candidateTimeWindow, new TypeReference<>() {});
            for (String key : myMap.keySet()) {
                if (candidateMap.containsKey(key)) {
                    return true;
                }
            }
        } catch (JsonProcessingException e) {
            return false;
        }
        return false;
    }

    // ---- 私有辅助方法 ----

    /**
     * 加载当前用户加入的兴趣圈 ID 列表。
     * 查询失败时返回空集合，保证主流程不被影响。
     */
    private Set<Long> loadMyCircleIds(Long userId) {
        try {
            List<CircleMembership> myMemberships = circleMembershipRepository.findByUserId(userId);
            return myMemberships.stream()
                    .map(m -> m.getCircle().getId())
                    .collect(Collectors.toSet());
        } catch (DataAccessException e) {
            return Collections.emptySet();
        }
    }

    /**
     * 加载当前用户回答过的每日一问 questionId 列表。
     * 查询失败时返回空集合。
     */
    private Set<Long> loadMyAnswerQuestionIds(Long userId) {
        try {
            List<DailyAnswer> myAnswers = dailyAnswerRepository.findByUserIdOrderByCreatedAtDesc(userId);
            return myAnswers.stream()
                    .map(a -> a.getQuestion().getId())
                    .collect(Collectors.toSet());
        } catch (DataAccessException e) {
            return Collections.emptySet();
        }
    }

    /**
     * 加载推荐偏好，未持久化时返回默认值。
     */
    private RecommendationPreference loadRecommendationPreference(Long userId) {
        return recommendationPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    RecommendationPreference defaultPref = new RecommendationPreference();
                    defaultPref.setUserId(userId);
                    defaultPref.setPreferredTime("12:00");
                    defaultPref.setScope("campus_first");
                    return defaultPref;
                });
    }

    /**
     * 批量预加载候选用户的圈子成员关系（带 circle 预加载以避免 LAZY 加载 N+1）。
     */
    private Map<Long, List<CircleMembership>> loadMemberships(List<Long> candidateIds) {
        if (candidateIds.isEmpty()) {
            return Collections.emptyMap();
        }
        try {
            return circleMembershipRepository.findWithCircleByUserIdIn(candidateIds)
                    .stream()
                    .collect(Collectors.groupingBy(CircleMembership::getUserId));
        } catch (DataAccessException e) {
            return Collections.emptyMap();
        }
    }

    /**
     * SubTask 5.1.3：批量查询候选用户最近 N 天的发帖数（活跃度指标）。
     *
     * <p>单次 GROUP BY 查询避免 N+1，返回 authorId -> postCount 映射。
     * 查询失败时返回空 Map，活跃度加分降级为 0，不影响推荐主流程。</p>
     *
     * @param candidateIds 候选用户 ID 列表
     * @return authorId -> 最近 N 天发帖数 映射
     */
    private Map<Long, Long> loadRecentPostCounts(List<Long> candidateIds) {
        if (candidateIds.isEmpty()) {
            return Collections.emptyMap();
        }
        try {
            int recentDays = recommendationConfig.getActivityRecentDays();
            LocalDateTime since = LocalDateTime.now(TimeZones.BUSINESS).minusDays(recentDays);
            List<Object[]> rows = postRepository.countRecentPostsByAuthorIds(
                    candidateIds, PostStatus.active, since);
            Map<Long, Long> result = new HashMap<>(rows.size());
            for (Object[] row : rows) {
                Long authorId = (Long) row[0];
                Long count = (Long) row[1];
                if (authorId != null && count != null) {
                    result.put(authorId, count);
                }
            }
            return result;
        } catch (DataAccessException e) {
            // 活跃度查询失败时降级为空 Map，不影响推荐主流程
            return Collections.emptyMap();
        }
    }

    /**
     * 加权排序用的内部记录。
     * 公开以便 {@link RecommendationRanker} 排序后转换为视图。
     */
    public record ScoredUser(User user, int score) {}

    /**
     * 推荐算法上下文结果。
     * 包含排序前的 ScoredUser 列表 + 预加载的关联数据 Map + 当前用户的上下文信息。
     * 由 {@link #doRecommend} 返回，供 {@link RecommendationRanker} 直接使用避免重复查询。
     *
     * @param scoredUsers      评分后的候选用户列表
     * @param myCampusName     当前用户校区名称
     * @param myDepartmentName 当前用户专业/院系名称
     * @param myCircleIds      当前用户兴趣圈 ID 集合
     * @param campusProfileMap 候选用户 userId -> UserCampusProfile 映射
     * @param basicProfileMap  候选用户 userId -> UserBasicProfile 映射
     * @param membershipMap    候选用户 userId -> List&lt;CircleMembership&gt; 映射
     */
    public record RecommendResult(
            List<ScoredUser> scoredUsers,
            String myCampusName,
            String myDepartmentName,
            Set<Long> myCircleIds,
            Map<Long, UserCampusProfile> campusProfileMap,
            Map<Long, UserBasicProfile> basicProfileMap,
            Map<Long, List<CircleMembership>> membershipMap) {
    }
}
