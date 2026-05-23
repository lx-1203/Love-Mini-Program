package com.campuslove.api.chat;

import com.campuslove.api.config.ChatConfig;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.discover.RecommendationService;
import com.campuslove.api.discover.RecommendedPersonView;
import com.campuslove.api.entity.TempChatContactExchange;
import com.campuslove.api.entity.TempChatMessage;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
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
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实临时聊天服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库持久化。
 * 提供临时聊天会话的创建、消息发送、联系交换、结束会话等功能。
 * 会话具有 24h 自动过期机制。
 */
@Profile("real")
@Primary
@Service
public class RealTempChatService implements TempChatService {

    private static final Logger log = LoggerFactory.getLogger(RealTempChatService.class);

    private final ChatConfig chatConfig;

    /** 已关闭/已过期的会话阶段列表，用于排除不可用会话 */
    private static final List<SessionPhase> INACTIVE_PHASES = List.of(SessionPhase.closed, SessionPhase.expired);

    private final TempChatSessionRepository sessionRepository;
    private final TempChatMessageRepository messageRepository;
    private final TempChatContactExchangeRepository contactExchangeRepository;
    private final UserRepository userRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final RecommendationService recommendationService;
    private final SimpMessagingTemplate messagingTemplate;

    public RealTempChatService(
            ChatConfig chatConfig,
            TempChatSessionRepository sessionRepository,
            TempChatMessageRepository messageRepository,
            TempChatContactExchangeRepository contactExchangeRepository,
            UserRepository userRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            RecommendationService recommendationService,
            SimpMessagingTemplate messagingTemplate) {
        this.chatConfig = chatConfig;
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.contactExchangeRepository = contactExchangeRepository;
        this.userRepository = userRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.recommendationService = recommendationService;
        this.messagingTemplate = messagingTemplate;
    }

    // ---- 接口方法实现 ----

    /**
     * 获取聊天概览，包含会话列表和推荐的人。
     * 当前用户 ID 通过请求参数 userId 或 resolveCurrentUserId() 获取。
     */
    @Override
    @Transactional(readOnly = true)
    public ChatOverviewView getOverview() {
        Long currentUserId = resolveCurrentUserId();
        List<ChatSessionSummaryView> sessions = listSessions();

        // 获取推荐人物列表
        List<RecommendedPersonCardView> recommendedPeople = getRecommendedPeople(currentUserId);

        String emptyStateLead = sessions.isEmpty()
                ? "还没有临时会话时，继续从推荐的人进入。"
                : null;

        return new ChatOverviewView(sessions, emptyStateLead, recommendedPeople);
    }

    /**
     * 获取当前用户的会话列表，按置顶和最后消息时间排序。
     */
    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionSummaryView> listSessions() {
        Long currentUserId = resolveCurrentUserId();
        List<TempChatSession> sessions = sessionRepository.findByUserIdOrderByPinnedAndLastMessage(currentUserId);

        // 检查并标记过期会话
        List<ChatSessionSummaryView> result = new ArrayList<>();
        for (TempChatSession session : sessions) {
            // 惰性检查过期：如果会话已到关闭时间但尚未标记为过期，则更新状态
            if (isSessionExpired(session) && session.getPhase() != SessionPhase.expired) {
                session.setPhase(SessionPhase.expired);
                session.setClosedReason("expired");
                session.setUpdatedAt(LocalDateTime.now());
                sessionRepository.save(session);
            }
            result.add(toSummary(session, currentUserId));
        }

        return result;
    }

    /**
     * 创建临时聊天会话。
     * 如果已存在与该推荐人的活跃会话，则直接返回已有会话。
     * 新会话默认为 matching 阶段，24h 后自动过期。
     */
    @Override
    @Transactional
    public TempChatSessionView createSession(String recommendedPersonId, String matchId) {
        Long currentUserId = resolveCurrentUserId();

        // 解析推荐人对应的用户 ID
        Long partnerUserId = resolvePartnerUserId(recommendedPersonId, matchId);
        if (partnerUserId == null) {
            throw new IllegalArgumentException("无法解析推荐人信息: recommendedPersonId=" + recommendedPersonId + ", matchId=" + matchId);
        }

        // 检查是否已存在活跃会话
        Optional<TempChatSession> existingSession = sessionRepository.findActiveByUserPair(
                currentUserId, partnerUserId, INACTIVE_PHASES);

        if (existingSession.isPresent()) {
            log.debug("用户 {} 与 {} 已存在活跃会话: {}", currentUserId, partnerUserId, existingSession.get().getSessionUid());
            return toSessionView(existingSession.get(), currentUserId);
        }

        // 如果有 matchId，也尝试按 matchId 查找
        if (hasText(matchId)) {
            Optional<TempChatSession> matchSession = sessionRepository.findActiveByMatchId(matchId, INACTIVE_PHASES);
            if (matchSession.isPresent()) {
                log.debug("通过 matchId={} 找到已有活跃会话: {}", matchId, matchSession.get().getSessionUid());
                return toSessionView(matchSession.get(), currentUserId);
            }
        }

        // 创建新会话
        LocalDateTime now = LocalDateTime.now();
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

        sessionRepository.save(session);

        // 创建默认的联系交换记录
        TempChatContactExchange contactExchange = new TempChatContactExchange();
        contactExchange.setSession(session);
        contactExchange.setStatus("idle");
        contactExchange.setCreatedAt(now);
        contactExchange.setUpdatedAt(now);
        contactExchangeRepository.save(contactExchange);

        log.info("创建临时聊天会话: sessionUid={}, userA={}, userB={}, closesAt={}",
                sessionUid, currentUserId, partnerUserId, session.getClosesAt());

        // 通过 WebSocket 通知被推荐方有新的临时聊天会话
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
     */
    @Override
    @Transactional(readOnly = true)
    public TempChatSessionView getSession(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSession(id);

        // 惰性检查过期
        if (isSessionExpired(session) && session.getPhase() != SessionPhase.expired) {
            session.setPhase(SessionPhase.expired);
            session.setClosedReason("expired");
            session.setUpdatedAt(LocalDateTime.now());
            sessionRepository.save(session);
        }

        return toSessionView(session, currentUserId);
    }

    /**
     * 在指定会话中发送消息。
     * 已关闭或已过期的会话不允许发送消息。
     * 发送消息后通过 WebSocket 推送给对方。
     */
    @Override
    @Transactional
    public TempChatSessionView sendMessage(String id, ChatMessageRequest request) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSession(id);

        // 检查过期
        if (isSessionExpired(session)) {
            if (session.getPhase() != SessionPhase.expired) {
                session.setPhase(SessionPhase.expired);
                session.setClosedReason("expired");
                session.setUpdatedAt(LocalDateTime.now());
                sessionRepository.save(session);
            }
            log.debug("会话 {} 已过期，无法发送消息", id);
            return toSessionView(session, currentUserId);
        }

        // 检查会话是否已关闭
        if (session.getPhase() == SessionPhase.closed) {
            log.debug("会话 {} 已关闭，无法发送消息", id);
            return toSessionView(session, currentUserId);
        }

        // 如果会话还在 matching 阶段，发送第一条消息后自动转为 active
        if (session.getPhase() == SessionPhase.matching) {
            session.setPhase(SessionPhase.active);
        }

        LocalDateTime now = LocalDateTime.now();

        // 创建消息
        TempChatMessage message = new TempChatMessage();
        message.setSession(session);
        message.setSender(request.sender());
        message.setKind(request.kind());
        message.setBody(request.body());
        message.setDurationSeconds(request.durationSeconds());
        message.setCreatedAt(now);

        messageRepository.save(message);

        // 更新会话的最后消息信息
        String preview = buildMessagePreview(request.kind(), request.body());
        session.setLastMessagePreview(preview);
        session.setLastMessageAt(now);
        session.setUpdatedAt(now);

        // 更新未读计数：如果发送者是对方，则当前用户的未读数+1
        boolean isPeerMessage = "peer".equals(request.sender());
        if (isPeerMessage) {
            session.setUserAUnreadCount(session.getUserAUnreadCount() + 1);
        } else {
            session.setUserBUnreadCount(session.getUserBUnreadCount() + 1);
        }

        sessionRepository.save(session);

        // 通过 WebSocket 推送消息给对方
        Long recipientId = isPeerMessage ? session.getUserAId() : session.getUserBId();
        ChatMessageView messageView = new ChatMessageView(
                String.valueOf(message.getId()),
                message.getSender(),
                message.getKind(),
                message.getBody(),
                message.getCreatedAt().toString(),
                message.getDurationSeconds()
        );
        messagingTemplate.convertAndSendToUser(
                String.valueOf(recipientId),
                "/queue/temp-chat/messages",
                messageView
        );

        log.debug("会话 {} 发送消息: sender={}, kind={}", id, request.sender(), request.kind());

        return toSessionView(session, currentUserId);
    }

    /**
     * 响应联系交换请求。
     * 状态流转逻辑：
     * - rejected: 直接拒绝
     * - accepted-by-self / accepted-by-peer: 单方同意
     * - completed: 双方同意
     */
    @Override
    @Transactional
    public TempChatSessionView respondToContactExchange(String id, ContactExchangeDecisionRequest request) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSession(id);

        // 已关闭或已过期的会话不允许操作联系交换
        if (session.getPhase() == SessionPhase.closed || session.getPhase() == SessionPhase.expired) {
            log.debug("会话 {} 已{}，无法响应联系交换", id, session.getPhase() == SessionPhase.closed ? "关闭" : "过期");
            return toSessionView(session, currentUserId);
        }

        // 获取或创建联系交换记录
        TempChatContactExchange exchange = contactExchangeRepository.findBySessionId(session.getId())
                .orElseGet(() -> {
                    LocalDateTime now = LocalDateTime.now();
                    TempChatContactExchange newExchange = new TempChatContactExchange();
                    newExchange.setSession(session);
                    newExchange.setStatus("idle");
                    newExchange.setCreatedAt(now);
                    newExchange.setUpdatedAt(now);
                    return contactExchangeRepository.save(newExchange);
                });

        // 解析交换状态
        String currentStatus = exchange.getStatus();
        String newStatus = resolveExchangeStatus(currentStatus, request.actor(), request.decision());
        String proposer = exchange.getProposer() == null ? request.actor() : exchange.getProposer();

        exchange.setProposer(proposer);
        exchange.setStatus(newStatus);
        exchange.setUpdatedAt(LocalDateTime.now());
        contactExchangeRepository.save(exchange);

        // 如果联系交换完成，通过 WebSocket 通知双方
        if ("completed".equals(newStatus)) {
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(session.getUserAId()),
                    "/queue/temp-chat",
                    java.util.Map.of("type", "contact_exchange_completed", "sessionId", session.getSessionUid())
            );
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(session.getUserBId()),
                    "/queue/temp-chat",
                    java.util.Map.of("type", "contact_exchange_completed", "sessionId", session.getSessionUid())
            );
        }

        log.info("会话 {} 联系交换状态更新: {} -> {}, actor={}, decision={}",
                id, currentStatus, newStatus, request.actor(), request.decision());

        return toSessionView(session, currentUserId);
    }

    /**
     * 结束指定会话。
     * 将会话阶段设为 closed，关闭原因设为 ended。
     */
    @Override
    @Transactional
    public TempChatSessionView endSession(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSession(id);

        if (session.getPhase() == SessionPhase.closed || session.getPhase() == SessionPhase.expired) {
            log.debug("会话 {} 已{}，无需重复结束", id, session.getPhase() == SessionPhase.closed ? "关闭" : "过期");
            return toSessionView(session, currentUserId);
        }

        LocalDateTime now = LocalDateTime.now();
        session.setPhase(SessionPhase.closed);
        session.setClosedReason("ended");
        session.setUpdatedAt(now);
        sessionRepository.save(session);

        // 通过 WebSocket 通知对方会话已结束
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
    @Override
    @Transactional
    public ChatSessionSummaryView pinSession(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSession(id);

        session.setIsPinned(true);
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepository.save(session);

        log.debug("会话 {} 已置顶", id);
        return toSummary(session, currentUserId);
    }

    /**
     * 取消置顶指定会话。
     */
    @Override
    @Transactional
    public ChatSessionSummaryView unpinSession(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSession(id);

        session.setIsPinned(false);
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepository.save(session);

        log.debug("会话 {} 已取消置顶", id);
        return toSummary(session, currentUserId);
    }

    /**
     * 标记指定会话为已读，将当前用户的未读计数归零。
     */
    @Override
    @Transactional
    public ChatSessionSummaryView markSessionRead(String id) {
        Long currentUserId = resolveCurrentUserId();
        TempChatSession session = resolveSession(id);

        // 将当前用户的未读计数归零
        if (session.getUserAId().equals(currentUserId)) {
            session.setUserAUnreadCount(0);
        } else {
            session.setUserBUnreadCount(0);
        }
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepository.save(session);

        log.debug("会话 {} 已被用户 {} 标记为已读", id, currentUserId);
        return toSummary(session, currentUserId);
    }

    // ---- 私有辅助方法 ----

    /**
     * 解析当前用户 ID。
     * 优先从请求参数 userId 获取，回退到默认值 1L。
     * 后续集成 Spring Security 后可从 SecurityContextHolder 获取。
     *
     * @return 当前用户 ID
     */
    private Long resolveCurrentUserId() {
        // 尝试从当前 HTTP 请求的参数中获取 userId
        try {
            jakarta.servlet.http.HttpServletRequest request =
                    ((org.springframework.web.context.request.ServletRequestAttributes)
                            org.springframework.web.context.request.RequestContextHolder.getRequestAttributes())
                    .getRequest();
            String userIdParam = request.getParameter("userId");
            if (userIdParam != null && !userIdParam.isBlank()) {
                return Long.parseLong(userIdParam);
            }
        } catch (Exception e) {
            // 非请求上下文或参数解析失败，使用默认值
        }
        // 从 SecurityContext 获取当前用户 ID，未认证时回退到默认值 1L
        return SecurityUtils.getCurrentUserIdOrDefault(1L);
    }

    /**
     * 解析会话实体。
     * 优先按 sessionUid 查找，若找不到则尝试按数据库 ID 查找。
     *
     * @param id 会话标识（sessionUid 或数据库 ID）
     * @return 会话实体
     * @throws IllegalArgumentException 会话不存在时抛出
     */
    private TempChatSession resolveSession(String id) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("会话 ID 不能为空");
        }

        // 先按 sessionUid 查找
        Optional<TempChatSession> sessionOpt = sessionRepository.findBySessionUid(id);

        // 如果找不到，尝试按数据库 ID 查找
        if (sessionOpt.isEmpty()) {
            try {
                Long dbId = Long.parseLong(id);
                sessionOpt = sessionRepository.findById(dbId);
            } catch (NumberFormatException e) {
                // id 不是数字格式，忽略
            }
        }

        return sessionOpt.orElseThrow(() -> new IllegalArgumentException("会话不存在: " + id));
    }

    /**
     * 解析推荐人对应的用户 ID。
     * 优先通过推荐服务获取推荐人信息，回退到按 recommendedPersonId 解析。
     *
     * @param recommendedPersonId 推荐人 ID（可能是 "person-1" 格式或数字 ID）
     * @param matchId             匹配 ID
     * @return 推荐人的用户 ID，解析失败返回 null
     */
    private Long resolvePartnerUserId(String recommendedPersonId, String matchId) {
        // 优先尝试从推荐服务获取推荐人信息
        Long currentUserId = resolveCurrentUserId();
        try {
            List<RecommendedPersonView> recommendations = recommendationService.getRecommendations(currentUserId);
            if (hasText(recommendedPersonId)) {
                // 尝试匹配推荐人 ID
                for (RecommendedPersonView person : recommendations) {
                    if (recommendedPersonId.equals(String.valueOf(person.id()))) {
                        return person.id();
                    }
                }
            }
            // 如果有推荐人但未匹配到，使用第一个推荐人
            if (!recommendations.isEmpty()) {
                return recommendations.get(0).id();
            }
        } catch (Exception e) {
            log.warn("从推荐服务获取推荐人信息失败，回退到 ID 解析: {}", e.getMessage());
        }

        // 回退：尝试将 recommendedPersonId 解析为数字 ID
        if (hasText(recommendedPersonId)) {
            Long parsed = parseUserId(recommendedPersonId);
            if (parsed != null) {
                return parsed;
            }
        }

        // 回退：尝试从 matchId 解析（matchId 可能是 HeartSignal 的 ID）
        if (hasText(matchId)) {
            Long parsed = parseUserId(matchId);
            if (parsed != null) {
                return parsed;
            }
        }

        return null;
    }

    /**
     * 检查会话是否已过期（当前时间超过 closesAt）。
     *
     * @param session 会话实体
     * @return true 表示已过期
     */
    private boolean isSessionExpired(TempChatSession session) {
        return session.getClosesAt() != null && LocalDateTime.now().isAfter(session.getClosesAt());
    }

    /**
     * 生成会话唯一标识。
     * 使用两个用户 ID 的排序组合加随机后缀确保唯一性。
     *
     * @param userAId 用户 A ID
     * @param userBId 用户 B ID
     * @return 会话唯一标识字符串
     */
    private String generateSessionUid(Long userAId, Long userBId) {
        long min = Math.min(userAId, userBId);
        long max = Math.max(userAId, userBId);
        String randomSuffix = java.util.UUID.randomUUID().toString().substring(0, 8);
        return "session-" + min + "-" + max + "-" + randomSuffix;
    }

    /**
     * 将 TempChatSession 实体转换为 TempChatSessionView。
     * 包含消息列表和联系交换状态。
     *
     * @param session       会话实体
     * @param currentUserId 当前用户 ID（用于确定对方信息）
     * @return 会话视图
     */
    private TempChatSessionView toSessionView(TempChatSession session, Long currentUserId) {
        // 确定对方用户 ID
        Long partnerId = session.getUserAId().equals(currentUserId) ? session.getUserBId() : session.getUserAId();

        // 获取对方用户信息
        PartnerInfo partnerInfo = getPartnerInfo(partnerId);

        // 获取消息列表：过期会话返回空列表
        List<ChatMessageView> messages;
        if (session.getPhase() == SessionPhase.expired || isSessionExpired(session)) {
            messages = List.of();
        } else {
            List<TempChatMessage> messageList = messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());
            messages = messageList.stream()
                    .map(this::toMessageView)
                    .toList();
        }

        // 获取联系交换状态
        ContactExchangeStateView contactExchange = getContactExchangeView(session);

        return new TempChatSessionView(
                session.getSessionUid(),
                String.valueOf(partnerId),
                partnerInfo.name(),
                partnerInfo.headline(),
                partnerInfo.availability(),
                session.getPhase().name(),
                session.getClosesAt().toString(),
                session.getClosedReason(),
                messages,
                contactExchange
        );
    }

    /**
     * 将 TempChatSession 实体转换为 ChatSessionSummaryView。
     *
     * @param session       会话实体
     * @param currentUserId 当前用户 ID
     * @return 会话摘要视图
     */
    private ChatSessionSummaryView toSummary(TempChatSession session, Long currentUserId) {
        Long partnerId = session.getUserAId().equals(currentUserId) ? session.getUserBId() : session.getUserAId();
        PartnerInfo partnerInfo = getPartnerInfo(partnerId);

        // 计算当前用户的未读数
        int unreadCount = session.getUserAId().equals(currentUserId)
                ? session.getUserAUnreadCount()
                : session.getUserBUnreadCount();

        // 获取联系交换状态
        String contactExchangeStatus = getContactExchangeStatus(session);

        return new ChatSessionSummaryView(
                session.getSessionUid(),
                String.valueOf(partnerId),
                partnerInfo.name(),
                partnerInfo.headline(),
                partnerInfo.availability(),
                session.getPhase().name(),
                session.getClosesAt().toString(),
                session.getClosedReason(),
                session.getLastMessagePreview(),
                session.getLastMessageAt() != null ? session.getLastMessageAt().toString() : null,
                contactExchangeStatus,
                Boolean.TRUE.equals(session.getIsPinned()),
                unreadCount
        );
    }

    /**
     * 将 TempChatMessage 实体转换为 ChatMessageView。
     *
     * @param message 消息实体
     * @return 消息视图
     */
    private ChatMessageView toMessageView(TempChatMessage message) {
        return new ChatMessageView(
                String.valueOf(message.getId()),
                message.getSender(),
                message.getKind(),
                message.getBody(),
                message.getCreatedAt().toString(),
                message.getDurationSeconds()
        );
    }

    /**
     * 获取对方的用户信息（昵称、简介、可用时间）。
     *
     * @param partnerId 对方用户 ID
     * @return 对方信息记录
     */
    private PartnerInfo getPartnerInfo(Long partnerId) {
        User partner = userRepository.findById(partnerId).orElse(null);
        UserBasicProfile basicProfile = userBasicProfileRepository.findByUserId(partnerId).orElse(null);
        UserCampusProfile campusProfile = userCampusProfileRepository.findByUserId(partnerId).orElse(null);
        UserScheduleProfile scheduleProfile = userScheduleProfileRepository.findByUserId(partnerId).orElse(null);

        String name = partner != null ? partner.getNickname() : DisplayConstants.UNKNOWN_USER;
        String headline = buildHeadline(basicProfile, campusProfile);
        String availability = buildAvailability(scheduleProfile);

        return new PartnerInfo(name, headline, availability);
    }

    /**
     * 构建对方简介文本（年级 + 个人简介摘要）。
     *
     * @param basicProfile  基础资料
     * @param campusProfile 校园资料
     * @return 简介字符串
     */
    private String buildHeadline(UserBasicProfile basicProfile, UserCampusProfile campusProfile) {
        StringBuilder sb = new StringBuilder();

        if (basicProfile != null && hasText(basicProfile.getGradeLabel())) {
            sb.append(basicProfile.getGradeLabel());
        }
        if (campusProfile != null && hasText(campusProfile.getDepartmentName())) {
            if (!sb.isEmpty()) {
                sb.append("，");
            }
            sb.append(campusProfile.getDepartmentName());
        }
        if (basicProfile != null && hasText(basicProfile.getBio())) {
            if (!sb.isEmpty()) {
                sb.append("，");
            }
            String bio = basicProfile.getBio().length() > 20
                    ? basicProfile.getBio().substring(0, 20) + "..."
                    : basicProfile.getBio();
            sb.append(bio);
        }

        return sb.isEmpty() ? "一位校园同学" : sb.toString();
    }

    /**
     * 构建可用时间提示文本。
     *
     * @param scheduleProfile 日程偏好
     * @return 可用时间提示
     */
    private String buildAvailability(UserScheduleProfile scheduleProfile) {
        if (scheduleProfile == null) {
            return "合适时间：待确认";
        }
        String area = scheduleProfile.getPreferredCampusArea();
        return hasText(area) ? "合适时间：" + area : "合适时间：待确认";
    }

    /**
     * 获取联系交换状态视图。
     *
     * @param session 会话实体
     * @return 联系交换状态视图
     */
    private ContactExchangeStateView getContactExchangeView(TempChatSession session) {
        Optional<TempChatContactExchange> exchangeOpt = contactExchangeRepository.findBySessionId(session.getId());
        if (exchangeOpt.isEmpty()) {
            return new ContactExchangeStateView(null, "idle");
        }
        TempChatContactExchange exchange = exchangeOpt.get();
        return new ContactExchangeStateView(exchange.getProposer(), exchange.getStatus());
    }

    /**
     * 获取联系交换状态字符串。
     *
     * @param session 会话实体
     * @return 联系交换状态
     */
    private String getContactExchangeStatus(TempChatSession session) {
        Optional<TempChatContactExchange> exchangeOpt = contactExchangeRepository.findBySessionId(session.getId());
        return exchangeOpt.map(TempChatContactExchange::getStatus).orElse("idle");
    }

    /**
     * 获取推荐人物卡片列表。
     *
     * @param currentUserId 当前用户 ID
     * @return 推荐人物卡片视图列表
     */
    private List<RecommendedPersonCardView> getRecommendedPeople(Long currentUserId) {
        try {
            List<RecommendedPersonView> recommendations = recommendationService.getRecommendations(currentUserId);
            return recommendations.stream()
                    .map(this::toRecommendedPersonCard)
                    .toList();
        } catch (Exception e) {
            log.warn("获取推荐人物列表失败: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * 将 RecommendedPersonView 转换为 RecommendedPersonCardView。
     *
     * @param person 推荐人物视图
     * @return 推荐人物卡片视图
     */
    private RecommendedPersonCardView toRecommendedPersonCard(RecommendedPersonView person) {
        return new RecommendedPersonCardView(
                String.valueOf(person.id()),
                person.name(),
                person.initials(),
                person.headline(),
                person.commonGround(),
                person.availability()
        );
    }

    /**
     * 构建消息预览文本。
     * 根据消息类型生成不同的预览文本。
     *
     * @param kind 消息类型
     * @param body 消息内容
     * @return 预览文本
     */
    private String buildMessagePreview(String kind, String body) {
        if (kind == null) {
            return body;
        }
        return switch (kind) {
            case "voice" -> "语音消息";
            case "emoji" -> "表情消息";
            case "system" -> body;
            default -> body != null && body.length() > 50 ? body.substring(0, 50) + "..." : body;
        };
    }

    /**
     * 解析联系交换状态流转逻辑。
     * - rejected: 直接拒绝
     * - accepted-by-self: 自己同意
     * - accepted-by-peer: 对方同意
     * - completed: 双方都同意
     *
     * @param currentStatus 当前状态
     * @param actor         操作方（self / peer）
     * @param decision      决定（accepted / rejected）
     * @return 新状态
     */
    private String resolveExchangeStatus(String currentStatus, String actor, String decision) {
        if ("rejected".equals(decision)) {
            return "rejected";
        }
        if ("self".equals(actor)) {
            return "accepted-by-peer".equals(currentStatus) ? "completed" : "accepted-by-self";
        }
        return "accepted-by-self".equals(currentStatus) ? "completed" : "accepted-by-peer";
    }

    /**
     * 尝试将字符串用户 ID 转为 Long。
     * 支持 "user-1001" 格式和纯数字格式。
     *
     * @param userId 字符串用户 ID
     * @return Long 类型用户 ID，解析失败返回 null
     */
    private Long parseUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        try {
            // 处理 "user-1001" 格式
            if (userId.startsWith("user-")) {
                return Long.parseLong(userId.substring(5));
            }
            // 处理 "person-1" 格式
            if (userId.startsWith("person-")) {
                return Long.parseLong(userId.substring(7));
            }
            return Long.parseLong(userId);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * 判断字符串是否有内容。
     *
     * @param value 字符串值
     * @return true 表示非空非空白
     */
    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /**
     * 对方用户信息内部记录。
     */
    private record PartnerInfo(String name, String headline, String availability) {
    }
}
