package com.campuslove.api.chat;

import com.campuslove.api.config.ChatConfig;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.discover.RecommendationService;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.repository.TempChatContactExchangeRepository;
import com.campuslove.api.repository.TempChatMessageRepository;
import com.campuslove.api.repository.TempChatSessionRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.util.List;
import org.redisson.api.RedissonClient;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实临时聊天服务实现（Task 4.2.3 重构）。
 *
 * <p>原 948 行 God Class 已拆分为 3 个组件：</p>
 * <ul>
 *   <li>{@link TempChatSessionService}：会话生命周期（创建/列表/详情/结束/置顶/已读/视图转换）</li>
 *   <li>{@link TempChatMessageService}：消息发送与撤回（含引用快照、预览、撤回时限）</li>
 *   <li>{@link TempChatCleanupService}：联系交换状态机与会话过期清理</li>
 * </ul>
 *
 * <p>本类保留接口编排，所有 public 方法签名保持向后兼容。内部仅做权限校验与委托。</p>
 */
@Profile("real")
@Service
public class RealTempChatService implements TempChatService {

    private final TempChatSessionService sessionService;
    private final TempChatMessageService messageService;
    private final TempChatCleanupService cleanupService;

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
            SimpMessagingTemplate messagingTemplate,
            TempChatViewMapper viewMapper,
            RedissonClient redissonClient) {
        this.sessionService = new TempChatSessionService(
                chatConfig,
                sessionRepository,
                messageRepository,
                contactExchangeRepository,
                userRepository,
                userBasicProfileRepository,
                userCampusProfileRepository,
                userScheduleProfileRepository,
                recommendationService,
                messagingTemplate,
                viewMapper);
        this.messageService = new TempChatMessageService(messageRepository, this.sessionService);
        this.cleanupService = new TempChatCleanupService(
                contactExchangeRepository, this.sessionService, sessionRepository, redissonClient);
    }

    /** 内部构造器：用于单元测试直接注入组件。 */
    public RealTempChatService(TempChatSessionService sessionService,
                                TempChatMessageService messageService,
                                TempChatCleanupService cleanupService) {
        this.sessionService = sessionService;
        this.messageService = messageService;
        this.cleanupService = cleanupService;
    }

    // ---- 接口方法实现（委托） ----

    @Override
    @Transactional(readOnly = true)
    public ChatOverviewView getOverview() {
        return sessionService.getOverview();
    }

    @Override
    @Transactional
    public List<ChatSessionSummaryView> listSessions() {
        return sessionService.listSessions();
    }

    @Override
    @Transactional
    public TempChatSessionView createSession(String recommendedPersonId, String matchId) {
        return sessionService.createSession(recommendedPersonId, matchId);
    }

    @Override
    @Transactional
    public TempChatSessionView getSession(String id) {
        return sessionService.getSession(id);
    }

    @Override
    @Transactional
    public TempChatSessionView sendMessage(String id, ChatMessageRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        TempChatSession session = messageService.sendMessage(id, request, currentUserId);
        return sessionService.toSessionView(session, currentUserId);
    }

    @Override
    @Transactional
    public TempChatSessionView recallMessage(String sessionId, String messageId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        TempChatSession session = messageService.recallMessage(sessionId, messageId, currentUserId);
        return sessionService.toSessionView(session, currentUserId);
    }

    @Override
    @Transactional
    public TempChatSessionView respondToContactExchange(String id, ContactExchangeDecisionRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        TempChatSession session = cleanupService.respondToContactExchange(id, request, currentUserId);
        return sessionService.toSessionView(session, currentUserId);
    }

    @Override
    @Transactional
    public TempChatSessionView endSession(String id) {
        return sessionService.endSession(id);
    }

    @Override
    @Transactional
    public ChatSessionSummaryView pinSession(String id) {
        return sessionService.pinSession(id);
    }

    @Override
    @Transactional
    public ChatSessionSummaryView unpinSession(String id) {
        return sessionService.unpinSession(id);
    }

    @Override
    @Transactional
    public ChatSessionSummaryView markSessionRead(String id) {
        return sessionService.markSessionRead(id);
    }
}
