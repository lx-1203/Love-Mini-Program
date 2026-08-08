package com.campuslove.api.match;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.chat.PrivateMessageService;
import com.campuslove.api.common.DailyLimitExceededException;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.wallet.WalletUnlock;
import com.campuslove.api.wallet.WalletUnlockService;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.PassRecord;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.Visitor;
import com.campuslove.api.mq.MessageProducer;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.growth.SocialProgressService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实匹配服务实现（Task 4.2.1 重构）。
 *
 * <p>原 1273 行 God Class 已拆分为 3 个组件：{@link MatchEngine}（算法）、
 * {@link MatchPolicy}（策略/限额）、{@link MatchRecorder}（记录/通知）。
 * 本类保留匹配流程编排与查询类方法，所有 public 方法签名保持向后兼容。</p>
 */
@Profile("real")
@Service
public class RealMatchService implements MatchService {

    private static final Logger log = LoggerFactory.getLogger(RealMatchService.class);

    private final MatchConfig matchConfig;
    private final LikeRepository likeRepository;
    private final HeartSignalRepository heartSignalRepository;
    private final UserRepository userRepository;
    private final MatchEngine matchEngine;
    private final MatchPolicy matchPolicy;
    private final MatchRecorder matchRecorder;
    /**
     * 访客记录 Repository（FIN HIGH-15 新增）。
     * 用于 {@link #markVisitorRead} 的 visitedUserId 归属校验。
     */
    private final com.campuslove.api.repository.VisitorRepository visitorRepository;

    /**
     * P0-17：商业化解锁服务，用于 liked-me / visitors 列表附加 unlocked 状态字段。
     * 双 profile 均有实现（real 数据库 / mock 内存），注入安全。
     */
    private final WalletUnlockService walletUnlockService;

    /**
     * 私信会话服务：双向匹配成功后自动创建/获取免费会话（2026-08-08 走查交付）。
     * 消息页即时可见新会话，无需用户手动发起。幂等（已存在则直接返回）。
     */
    private final PrivateMessageService privateMessageService;

    /**
     * 社交升温漏斗服务（R4-00327：like/match 主链路埋点）。
     * real profile 注入；单元测试 / mock 场景为 null 时跳过埋点。
     * 采用字段注入（required=false）而非构造器参数，避免破坏既有单测构造器。
     */
    @Autowired(required = false)
    private SocialProgressService socialProgressService;

    public RealMatchService(
            MatchConfig matchConfig,
            LikeRepository likeRepository,
            HeartSignalRepository heartSignalRepository,
            com.campuslove.api.repository.VisitorRepository visitorRepository,
            @SuppressWarnings("unused") com.campuslove.api.repository.PassRecordRepository passRecordRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            @SuppressWarnings("unused") com.campuslove.api.repository.UserBasicProfileRepository userBasicProfileRepository,
            @SuppressWarnings("unused") com.campuslove.api.repository.UserScheduleProfileRepository userScheduleProfileRepository,
            SimpMessagingTemplate messagingTemplate,
            @SuppressWarnings("unused") com.fasterxml.jackson.databind.ObjectMapper objectMapper,
            InteractionEventService interactionEventService,
            MessageProducer messageProducer,
            MatchEngine matchEngine,
            MatchPolicy matchPolicy,
            MatchRecorder matchRecorder,
            WalletUnlockService walletUnlockService,
            PrivateMessageService privateMessageService) {
        this.matchConfig = matchConfig;
        this.likeRepository = likeRepository;
        this.heartSignalRepository = heartSignalRepository;
        this.visitorRepository = visitorRepository;
        this.userRepository = userRepository;
        this.matchEngine = matchEngine;
        this.matchPolicy = matchPolicy;
        this.matchRecorder = matchRecorder;
        this.walletUnlockService = walletUnlockService;
        this.privateMessageService = privateMessageService;
    }

    // ---- Phase 1 存根方法 ----

    @Override
    public MatchFormConfigView getFormConfig() {
        return new MatchFormConfigView(List.of(
            new MatchFormSectionView("intent", "匹配目标",
                List.of(new MatchFormFieldView("matchIntent", "single-select", "从什么开始",
                    List.of(
                        new MatchOptionView("topic", "话题匹配"),
                        new MatchOptionView("coffee", "咖啡散步"),
                        new MatchOptionView("study", "自习搭子")
                    ), null, null)))));
    }

    @Override
    @Transactional
    public MatchResultView createMatch(MatchRequest request) {
        return doCreateMatch(request.userId(), request.matchIntent(),
                toMatchTypeLabel(request.matchIntent()),
                generateIcebreaker(request.matchIntent()),
                request.durationMinutes());
    }

    @Override
    @Transactional
    public MatchResultView createQuickMatch(QuickMatchRequest request) {
        return doCreateMatch(request.userId(), null, "快速匹配",
                "快速匹配成功！可以先打个招呼，聊聊今天的心情。",
                request.durationMinutes());
    }

    /** 创建匹配内部流程：验证用户→排除已互动→Top-N 随机选择→创建信号→推送通知。 */
    private MatchResultView doCreateMatch(Long userId, String matchIntent, String matchTypeLabel,
                                          String icebreaker, Integer durationMinutes) {
        if (userId == null) throw new IllegalArgumentException("userId is required");
        // infra R2-00226: 存在性校验改用 existsById，避免加载完整实体后即弃
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found: " + userId);
        }

        Set<Long> excludedUserIds = matchEngine.getExcludedUserIds(userId);
        List<MatchEngine.ScoredCandidate> scoredCandidates =
                matchEngine.findAndScoreCandidates(userId, excludedUserIds);
        Integer duration = durationMinutes != null ? durationMinutes : matchConfig.getDefaultChatDuration();

        if (scoredCandidates.isEmpty()) {
            return new MatchResultView("pending-" + userId, "queued", matchTypeLabel,
                    "正在为你寻找合适的匹配对象...", duration, null, null);
        }

        User matchedUser = matchEngine.selectFromTopCandidates(scoredCandidates);
        HeartSignal signal = matchRecorder.createMatchSignal(userId, matchedUser.getId(), matchTypeLabel);
        String matchId = String.valueOf(signal.getId());
        matchRecorder.pushMatchNotification(userId, matchedUser.getId(), matchId);

        return new MatchResultView(matchId, "connected", matchTypeLabel,
                buildPartnerHeadline(matchedUser), duration, icebreaker, "session-" + matchId);
    }

    @Override
    @Transactional(readOnly = true)
    public MatchResultView getMatch(String id) {
        Long signalId;
        try {
            signalId = Long.parseLong(id);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid match id: " + id);
        }
        HeartSignal signal = heartSignalRepository.findById(signalId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + id));

        // 修复（FIN HIGH-14）：归属校验——仅匹配双方（userA/userB）可查看该匹配详情，
        // 防止任意用户枚举 matchId 查看他人匹配信息（IDOR）
        Long currentUserId = SecurityUtils.getCurrentUserId();
        boolean participant = (signal.getUserAId() != null && signal.getUserAId().equals(currentUserId))
                || (signal.getUserBId() != null && signal.getUserBId().equals(currentUserId));
        if (!participant) {
            throw new com.campuslove.api.common.OperationForbiddenException("无权查看该匹配详情");
        }

        User matchedUser = userRepository.findById(signal.getUserBId()).orElse(null);
        String partnerHeadline = matchedUser != null
                ? buildPartnerHeadline(matchedUser) : DisplayConstants.UNKNOWN_USER;
        String queueStatus = mapSignalStatusToQueueStatus(signal.getStatus());
        String matchType = signal.getMatchType() != null ? signal.getMatchType() : "匹配";
        String sessionId = "connected".equals(queueStatus) ? "session-" + id : null;

        return new MatchResultView(id, queueStatus, matchType, partnerHeadline,
                matchConfig.getDefaultChatDuration(),
                generateDefaultIcebreaker(matchType), sessionId);
    }

    @Override public void setForceQueued(boolean forceQueued) {
        // infra R2-00225: real 模式下无强制排队状态（mock 专用能力），记录警告避免静默空实现
        log.warn("setForceQueued 为 mock 专用调试能力，real 模式不生效：forceQueued={}", forceQueued);
    }
    @Override public void setNextQueueStatus(String queueStatus) {
        // infra R2-00225: 同上，real 模式下不生效
        log.warn("setNextQueueStatus 为 mock 专用调试能力，real 模式不生效：queueStatus={}", queueStatus);
    }

    // ---- Phase 2 核心实现：社交功能 ----

    /**
     * 幂等喜欢视图的 status 值（A-25 修复）：重复喜欢（已存在 active like）时返回，
     * 标识"已喜欢过、未产生新信号"。HeartSignal.SignalStatus 枚举无对应值
     * （枚举与数据库 ENUM 列强绑定，不宜扩展），故以视图层常量表达。
     */
    public static final String HEART_SIGNAL_STATUS_ALREADY_LIKED = "ALREADY_LIKED";

    /** 喜欢用户。如果双方互相喜欢，则创建心动信号并推送通知。 */
    @Override
    @Transactional
    public HeartSignalView likeUser(Long userId, Long targetUserId) {
        // R4-00333：幂等命中（已 active 的重复喜欢）不消耗每日配额——
        // 原实现先 tryIncrementLike 扣配额再进 doLike，重复喜欢/取消后重喜欢
        // 都会消耗每日 30 次额度，限流失真。先做幂等检查，命中直接返回。
        Optional<Like> existingLike = matchRecorder.findExistingLike(userId, targetUserId);
        if (existingLike.isPresent() && existingLike.get().getStatus() == LikeStatus.active) {
            log.info("重复喜欢（幂等返回，不消耗配额）：userId={}, targetUserId={}", userId, targetUserId);
            return buildAlreadyLikedView(existingLike.get(), userId, targetUserId);
        }
        // A-25/A-31：普通 like 每日上限（超级喜欢走 superLikeUser 不受限）
        if (!matchPolicy.tryIncrementLike(userId)) {
            log.info("用户[{}]今日普通喜欢次数已达上限({}/{})，拒绝 like", userId,
                    MatchPolicy.LIKE_DAILY_LIMIT, MatchPolicy.LIKE_DAILY_LIMIT);
            throw new DailyLimitExceededException(
                    "喜欢",
                    MatchPolicy.LIKE_DAILY_LIMIT,
                    "今日喜欢次数已用完（上限 " + MatchPolicy.LIKE_DAILY_LIMIT + " 次），请明日再来");
        }
        return doLike(userId, targetUserId, "mutual_like");
    }

    /**
     * 超级喜欢：R4-00334 起受独立每日配额限制（app.match.super-like-daily-limit，默认 10 次/日），
     * 双向喜欢信号 matchType=super_like 与普通喜欢区分。原实现完全免费且无限量，
     * 可无限绕过普通喜欢 30 次/日限额；现按配置配额封堵绕过，后续商业化可接入扣费。
     */
    @Override
    @Transactional
    public HeartSignalView superLikeUser(Long userId, Long targetUserId) {
        // R4-00333 同款幂等先行：重复超级喜欢不消耗配额
        Optional<Like> existingLike = matchRecorder.findExistingLike(userId, targetUserId);
        if (existingLike.isPresent() && existingLike.get().getStatus() == LikeStatus.active) {
            log.info("重复超级喜欢（幂等返回，不消耗配额）：userId={}, targetUserId={}", userId, targetUserId);
            return buildAlreadyLikedView(existingLike.get(), userId, targetUserId);
        }
        // R4-00334：超级喜欢每日配额
        if (!matchPolicy.tryIncrementSuperLike(userId)) {
            int limit = matchPolicy.getSuperLikeDailyLimit();
            log.info("用户[{}]今日超级喜欢次数已达上限({})，拒绝 super-like", userId, limit);
            throw new DailyLimitExceededException(
                    "超级喜欢",
                    limit,
                    "今日超级喜欢次数已用完（上限 " + limit + " 次），请明日再来");
        }
        return doLike(userId, targetUserId, "super_like");
    }

    /**
     * 喜欢/超级喜欢内部流程：创建/激活 like → 双向喜欢则创建心动信号并推送通知。
     *
     * @param userId       当前用户 ID
     * @param targetUserId 目标用户 ID
     * @param matchType    双向喜欢信号的匹配类型（mutual_like 普通喜欢 / super_like 超级喜欢）
     * @return 心动信号视图（互相喜欢时非空；重复喜欢返回幂等视图；其余场景返回 null）
     */
    private HeartSignalView doLike(Long userId, Long targetUserId, String matchType) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId and targetUserId are required");
        }
        matchPolicy.requireNotSelf(userId, targetUserId);
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        Optional<Like> existingLike = matchRecorder.findExistingLike(userId, targetUserId);
        if (existingLike.isPresent()) {
            Like like = existingLike.get();
            if (like.getStatus() == LikeStatus.active) {
                // A-25 幂等修复：重复喜欢不再返回 null（前端将 null 视为操作失败），
                // 返回 status=ALREADY_LIKED 的幂等视图，标识"已喜欢过"
                log.info("重复喜欢（幂等返回）：userId={}, targetUserId={}", userId, targetUserId);
                return buildAlreadyLikedView(like, userId, targetUserId);
            }
            matchRecorder.reactivateLike(like, now);
        } else {
            matchRecorder.createLike(userId, targetUserId, now);
        }
        matchRecorder.recordNewLikeEvent(targetUserId, userId);

        // R4-00327：社交升温漏斗埋点——表达喜欢（L2_ATTENTION 计数）
        recordSocialProgressLike(userId);

        if (matchRecorder.findReverseActiveLike(targetUserId, userId).isPresent()) {
            // R4-00327：双向匹配成功（L3_MATCH 计数，双方都记录）
            recordSocialProgressMatch(userId);
            recordSocialProgressMatch(targetUserId);
            HeartSignal signal = matchRecorder.createMutualSignal(userId, targetUserId, now, matchType);
            HeartSignalView signalView = matchRecorder.toHeartSignalView(signal);
            matchRecorder.pushHeartSignalNotification(userId, targetUserId, signalView);
            matchRecorder.publishMatchEvent(userId, targetUserId, "match");
            // 2026-08-08 走查交付：双向匹配成功后自动创建/获取免费会话（消息页即时可见）。
            // 异常不影响匹配主流程（like/heart-signal 已提交，会话可后续手动创建）。
            createFreeConversation(userId, targetUserId);
            return signalView;
        }
        return null;
    }

    /**
     * 构造"已喜欢过"幂等视图（A-25 幂等返回；R4-00333 抽为公共方法，likeUser
     * 幂等检查与 doLike 内部共用，避免重复代码）。
     *
     * @param like          已存在的 like 记录
     * @param userId        当前用户 ID
     * @param targetUserId  目标用户 ID
     * @return status=ALREADY_LIKED 的幂等视图
     */
    private HeartSignalView buildAlreadyLikedView(Like like, Long userId, Long targetUserId) {
        return new HeartSignalView(
                like.getId(), userId, targetUserId, HEART_SIGNAL_STATUS_ALREADY_LIKED,
                null,
                like.getCreatedAt() != null ? like.getCreatedAt().toString() : null,
                null, null);
    }

    /**
     * R4-00327：社交升温埋点——表达喜欢（L2_ATTENTION）。
     * 埋点失败不影响匹配主流程（仅记录日志）。
     */
    private void recordSocialProgressLike(Long userId) {
        if (socialProgressService == null) {
            return;
        }
        try {
            socialProgressService.recordLike(userId);
        } catch (RuntimeException e) {
            log.debug("社交升温埋点（like）失败：userId={}, error={}", userId, e.getMessage());
        }
    }

    /**
     * R4-00327：社交升温埋点——双向匹配（L3_MATCH）。
     * 埋点失败不影响匹配主流程（仅记录日志）。
     */
    private void recordSocialProgressMatch(Long userId) {
        if (socialProgressService == null) {
            return;
        }
        try {
            socialProgressService.recordMatch(userId);
        } catch (RuntimeException e) {
            log.debug("社交升温埋点（match）失败：userId={}, error={}", userId, e.getMessage());
        }
    }

    /**
     * 双向匹配成功后自动创建/获取免费会话。
     *
     * <p>{@link PrivateMessageService#createOrGetConversation} 幂等（双向对称查询，
     * 已存在则直接返回），重复匹配不会重复建会话；异常仅记录日志，
     * 绝不阻塞匹配主流程返回。</p>
     */
    private void createFreeConversation(Long userAId, Long userBId) {
        try {
            privateMessageService.createOrGetConversation(userAId, userBId);
            log.info("双向匹配自动建会话成功：userAId={}, userBId={}", userAId, userBId);
        } catch (Exception e) {
            log.warn("双向匹配成功但会话创建失败（不影响匹配结果）：userAId={}, userBId={}, err={}",
                    userAId, userBId, e.getMessage());
        }
    }

    @Override
    @Transactional
    public void cancelLike(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId and targetUserId are required");
        }
        matchRecorder.cancelLike(userId, targetUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LikedUserView> getLikedMe(Long userId) {
        if (userId == null) throw new IllegalArgumentException("userId is required");
        List<Like> likes = likeRepository.findByTargetUserIdAndStatus(userId, LikeStatus.active);
        return mapToLikedUserViews(likes, Like::getUserId, Like::getTargetUserId,
                WalletUnlock.TARGET_TYPE_LIKED_ME, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LikedUserView> getMyLikes(Long userId) {
        if (userId == null) throw new IllegalArgumentException("userId is required");
        List<Like> likes = likeRepository.findByUserIdAndStatus(userId, LikeStatus.active);
        // 我的喜欢列表（我发出的）不涉及解锁查看，unlocked 恒为 true（unlockTargetType 传 null）
        return mapToLikedUserViews(likes, Like::getTargetUserId, Like::getUserId, null, userId);
    }

    /** 将 Like 列表转换为 LikedUserView 列表，复用批量预加载避免 N+1。 */
    private List<LikedUserView> mapToLikedUserViews(List<Like> likes,
                                                    Function<Like, Long> targetIdExtractor,
                                                    Function<Like, Long> ownerIdExtractor,
                                                    String unlockTargetType,
                                                    Long currentUserId) {
        List<Long> userIds = likes.stream().map(targetIdExtractor).distinct().toList();
        Map<Long, User> userMap = matchRecorder.batchLoadUsers(userIds);
        Map<Long, UserCampusProfile> campusMap = matchRecorder.batchLoadCampusProfiles(userIds);
        // P0-17：批量查询已解锁的目标 ID 集合（unlockTargetType 为 null 时表示无需解锁的列表）
        java.util.Set<Long> unlockedIds = unlockTargetType == null
                ? java.util.Set.of()
                : walletUnlockService.findUnlockedTargetIds(currentUserId, unlockTargetType, userIds);
        List<LikedUserView> result = new ArrayList<>(likes.size());
        for (int i = 0; i < likes.size(); i++) {
            Like like = likes.get(i);
            Long otherId = targetIdExtractor.apply(like);
            User u = userMap.get(otherId);
            String nickname = u != null ? u.getNickname() : DisplayConstants.UNKNOWN_USER;
            String avatarUrl = u != null ? u.getAvatarUrl() : null;
            UserCampusProfile campus = campusMap.get(otherId);
            String campusName = campus != null ? campus.getCampusName() : "";
            // 2026-08-08 走查 P1：前 2 条免费展示（其余按解锁集合判定）；
            // unlockTargetType 为 null（我喜欢的列表）时恒可见
            boolean unlocked = unlockTargetType == null || unlockedIds.contains(otherId) || i < 2;
            // R4-00313：解锁墙服务端保护——未解锁条目脱敏下发（昵称占位/头像置空/校区置空），
            // 不依赖前端 unlocked 标志打码；付费前无法从接口拿到真实昵称头像。
            if (!unlocked) {
                nickname = DisplayConstants.LOCKED_NICKNAME;
                avatarUrl = null;
                campusName = "";
            }
            result.add(new LikedUserView(otherId, nickname, avatarUrl, campusName,
                    like.getCreatedAt().toString(), unlocked));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<VisitorView> getVisitors(Long userId) {
        if (userId == null) throw new IllegalArgumentException("userId is required");
        List<Visitor> visitors = matchRecorder.findVisitors(userId);
        List<Long> visitorIds = visitors.stream().map(Visitor::getVisitorId).distinct().toList();
        Map<Long, User> userMap = matchRecorder.batchLoadUsers(visitorIds);
        Map<Long, UserCampusProfile> campusMap = matchRecorder.batchLoadCampusProfiles(visitorIds);
        // P0-17：批量查询已解锁的访客 ID 集合（unlocked 状态随列表下发）
        java.util.Set<Long> unlockedIds = walletUnlockService.findUnlockedTargetIds(
                userId, WalletUnlock.TARGET_TYPE_VISITOR, visitorIds);
        // 2026-08-08 走查 P1：访客列表前 2 条免费展示（与喜欢页规则统一）
        List<VisitorView> result = new ArrayList<>(visitors.size());
        for (int i = 0; i < visitors.size(); i++) {
            Visitor v = visitors.get(i);
            User u = userMap.get(v.getVisitorId());
            String nickname = u != null ? u.getNickname() : DisplayConstants.UNKNOWN_USER;
            String avatarUrl = u != null ? u.getAvatarUrl() : null;
            UserCampusProfile campus = campusMap.get(v.getVisitorId());
            String campusName = campus != null ? campus.getCampusName() : "";
            boolean unlocked = unlockedIds.contains(v.getVisitorId()) || i < 2;
            // R4-00313：解锁墙服务端保护——未解锁条目脱敏下发（昵称占位/头像置空/校区置空）
            if (!unlocked) {
                nickname = DisplayConstants.LOCKED_NICKNAME;
                avatarUrl = null;
                campusName = "";
            }
            result.add(new VisitorView(v.getVisitorId(), nickname, avatarUrl, campusName,
                    v.getCreatedAt().toString(), unlocked));
        }
        return result;
    }

    @Override
    @Transactional
    public void recordVisit(Long visitorId, Long visitedUserId) {
        if (visitorId == null || visitedUserId == null) {
            throw new IllegalArgumentException("visitorId and visitedUserId are required");
        }
        if (!visitorId.equals(visitedUserId)) {
            matchRecorder.recordVisit(visitorId, visitedUserId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<HeartSignalView> getHeartSignals(Long userId) {
        if (userId == null) throw new IllegalArgumentException("userId is required");
        // P0-25：查询加 expiresAt > now 过滤——已过期（含尚未被定时任务标记）的信号不进入列表；
        // 2026-08-08 走查 P0-3：pending + accepted 一并下发（「已接受」Tab 的「开聊」入口依赖）
        List<HeartSignal> signals = heartSignalRepository.findByUserAIdOrUserBIdAndStatusInNotExpired(
                userId, userId, java.util.List.of(SignalStatus.pending, SignalStatus.accepted), LocalDateTime.now(TimeZones.BUSINESS));
        List<Long> userAIds = signals.stream()
                .map(HeartSignal::getUserAId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> userAMap = matchRecorder.batchLoadUsers(userAIds);
        return signals.stream()
                .map(signal -> matchRecorder.toHeartSignalView(signal, userAMap))
                .toList();
    }

    /**
     * P0-25：心动信号过期清理定时任务。
     *
     * <p>每 1 小时执行一次：将已超过 expiresAt 的 pending 信号批量置为 expired，
     * 与查询侧的 {@code expiresAt > now} 过滤形成闭环（查询兜底 + 定时清理），
     * 保证待处理信号列表不再出现过期数据。</p>
     *
     * <p>由 {@code @EnableScheduling}（CampusLoveApplication 已启用）调度；
     * real profile 下激活，mock 不执行。</p>
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 3_600_000L, initialDelay = 3_600_000L)
    @Transactional
    public void expireOverdueHeartSignals() {
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        int updated;
        try {
            updated = heartSignalRepository.expirePendingSignalsBefore(
                    SignalStatus.pending, SignalStatus.expired, now);
        } catch (RuntimeException e) {
            // 定时任务异常仅记录日志，不影响后续调度
            log.error("心动信号过期清理任务执行失败：{}", e.getMessage(), e);
            return;
        }
        if (updated > 0) {
            log.info("心动信号过期清理完成：{} 条 pending 信号已置为 expired", updated);
        }
    }

    @Override
    @Transactional
    public void acceptHeartSignal(Long signalId, Long userId) {
        if (signalId == null || userId == null) {
            throw new IllegalArgumentException("signalId and userId are required");
        }
        matchRecorder.acceptHeartSignal(signalId, userId);
    }

    @Override
    @Transactional
    public void declineHeartSignal(Long signalId, Long userId) {
        if (signalId == null || userId == null) {
            throw new IllegalArgumentException("signalId and userId are required");
        }
        matchRecorder.declineHeartSignal(signalId, userId);
    }

    // ---- Phase 2 新增：左滑/反悔/访客已读 ----

    @Override
    @Transactional
    public void passUser(Long userId, Long passedUserId) {
        if (userId == null || passedUserId == null) {
            throw new IllegalArgumentException("userId and passedUserId are required");
        }
        matchPolicy.requireNotSelf(userId, passedUserId);
        matchRecorder.recordPass(userId, passedUserId);
    }

    /** 反悔(rewind)：策略校验→查询最近 pass→无记录返回失败→删除记录→递增计数。 */
    @Override
    @Transactional
    public RewindResultView rewind(Long userId) {
        if (userId == null) throw new IllegalArgumentException("userId is required");
        // infra R2-00224: 限额检查与计数递增合并为原子操作（INCR 返回值判断），
        // 修复 GET+INCR 分离导致并发请求可绕过每日 1 次限制的问题
        if (!matchPolicy.tryIncrementRewind(userId)) {
            throw new DailyLimitExceededException(
                    "反悔",
                    MatchPolicy.REWIND_DAILY_LIMIT,
                    "今日反悔次数已用完（上限 " + MatchPolicy.REWIND_DAILY_LIMIT + " 次），请明日再来");
        }

        List<PassRecord> passRecords = matchRecorder.findLatestPassRecords(userId);
        if (passRecords.isEmpty()) {
            // infra R2-00224: 无 pass 记录不占用额度，回滚递增
            matchPolicy.decrementRewindCount(userId);
            return new RewindResultView(false, "没有可撤销的 pass 记录");
        }
        PassRecord latestPass = passRecords.get(0);
        matchRecorder.deletePassRecord(latestPass);

        int todayCount = matchPolicy.getTodayRewindCount(userId);
        log.info("用户[{}]rewind 成功，撤销 pass 记录 id={}，目标用户 id={}，今日已用 {}/{}",
                userId, latestPass.getId(), latestPass.getPassedUserId(),
                todayCount, MatchPolicy.REWIND_DAILY_LIMIT);
        return new RewindResultView(true, "已撤销对用户的 pass 操作");
    }

    @Override
    @Transactional
    public void markVisitorRead(Long visitorId) {
        if (visitorId == null) throw new IllegalArgumentException("visitorId is required");
        // 修复（FIN HIGH-15）：校验 visitedUserId 归属——仅被访问者本人可标记访客记录已读，
        // 防止任意用户标记他人访客记录（IDOR）
        Long currentUserId = SecurityUtils.getCurrentUserId();
        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new IllegalArgumentException("Visitor record not found: " + visitorId));
        if (visitor.getVisitedUserId() == null || !visitor.getVisitedUserId().equals(currentUserId)) {
            throw new com.campuslove.api.common.OperationForbiddenException("无权操作该访客记录");
        }
        matchRecorder.markVisitorRead(visitorId);
    }

    // ---- 私有辅助方法 ----

    private String buildPartnerHeadline(User user) {
        String grade = user.getGradeLabel();
        String bio = user.getBio();
        // 修复（FIN HIGH-9）：grade 判空——原实现第二段表达式直接调用 grade.isBlank()，
        // grade 为 null 时必 NPE，导致匹配详情/推荐头部 500
        boolean hasGrade = grade != null && !grade.isBlank();
        boolean hasBio = bio != null && !bio.isBlank();
        String headline = (hasGrade ? grade : "")
                + (hasGrade && hasBio ? "，" : "")
                + (hasBio ? (bio.length() > 20 ? bio.substring(0, 20) + "..." : bio) : "");
        return headline.isBlank() ? "一位校园同学" : headline;
    }

    private String generateIcebreaker(String matchIntent) {
        if (matchIntent == null) return "可以先聊聊彼此的校园生活。";
        return switch (matchIntent) {
            case "topic" -> "可以先问问，对方最近在关注什么有趣的话题。";
            case "coffee" -> "可以聊聊最喜欢的校园角落，也许你们有共同的秘密基地。";
            case "study" -> "可以问问对方最近在忙什么课程，说不定能一起自习。";
            default -> "可以先问问，对方心里最轻松的一次校园初见应该是什么样。";
        };
    }

    private String generateDefaultIcebreaker(String matchType) {
        if (matchType == null) return "可以先聊聊彼此的校园生活。";
        return switch (matchType) {
            case "话题匹配" -> "可以先问问，对方最近在关注什么有趣的话题。";
            case "咖啡散步" -> "可以聊聊最喜欢的校园角落，也许你们有共同的秘密基地。";
            case "自习搭子" -> "可以问问对方最近在忙什么课程，说不定能一起自习。";
            case "快速匹配" -> "快速匹配成功！可以先打个招呼，聊聊今天的心情。";
            default -> "可以先聊聊彼此的校园生活。";
        };
    }

    private String toMatchTypeLabel(String matchIntent) {
        if (matchIntent == null) return "匹配";
        return switch (matchIntent) {
            case "topic" -> "话题匹配";
            case "coffee" -> "咖啡散步";
            case "study" -> "自习搭子";
            default -> matchIntent;
        };
    }

    private String mapSignalStatusToQueueStatus(SignalStatus status) {
        return switch (status) {
            case pending, accepted -> "connected";
            case expired, declined -> "expired";
        };
    }
}
