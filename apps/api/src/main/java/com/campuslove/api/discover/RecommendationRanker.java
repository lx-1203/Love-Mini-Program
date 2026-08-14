package com.campuslove.api.discover;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.media.MediaAssetService;
import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.MediaAsset;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.entity.CampusCertification;
import com.campuslove.api.entity.Post;
import com.campuslove.api.wallet.WalletTransactionLog;
import com.campuslove.api.wallet.WalletTransactionLogRepository;
import java.time.Year;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
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

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RecommendationRanker.class);

    /** 热度标签「高参与」阈值（R4-01829）：回复+点赞 >= 100 显示参与人数 */
    private static final int HEAT_HIGH_THRESHOLD = 100;

    /** 热度标签「上升中」阈值（R4-01830）：回复+点赞 >= 20 显示热度上升 */
    private static final int HEAT_RISING_THRESHOLD = 20;

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

    /**
     * 认证记录 Repository（A-27 批量徽章级别预加载）。
     * 可为 null（兼容旧测试构造器），为 null 时降级为逐条查询。
     */
    private final CampusCertificationRepository campusCertificationRepository;

    /**
     * 帖子 Repository（V2026.08.08.0015：动态预览批量加载）。
     * 可为 null（兼容旧测试构造器），为 null 时动态预览为空列表。
     */
    private final PostRepository postRepository;

    /** 悄悄话开场白候选池（V2026.08.08.0016：real 链路 whisper 兜底，与 mock 口径一致） */
    private static final List<String> WHISPER_POOL = List.of(
        "第一次见面可以从一杯咖啡开始，紧张也没关系。",
        "比起闲聊，我更想听听你今天真正在想什么。",
        "希望第一段对话能留下点想象空间。",
        "我偏爱傍晚的校园散步，灯亮起来的时候最适合认识新朋友。"
    );

    /**
     * 钱包流水 Repository（R4-00314/00315：私信/悄悄话解锁状态凭据）。
     * 可为 null（兼容旧测试构造器）：为 null 时 allowMessage 恒为 false、
     * whisper 恒为空（与修复前行为一致，仅丢失解锁放行能力）。
     */
    private final WalletTransactionLogRepository walletTransactionLogRepository;

    /**
     * 媒体资产审核服务（2026-08-09：他人视角照片墙过滤 approved-only）。
     * 可为 null（兼容旧测试构造器）：为 null 时不过滤（保持旧测试行为）。
     */
    private final MediaAssetService mediaAssetService;

    @org.springframework.beans.factory.annotation.Autowired
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
            UserPreferenceCalculator preferenceCalculator,
            CampusCertificationRepository campusCertificationRepository,
            PostRepository postRepository,
            WalletTransactionLogRepository walletTransactionLogRepository,
            MediaAssetService mediaAssetService) {
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
        this.campusCertificationRepository = campusCertificationRepository;
        this.postRepository = postRepository;
        this.walletTransactionLogRepository = walletTransactionLogRepository;
        this.mediaAssetService = mediaAssetService;
    }

    /**
     * 解析用户悄悄话开场白文案（R4-00314 解锁接口专用）。
     *
     * <p>悄悄话内容不再随推荐列表明文下发，仅在本方法被解锁接口
     * （GET /recommendations/{userId}/whisper，付费解锁后）调用时返回。
     * 与 {@link MockRecommendationService#WHISPER_POOL} 口径一致：按 userId
     * 稳定取模，同一用户文案恒定。</p>
     *
     * @param userId 目标用户 ID
     * @return 悄悄话文案；userId 为 null 时返回 null
     */
    public String resolveWhisper(Long userId) {
        if (userId == null) {
            return null;
        }
        // R4-00351：Math.floorMod 替代 Math.abs(hashCode()) % n——Integer.MIN_VALUE
        // 取 abs 仍为负数会导致索引越界 500
        return WHISPER_POOL.get(Math.floorMod(userId.hashCode(), WHISPER_POOL.size()));
    }

    /**
     * 兼容旧测试的构造器（campusCertificationRepository 与 postRepository 为 null，
     * 批量徽章级别预加载降级为逐条查询，动态预览为空列表）。
     *
     * @deprecated 仅单元测试使用；Spring 注入请使用带 CampusCertificationRepository / PostRepository 的构造器。
     */
    @Deprecated
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
        this(recommendationConfig, userCampusProfileRepository, userBasicProfileRepository,
                userScheduleProfileRepository, circleMembershipRepository, heartSignalRepository,
                likeRepository, userRepository, campusCertificationService,
                preferenceCalculator, null, null, null, null);
    }

    /**
     * 兼容旧测试的构造器（walletTransactionLogRepository 为 null，
     * allowMessage 恒为 false、whisper 恒为空——与修复前行为一致）。
     *
     * @deprecated 仅单元测试使用；Spring 注入请使用带 WalletTransactionLogRepository 的构造器。
     */
    @Deprecated
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
            UserPreferenceCalculator preferenceCalculator,
            CampusCertificationRepository campusCertificationRepository,
            PostRepository postRepository) {
        this(recommendationConfig, userCampusProfileRepository, userBasicProfileRepository,
                userScheduleProfileRepository, circleMembershipRepository, heartSignalRepository,
                likeRepository, userRepository, campusCertificationService,
                preferenceCalculator, campusCertificationRepository, postRepository, null, null);
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
        return rankAndConvert(scoredUsers, myCampusName, myDepartmentName, myCircleIds,
                campusProfileMap, basicProfileMap, membershipMap, null);
    }

    /**
     * 带当前用户上下文的转换（R4-00315）。
     *
     * <p>currentUserId 非空且 {@link WalletTransactionLogRepository} 可用时，
     * 批量预加载「已解锁私信/悄悄话」的目标用户 ID 集合，据实填充
     * {@code allowMessage}（已解锁=可私信）与 {@code whisperSent}；
     * 否则与旧行为一致（allowMessage=false / whisperSent=null）。</p>
     */
    public List<RecommendedPersonView> rankAndConvert(
            List<RecommendationStrategy.ScoredUser> scoredUsers,
            String myCampusName, String myDepartmentName, Set<Long> myCircleIds,
            java.util.Map<Long, UserCampusProfile> campusProfileMap,
            java.util.Map<Long, UserBasicProfile> basicProfileMap,
            java.util.Map<Long, List<CircleMembership>> membershipMap,
            Long currentUserId) {
        scoredUsers.sort(Comparator.comparingInt(RecommendationStrategy.ScoredUser::score).reversed());

        List<RecommendationStrategy.ScoredUser> topResults = scoredUsers.stream()
                .limit(recommendationConfig.getDailyLimit())
                .toList();

        // A-27 修复：批量预加载该批候选的认证徽章级别（一次查询），
        // 替代逐候选调用 getVerificationBadgeLevel 的 N+1 查询
        List<Long> candidateIds = topResults.stream()
                .map(su -> su.user().getId()).filter(java.util.Objects::nonNull).toList();
        Map<Long, String> badgeLevelMap = loadBadgeLevelMap(candidateIds);

        // V2026.08.08.0015：批量加载候选用户最新动态（一次查询，按创建时间倒序），
        // 内存按作者分组取每条最新动态，替代逐候选查询的 N+1
        Map<Long, RecommendedPersonView.RecentPostView> recentPostMap =
                loadRecentPostMap(candidateIds);

        // R4-00315：批量预加载已解锁私信/悄悄话的目标 ID 集合（一次查询）
        Set<Long> unlockedMessageIds = loadUnlockedMessageIds(currentUserId, candidateIds);

        return topResults.stream()
                .map(su -> toRecommendedPersonView(
                        su.user(), myCampusName, myDepartmentName, myCircleIds,
                        campusProfileMap.get(su.user().getId()),
                        basicProfileMap.get(su.user().getId()),
                        membershipMap.getOrDefault(su.user().getId(), List.of()),
                        badgeLevelMap, recentPostMap, unlockedMessageIds))
                .toList();
    }

    /**
     * 批量查询当前用户对候选用户「已解锁私信/悄悄话」的目标 ID 集合。
     *
     * <p>R4-00315：以 wallet_transaction_log 中 relatedType ∈ {MESSAGE_UNLOCK,
     * WHISPER_UNLOCK} 且 relatedId=目标用户 ID 的流水作为解锁凭据（客户端经
     * POST /wallet/deduct 扣费写入，order_id 唯一索引保证不重复扣费）。</p>
     *
     * @param currentUserId 当前用户 ID（null 时返回空集合）
     * @param candidateIds  候选用户 ID 列表
     * @return 已解锁目标用户 ID 集合
     */
    private Set<Long> loadUnlockedMessageIds(Long currentUserId, List<Long> candidateIds) {
        if (currentUserId == null || walletTransactionLogRepository == null
                || candidateIds == null || candidateIds.isEmpty()) {
            return Collections.emptySet();
        }
        List<String> candidateIdStrs = candidateIds.stream()
                .map(String::valueOf)
                .distinct()
                .toList();
        try {
            return walletTransactionLogRepository
                    .findByUserIdAndRelatedTypeInAndRelatedIdIn(
                            currentUserId,
                            List.of(WalletTransactionLog.RELATED_TYPE_MESSAGE_UNLOCK,
                                    WalletTransactionLog.RELATED_TYPE_WHISPER_UNLOCK),
                            candidateIdStrs)
                    .stream()
                    .map(WalletTransactionLog::getRelatedId)
                    .filter(java.util.Objects::nonNull)
                    .map(id -> {
                        try {
                            return Long.valueOf(id);
                        } catch (NumberFormatException e) {
                            return null;
                        }
                    })
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toSet());
        } catch (RuntimeException e) {
            // 解锁状态查询失败降级为空集合（不阻断推荐主流程）
            log.warn("查询已解锁私信/悄悄话目标集合失败，降级为空集合：userId={}, error={}",
                    currentUserId, e.getMessage());
            return Collections.emptySet();
        }
    }

    /**
     * 简化重载：直接接收 {@link RecommendationStrategy.RecommendResult}，
     * 避免调用方在拆解 result 与传递参数时出错。
     *
     * @param result 推荐算法上下文结果
     * @return 推荐人物视图列表（已截断到 dailyLimit）
     */
    public List<RecommendedPersonView> rankAndConvert(RecommendationStrategy.RecommendResult result) {
        return rankAndConvert(result, null);
    }

    /**
     * 简化重载（R4-00315）：携带当前用户 ID，allowMessage / whisperSent 按解锁集合据实返回。
     *
     * @param result        推荐算法上下文结果
     * @param currentUserId 当前用户 ID（null 时 allowMessage 恒为 false）
     * @return 推荐人物视图列表（已截断到 dailyLimit）
     */
    public List<RecommendedPersonView> rankAndConvert(
            RecommendationStrategy.RecommendResult result, Long currentUserId) {
        return rankAndConvert(
                result.scoredUsers(),
                result.myCampusName(),
                result.myDepartmentName(),
                result.myCircleIds(),
                result.campusProfileMap(),
                result.basicProfileMap(),
                result.membershipMap(),
                currentUserId);
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
        // 无批量 Map 场景（单条查询/历史），badge 逐条降级查询、动态预览为空
        return toRecommendedPersonView(user, myCampusName, myDepartmentName, myCircleIds,
                campusProfile, basicProfile, memberships, Collections.emptyMap(),
                Collections.emptyMap());
    }

    /**
     * 将 User 实体转换为 RecommendedPersonView（使用预加载数据，避免 N+1）。
     *
     * <p>A-27 扩展：接收批量预加载的认证徽章级别 Map（userId → badge level），
     * 避免逐候选调用 {@link CampusCertificationService#getVerificationBadgeLevel}。</p>
     *
     * @param badgeLevelMap userId → 认证徽章级别（school/email/idcard/none）的 Map，
     *                      为空 Map 时降级为逐条查询
     */
    public RecommendedPersonView toRecommendedPersonView(User user,
            String myCampusName, String myDepartmentName, Set<Long> myCircleIds,
            UserCampusProfile campusProfile, UserBasicProfile basicProfile,
            List<CircleMembership> memberships, Map<Long, String> badgeLevelMap) {
        return toRecommendedPersonView(user, myCampusName, myDepartmentName, myCircleIds,
                campusProfile, basicProfile, memberships, badgeLevelMap,
                Collections.emptyMap());
    }

    /**
     * 将 User 实体转换为 RecommendedPersonView（使用预加载数据，避免 N+1）。
     *
     * <p>V2026.08.08.0015 扩展：接收批量预加载的最新动态 Map（userId → 最新动态预览），
     * 为空 Map 时动态预览为空列表（历史/单条查询场景）。</p>
     *
     * @param badgeLevelMap   userId → 认证徽章级别 Map，为空时降级为逐条查询
     * @param recentPostMap   userId → 最新动态预览 Map，为空时动态预览为空列表
     */
    public RecommendedPersonView toRecommendedPersonView(User user,
            String myCampusName, String myDepartmentName, Set<Long> myCircleIds,
            UserCampusProfile campusProfile, UserBasicProfile basicProfile,
            List<CircleMembership> memberships, Map<Long, String> badgeLevelMap,
            Map<Long, RecommendedPersonView.RecentPostView> recentPostMap) {
        return toRecommendedPersonView(user, myCampusName, myDepartmentName, myCircleIds,
                campusProfile, basicProfile, memberships, badgeLevelMap, recentPostMap,
                Collections.emptySet());
    }

    /**
     * R4-00315 扩展：携带「已解锁私信/悄悄话」目标 ID 集合。
     *
     * @param unlockedMessageIds 当前用户已解锁（MESSAGE_UNLOCK/WHISPER_UNLOCK 流水）的目标用户 ID 集合
     */
    public RecommendedPersonView toRecommendedPersonView(User user,
            String myCampusName, String myDepartmentName, Set<Long> myCircleIds,
            UserCampusProfile campusProfile, UserBasicProfile basicProfile,
            List<CircleMembership> memberships, Map<Long, String> badgeLevelMap,
            Map<Long, RecommendedPersonView.RecentPostView> recentPostMap,
            Set<Long> unlockedMessageIds) {
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
        // 2026-08-09：他人视角过滤——照片墙仅展示审核通过的图片（pending/rejected 对他人不可见）。
        // mediaAssetService 为 null（旧测试构造器）时不过滤，保持旧测试行为。
        if (!photoGallery.isEmpty() && mediaAssetService != null) {
            Map<String, MediaAsset> assetMap = mediaAssetService.findByUrls(photoGallery);
            photoGallery = photoGallery.stream()
                    .filter(url -> {
                        MediaAsset asset = assetMap.get(url);
                        return asset == null
                                || MediaAssetService.AUDIT_APPROVED.equals(asset.getAuditStatus());
                    })
                    .toList();
        }
        String halfBodyPhotoUrl = basicProfile != null ? basicProfile.getHalfBodyPhotoUrl() : null;
        String personalVideoUrl = basicProfile != null ? basicProfile.getPersonalVideoUrl() : null;
        String verificationBadgeLevel = resolveBadgeLevelSafe(user.getId(), badgeLevelMap);

        // ---- Phase Feedback1：卡片重设计扩展字段（可空，前端按缺省兜底） ----
        // 展示 ID：User 无独立字段，稳定推导为 CL-{id}（同 mock 口径）
        String displayId = user.getId() != null ? "CL-" + user.getId() : null;
        // 距离文案：同校为空；异地按稳定 hash 给 km（真实距离由推荐服务计算）
        String distanceText = isSameSchool ? null : deriveDistanceText(user);
        // 活跃状态：离线为默认，在线用户由前端二次查询回填
        String activeStatusText = "offline";
        // 双重认证：由认证徽章级别推导（有认证即视为机器认证；school/idcard 视为有人工认证）
        String resolvedBadge = resolveBadgeLevelSafe(user.getId(), badgeLevelMap);
        boolean machineVerified = !"none".equals(resolvedBadge);
        boolean humanVerified = "school".equals(resolvedBadge) || "idcard".equals(resolvedBadge);
        // ---- V2026.08.08.0015：完整画像字段（真实数据填充，不再占位） ----
        // 性格标签：personality_tags JSON → List
        List<String> personality = basicProfile != null
                ? preferenceCalculator.parseStringList(basicProfile.getPersonalityTags())
                : List.of();
        String mbti = basicProfile != null ? basicProfile.getMbti() : null;
        // R4-00314：悄悄话（付费可见语义）不再随推荐列表明文下发——
        // whisper 恒为 null，由专用解锁接口（GET /recommendations/{userId}/whisper）在
        // 用户付费解锁（MESSAGE_UNLOCK/WHISPER_UNLOCK 流水）后单独返回。
        String whisper = null;
        // R4-00315：已解锁（含悄悄话解锁）即视为已发送过悄悄话，据实返回
        boolean messageUnlocked = unlockedMessageIds != null
                && user.getId() != null && unlockedMessageIds.contains(user.getId());
        Boolean whisperSent = messageUnlocked ? Boolean.TRUE : null;
        // 动态预览：从批量预加载的 Map 取该用户最新一条动态（空 Map 时为空列表）
        List<RecommendedPersonView.RecentPostView> recentPosts =
                recentPostMap != null && recentPostMap.containsKey(user.getId())
                        ? List.of(recentPostMap.get(user.getId()))
                        : List.of();
        String expectedPartner = basicProfile != null ? basicProfile.getExpectedPartner() : null;
        // R4-00315：私信权限据实返回——当前用户已为该目标付费解锁私信/悄悄话
        // （wallet_transaction_log 存在 MESSAGE_UNLOCK/WHISPER_UNLOCK 流水）则允许，
        // 否则 false（前端展示解锁流程）；解锁校验在服务端生效，杜绝「扣费无消费方」。
        Boolean allowMessage = messageUnlocked ? Boolean.TRUE : Boolean.FALSE;
        // IP 属地：由籍贯省/市推导（如 "江苏 · 南京"），与 mock 口径一致
        String ipLocation = deriveIpLocation(basicProfile);

        // ---- V2026.08.08.0015：卡片完整字段 ----
        String occupation = basicProfile != null ? basicProfile.getOccupation() : null;
        // R4-00337：月收入档位不再随公开推荐视图下发（敏感经济信息），
        // 前端已含 incomeRange 缺省回退（"--"），UserBasicProfile.incomeRange 仍保留
        // 供用户本人资料页/后续付费可见场景使用。
        // 年龄：出生年份推导（2026 口径），无出生年份时为空
        Integer age = basicProfile != null && basicProfile.getBirthYear() != null
                ? Year.now(TimeZones.BUSINESS).getValue() - basicProfile.getBirthYear()
                : null;
        // 注册时间：ISO 字符串（供「最新注册」排序）
        String registeredAt = user.getCreatedAt() != null
                ? user.getCreatedAt().toString()
                : null;
        // V3（2026-08-12）：他人主页背景——主页背景属公开展示字段，随推荐视图下发
        String profileBackgroundUrl = basicProfile != null
                ? basicProfile.getProfileBackgroundUrl()
                : null;

        return new RecommendedPersonView(
                user.getId(),
                name,
                initials,
                headline,
                commonGround,
                availability,
                campusName,
                resolveAvatarUrl(user),
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
                verificationBadgeLevel,
                displayId,
                distanceText,
                activeStatusText,
                machineVerified,
                humanVerified,
                personality,
                mbti,
                whisper,
                whisperSent,
                recentPosts,
                expectedPartner,
                allowMessage,
                ipLocation,
                occupation,
                age,
                registeredAt,
                profileBackgroundUrl
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
        // R4-01829/01830：热度分层阈值收敛为命名常量，调优无需改散落字面量
        if (total >= HEAT_HIGH_THRESHOLD) {
            return total + " 人参与";
        } else if (total >= HEAT_RISING_THRESHOLD) {
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
     * 安全查询认证徽章级别（A-27 批量版）。
     *
     * <p>优先从批量预加载的 Map 取数（O(1)，无 N+1）；Map 为空
     * （单条/历史场景或未启用批量预加载）时降级为逐条调用
     * {@link CampusCertificationService#getVerificationBadgeLevel}。</p>
     *
     * @param userId        用户 ID
     * @param badgeLevelMap 批量预加载的 userId → 认证徽章级别 Map（可为空 Map）
     * @return 徽章级别字符串（school/email/idcard/none）
     */
    private String resolveBadgeLevelSafe(Long userId, Map<Long, String> badgeLevelMap) {
        if (badgeLevelMap != null && !badgeLevelMap.isEmpty()) {
            return badgeLevelMap.getOrDefault(userId, "none");
        }
        try {
            return campusCertificationService.getVerificationBadgeLevel(userId);
        } catch (DataAccessException e) {
            return "none";
        }
    }

    /**
     * A-27 修复：批量预加载该批候选用户的认证徽章级别。
     *
     * <p>将原逐候选 {@code getVerificationBadgeLevel} 的 N 次查询压缩为 2 次：
     * 一次查全部 APPROVED 校园认证记录 + 一次批量查基本资料（email/idcard 标志）。
     * 判定优先级与单条实现一致：school &gt; email &gt; idcard &gt; none。</p>
     *
     * @param userIds 候选用户 ID 列表
     * @return userId → 认证徽章级别 的 Map（无候选或降级场景返回空 Map）
     */
    private Map<Long, String> loadBadgeLevelMap(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        if (campusCertificationRepository == null) {
            // 兼容旧测试构造器：未注入 Repository 时返回空 Map，由调用方逐条降级
            return Collections.emptyMap();
        }
        Set<Long> idSet = new HashSet<>(userIds);
        Map<Long, String> result = new HashMap<>();
        try {
            // 1. 校园认证 APPROVED（school 优先级最高）：R4-00336 改为 WHERE userId IN 下推
            //    SQL，替代全表加载 APPROVED 记录后内存过滤（避免每次推荐全表扫描认证表）
            for (CampusCertification cert : campusCertificationRepository
                    .findByStatusAndUserIdIn("APPROVED", idSet)) {
                if (cert.getUserId() != null) {
                    result.put(cert.getUserId(), "school");
                }
            }
            // 2. email / idcard 标志（基本资料批量查询）
            for (UserBasicProfile bp : userBasicProfileRepository.findByUserIdIn(new ArrayList<>(idSet))) {
                if (result.containsKey(bp.getUserId())) {
                    continue; // school 已命中，优先级最高
                }
                if (Boolean.TRUE.equals(bp.getEmailVerified())) {
                    result.put(bp.getUserId(), "email");
                } else if (Boolean.TRUE.equals(bp.getIdCardVerified())) {
                    result.put(bp.getUserId(), "idcard");
                }
            }
        } catch (DataAccessException e) {
            // 认证查询失败时返回空 Map，调用方逐条降级（与单条场景行为一致）
            return Collections.emptyMap();
        }
        return result;
    }

    /**
     * 异地用户距离文案：按 userId 稳定推导（无实时定位数据时使用确定性近似值，
     * 避免每次刷新距离抖动）。同校用户不会走到此方法（上游已置 null）。
     */
    private String deriveDistanceText(User user) {
        Long id = user.getId();
        if (id == null) {
            return null;
        }
        // R4-00351：Math.floorMod 替代 Math.abs(hashCode()) % n（Integer.MIN_VALUE 时仍为负）
        double km = 3.2 + Math.floorMod(id.hashCode(), 120) / 10.0;
        return String.format(java.util.Locale.ROOT, "%.1fkm", km);
    }

    /**
     * 头像兜底（V2026.08.08.0016）：avatarUrl 为空或为外链时，回退到小程序包内
     * 本地素材路径（62 张按 userId 稳定映射）。mp 端外链（pexels 等）加载不可靠，
     * 本地包路径保证卡片大图 100% 可显示。
     */
    private String resolveAvatarUrl(User user) {
        String avatarUrl = user.getAvatarUrl();
        if (avatarUrl != null && (avatarUrl.startsWith("/static") || avatarUrl.startsWith("http"))) {
            return avatarUrl;
        }
        Long id = user.getId();
        if (id == null) {
            return "/static/assets/images/avatars/avatar-1.jpg";
        }
        // R4-00351：Math.floorMod 替代 Math.abs(hashCode()) % n（Integer.MIN_VALUE 时仍为负）
        return "/static/assets/images/avatars/avatar-" + (1 + Math.floorMod(id.hashCode(), 62)) + ".jpg";
    }

    /**
     * V2026.08.08.0015：批量加载候选用户的最新动态预览（一次查询避免 N+1）。
     *
     * <p>按创建时间倒序取「候选数 × 2」条（种子数据每用户最多 2 条），
     * 内存中按作者分组、每组取第一条（即该作者最新动态）。
     * postRepository 为 null（旧测试构造器）或查询失败时返回空 Map。</p>
     *
     * @param userIds 候选用户 ID 列表
     * @return userId → 最新动态预览 的 Map
     */
    private Map<Long, RecommendedPersonView.RecentPostView> loadRecentPostMap(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty() || postRepository == null) {
            return Collections.emptyMap();
        }
        try {
            List<Post> posts = postRepository
                    .findByAuthorIdInAndStatusOrderByCreatedAtDesc(
                            new ArrayList<>(userIds),
                            Post.PostStatus.active,
                            PageRequest.of(0, Math.max(userIds.size() * 2, 10)))
                    .getContent();
            Map<Long, RecommendedPersonView.RecentPostView> result = new HashMap<>();
            for (Post post : posts) {
                // 已按 createdAt 倒序，第一个出现的作者即其最新动态
                result.putIfAbsent(post.getAuthorId(), toRecentPostView(post));
            }
            return result;
        } catch (DataAccessException e) {
            // 动态查询失败时返回空 Map，动态预览为空列表（不影响推荐主流程）
            return Collections.emptyMap();
        }
    }

    /**
     * V2026.08.08.0015：将 Post 实体转换为动态预览视图。
     */
    private RecommendedPersonView.RecentPostView toRecentPostView(Post post) {
        if (post == null) {
            return null;
        }
        List<String> images = post.getImages() != null
                ? preferenceCalculator.parseStringList(post.getImages())
                : List.of();
        return new RecommendedPersonView.RecentPostView(
                String.valueOf(post.getId()),
                post.getContent() != null ? post.getContent() : "",
                images,
                post.getLikesCount() != null ? post.getLikesCount() : 0L,
                post.getCommentsCount() != null ? post.getCommentsCount() : 0L,
                false,
                post.getCreatedAt() != null ? post.getCreatedAt().toString() : null);
    }

    /**
     * V2026.08.08.0015：IP 属地由籍贯省/市推导（如 "江苏 · 南京"）。
     * 仅有省份时返回省名；均无时返回 null（前端隐藏该行）。
     */
    private String deriveIpLocation(UserBasicProfile basicProfile) {
        if (basicProfile == null) {
            return null;
        }
        String province = basicProfile.getHometownProvince();
        String city = basicProfile.getHometownCity();
        if (province == null || province.isBlank()) {
            return null;
        }
        if (city == null || city.isBlank()) {
            return province;
        }
        return province + " · " + city;
    }
}
