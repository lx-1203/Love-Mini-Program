package com.campuslove.api.match;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.common.DailyLimitExceededException;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.config.SecurityUtils;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
            MatchRecorder matchRecorder) {
        this.matchConfig = matchConfig;
        this.likeRepository = likeRepository;
        this.heartSignalRepository = heartSignalRepository;
        this.visitorRepository = visitorRepository;
        this.userRepository = userRepository;
        this.matchEngine = matchEngine;
        this.matchPolicy = matchPolicy;
        this.matchRecorder = matchRecorder;
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

    /** 喜欢用户。如果双方互相喜欢，则创建心动信号并推送通知。 */
    @Override
    @Transactional
    public HeartSignalView likeUser(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId and targetUserId are required");
        }
        matchPolicy.requireNotSelf(userId, targetUserId);
        LocalDateTime now = LocalDateTime.now();
        Optional<Like> existingLike = matchRecorder.findExistingLike(userId, targetUserId);
        if (existingLike.isPresent()) {
            Like like = existingLike.get();
            if (like.getStatus() == LikeStatus.active) return null;
            matchRecorder.reactivateLike(like, now);
        } else {
            matchRecorder.createLike(userId, targetUserId, now);
        }
        matchRecorder.recordNewLikeEvent(targetUserId, userId);

        if (matchRecorder.findReverseActiveLike(targetUserId, userId).isPresent()) {
            HeartSignal signal = matchRecorder.createMutualSignal(userId, targetUserId, now);
            HeartSignalView signalView = matchRecorder.toHeartSignalView(signal);
            matchRecorder.pushHeartSignalNotification(userId, targetUserId, signalView);
            matchRecorder.publishMatchEvent(userId, targetUserId, "match");
            return signalView;
        }
        return null;
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
        return mapToLikedUserViews(likes, Like::getUserId, Like::getTargetUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LikedUserView> getMyLikes(Long userId) {
        if (userId == null) throw new IllegalArgumentException("userId is required");
        List<Like> likes = likeRepository.findByUserIdAndStatus(userId, LikeStatus.active);
        return mapToLikedUserViews(likes, Like::getTargetUserId, Like::getUserId);
    }

    /** 将 Like 列表转换为 LikedUserView 列表，复用批量预加载避免 N+1。 */
    private List<LikedUserView> mapToLikedUserViews(List<Like> likes,
                                                    Function<Like, Long> targetIdExtractor,
                                                    Function<Like, Long> ownerIdExtractor) {
        List<Long> userIds = likes.stream().map(targetIdExtractor).distinct().toList();
        Map<Long, User> userMap = matchRecorder.batchLoadUsers(userIds);
        Map<Long, UserCampusProfile> campusMap = matchRecorder.batchLoadCampusProfiles(userIds);
        return likes.stream()
                .map(like -> {
                    Long otherId = targetIdExtractor.apply(like);
                    User u = userMap.get(otherId);
                    String nickname = u != null ? u.getNickname() : DisplayConstants.UNKNOWN_USER;
                    String avatarUrl = u != null ? u.getAvatarUrl() : null;
                    UserCampusProfile campus = campusMap.get(otherId);
                    String campusName = campus != null ? campus.getCampusName() : "";
                    return new LikedUserView(otherId, nickname, avatarUrl, campusName,
                            like.getCreatedAt().toString());
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<VisitorView> getVisitors(Long userId) {
        if (userId == null) throw new IllegalArgumentException("userId is required");
        List<Visitor> visitors = matchRecorder.findVisitors(userId);
        List<Long> visitorIds = visitors.stream().map(Visitor::getVisitorId).distinct().toList();
        Map<Long, User> userMap = matchRecorder.batchLoadUsers(visitorIds);
        Map<Long, UserCampusProfile> campusMap = matchRecorder.batchLoadCampusProfiles(visitorIds);
        return visitors.stream()
                .map(v -> {
                    User u = userMap.get(v.getVisitorId());
                    String nickname = u != null ? u.getNickname() : DisplayConstants.UNKNOWN_USER;
                    String avatarUrl = u != null ? u.getAvatarUrl() : null;
                    UserCampusProfile campus = campusMap.get(v.getVisitorId());
                    String campusName = campus != null ? campus.getCampusName() : "";
                    return new VisitorView(v.getVisitorId(), nickname, avatarUrl, campusName,
                            v.getCreatedAt().toString());
                })
                .toList();
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
        List<HeartSignal> signals = heartSignalRepository.findByUserAIdOrUserBIdAndStatus(
                userId, userId, SignalStatus.pending);
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
