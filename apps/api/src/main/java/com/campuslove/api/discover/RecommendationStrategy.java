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
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

    /**
     * 可推荐账号的资料完整度下限（2026-10-26）：空资料官方小助手（0%）、QA 测试号（30%）
     * 不得进入游客/登录推荐池；演示人设已补全到 90–100%。
     */
    private static final int MIN_RECOMMEND_PROFILE_COMPLETION = 80;

    /**
     * S3-6：{@link #loadCampusProfiles(java.util.Collection)} 单次 IN 查询的 id 上限，
     * 避免把整页 id 塞进一条 SQL 的超长 IN 子句（与 {@code AdminDataScope} 的批量解析器同口径）。
     */
    private static final int CAMPUS_BATCH_SIZE = 500;

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
     *   <li>分页查询候选用户</li>
     *   <li>整页批量预加载候选用户的 campusProfile（S3-6：一次 IN 查询，供 scope 过滤复用）</li>
     *   <li>按 scope 在内存里过滤候选（不再逐候选查库）</li>
     *   <li>批量预加载候选用户的 basicProfile / circleMemberships / 最近发帖数</li>
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
        Optional<UserBasicProfile> myBasicProfileOpt = userBasicProfileRepository.findByUserId(userId);
        Set<String> myTags = myBasicProfileOpt
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
        List<User> allUsers = userRepository.findRecommendableUsers(
                "active", "USER", MIN_RECOMMEND_PROFILE_COMPLETION,
                PageRequest.of(0, recommendationConfig.getCandidatePageSize())).getContent();

        // S3-6（2026-10-30）：校区资料改成「整页一次批量取」，scope 过滤与后续评分共用同一份数据。
        // 原实现里 filterByScope 对每个候选各发一次 findByUserId —— 一页 candidatePageSize（默认 200）
        // 个候选就是 200 次数据库往返，campus_first 无候选放宽到 city 时还会再扫一轮（最坏 2N 次），
        // 而取回的内容与第 10 步批量预加载的 campusProfileMap 完全重复。
        // 结构仿 AdminDataScope.resolveUserCampusNames：批量 + 去重 + null 安全 + 超长 IN 分批。
        Map<Long, UserCampusProfile> pageCampusProfileMap =
                loadCampusProfiles(allUsers.stream().map(User::getId).toList());

        // 9. 根据 scope 过滤候选（纯内存判定，不再逐候选查库）
        String scope = pref.getScope();
        List<User> candidates = allUsers.stream()
                .filter(u -> !excludedUserIds.contains(u.getId()))
                .filter(u -> matchesScope(pageCampusProfileMap.get(u.getId()), scope, myCampusName, myCityName))
                .toList();

        // P0-21 空池兜底：campus_first 同校无候选时放宽到同城，再放宽到全国
        // （排除集合已覆盖自己 + 已 like + 已 pass + 已产生双向信号）
        if (candidates.isEmpty() && "campus_first".equals(scope)) {
            candidates = allUsers.stream()
                    .filter(u -> !excludedUserIds.contains(u.getId()))
                    .filter(u -> matchesScope(pageCampusProfileMap.get(u.getId()), "city", myCampusName, myCityName))
                    .toList();
        }
        if (candidates.isEmpty() && "campus_first".equals(scope)) {
            candidates = allUsers.stream()
                    .filter(u -> !excludedUserIds.contains(u.getId()))
                    .toList();
        }

        // 10. 批量预加载候选用户的关联数据
        List<Long> candidateIds = candidates.stream().map(User::getId).toList();
        // 校区资料第 8 步已整页批量取回，这里只按候选集裁剪（不再产生第 2 次查询）；
        // 交给 Ranker 的 Map 内容与修复前逐字节一致
        Map<Long, UserCampusProfile> campusProfileMap = new HashMap<>();
        for (Long candidateId : candidateIds) {
            UserCampusProfile profile = pageCampusProfileMap.get(candidateId);
            if (profile != null) {
                campusProfileMap.putIfAbsent(candidateId, profile);
            }
        }
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
                    campusProfile, basicProfile, memberships, myBasicProfileOpt.orElse(null));
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

    /**
     * 游客（未登录）推荐计算（2026-08-09 免登录可逛）。
     *
     * <p>与 {@link #doRecommend} 的区别：无个人上下文，不加载用户偏好/校区/兴趣圈，
     * 不计算排除集合（游客无自己/已喜欢/已 pass），scope 视为不限；
     * 评分仅含活跃度加分（最近 N 天发帖数），保证列表非空且新鲜内容靠前。</p>
     *
     * <p>候选池与预加载逻辑与登录用户一致（仅 active + USER，排除管理员/禁用账号；
     * 批量预加载 campusProfile / basicProfile / circleMemberships），
     * 保证游客视图与登录用户视图字段口径一致（实时更新同步）。</p>
     *
     * @return 游客推荐上下文（空个人上下文 + 中性排序候选）
     */
    @Transactional(readOnly = true)
    public RecommendResult doRecommendForGuest() {
        // 候选池：与 doRecommend 一致，仅 status=active 且 role=USER 的普通用户
        List<User> allUsers = userRepository.findRecommendableUsers(
                "active", "USER", MIN_RECOMMEND_PROFILE_COMPLETION,
                PageRequest.of(0, recommendationConfig.getCandidatePageSize())).getContent();

        // 批量预加载候选用户的关联数据（与 doRecommend 相同，保证视图字段完整）
        List<Long> candidateIds = allUsers.stream().map(User::getId).toList();
        // S3-6：与登录链路共用同一个批量解析器（整页一次 IN 查询，去重 + null 安全）
        Map<Long, UserCampusProfile> campusProfileMap = loadCampusProfiles(candidateIds);
        Map<Long, UserBasicProfile> basicProfileMap = userBasicProfileRepository.findByUserIdIn(candidateIds)
                .stream().collect(Collectors.toMap(UserBasicProfile::getUserId, p -> p));
        Map<Long, List<CircleMembership>> membershipMap = loadMemberships(candidateIds);

        // 活跃度加分（与 doRecommend 公式一致：最近 N 天发帖数，封顶 activityMaxPosts 条）
        Map<Long, Long> recentPostCountMap = loadRecentPostCounts(candidateIds);

        List<ScoredUser> scoredUsers = new ArrayList<>();
        for (User candidate : allUsers) {
            long recentPostCount = recentPostCountMap.getOrDefault(candidate.getId(), 0L);
            int score = (int) Math.min(recentPostCount, recommendationConfig.getActivityMaxPosts())
                    * recommendationConfig.getActivityWeight();
            scoredUsers.add(new ScoredUser(candidate, score));
        }

        // 游客无个人上下文：校区/专业/兴趣圈均为空
        return new RecommendResult(
                scoredUsers,
                "",
                "",
                Collections.emptySet(),
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
        // S3-6：逐条查询的公开入口（历史/单条场景与既有测试仍在用）。
        // 推荐主流程不再走这里——doRecommend 用整页批量预加载的 Map 调 matchesScope。
        return matchesScope(userCampusProfileRepository.findByUserId(candidateUserId).orElse(null),
                scope, myCampusName, myCityName);
    }

    /**
     * S3-6 纯内存版 scope 判定：候选用户的校区资料由调用方批量预加载后传入，
     * 本方法不产生任何查询。语义与 {@link #filterByScope(Long, String, String, String)} 一致：
     * <ul>
     *   <li>{@code unlimited} 恒通过；</li>
     *   <li>候选无校区资料（profile 为 null）时，除 {@code city} 外一律放行
     *       （2026-08-07 链路调整：避免未完善资料的人在推荐流中永远不可见）；</li>
     *   <li>{@code campus_first}：当前用户未填校区时放宽为同城；</li>
     *   <li>{@code city}：要求同城。</li>
     * </ul>
     *
     * @param candidateCampus 候选用户校区资料（可为 null，表示未完善）
     * @param scope           推荐范围
     * @param myCampusName    当前用户校区名称
     * @param myCityName      当前用户城市名称
     * @return true 表示候选用户通过过滤
     */
    public boolean matchesScope(UserCampusProfile candidateCampus, String scope,
                                 String myCampusName, String myCityName) {
        if ("unlimited".equals(scope)) {
            return true;
        }

        if (candidateCampus == null) {
            // 2026-08-07 链路调整：候选用户未完善校区资料时，非 city 严格模式一律放行
            // （原实现直接排除，导致未完善资料的用户在推荐流中永远不可见，
            //   配合评分降级可保证列表非空；city 模式依赖城市信息，无依据时排除）
            return !"city".equals(scope);
        }

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
     * 加权维度：同校区 / 同城市 / 同专业 / 兴趣标签 / 共同圈 / 校园优先加成
     * + 2026-08-11 匹配精细化：身高 / 年龄 / 理想型。
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
        return calculateScoreOptimized(candidateUserId, myCampusName, myCityName, myTags, myTimeWindow,
                myDepartmentName, myCircleIds, myAnswerQuestionIds, campusPriorityEnabled,
                campusProfile, basicProfile, memberships, null);
    }

    /**
     * 扩展版：携带当前用户自身基础资料（身高/理想型），供 2026-08-11 匹配精细化加分。
     */
    public int calculateScoreOptimized(Long candidateUserId, String myCampusName,
                                        String myCityName, Set<String> myTags, String myTimeWindow,
                                        String myDepartmentName, Set<Long> myCircleIds,
                                        Set<Long> myAnswerQuestionIds, boolean campusPriorityEnabled,
                                        UserCampusProfile campusProfile, UserBasicProfile basicProfile,
                                        List<CircleMembership> memberships,
                                        UserBasicProfile myBasicProfile) {
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

        // 2026-08-11 匹配精细化：身高匹配（差 ≤5cm 加分，≤10cm 减半）
        if (myBasicProfile != null && basicProfile != null) {
            Integer myHeight = myBasicProfile.getHeight();
            Integer candidateHeight = basicProfile.getHeight();
            if (myHeight != null && candidateHeight != null) {
                int diff = Math.abs(myHeight - candidateHeight);
                int tolerance = recommendationConfig.getHeightDiffTolerance();
                if (diff <= tolerance) {
                    score += recommendationConfig.getHeightWeight();
                } else if (diff <= tolerance * 2) {
                    score += recommendationConfig.getHeightWeight() / 2;
                }
            }

            // 年龄匹配（差 ≤3 岁加分；出生年份近似，缺任一方跳过）
            Integer myBirthYear = myBasicProfile.getBirthYear();
            Integer candidateBirthYear = basicProfile.getBirthYear();
            if (myBirthYear != null && candidateBirthYear != null) {
                int ageDiff = Math.abs(myBirthYear - candidateBirthYear);
                if (ageDiff <= recommendationConfig.getAgeDiffTolerance()) {
                    score += recommendationConfig.getAgeWeight();
                }
            }

            // 理想型匹配：我的 expectedPartner 关键词命中候选兴趣/性格标签，每个 +partnerWeight
            String myExpected = myBasicProfile.getExpectedPartner();
            if (myExpected != null && !myExpected.isBlank()) {
                Set<String> candidateTags = preferenceCalculator.parseInterestTags(basicProfile.getInterestTags());
                if (basicProfile.getPersonalityTags() != null && !basicProfile.getPersonalityTags().isBlank()) {
                    candidateTags = new java.util.HashSet<>(candidateTags);
                    candidateTags.addAll(preferenceCalculator.parseInterestTags(basicProfile.getPersonalityTags()));
                }
                List<String> myKeywords = splitKeywords(myExpected);
                long hitCount = myKeywords.stream().filter(candidateTags::contains).count();
                score += (int) hitCount * recommendationConfig.getPartnerWeight();
            }
        }

        // 校园优先加成：同校用户总分加成。
        // S2-3（2026-10-30）：倍率原先硬编码在这里（score * 1.3），而
        // RecommendationConfig.sameSchoolBoostPercent / sameSchoolBoostEnabled 两个键
        // 已经被后台 RealAdminMatchConfigService 列为可编辑项——于是管理员把加成调成
        // 0.1 或干脆关掉都不生效（配置在界面上能改，算法不读）。现统一读配置：
        // 用户偏好（campusPriority）与全局开关都开时才加成，倍率取自配置。
        if (campusPriorityEnabled && recommendationConfig.isSameSchoolBoostEnabled()
                && campusProfile != null
                && myCampusName != null && !myCampusName.isBlank()
                && myCampusName.equals(campusProfile.getCampusName())) {
            score = (int) (score * (1 + recommendationConfig.getSameSchoolBoostPercent()));
        }

        return score;
    }

    /**
     * 理想型关键词拆分：按空格/逗号/顿号/中文逗号分隔，trim 后去空。
     */
    private static List<String> splitKeywords(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(text.split("[\\s,，、;；]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
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
     * S3-6：批量预加载候选用户的校区资料（userId → UserCampusProfile）。
     *
     * <p>结构仿 {@code AdminDataScope.resolveUserCampusNames(Collection)}：
     * 先过滤 null 并去重，再按 {@link #CAMPUS_BATCH_SIZE} 分批发 IN 查询，
     * 因此「一页多少候选」只决定返回 Map 的大小，不决定查询次数
     * （candidatePageSize=200 → 1 次查询；修复前是 200~400 次单条查询）。</p>
     *
     * <p>与逐条 {@code findByUserId} 的语义差异仅有一处：同一 userId 出现多条资料时
     * 取第一条（原 {@code Collectors.toMap} 会抛 IllegalStateException 直接 500）。
     * 查库异常不吞：与修复前的主流程一致向上抛出，避免静默产出空推荐池。</p>
     *
     * @param userIds 候选用户 ID（允许含 null / 重复 / 为空）
     * @return userId → 校区资料；无资料的 userId 不在 Map 中
     */
    private Map<Long, UserCampusProfile> loadCampusProfiles(Collection<Long> userIds) {
        Map<Long, UserCampusProfile> profileByUserId = new HashMap<>();
        if (userIds == null || userIds.isEmpty()) {
            return profileByUserId;
        }
        List<Long> distinct = userIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        for (int from = 0; from < distinct.size(); from += CAMPUS_BATCH_SIZE) {
            List<Long> batch = distinct.subList(from, Math.min(from + CAMPUS_BATCH_SIZE, distinct.size()));
            for (UserCampusProfile profile : userCampusProfileRepository.findByUserIdIn(batch)) {
                if (profile != null && profile.getUserId() != null) {
                    profileByUserId.putIfAbsent(profile.getUserId(), profile);
                }
            }
        }
        return profileByUserId;
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
