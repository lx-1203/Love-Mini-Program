package com.campuslove.api.chat;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.ChatConfig;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.discover.RecommendationService;
import com.campuslove.api.discover.RecommendedPersonView;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.TempChatContactExchange;
import com.campuslove.api.entity.TempChatMessage;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.TempChatContactExchangeRepository;
import com.campuslove.api.repository.TempChatMessageRepository;
import com.campuslove.api.repository.TempChatSessionRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 临时聊天会话生命周期组件（Task 4.2.3 拆分）。
 *
 * <p>职责：会话的创建、查询、结束、置顶、已读标记等生命周期管理，
 * 以及会话视图转换（{@link #toSessionView} / {@link #toSummary}）和对方用户信息组装。
 * 不处理消息发送（由 {@link TempChatMessageService} 负责）和联系交换/过期清理（由 {@link TempChatCleanupService} 负责）。</p>
 */
@Profile("real")
@Component
public class TempChatSessionService {

    private static final Logger log = LoggerFactory.getLogger(TempChatSessionService.class);

    /** 已关闭/已过期的会话阶段列表，用于排除不可用会话 */
    public static final List<SessionPhase> INACTIVE_PHASES = List.of(SessionPhase.closed, SessionPhase.expired);

    private final ChatConfig chatConfig;
    private final TempChatSessionRepository sessionRepository;
    private final TempChatMessageRepository messageRepository;
    private final TempChatContactExchangeRepository contactExchangeRepository;
    private final UserRepository userRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final RecommendationService recommendationService;
    private final HeartSignalRepository heartSignalRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final TempChatViewMapper viewMapper;

    public TempChatSessionService(
            ChatConfig chatConfig,
            TempChatSessionRepository sessionRepository,
            TempChatMessageRepository messageRepository,
            TempChatContactExchangeRepository contactExchangeRepository,
            UserRepository userRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            RecommendationService recommendationService,
            HeartSignalRepository heartSignalRepository,
            SimpMessagingTemplate messagingTemplate,
            TempChatViewMapper viewMapper) {
        this.chatConfig = chatConfig;
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.contactExchangeRepository = contactExchangeRepository;
        this.userRepository = userRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.recommendationService = recommendationService;
        this.heartSignalRepository = heartSignalRepository;
        this.messagingTemplate = messagingTemplate;
        this.viewMapper = viewMapper;
    }

    // ---- 会话生命周期 ----

    /**
     * 获取聊天概览，包含会话列表和推荐的人。
     */
    @Transactional(readOnly = true)
    public ChatOverviewView getOverview() {
        Long currentUserId = resolveCurrentUserId();
        List<ChatSessionSummaryView> sessions = listSessions();
        List<RecommendedPersonCardView> recommendedPeople = getRecommendedPeople(currentUserId);
        String emptyStateLead = sessions.isEmpty() ? "还没有临时会话时，继续从推荐的人进入。" : null;
        return new ChatOverviewView(sessions, emptyStateLead, recommendedPeople);
    }

    /**
     * 获取当前用户的会话列表，按置顶和最后消息时间排序。
     * 惰性检查并标记过期会话。
     */
    @Transactional
    public List<ChatSessionSummaryView> listSessions() {
        Long currentUserId = resolveCurrentUserId();
        List<TempChatSession> sessions = sessionRepository.findByUserIdOrderByPinnedAndLastMessage(currentUserId);

        // infra R2-00240: 批量预加载对方用户信息，避免每会话 4 次查库（N+1）
        Map<Long, com.campuslove.api.chat.TempChatViewMapper.PartnerInfo> partnerInfoMap =
                viewMapper.loadPartnerInfoMap(sessions.stream()
                        .map(s -> s.getUserAId().equals(currentUserId) ? s.getUserBId() : s.getUserAId())
                        .toList());

        List<ChatSessionSummaryView> result = new ArrayList<>();
        for (TempChatSession session : sessions) {
            markExpiredIfDue(session);
            result.add(toSummary(session, currentUserId, partnerInfoMap));
        }
        return result;
    }

    /**
     * 创建临时聊天会话。
     * 如果已存在与该推荐人的活跃会话，则直接返回已有会话。
     * 新会话默认为 matching 阶段，24h 后自动过期。
     *
     * @param recommendedPersonId 推荐人 ID（可选，命中当前用户推荐列表）
     * @param matchId             匹配记录 ID（可选，兼容旧调用）
     * @param signalId            心动信号 ID（可选，2026-08-08 走查 P0-3：已接受信号开聊入口，
     *                            服务端校验信号归属与状态后解析对端用户）
     */
    @Transactional
    public TempChatSessionView createSession(String recommendedPersonId, String matchId, String signalId) {
        Long currentUserId = resolveCurrentUserId();
        Long partnerUserId = resolvePartnerUserId(recommendedPersonId, matchId, signalId);
        if (partnerUserId == null) {
            throw new IllegalArgumentException(ErrorMessages.RECOMMENDER_PARSE_FAILED_PREFIX + recommendedPersonId
                    + ", matchId=" + matchId + ", signalId=" + signalId);
        }

        Optional<TempChatSession> existing = sessionRepository.findActiveByUserPair(currentUserId, partnerUserId, INACTIVE_PHASES);
        if (existing.isPresent()) {
            log.debug("用户 {} 与 {} 已存在活跃会话: {}", currentUserId, partnerUserId, existing.get().getSessionUid());
            return toSessionView(existing.get(), currentUserId);
        }

        if (hasText(matchId)) {
            Optional<TempChatSession> matchSession = sessionRepository.findActiveByMatchId(matchId, INACTIVE_PHASES);
            if (matchSession.isPresent()) {
                log.debug("通过 matchId={} 找到已有活跃会话: {}", matchId, matchSession.get().getSessionUid());
                return toSessionView(matchSession.get(), currentUserId);
            }
        }

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        String sessionUid = generateSessionUid(currentUserId, partnerUserId);

        TempChatSession session = new TempChatSession();
        session.setSessionUid(sessionUid);
        session.setUserAId(currentUserId);
        session.setUserBId(partnerUserId);
        session.setRecommendedPersonId(recommendedPersonId);
        session.setMatchId(matchId);
        session.setPhase(SessionPhase.matching);
        session.setClosesAt(now.plusHours(chatConfig.getSessionExpireHours()));
        session.setIsPinned(false);
        session.setUserAUnreadCount(0);
        session.setUserBUnreadCount(0);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);
        // 实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id，
        // 否则 contactExchange.setSession 与下方 toSessionView 中 session.getId() 为 null
        session = sessionRepository.save(session);

        // 创建默认的联系交换记录
        TempChatContactExchange contactExchange = new TempChatContactExchange();
        contactExchange.setSession(session);
        contactExchange.setStatus("idle");
        contactExchange.setCreatedAt(now);
        contactExchange.setUpdatedAt(now);
        contactExchangeRepository.save(contactExchange);

        log.info("创建临时聊天会话: sessionUid={}, userA={}, userB={}, closesAt={}",
                sessionUid, currentUserId, partnerUserId, session.getClosesAt());

        messagingTemplate.convertAndSendToUser(
                String.valueOf(partnerUserId),
                "/queue/temp-chat",
                java.util.Map.of("type", "session_created", "sessionId", sessionUid)
        );

        return toSessionView(session, currentUserId);
    }

    /**
     * 获取指定会话详情，包含消息列表和联系交换状态。
     * 如果会话已过期，消息列表为空。
     * 修复（FIN HIGH-1）：校验当前用户是否为会话参与者，防止 IDOR 越权查看他人会话。
     */
    @Transactional
    public TempChatSessionView getSession(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSessionForCurrentUser(id);
        markExpiredIfDue(session);
        return toSessionView(session, currentUserId);
    }

    /**
     * 结束指定会话。
     * 将会话阶段设为 closed，关闭原因设为 ended，并通过 WebSocket 通知对方。
     */
    @Transactional
    public TempChatSessionView endSession(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSessionForCurrentUser(id);

        if (session.getPhase() == SessionPhase.closed || session.getPhase() == SessionPhase.expired) {
            log.debug("会话 {} 已{}，无需重复结束", id, session.getPhase() == SessionPhase.closed ? "关闭" : "过期");
            return toSessionView(session, currentUserId);
        }

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        session.setPhase(SessionPhase.closed);
        session.setClosedReason("ended");
        session.setUpdatedAt(now);
        sessionRepository.save(session);

        Long partnerId = session.getUserAId().equals(currentUserId) ? session.getUserBId() : session.getUserAId();
        messagingTemplate.convertAndSendToUser(
                String.valueOf(partnerId),
                "/queue/temp-chat",
                java.util.Map.of("type", "session_ended", "sessionId", session.getSessionUid())
        );

        log.info("会话 {} 已被用户 {} 手动结束", id, currentUserId);
        return toSessionView(session, currentUserId);
    }

    /**
     * 置顶指定会话。
     */
    @Transactional
    public ChatSessionSummaryView pinSession(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSessionForCurrentUser(id);
        session.setIsPinned(true);
        session.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        sessionRepository.save(session);
        log.debug("会话 {} 已置顶", id);
        return toSummary(session, currentUserId);
    }

    /**
     * 取消置顶指定会话。
     */
    @Transactional
    public ChatSessionSummaryView unpinSession(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSessionForCurrentUser(id);
        session.setIsPinned(false);
        session.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        sessionRepository.save(session);
        log.debug("会话 {} 已取消置顶", id);
        return toSummary(session, currentUserId);
    }

    /**
     * 标记指定会话为已读，将当前用户的未读计数归零。
     */
    @Transactional
    public ChatSessionSummaryView markSessionRead(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSessionForCurrentUser(id);
        if (session.getUserAId().equals(currentUserId)) {
            session.setUserAUnreadCount(0);
        } else {
            session.setUserBUnreadCount(0);
        }
        session.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        sessionRepository.save(session);
        log.debug("会话 {} 已被用户 {} 标记为已读", id, currentUserId);
        return toSummary(session, currentUserId);
    }

    // ---- 视图转换（委托至 TempChatViewMapper） ----

    /**
     * 将 TempChatSession 实体转换为 TempChatSessionView。
     * 包含消息列表（过期会话返回空列表）和联系交换状态。
     */
    public TempChatSessionView toSessionView(TempChatSession session, Long currentUserId) {
        return viewMapper.toSessionView(session, currentUserId, isSessionExpired(session));
    }

    /**
     * 将 TempChatSession 实体转换为 ChatSessionSummaryView。
     */
    public ChatSessionSummaryView toSummary(TempChatSession session, Long currentUserId) {
        return viewMapper.toSummary(session, currentUserId);
    }

    /**
     * 将 TempChatSession 实体转换为 ChatSessionSummaryView（批量预加载版本）。
     *
     * @param session        会话实体
     * @param currentUserId  当前用户 ID
     * @param partnerInfoMap 批量预加载的对方用户信息 Map
     * @return 会话摘要视图
     */
    public ChatSessionSummaryView toSummary(TempChatSession session, Long currentUserId,
                                            Map<Long, com.campuslove.api.chat.TempChatViewMapper.PartnerInfo> partnerInfoMap) {
        return viewMapper.toSummary(session, currentUserId, partnerInfoMap);
    }

    /** 将消息实体转换为视图。 */
    public ChatMessageView toMessageView(TempChatMessage message) {
        return viewMapper.toMessageView(message);
    }

    // ---- 共享辅助方法（被 MessageService / CleanupService 复用） ----

    /** 解析当前用户 ID。 */
    public Long resolveCurrentUserId() {
        return SecurityUtils.getCurrentUserId();
    }

    /** 解析会话实体（按 sessionUid 优先，回退到数据库 ID）。 */
    public TempChatSession resolveSession(String id) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.SESSION_ID_REQUIRED);
        }
        Optional<TempChatSession> sessionOpt = sessionRepository.findBySessionUid(id);
        if (sessionOpt.isEmpty()) {
            try {
                Long dbId = Long.parseLong(id);
                sessionOpt = sessionRepository.findById(dbId);
            } catch (NumberFormatException ignored) {
                // id 不是数字格式，忽略
            }
        }
        return sessionOpt.orElseThrow(() -> new IllegalArgumentException(ErrorMessages.SESSION_NOT_FOUND_PREFIX + id));
    }

    /**
     * 解析会话实体并校验当前用户（SecurityContext）是否为会话参与者。
     *
     * <p>修复（FIN HIGH-1）：会话 UID 格式可预测，若下游操作直接使用 {@link #resolveSession(String)}
     * 而不校验参与者，任意登录用户可越权访问/操作他人会话（IDOR）。
     * 所有面向用户的会话操作入口必须使用本方法。</p>
     *
     * @param id 会话 ID（sessionUid 或数据库 ID）
     * @return 会话实体
     * @throws com.campuslove.api.common.OperationForbiddenException 当前用户不是会话参与者时抛出
     */
    public TempChatSession resolveSessionForCurrentUser(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSession(id);
        requireParticipant(session, currentUserId);
        return session;
    }

    /**
     * 校验指定用户是否为会话参与者（userA / userB 之一）。
     *
     * @param session 会话实体
     * @param userId  待校验用户 ID
     * @throws com.campuslove.api.common.OperationForbiddenException 用户不是会话参与者时抛出
     */
    public void requireParticipant(TempChatSession session, Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.CURRENT_USER_ID_REQUIRED);
        }
        boolean participant = (session.getUserAId() != null && session.getUserAId().equals(userId))
                || (session.getUserBId() != null && session.getUserBId().equals(userId));
        if (!participant) {
            throw new com.campuslove.api.common.OperationForbiddenException("无权访问该会话");
        }
    }

    /** 检查会话是否已过期（当前时间超过 closesAt）。 */
    public boolean isSessionExpired(TempChatSession session) {
        return session.getClosesAt() != null && LocalDateTime.now(TimeZones.BUSINESS).isAfter(session.getClosesAt());
    }

    /**
     * 惰性标记过期：如果会话已到关闭时间但尚未标记为 expired，则更新状态并持久化。
     *
     * @param session 会话实体
     * @return true 表示会话已过期（无论是本次标记还是之前已标记）
     */
    @Transactional
    public boolean markExpiredIfDue(TempChatSession session) {
        if (isSessionExpired(session) && session.getPhase() != SessionPhase.expired) {
            session.setPhase(SessionPhase.expired);
            session.setClosedReason("expired");
            session.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
            sessionRepository.save(session);
            return true;
        }
        return session.getPhase() == SessionPhase.expired;
    }

    /** 持久化会话实体（供 MessageService / CleanupService 复用）。 */
    @Transactional
    public TempChatSession saveSession(TempChatSession session) {
        return sessionRepository.save(session);
    }

    /** 暴露 messagingTemplate（供 MessageService / CleanupService 推送通知复用）。 */
    public SimpMessagingTemplate getMessagingTemplate() {
        return messagingTemplate;
    }

    /** 暴露 messageRepository（供 MessageService 加载引用消息复用）。 */
    public TempChatMessageRepository getMessageRepository() {
        return messageRepository;
    }

    // ---- 私有辅助方法 ----

    /** 解析推荐人对应的用户 ID。 */
    private Long resolvePartnerUserId(String recommendedPersonId, String matchId, String signalId) {
        Long currentUserId = resolveCurrentUserId();

        // 心动信号入口（2026-08-08 走查 P0-3）：校验信号归属与状态后解析对端用户。
        // 优先于推荐人/匹配入口——已互动的信号对象大概率不在推荐列表中。
        Long signalPartner = resolvePartnerFromSignal(currentUserId, signalId);
        if (signalPartner != null) {
            return signalPartner;
        }

        try {
            List<RecommendedPersonView> recommendations = recommendationService.getRecommendations(currentUserId);
            if (hasText(recommendedPersonId)) {
                for (RecommendedPersonView person : recommendations) {
                    if (recommendedPersonId.equals(String.valueOf(person.id()))) {
                        return person.id();
                    }
                }
            }
            if (!recommendations.isEmpty()) {
                return recommendations.get(0).id();
            }
        } catch (DataAccessException e) {
            log.warn("从推荐服务获取推荐人信息失败: {}", e.getMessage());
        }

        // 修复（R2 review MED）：旧实现会把 recommendedPersonId 任意解析为 userId，
        // 允许用户与任意用户建立临时会话（绕过推荐/匹配体系，对方无接受机制即被拉入）。
        // 现仅保留 matchId 兜底（来自匹配体系的 ID 相对可信），
        // recommendedPersonId 未命中推荐列表时不再回退到任意用户。
        // R4-00322 修复：matchId 兜底不再把任意数字解析为 userId——matchId 按
        // 心动信号（匹配）ID 查询，必须存在且当前用户是参与者，返回对端用户 ID。
        // 任意数字/他人匹配 ID 均无法建立会话（越权骚扰修复）。
        if (hasText(matchId)) {
            Long partner = resolvePartnerFromMatch(currentUserId, matchId);
            if (partner != null) {
                return partner;
            }
        }
        return null;
    }

    /**
     * 从匹配（心动信号）ID 解析对端用户 ID（R4-00322）。
     *
     * <p>校验规则：matchId 对应的心动信号必须存在且当前用户是参与者之一；
     * 满足条件返回对端用户 ID，否则返回 null（不抛错——matchId 仅作兜底入口，
     * 未命中时走其他入口语义，避免误伤正常流程）。</p>
     */
    private Long resolvePartnerFromMatch(Long currentUserId, String matchId) {
        Long matchDbId;
        try {
            matchDbId = Long.parseLong(matchId);
        } catch (NumberFormatException e) {
            return null;
        }
        try {
            Optional<HeartSignal> matchOpt = heartSignalRepository.findById(matchDbId);
            if (matchOpt.isEmpty()) {
                log.warn("matchId 兜底：匹配记录不存在，拒绝建会话：matchId={}, userId={}", matchId, currentUserId);
                return null;
            }
            HeartSignal match = matchOpt.get();
            boolean participant = currentUserId.equals(match.getUserAId())
                    || currentUserId.equals(match.getUserBId());
            if (!participant) {
                log.warn("matchId 兜底：当前用户非匹配参与者，拒绝建会话：matchId={}, userId={}",
                        matchId, currentUserId);
                return null;
            }
            return currentUserId.equals(match.getUserAId()) ? match.getUserBId() : match.getUserAId();
        } catch (DataAccessException e) {
            log.warn("matchId 兜底：查询匹配记录失败，拒绝建会话：matchId={}, error={}",
                    matchId, e.getMessage());
            return null;
        }
    }

    /** 生成会话唯一标识。 */
    private String generateSessionUid(Long userAId, Long userBId) {
        long min = Math.min(userAId, userBId);
        long max = Math.max(userAId, userBId);
        String randomSuffix = UUID.randomUUID().toString().substring(0, 8);
        return "session-" + min + "-" + max + "-" + randomSuffix;
    }

    /** 获取推荐人物卡片列表。 */
    private List<RecommendedPersonCardView> getRecommendedPeople(Long currentUserId) {
        try {
            List<RecommendedPersonView> recommendations = recommendationService.getRecommendations(currentUserId);
            return recommendations.stream().map(viewMapper::toRecommendedPersonCard).toList();
        } catch (DataAccessException e) {
            log.warn("获取推荐人物列表失败: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * 从心动信号解析对端用户 ID（2026-08-08 走查 P0-3）。
     *
     * <p>校验规则：信号必须存在、状态为 accepted、且当前用户是信号参与者之一。
     * 满足条件返回对端用户 ID；signalId 为空/无效时返回 null（走其他入口）；</p>
     * <p>存在但校验失败（非参与者/非 accepted）时抛 400「心动信号无效或已过期」，
     * 防止用户借任意 ID 与陌生人建立匿名会话（越权风险，与 R2 review MED 同一思路）。</p>
     */
    private Long resolvePartnerFromSignal(Long currentUserId, String signalId) {
        if (!hasText(signalId)) {
            return null;
        }
        Long signalDbId;
        try {
            signalDbId = Long.parseLong(signalId);
        } catch (NumberFormatException e) {
            return null;
        }
        Optional<HeartSignal> signalOpt = heartSignalRepository.findById(signalDbId);
        if (signalOpt.isEmpty()) {
            throw new IllegalArgumentException(ErrorMessages.SIGNAL_INVALID_OR_EXPIRED_PREFIX + signalId);
        }
        HeartSignal signal = signalOpt.get();
        boolean participant = signal.getUserAId().equals(currentUserId) || signal.getUserBId().equals(currentUserId);
        if (!participant || signal.getStatus() != HeartSignal.SignalStatus.accepted) {
            throw new IllegalArgumentException(ErrorMessages.SIGNAL_INVALID_OR_EXPIRED_PREFIX + signalId);
        }
        Long partner = signal.getUserAId().equals(currentUserId) ? signal.getUserBId() : signal.getUserAId();
        log.debug("心动信号 {} 解析对端用户 {}（当前用户 {}）", signalId, partner, currentUserId);
        return partner;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
