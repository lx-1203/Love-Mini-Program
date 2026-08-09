package com.campuslove.api.match;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.PassRecord;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.Visitor;
import com.campuslove.api.mq.MatchEventMessage;
import com.campuslove.api.mq.MessageProducer;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PassRecordRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.VisitorRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 匹配记录与通知组件（Task 4.2.1 拆分）。
 *
 * <p>专注"记录写入 + 通知推送"，不包含算法逻辑（由 {@link MatchEngine} 提供）。
 * 涵盖 Like/HeartSignal/Pass/Visitor 增删改、WebSocket 实时推送、MQ 异步事件发布、
 * 批量加载用户与校区资料（避免 N+1）、HeartSignalView 视图转换等职责。</p>
 */
@Profile("real")
@Component
public class MatchRecorder {

    private final MatchConfig matchConfig;
    private final LikeRepository likeRepository;
    private final HeartSignalRepository heartSignalRepository;
    private final VisitorRepository visitorRepository;
    private final PassRecordRepository passRecordRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final InteractionEventService interactionEventService;
    private final MessageProducer messageProducer;

    public MatchRecorder(
            MatchConfig matchConfig,
            LikeRepository likeRepository,
            HeartSignalRepository heartSignalRepository,
            VisitorRepository visitorRepository,
            PassRecordRepository passRecordRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            SimpMessagingTemplate messagingTemplate,
            InteractionEventService interactionEventService,
            MessageProducer messageProducer) {
        this.matchConfig = matchConfig;
        this.likeRepository = likeRepository;
        this.heartSignalRepository = heartSignalRepository;
        this.visitorRepository = visitorRepository;
        this.passRecordRepository = passRecordRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.messagingTemplate = messagingTemplate;
        this.interactionEventService = interactionEventService;
        this.messageProducer = messageProducer;
    }

    // ---- Like 记录管理 ----

    /**
     * 查询已存在的 like 记录（任意状态）。
     */
    public Optional<Like> findExistingLike(Long userId, Long targetUserId) {
        return likeRepository.findByUserIdAndTargetUserId(userId, targetUserId);
    }

    /**
     * 重新激活已取消的 like 记录。
     */
    @Transactional
    public Like reactivateLike(Like like, LocalDateTime now) {
        like.setStatus(LikeStatus.active);
        like.setUpdatedAt(now);
        return likeRepository.save(like);
    }

    /**
     * 创建新的 like 记录。
     */
    @Transactional
    public Like createLike(Long userId, Long targetUserId, LocalDateTime now) {
        Like like = new Like();
        like.setUserId(userId);
        like.setTargetUserId(targetUserId);
        like.setStatus(LikeStatus.active);
        like.setCreatedAt(now);
        like.setUpdatedAt(now);
        return likeRepository.save(like);
    }

    /**
     * 取消 like 记录（status=cancelled）。
     */
    @Transactional
    public void cancelLike(Long userId, Long targetUserId) {
        Optional<Like> existingLike = likeRepository.findByUserIdAndTargetUserId(userId, targetUserId);
        if (existingLike.isPresent()) {
            Like like = existingLike.get();
            like.setStatus(LikeStatus.cancelled);
            like.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
            likeRepository.save(like);
        }
    }

    /**
     * 查询反向 like（targetUserId -> userId）是否为 active。
     */
    public Optional<Like> findReverseActiveLike(Long targetUserId, Long userId) {
        return likeRepository.findByUserIdAndTargetUserId(targetUserId, userId)
                .filter(like -> like.getStatus() == LikeStatus.active);
    }

    /**
     * 记录 NEW_LIKE 互动事件（通知被喜欢的用户）。
     */
    public void recordNewLikeEvent(Long targetUserId, Long userId) {
        interactionEventService.recordEvent(
                targetUserId, userId, "NEW_LIKE", null, "USER", "有人喜欢了你");
    }

    /**
     * 创建双向喜欢的心动信号（mutual_like）。
     */
    @Transactional
    public HeartSignal createMutualSignal(Long userId, Long targetUserId, LocalDateTime now) {
        return createMutualSignal(userId, targetUserId, now, "mutual_like");
    }

    /**
     * 创建双向喜欢的心动信号（支持匹配类型区分）。
     *
     * <p>A-25/A-31：超级喜欢生成的信号 matchType=super_like，与普通喜欢
     * （mutual_like）区分——super-like 不受每日上限限制且权重更高，
     * 上层（推荐/匹配）可按 matchType 差异化处理。</p>
     *
     * @param userId       用户 A ID
     * @param targetUserId 用户 B ID
     * @param now          当前时间
     * @param matchType    匹配类型（mutual_like / super_like）
     */
    @Transactional
    public HeartSignal createMutualSignal(Long userId, Long targetUserId, LocalDateTime now, String matchType) {
        HeartSignal signal = new HeartSignal();
        signal.setUserAId(userId);
        signal.setUserBId(targetUserId);
        signal.setStatus(SignalStatus.pending);
        signal.setMatchType(matchType != null ? matchType : "mutual_like");
        signal.setExpiresAt(now.plusHours(matchConfig.getHeartSignalExpireHours()));
        signal.setCreatedAt(now);
        signal.setUpdatedAt(now);
        return heartSignalRepository.save(signal);
    }

    /**
     * 创建匹配心动信号（用于 createMatch/createQuickMatch）。
     */
    @Transactional
    public HeartSignal createMatchSignal(Long userId, Long matchedUserId, String matchType) {
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
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

    // ---- Pass 记录管理 ----

    /**
     * 检查 pass 记录是否已存在（避免重复 pass）。
     */
    public boolean existsPassRecord(Long userId, Long passedUserId) {
        return passRecordRepository.existsByUserIdAndPassedUserId(userId, passedUserId);
    }

    /**
     * 创建 pass 记录。
     */
    @Transactional
    public void recordPass(Long userId, Long passedUserId) {
        if (existsPassRecord(userId, passedUserId)) {
            return;
        }
        PassRecord record = new PassRecord();
        record.setUserId(userId);
        record.setPassedUserId(passedUserId);
        record.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        passRecordRepository.save(record);
    }

    /**
     * 查询用户最近 pass 记录（按 createdAt 倒序）。
     */
    public List<PassRecord> findLatestPassRecords(Long userId) {
        return passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * 删除 pass 记录（用于 rewind）。
     */
    @Transactional
    public void deletePassRecord(PassRecord record) {
        passRecordRepository.delete(record);
    }

    // ---- 访客记录管理 ----

    /**
     * 查询访客记录（按 createdAt 倒序）。
     */
    public List<Visitor> findVisitors(Long userId) {
        return visitorRepository.findByVisitedUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * 检查今日是否已访问过（避免重复记录）。
     *
     * <p>缺陷修复：visitors.created_at 为 {@link LocalDateTime} 类型，
     * 派生查询 Between 参数必须为 {@link LocalDateTime}。此处将日期转换为
     * 「今日 00:00:00（含）～ 明日 00:00:00（不含）」时刻区间，
     * 修复原 LocalDate 直传导致的 InvalidDataAccessApiUsageException（500）。</p>
     */
    public boolean existsTodayVisit(Long visitorId, Long visitedUserId, LocalDate today) {
        return visitorRepository.existsByVisitorIdAndVisitedUserIdAndCreatedAtBetween(
                visitorId, visitedUserId, today.atStartOfDay(), today.plusDays(1).atStartOfDay());
    }

    /**
     * 记录访客（同一访客对同一用户每天只记录一次）。
     */
    @Transactional
    public void recordVisit(Long visitorId, Long visitedUserId) {
        LocalDate today = LocalDate.now(TimeZones.BUSINESS);
        if (existsTodayVisit(visitorId, visitedUserId, today)) {
            return;
        }
        Visitor visitor = new Visitor();
        visitor.setVisitorId(visitorId);
        visitor.setVisitedUserId(visitedUserId);
        visitor.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        visitorRepository.save(visitor);

        interactionEventService.recordEvent(
                visitedUserId, visitorId, "NEW_VISITOR", null, "USER", "有人查看了你的资料");

        // 2026-08-09 访客通知链路修复：发布 visitor 事件，
        // 由 MatchEventConsumer.handleVisitor 持久化「有人查看了你的资料」通知到被访方，
        // 与「喜欢/匹配」通知走同一 MQ 消费链路（WebSocket 实时推送 + notifications 表落库）
        messageProducer.sendMatchEvent(new MatchEventMessage(
                visitorId, visitedUserId, "visitor", Instant.now()));
    }

    /**
     * 标记访客记录为已读。
     */
    @Transactional
    public void markVisitorRead(Long visitorId) {
        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new IllegalArgumentException("Visitor record not found: " + visitorId));
        visitor.setIsRead(true);
        visitorRepository.save(visitor);
    }

    // ---- 心动信号状态更新 ----

    /**
     * 接受心动信号（status=accepted）。
     */
    @Transactional
    public void acceptHeartSignal(Long signalId, Long userId) {
        HeartSignal signal = loadSignalAndVerifyParticipant(signalId, userId);
        signal.setStatus(SignalStatus.accepted);
        signal.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        heartSignalRepository.save(signal);
    }

    /**
     * 拒绝心动信号（status=declined）。
     */
    @Transactional
    public void declineHeartSignal(Long signalId, Long userId) {
        HeartSignal signal = loadSignalAndVerifyParticipant(signalId, userId);
        signal.setStatus(SignalStatus.declined);
        signal.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        heartSignalRepository.save(signal);
    }

    private HeartSignal loadSignalAndVerifyParticipant(Long signalId, Long userId) {
        HeartSignal signal = heartSignalRepository.findById(signalId)
                .orElseThrow(() -> new IllegalArgumentException("Heart signal not found: " + signalId));
        if (!signal.getUserAId().equals(userId) && !signal.getUserBId().equals(userId)) {
            throw new IllegalArgumentException("User is not a participant of this heart signal");
        }
        return signal;
    }

    // ---- 通知与 MQ 推送 ----

    /**
     * 通过 WebSocket 推送匹配通知给双方用户。
     */
    public void pushMatchNotification(Long userId, Long matchedUserId, String matchId) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/matches",
                Map.of("matchId", matchId, "matchedUserId", matchedUserId, "type", "match_created")
        );
        messagingTemplate.convertAndSendToUser(
                String.valueOf(matchedUserId),
                "/queue/matches",
                Map.of("matchId", matchId, "matchedUserId", userId, "type", "match_received")
        );
    }

    /**
     * 通过 WebSocket 推送心动信号给双方用户。
     */
    public void pushHeartSignalNotification(Long userId, Long targetUserId, HeartSignalView signalView) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId), "/queue/signals", signalView);
        messagingTemplate.convertAndSendToUser(
                String.valueOf(targetUserId), "/queue/signals", signalView);
    }

    /**
     * 通过 MQ 异步推送匹配事件（微信模板消息、通知持久化等）。
     * <p>P0 BUG 修复：原同步发送微信模板消息逻辑改为异步 MQ，
     * 避免阻塞匹配主流程。MQ 不可用时由 MessageProducer 内部降级处理。</p>
     */
    public void publishMatchEvent(Long userId, Long targetUserId, String type) {
        messageProducer.sendMatchEvent(new MatchEventMessage(
                userId, targetUserId, type, Instant.now()));
    }

    // ---- 视图转换与批量加载 ----

    /**
     * 将 HeartSignal 实体转换为 HeartSignalView（使用预加载的 userA Map）。
     */
    public HeartSignalView toHeartSignalView(HeartSignal signal, Map<Long, User> userAMap) {
        User fromUser = userAMap != null ? userAMap.get(signal.getUserAId()) : null;
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

    /**
     * 单条场景的视图转换，内部调用 batchLoadUsers。
     */
    public HeartSignalView toHeartSignalView(HeartSignal signal) {
        Map<Long, User> userAMap = batchLoadUsers(List.of(signal.getUserAId()));
        return toHeartSignalView(signal, userAMap);
    }

    /**
     * 批量查询用户信息，避免 N+1 查询。
     */
    public Map<Long, User> batchLoadUsers(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> distinctIds = userIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (distinctIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findAllById(distinctIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    /**
     * 批量查询用户校园资料，避免 N+1 查询。
     */
    public Map<Long, UserCampusProfile> batchLoadCampusProfiles(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> distinctIds = userIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (distinctIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userCampusProfileRepository.findByUserIdIn(distinctIds).stream()
                .collect(Collectors.toMap(UserCampusProfile::getUserId, p -> p));
    }
}
