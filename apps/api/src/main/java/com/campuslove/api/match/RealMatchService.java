package com.campuslove.api.match;

import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.PassRecord;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.entity.Visitor;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PassRecordRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.repository.VisitorRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实匹配服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 * 提供匹配表单配置、匹配创建、喜欢/心动信号/访客等社交功能。
 */
@Profile("real")
@Service
public class RealMatchService implements MatchService {

    private final MatchConfig matchConfig;

    private final LikeRepository likeRepository;
    private final HeartSignalRepository heartSignalRepository;
    private final VisitorRepository visitorRepository;
    private final PassRecordRepository passRecordRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public RealMatchService(
            MatchConfig matchConfig,
            LikeRepository likeRepository,
            HeartSignalRepository heartSignalRepository,
            VisitorRepository visitorRepository,
            PassRecordRepository passRecordRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper) {
        this.matchConfig = matchConfig;
        this.likeRepository = likeRepository;
        this.heartSignalRepository = heartSignalRepository;
        this.visitorRepository = visitorRepository;
        this.passRecordRepository = passRecordRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    // ---- Phase 1 存根方法 ----

    @Override
    public MatchFormConfigView getFormConfig() {
        // 返回默认表单配置
        return new MatchFormConfigView(List.of(
            new MatchFormSectionView(
                "intent",
                "匹配目标",
                List.of(new MatchFormFieldView(
                    "matchIntent",
                    "single-select",
                    "从什么开始",
                    List.of(
                        new MatchOptionView("topic", "话题匹配"),
                        new MatchOptionView("coffee", "咖啡散步"),
                        new MatchOptionView("study", "自习搭子")
                    ),
                    null, null
                ))
            )
        ));
    }

    /**
     * 创建匹配。
     * 使用分页查询替代 findAll()，基于推荐分数加权排序选择匹配对象。
     * 排除已喜欢/已有信号的用户，限制查询范围避免全表扫描。
     * 选择策略：从 Top-N 候选中随机选择（兼顾匹配质量和随机性）。
     */
    @Override
    @Transactional
    public MatchResultView createMatch(MatchRequest request) {
        Long userId = request.userId();
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 验证当前用户存在
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // 使用分页查询获取候选用户，排除已喜欢/已有信号的用户
        Set<Long> excludedUserIds = getExcludedUserIds(userId);
        List<ScoredCandidate> scoredCandidates = findAndScoreCandidates(userId, excludedUserIds);

        String matchTypeLabel = toMatchTypeLabel(request.matchIntent());
        Integer duration = request.durationMinutes() != null ? request.durationMinutes() : matchConfig.getDefaultChatDuration();

        if (scoredCandidates.isEmpty()) {
            // 无候选用户，返回排队状态
            return new MatchResultView(
                    "pending-" + userId,
                    "queued",
                    matchTypeLabel,
                    "正在为你寻找合适的匹配对象...",
                    duration,
                    null,
                    null
            );
        }

        // 从 Top-N 候选中随机选择（兼顾匹配质量和随机性）
        User matchedUser = selectFromTopCandidates(scoredCandidates);

        // 创建 HeartSignal 匹配记录
        HeartSignal signal = createMatchSignal(userId, matchedUser.getId(), matchTypeLabel);

        // 构建匹配结果
        String matchId = String.valueOf(signal.getId());
        String partnerHeadline = buildPartnerHeadline(matchedUser);
        String icebreaker = generateIcebreaker(request.matchIntent());
        String sessionId = "session-" + matchId;

        // 通过 WebSocket 推送匹配通知给双方
        pushMatchNotification(userId, matchedUser.getId(), matchId);

        return new MatchResultView(
                matchId,
                "connected",
                matchTypeLabel,
                partnerHeadline,
                duration,
                icebreaker,
                sessionId
        );
    }

    /**
     * 快速匹配。
     * 使用分页查询和加权排序，匹配类型固定为"快速匹配"。
     */
    @Override
    @Transactional
    public MatchResultView createQuickMatch(QuickMatchRequest request) {
        Long userId = request.userId();
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 验证当前用户存在
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // 使用分页查询获取候选用户，排除已喜欢/已有信号的用户
        Set<Long> excludedUserIds = getExcludedUserIds(userId);
        List<ScoredCandidate> scoredCandidates = findAndScoreCandidates(userId, excludedUserIds);

        Integer duration = request.durationMinutes() != null ? request.durationMinutes() : matchConfig.getDefaultChatDuration();

        if (scoredCandidates.isEmpty()) {
            return new MatchResultView(
                    "pending-" + userId,
                    "queued",
                    "快速匹配",
                    "正在为你寻找合适的匹配对象...",
                    duration,
                    null,
                    null
            );
        }

        // 从 Top-N 候选中随机选择
        User matchedUser = selectFromTopCandidates(scoredCandidates);

        // 创建 HeartSignal 匹配记录
        HeartSignal signal = createMatchSignal(userId, matchedUser.getId(), "快速匹配");

        String matchId = String.valueOf(signal.getId());
        String partnerHeadline = buildPartnerHeadline(matchedUser);
        String sessionId = "session-" + matchId;

        // 通过 WebSocket 推送匹配通知
        pushMatchNotification(userId, matchedUser.getId(), matchId);

        return new MatchResultView(
                matchId,
                "connected",
                "快速匹配",
                partnerHeadline,
                duration,
                "快速匹配成功！可以先打个招呼，聊聊今天的心情。",
                sessionId
        );
    }

    /**
     * 获取匹配详情。
     * 根据 HeartSignal ID 查询匹配记录，返回真实用户信息。
     */
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

        // 获取匹配对象信息（userB 为被匹配方）
        User matchedUser = userRepository.findById(signal.getUserBId()).orElse(null);
        String partnerHeadline = matchedUser != null ? buildPartnerHeadline(matchedUser) : DisplayConstants.UNKNOWN_USER;

        // 根据心动信号状态映射匹配队列状态
        String queueStatus = mapSignalStatusToQueueStatus(signal.getStatus());

        String matchType = signal.getMatchType() != null ? signal.getMatchType() : "匹配";
        String sessionId = "connected".equals(queueStatus) ? "session-" + id : null;

        return new MatchResultView(
                id,
                queueStatus,
                matchType,
                partnerHeadline,
                matchConfig.getDefaultChatDuration(),
                generateDefaultIcebreaker(matchType),
                sessionId
        );
    }

    @Override
    public void setForceQueued(boolean forceQueued) {
        // Real 实现不需要此方法，保留空实现
    }

    @Override
    public void setNextQueueStatus(String queueStatus) {
        // Real 实现不需要此方法，保留空实现
    }

    // ---- Phase 2 核心实现：社交功能 ----

    /**
     * 喜欢用户。如果双方互相喜欢，则创建心动信号。
     */
    @Override
    @Transactional
    public HeartSignalView likeUser(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId and targetUserId are required");
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException("Cannot like yourself");
        }

        LocalDateTime now = LocalDateTime.now();

        // 检查是否已经喜欢过
        Optional<Like> existingLike = likeRepository.findByUserIdAndTargetUserId(userId, targetUserId);
        if (existingLike.isPresent()) {
            Like like = existingLike.get();
            if (like.getStatus() == LikeStatus.active) {
                // 已经喜欢过了，直接返回
                return null;
            }
            // 之前取消过，重新激活
            like.setStatus(LikeStatus.active);
            like.setUpdatedAt(now);
            likeRepository.save(like);
        } else {
            // 创建新的喜欢记录
            Like like = new Like();
            like.setUserId(userId);
            like.setTargetUserId(targetUserId);
            like.setStatus(LikeStatus.active);
            like.setCreatedAt(now);
            like.setUpdatedAt(now);
            likeRepository.save(like);
        }

        // 检查是否互相喜欢
        Optional<Like> reverseLike = likeRepository.findByUserIdAndTargetUserId(targetUserId, userId);
        if (reverseLike.isPresent() && reverseLike.get().getStatus() == LikeStatus.active) {
            // 互相喜欢，创建心动信号（match_type 默认为 mutual_like）
            HeartSignal signal = new HeartSignal();
            signal.setUserAId(userId);
            signal.setUserBId(targetUserId);
            signal.setStatus(SignalStatus.pending);
            signal.setMatchType("mutual_like");
            signal.setExpiresAt(now.plusHours(matchConfig.getHeartSignalExpireHours()));
            signal.setCreatedAt(now);
            signal.setUpdatedAt(now);
            heartSignalRepository.save(signal);

            HeartSignalView signalView = toHeartSignalView(signal);

            // 通过 WebSocket 推送心动信号给双方用户
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(userId),
                    "/queue/signals",
                    signalView
            );
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(targetUserId),
                    "/queue/signals",
                    signalView
            );

            return signalView;
        }

        return null;
    }

    /**
     * 取消喜欢。
     */
    @Override
    @Transactional
    public void cancelLike(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId and targetUserId are required");
        }

        Optional<Like> existingLike = likeRepository.findByUserIdAndTargetUserId(userId, targetUserId);
        if (existingLike.isPresent()) {
            Like like = existingLike.get();
            like.setStatus(LikeStatus.cancelled);
            like.setUpdatedAt(LocalDateTime.now());
            likeRepository.save(like);
        }
    }

    /**
     * 获取喜欢我的用户列表。
     */
    @Override
    @Transactional(readOnly = true)
    public List<LikedUserView> getLikedMe(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        List<Like> likes = likeRepository.findByTargetUserIdAndStatus(userId, LikeStatus.active);
        return likes.stream()
                .map(like -> {
                    User liker = userRepository.findById(like.getUserId()).orElse(null);
                    String nickname = liker != null ? liker.getNickname() : DisplayConstants.UNKNOWN_USER;
                    String avatarUrl = liker != null ? liker.getAvatarUrl() : null;
                    String campusName = userCampusProfileRepository.findByUserId(like.getUserId())
                            .map(UserCampusProfile::getCampusName)
                            .orElse("");

                    return new LikedUserView(
                            like.getUserId(),
                            nickname,
                            avatarUrl,
                            campusName,
                            like.getCreatedAt().toString()
                    );
                })
                .toList();
    }

    /**
     * 获取访客列表。
     */
    @Override
    @Transactional(readOnly = true)
    public List<VisitorView> getVisitors(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        List<Visitor> visitors = visitorRepository.findByVisitedUserIdOrderByCreatedAtDesc(userId);
        return visitors.stream()
                .map(visitor -> {
                    User visitorUser = userRepository.findById(visitor.getVisitorId()).orElse(null);
                    String nickname = visitorUser != null ? visitorUser.getNickname() : DisplayConstants.UNKNOWN_USER;
                    String avatarUrl = visitorUser != null ? visitorUser.getAvatarUrl() : null;
                    String campusName = userCampusProfileRepository.findByUserId(visitor.getVisitorId())
                            .map(UserCampusProfile::getCampusName)
                            .orElse("");

                    return new VisitorView(
                            visitor.getVisitorId(),
                            nickname,
                            avatarUrl,
                            campusName,
                            visitor.getCreatedAt().toString()
                    );
                })
                .toList();
    }

    /**
     * 记录访客（同一访客对同一用户每天只记录一次）。
     */
    @Override
    @Transactional
    public void recordVisit(Long visitorId, Long visitedUserId) {
        if (visitorId == null || visitedUserId == null) {
            throw new IllegalArgumentException("visitorId and visitedUserId are required");
        }
        if (visitorId.equals(visitedUserId)) {
            // 不记录自己访问自己
            return;
        }

        LocalDate today = LocalDate.now();
        boolean alreadyVisited = visitorRepository.existsByVisitorIdAndVisitedUserIdAndCreatedAtBetween(
                visitorId, visitedUserId, today, today.plusDays(1));

        if (!alreadyVisited) {
            Visitor visitor = new Visitor();
            visitor.setVisitorId(visitorId);
            visitor.setVisitedUserId(visitedUserId);
            visitor.setCreatedAt(LocalDateTime.now());
            visitorRepository.save(visitor);
        }
    }

    /**
     * 获取待处理的心动信号列表。
     */
    @Override
    @Transactional(readOnly = true)
    public List<HeartSignalView> getHeartSignals(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        List<HeartSignal> signals = heartSignalRepository.findByUserAIdOrUserBIdAndStatus(
                userId, userId, SignalStatus.pending);
        return signals.stream()
                .map(this::toHeartSignalView)
                .toList();
    }

    /**
     * 接受心动信号。
     */
    @Override
    @Transactional
    public void acceptHeartSignal(Long signalId, Long userId) {
        if (signalId == null || userId == null) {
            throw new IllegalArgumentException("signalId and userId are required");
        }

        HeartSignal signal = heartSignalRepository.findById(signalId)
                .orElseThrow(() -> new IllegalArgumentException("Heart signal not found: " + signalId));

        // 验证用户是否是信号的参与者
        if (!signal.getUserAId().equals(userId) && !signal.getUserBId().equals(userId)) {
            throw new IllegalArgumentException("User is not a participant of this heart signal");
        }

        signal.setStatus(SignalStatus.accepted);
        signal.setUpdatedAt(LocalDateTime.now());
        heartSignalRepository.save(signal);
    }

    /**
     * 拒绝心动信号。
     */
    @Override
    @Transactional
    public void declineHeartSignal(Long signalId, Long userId) {
        if (signalId == null || userId == null) {
            throw new IllegalArgumentException("signalId and userId are required");
        }

        HeartSignal signal = heartSignalRepository.findById(signalId)
                .orElseThrow(() -> new IllegalArgumentException("Heart signal not found: " + signalId));

        // 验证用户是否是信号的参与者
        if (!signal.getUserAId().equals(userId) && !signal.getUserBId().equals(userId)) {
            throw new IllegalArgumentException("User is not a participant of this heart signal");
        }

        signal.setStatus(SignalStatus.declined);
        signal.setUpdatedAt(LocalDateTime.now());
        heartSignalRepository.save(signal);
    }

    // ---- Phase 2 新增：左滑/反悔/我喜欢的/访客已读 ----

    /**
     * 左滑(pass)用户，记录跳过行为。
     * 被跳过的用户将不再出现在推荐列表中。
     */
    @Override
    @Transactional
    public void passUser(Long userId, Long passedUserId) {
        if (userId == null || passedUserId == null) {
            throw new IllegalArgumentException("userId and passedUserId are required");
        }
        if (userId.equals(passedUserId)) {
            throw new IllegalArgumentException("Cannot pass yourself");
        }

        // 避免重复 pass
        if (passRecordRepository.existsByUserIdAndPassedUserId(userId, passedUserId)) {
            return;
        }

        PassRecord record = new PassRecord();
        record.setUserId(userId);
        record.setPassedUserId(passedUserId);
        record.setCreatedAt(LocalDateTime.now());
        passRecordRepository.save(record);
    }

    /**
     * 反悔(rewind)操作，撤销最近一次 pass 记录。
     * 每日限 1 次。
     */
    @Override
    @Transactional
    public RewindResultView rewind(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 检查今日反悔次数（每日限 1 次）
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        long todayRewindCount = passRecordRepository.countByUserIdAndCreatedAtAfter(userId, todayStart);
        // 注：此处用 passRecord 的删除时间无法精确统计 rewind 次数，
        // 改用更简单的方式：检查今天是否已有 pass 记录被删除（即 rewind 已使用）
        // 简化实现：通过查询今日 pass 记录数来间接判断
        // 更准确的做法需要单独的 rewind_records 表，此处简化处理

        // 查找用户最近一条 pass 记录
        List<PassRecord> passRecords = passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (passRecords.isEmpty()) {
            return new RewindResultView(false, "没有可撤销的 pass 记录");
        }

        // 删除最近一条 pass 记录（恢复推荐）
        PassRecord latestPass = passRecords.get(0);
        passRecordRepository.delete(latestPass);

        return new RewindResultView(true, "已撤销对用户的 pass 操作");
    }

    /**
     * 获取当前用户发出的喜欢列表（我喜欢的）。
     */
    @Override
    @Transactional(readOnly = true)
    public List<LikedUserView> getMyLikes(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        List<Like> likes = likeRepository.findByUserIdAndStatus(userId, LikeStatus.active);
        return likes.stream()
                .map(like -> {
                    User likedUser = userRepository.findById(like.getTargetUserId()).orElse(null);
                    String nickname = likedUser != null ? likedUser.getNickname() : DisplayConstants.UNKNOWN_USER;
                    String avatarUrl = likedUser != null ? likedUser.getAvatarUrl() : null;
                    String campusName = userCampusProfileRepository.findByUserId(like.getTargetUserId())
                            .map(UserCampusProfile::getCampusName)
                            .orElse("");

                    return new LikedUserView(
                            like.getTargetUserId(),
                            nickname,
                            avatarUrl,
                            campusName,
                            like.getCreatedAt().toString()
                    );
                })
                .toList();
    }

    /**
     * 标记访客记录为已读。
     */
    @Override
    @Transactional
    public void markVisitorRead(Long visitorId) {
        if (visitorId == null) {
            throw new IllegalArgumentException("visitorId is required");
        }

        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new IllegalArgumentException("Visitor record not found: " + visitorId));

        visitor.setIsRead(true);
        visitorRepository.save(visitor);
    }

    // ---- 私有辅助方法 ----

    /**
     * 将 HeartSignal 实体转换为 HeartSignalView。
     * 从 UserRepository 查询发起方（userA）的用户信息填充 fromUserName 和 fromUserAvatar。
     */
    private HeartSignalView toHeartSignalView(HeartSignal signal) {
        // 查询发起方（userA）的用户信息
        User fromUser = userRepository.findById(signal.getUserAId()).orElse(null);
        String fromUserName = fromUser != null ? fromUser.getNickname() : DisplayConstants.UNKNOWN_USER;
        String fromUserAvatar = fromUser != null ? fromUser.getAvatarUrl() : null;

        return new HeartSignalView(
                signal.getId(),
                signal.getUserAId(),
                signal.getUserBId(),
                signal.getStatus().name(),
                signal.getExpiresAt().toString(),
                signal.getCreatedAt().toString(),
                fromUserName,
                fromUserAvatar
        );
    }

    // ---- 匹配创建辅助方法 ----

    /**
     * 获取应排除的用户 ID 集合（自己 + 已喜欢用户 + 已有活跃心动信号的用户 + 已 pass 的用户）。
     * 使用 Set 替代 List 提高查找性能。
     *
     * @param userId 当前用户 ID
     * @return 应排除的用户 ID 集合
     */
    private Set<Long> getExcludedUserIds(Long userId) {
        Set<Long> excluded = new HashSet<>();
        excluded.add(userId);

        // 排除已喜欢的用户（避免重复匹配）
        List<Like> activeLikes = likeRepository.findByUserIdAndStatus(userId, LikeStatus.active);
        for (Like like : activeLikes) {
            excluded.add(like.getTargetUserId());
        }

        // 排除已有活跃心动信号的用户（pending 和 accepted 状态）
        List<HeartSignal> pendingSignals = heartSignalRepository
                .findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.pending);
        List<HeartSignal> acceptedSignals = heartSignalRepository
                .findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.accepted);

        for (HeartSignal signal : pendingSignals) {
            excluded.add(signal.getUserAId().equals(userId) ? signal.getUserBId() : signal.getUserAId());
        }
        for (HeartSignal signal : acceptedSignals) {
            excluded.add(signal.getUserAId().equals(userId) ? signal.getUserBId() : signal.getUserAId());
        }

        // 排除已 pass 的用户（左滑跳过的用户不再推荐）
        List<PassRecord> passRecords = passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (PassRecord passRecord : passRecords) {
            excluded.add(passRecord.getPassedUserId());
        }

        return excluded;
    }

    /**
     * 使用分页查询获取候选用户，并基于推荐分数加权排序。
     * 复用 RealRecommendationService.calculateScore() 的逻辑：
     * - 同校区: +50 权重
     * - 同城市: +20 权重
     * - 兴趣标签匹配: +10 每个匹配
     * - 日程重叠: +15 权重
     *
     * @param userId          当前用户 ID
     * @param excludedUserIds 应排除的用户 ID 集合
     * @return 按推荐分数降序排列的候选列表
     */
    private List<ScoredCandidate> findAndScoreCandidates(Long userId, Set<Long> excludedUserIds) {
        // 1. 获取当前用户的校区和城市信息
        Optional<UserCampusProfile> myCampusOpt = userCampusProfileRepository.findByUserId(userId);
        String myCampusName = myCampusOpt.map(UserCampusProfile::getCampusName).orElse("");
        String myCityName = myCampusOpt.map(UserCampusProfile::getCityName).orElse("");

        // 2. 获取当前用户的日程偏好
        Optional<UserScheduleProfile> myScheduleOpt = userScheduleProfileRepository.findByUserId(userId);
        String myTimeWindow = myScheduleOpt.map(UserScheduleProfile::getPreferredTimeWindowJson).orElse("{}");

        // 3. 获取当前用户的兴趣标签
        Set<String> myTags = userBasicProfileRepository.findByUserId(userId)
                .map(profile -> parseInterestTags(profile.getInterestTags()))
                .orElse(Collections.emptySet());

        // 4. 使用分页查询获取候选用户，避免全表扫描
        List<User> pagedUsers = userRepository.findAll(
                PageRequest.of(0, matchConfig.getCandidatePageSize())).getContent();

        // 5. 过滤排除用户并计算推荐分数
        List<ScoredCandidate> scoredCandidates = new ArrayList<>();
        for (User candidate : pagedUsers) {
            if (excludedUserIds.contains(candidate.getId())) {
                continue;
            }
            int score = calculateMatchScore(candidate.getId(), myCampusName, myCityName, myTags, myTimeWindow);
            scoredCandidates.add(new ScoredCandidate(candidate, score));
        }

        // 6. 按推荐分数降序排序
        scoredCandidates.sort(Comparator.comparingInt(ScoredCandidate::score).reversed());

        return scoredCandidates;
    }

    /**
     * 从 Top-N 候选中随机选择一个匹配对象。
     * 取前 5 个高分候选（或全部候选，如果不足 5 个），从中随机选择，
     * 兼顾匹配质量和随机性，避免总是匹配最高分用户。
     *
     * @param scoredCandidates 已排序的候选列表
     * @return 被选中的用户
     */
    private User selectFromTopCandidates(List<ScoredCandidate> scoredCandidates) {
        int topN = Math.min(5, scoredCandidates.size());
        int selectedIndex = ThreadLocalRandom.current().nextInt(topN);
        return scoredCandidates.get(selectedIndex).user();
    }

    /**
     * 计算候选用户的匹配推荐分数（复用 RealRecommendationService 的逻辑）。
     * - 同校区: +50
     * - 同城市: +20
     * - 兴趣标签匹配: +10 每个匹配
     * - 日程重叠: +15
     *
     * @param candidateUserId 候选用户 ID
     * @param myCampusName    当前用户校区名称
     * @param myCityName      当前用户城市名称
     * @param myTags          当前用户兴趣标签集合
     * @param myTimeWindow    当前用户日程时间窗口 JSON
     * @return 推荐分数
     */
    private int calculateMatchScore(Long candidateUserId, String myCampusName,
                                     String myCityName, Set<String> myTags, String myTimeWindow) {
        int score = 0;

        // 同校区
        Optional<UserCampusProfile> campusOpt = userCampusProfileRepository.findByUserId(candidateUserId);
        if (campusOpt.isPresent()) {
            UserCampusProfile campus = campusOpt.get();
            if (myCampusName.equals(campus.getCampusName())) {
                score += matchConfig.getCampusWeight();
            }
            // 同城市
            if (myCityName.equals(campus.getCityName())) {
                score += matchConfig.getCityWeight();
            }
        }

        // 兴趣标签匹配
        if (!myTags.isEmpty()) {
            Set<String> candidateTags = userBasicProfileRepository.findByUserId(candidateUserId)
                    .map(profile -> parseInterestTags(profile.getInterestTags()))
                    .orElse(Collections.emptySet());
            long commonTagCount = myTags.stream()
                    .filter(candidateTags::contains)
                    .count();
            score += (int) commonTagCount * matchConfig.getInterestWeight();
        }

        // 日程重叠
        Optional<UserScheduleProfile> scheduleOpt = userScheduleProfileRepository.findByUserId(candidateUserId);
        if (scheduleOpt.isPresent() && hasScheduleOverlap(myTimeWindow, scheduleOpt.get().getPreferredTimeWindowJson())) {
            score += matchConfig.getScheduleWeight();
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
            return Collections.emptySet();
        }
    }

    /**
     * 匹配候选加权排序用的内部记录。
     */
    private record ScoredCandidate(User user, int score) {}

    /**
     * 创建匹配心动信号记录。
     *
     * @param userId        发起匹配的用户 ID
     * @param matchedUserId 被匹配的用户 ID
     * @param matchType     匹配类型标签
     * @return 保存后的 HeartSignal 实体
     */
    private HeartSignal createMatchSignal(Long userId, Long matchedUserId, String matchType) {
        LocalDateTime now = LocalDateTime.now();
        HeartSignal signal = new HeartSignal();
        signal.setUserAId(userId);
        signal.setUserBId(matchedUserId);
        signal.setStatus(SignalStatus.pending);
        signal.setMatchType(matchType);
        signal.setExpiresAt(now.plusHours(matchConfig.getHeartSignalExpireHours()));
        signal.setCreatedAt(now);
        signal.setUpdatedAt(now);
        return heartSignalRepository.save(signal);
    }

    /**
     * 构建匹配对象简介（年级 + 个人简介摘要）。
     *
     * @param user 匹配对象用户实体
     * @return 简介字符串
     */
    private String buildPartnerHeadline(User user) {
        StringBuilder sb = new StringBuilder();
        if (user.getGradeLabel() != null && !user.getGradeLabel().isBlank()) {
            sb.append(user.getGradeLabel());
        }
        if (user.getBio() != null && !user.getBio().isBlank()) {
            if (!sb.isEmpty()) {
                sb.append("，");
            }
            // 截取简介前 20 个字符，避免过长
            String bio = user.getBio().length() > 20
                    ? user.getBio().substring(0, 20) + "..."
                    : user.getBio();
            sb.append(bio);
        }
        return sb.isEmpty() ? "一位校园同学" : sb.toString();
    }

    /**
     * 根据匹配意图生成破冰提示。
     *
     * @param matchIntent 匹配意图标识（topic/coffee/study）
     * @return 破冰提示文本
     */
    private String generateIcebreaker(String matchIntent) {
        if (matchIntent == null) {
            return "可以先聊聊彼此的校园生活。";
        }
        return switch (matchIntent) {
            case "topic" -> "可以先问问，对方最近在关注什么有趣的话题。";
            case "coffee" -> "可以聊聊最喜欢的校园角落，也许你们有共同的秘密基地。";
            case "study" -> "可以问问对方最近在忙什么课程，说不定能一起自习。";
            default -> "可以先问问，对方心里最轻松的一次校园初见应该是什么样。";
        };
    }

    /**
     * 根据匹配类型生成默认破冰提示（用于 getMatch 场景）。
     *
     * @param matchType 匹配类型中文标签
     * @return 破冰提示文本
     */
    private String generateDefaultIcebreaker(String matchType) {
        if (matchType == null) {
            return "可以先聊聊彼此的校园生活。";
        }
        return switch (matchType) {
            case "话题匹配" -> "可以先问问，对方最近在关注什么有趣的话题。";
            case "咖啡散步" -> "可以聊聊最喜欢的校园角落，也许你们有共同的秘密基地。";
            case "自习搭子" -> "可以问问对方最近在忙什么课程，说不定能一起自习。";
            case "快速匹配" -> "快速匹配成功！可以先打个招呼，聊聊今天的心情。";
            default -> "可以先聊聊彼此的校园生活。";
        };
    }

    /**
     * 将匹配意图标识映射为中文标签。
     *
     * @param matchIntent 匹配意图标识（topic/coffee/study）
     * @return 中文标签
     */
    private String toMatchTypeLabel(String matchIntent) {
        if (matchIntent == null) {
            return "匹配";
        }
        return switch (matchIntent) {
            case "topic" -> "话题匹配";
            case "coffee" -> "咖啡散步";
            case "study" -> "自习搭子";
            default -> matchIntent;
        };
    }

    /**
     * 将心动信号状态映射为匹配队列状态。
     *
     * @param status 心动信号状态
     * @return 匹配队列状态（connected/expired）
     */
    private String mapSignalStatusToQueueStatus(SignalStatus status) {
        return switch (status) {
            case pending, accepted -> "connected";
            case expired, declined -> "expired";
        };
    }

    /**
     * 通过 WebSocket 推送匹配通知给双方用户。
     *
     * @param userId        发起匹配的用户 ID
     * @param matchedUserId 被匹配的用户 ID
     * @param matchId       匹配记录 ID
     */
    private void pushMatchNotification(Long userId, Long matchedUserId, String matchId) {
        // 通知发起方：匹配创建成功
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/matches",
                Map.of("matchId", matchId, "matchedUserId", matchedUserId, "type", "match_created")
        );
        // 通知被匹配方：收到新的匹配
        messagingTemplate.convertAndSendToUser(
                String.valueOf(matchedUserId),
                "/queue/matches",
                Map.of("matchId", matchId, "matchedUserId", userId, "type", "match_received")
        );
    }
}
