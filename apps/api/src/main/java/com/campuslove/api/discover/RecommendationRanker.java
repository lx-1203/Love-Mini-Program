package com.campuslove.api.discover;

import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;

/**
 * 推荐结果排序与视图转换组件。
 *
 * <p>职责：</p>
 * <ul>
 *   <li>对 {@link RecommendationStrategy.ScoredUser} 列表按分数降序排序并截断到 dailyLimit</li>
 *   <li>将 User 实体转换为 {@link RecommendedPersonView}（含同校/同专业/共同圈等标记）</li>
 *   <li>提供推荐历史（{@link #buildHistory}) 转换辅助</li>
 *   <li>提供内容截断、热度标签等字符串辅助方法</li>
 * </ul>
 *
 * <p>从 RealRecommendationService 拆分而来（Task 4.1.4）。
 * 与 Strategy 解耦：Strategy 只产生分数，Ranker 负责排序后转换为视图。</p>
 */
@Profile("real")
@Component
public class RecommendationRanker {

    private final RecommendationConfig recommendationConfig;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final CircleMembershipRepository circleMembershipRepository;
    private final HeartSignalRepository heartSignalRepository;
    private final LikeRepository likeRepository;
    private final UserRepository userRepository;
    private final CampusCertificationService campusCertificationService;
    private final UserPreferenceCalculator preferenceCalculator;

    public RecommendationRanker(
            RecommendationConfig recommendationConfig,
            UserCampusProfileRepository userCampusProfileRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            CircleMembershipRepository circleMembershipRepository,
            HeartSignalRepository heartSignalRepository,
            LikeRepository likeRepository,
            UserRepository userRepository,
            CampusCertificationService campusCertificationService,
            UserPreferenceCalculator preferenceCalculator) {
        this.recommendationConfig = recommendationConfig;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.heartSignalRepository = heartSignalRepository;
        this.likeRepository = likeRepository;
        this.userRepository = userRepository;
        this.campusCertificationService = campusCertificationService;
        this.preferenceCalculator = preferenceCalculator;
    }

    // ---- 排序与截断 ----

    /**
     * 对评分后的候选用户按分数降序排序，截断到 dailyLimit 个。
     * 转换为 {@link RecommendedPersonView} 列表。
     *
     * @param scoredUsers   评分后的候选列表
     * @param myCampusName  当前用户校区名称
     * @param myDepartmentName 当前用户专业/院系名称
     * @param myCircleIds   当前用户兴趣圈 ID 集合
     * @param campusProfileMap 预加载的候选用户校区资料 Map
     * @param basicProfileMap  预加载的候选用户基础资料 Map
     * @param membershipMap   预加载的候选用户圈子成员关系 Map
     * @return 推荐人物视图列表（已截断到 dailyLimit）
     */
    public List<RecommendedPersonView> rankAndConvert(
            List<RecommendationStrategy.ScoredUser> scoredUsers,
            String myCampusName, String myDepartmentName, Set<Long> myCircleIds,
            java.util.Map<Long, UserCampusProfile> campusProfileMap,
            java.util.Map<Long, UserBasicProfile> basicProfileMap,
            java.util.Map<Long, List<CircleMembership>> membershipMap) {
        scoredUsers.sort(Comparator.comparingInt(RecommendationStrategy.ScoredUser::score).reversed());

        List<RecommendationStrategy.ScoredUser> topResults = scoredUsers.stream()
                .limit(recommendationConfig.getDailyLimit())
                .toList();

        return topResults.stream()
                .map(su -> toRecommendedPersonView(
                        su.user(), myCampusName, myDepartmentName, myCircleIds,
                        campusProfileMap.get(su.user().getId()),
                        basicProfileMap.get(su.user().getId()),
                        membershipMap.getOrDefault(su.user().getId(), List.of())))
                .toList();
    }

    /**
     * 简化重载：直接接收 {@link RecommendationStrategy.RecommendResult}，
     * 避免调用方在拆解 result 与传递参数时出错。
     *
     * @param result 推荐算法上下文结果
     * @return 推荐人物视图列表（已截断到 dailyLimit）
     */
    public List<RecommendedPersonView> rankAndConvert(RecommendationStrategy.RecommendResult result) {
        return rankAndConvert(
                result.scoredUsers(),
                result.myCampusName(),
                result.myDepartmentName(),
                result.myCircleIds(),
                result.campusProfileMap(),
                result.basicProfileMap(),
                result.membershipMap());
    }

    // ---- 推荐历史构建 ----

    /**
     * 构建推荐历史列表。
     * 基于用户的 Like 记录和 HeartSignal 记录，按互动时间倒序返回用户曾经互动过的推荐人物。
     *
     * @param userId 当前用户 ID
     * @return 历史推荐人物视图列表
     */
    public List<RecommendedPersonView> buildHistory(Long userId) {
        // 预加载当前用户的校区和专业信息
        Optional<UserCampusProfile> myCampusOpt = userCampusProfileRepository.findByUserId(userId);
        String myCampusName = myCampusOpt.map(UserCampusProfile::getCampusName).orElse("");
        String myDepartmentName = myCampusOpt.map(UserCampusProfile::getDepartmentName).orElse("");

        // 预加载当前用户的兴趣圈 ID
        Set<Long> myCircleIdsTemp;
        try {
            List<CircleMembership> myMemberships = circleMembershipRepository.findByUserId(userId);
            myCircleIdsTemp = myMemberships.stream()
                    .map(m -> m.getCircle().getId())
                    .collect(Collectors.toSet());
        } catch (DataAccessException e) {
            // 数据库查询失败时降级为空集合，不影响推荐主流程
            myCircleIdsTemp = Collections.emptySet();
        }
        final Set<Long> myCircleIds = myCircleIdsTemp;

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
        } catch (DataAccessException e) {
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
        } catch (DataAccessException e) {
            // Like 查询失败时忽略
        }

        return historyUsers.stream()
                .limit(recommendationConfig.getDailyLimit())
                .map(u -> toRecommendedPersonView(u, myCampusName, myDepartmentName, myCircleIds))
                .toList();
    }

    // ---- 视图转换 ----

    /**
     * 将 User 实体转换为 RecommendedPersonView（使用预加载数据，避免 N+1）。
     *
     * @param user             用户实体
     * @param myCampusName     当前用户校区名称
     * @param myDepartmentName 当前用户专业/院系名称
     * @param myCircleIds      当前用户兴趣圈 ID 集合
     * @param campusProfile    预加载的候选用户校区资料（可为 null）
     * @param basicProfile     预加载的候选用户基础资料（可为 null）
     * @param memberships      预加载的候选用户圈子成员关系（可为空列表）
     * @return 推荐人物视图
     */
    public RecommendedPersonView toRecommendedPersonView(User user,
            String myCampusName, String myDepartmentName, Set<Long> myCircleIds,
            UserCampusProfile campusProfile, UserBasicProfile basicProfile,
            List<CircleMembership> memberships) {
        String name = user.getNickname() != null ? user.getNickname() : "";
        String initials = extractInitials(name);
        String headline = user.getBio() != null ? user.getBio() : "";

        String campusName = campusProfile != null ? campusProfile.getCampusName() : "";
        List<String> tags = basicProfile != null
                ? preferenceCalculator.parseInterestTags(basicProfile.getInterestTags()).stream().toList()
                : List.of();
        String bio = basicProfile != null && basicProfile.getBio() != null
                ? basicProfile.getBio()
                : (user.getBio() != null ? user.getBio() : "");

        List<String> images = Collections.emptyList();
        String commonGround = "";
        String availability = "";

        // 同校判断
        boolean isSameSchool = false;
        if (campusProfile != null && myCampusName != null && !myCampusName.isBlank()) {
            isSameSchool = myCampusName.equals(campusProfile.getCampusName());
        }

        // 同专业判断
        boolean isSameMajor = false;
        if (campusProfile != null && myDepartmentName != null && !myDepartmentName.isBlank()) {
            isSameMajor = myDepartmentName.equals(campusProfile.getDepartmentName());
        }

        // 共同兴趣圈数量
        int commonCircleCount = 0;
        if (!myCircleIds.isEmpty()) {
            Set<Long> candidateCircleIds = memberships.stream()
                    .map(m -> m.getCircle().getId())
                    .collect(Collectors.toSet());
            commonCircleCount = (int) myCircleIds.stream()
                    .filter(candidateCircleIds::contains)
                    .count();
        }

        Integer height = basicProfile != null ? basicProfile.getHeight() : null;
        String educationLevel = basicProfile != null ? basicProfile.getEducationLevel() : null;
        List<String> photoGallery = basicProfile != null
                ? preferenceCalculator.parseStringList(basicProfile.getPhotoGallery())
                : List.of();
        String halfBodyPhotoUrl = basicProfile != null ? basicProfile.getHalfBodyPhotoUrl() : null;
        String personalVideoUrl = basicProfile != null ? basicProfile.getPersonalVideoUrl() : null;
        String verificationBadgeLevel = resolveBadgeLevelSafe(user.getId());

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
                commonCircleCount,
                height,
                educationLevel,
                photoGallery,
                halfBodyPhotoUrl,
                personalVideoUrl,
                verificationBadgeLevel
        );
    }

    /**
     * 将 User 实体转换为 RecommendedPersonView（无预加载数据，单条查询场景）。
     * 用于 {@link #buildHistory} 等需要逐条查询的场景。
     */
    public RecommendedPersonView toRecommendedPersonView(User user,
            String myCampusName, String myDepartmentName, Set<Long> myCircleIds) {
        UserCampusProfile campusProfile = userCampusProfileRepository.findByUserId(user.getId()).orElse(null);
        UserBasicProfile basicProfile = userBasicProfileRepository.findByUserId(user.getId()).orElse(null);
        List<CircleMembership> memberships;
        try {
            memberships = circleMembershipRepository.findByUserId(user.getId());
        } catch (DataAccessException e) {
            memberships = List.of();
        }
        return toRecommendedPersonView(user, myCampusName, myDepartmentName, myCircleIds,
                campusProfile, basicProfile, memberships);
    }

    // ---- 字符串辅助方法 ----

    /**
     * 提取姓名首字母（简化实现：取第一个字符）。
     */
    public String extractInitials(String name) {
        if (name == null || name.isBlank()) {
            return "";
        }
        return name.substring(0, 1);
    }

    /**
     * 截断内容到指定最大长度，超出部分用省略号代替。
     */
    public String truncateContent(String content, int maxLength) {
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
     */
    public String buildHeatLabel(Integer replyCount, int likesCount) {
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

    /**
     * 暴露 RecommendationConfig 的 discussionLimit 配置。
     * 供 {@link RealRecommendationService} 复用，避免重复注入 RecommendationConfig。
     *
     * @return 讨论推荐数量上限
     */
    public int getDiscussionLimit() {
        return recommendationConfig.getDiscussionLimit();
    }

    // ---- 私有辅助 ----

    /**
     * 安全查询认证徽章级别。
     * 委托 CampusCertificationService，捕获数据访问异常以避免推荐流程被认证查询失败影响。
     */
    private String resolveBadgeLevelSafe(Long userId) {
        try {
            return campusCertificationService.getVerificationBadgeLevel(userId);
        } catch (DataAccessException e) {
            return "none";
        }
    }
}
