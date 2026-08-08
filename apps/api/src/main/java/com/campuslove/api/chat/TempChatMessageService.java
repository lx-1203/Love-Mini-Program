package com.campuslove.api.chat;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.TempChatMessage;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.repository.TempChatMessageRepository;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 临时聊天消息组件（Task 4.2.3 拆分）。
 *
 * <p>职责：消息发送、撤回、引用快照生成、消息预览文本构建。
 * 不负责会话生命周期（由 {@link TempChatSessionService} 负责）和联系交换/过期清理（由 {@link TempChatCleanupService} 负责）。</p>
 *
 * <p>sendMessage 流程：</p>
 * <ol>
 *   <li>解析会话与过期状态（委托 SessionService）</li>
 *   <li>校验会话是否可发送消息（已关闭/已过期则跳过）</li>
 *   <li>首次消息自动将会话从 matching 转为 active</li>
 *   <li>创建 TempChatMessage 实体（含引用消息快照）</li>
 *   <li>更新会话最后消息预览/时间/未读计数</li>
 *   <li>WebSocket 推送消息给对方</li>
 * </ol>
 *
 * <p>recallMessage 流程：</p>
 * <ol>
 *   <li>校验 messageId 属于当前会话</li>
 *   <li>仅允许 self/peer 发送者本人在 2 分钟内撤回</li>
 *   <li>标记 recalled=true，正文置为 [已撤回]</li>
 * </ol>
 */
@Profile("real")
@Component
public class TempChatMessageService {

    private static final Logger log = LoggerFactory.getLogger(TempChatMessageService.class);

    /** 消息撤回时间窗口（分钟）。 */
    private static final int RECALL_WINDOW_MINUTES = 2;

    private final TempChatMessageRepository messageRepository;
    private final TempChatSessionService sessionService;
    private final SensitiveWordFilter sensitiveWordFilter;

    public TempChatMessageService(TempChatMessageRepository messageRepository,
                                  TempChatSessionService sessionService,
                                  SensitiveWordFilter sensitiveWordFilter) {
        this.messageRepository = messageRepository;
        this.sessionService = sessionService;
        this.sensitiveWordFilter = sensitiveWordFilter;
    }

    /**
     * 在指定会话中发送消息。
     *
     * <p>已关闭或已过期的会话不允许发送消息，但仍返回会话视图（携带当前状态）。
     * 发送消息后通过 WebSocket 推送给对方。</p>
     *
     * <p>安全修复（FIN HIGH-3）：sender 由服务端根据当前用户与会话参与者关系判定
     * （userA → "self"，userB → "peer"），不再信任客户端请求体中的 sender 字段，
     * 防止冒充对方发送消息。同时校验当前用户为会话参与者（FIN HIGH-1）。</p>
     *
     * @param id            会话 ID（sessionUid 或数据库 ID）
     * @param request       消息请求
     * @param currentUserId 当前用户 ID
     * @return 更新后的会话实体（调用方负责转换为视图）
     */
    @Transactional
    public TempChatSession sendMessage(String id, ChatMessageRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new IllegalArgumentException("当前用户 ID 不能为空");
        }
        TempChatSession session = sessionService.resolveSession(id);
        // FIN HIGH-1：校验当前用户是会话参与者，防止越权向他人会话发送消息
        sessionService.requireParticipant(session, currentUserId);

        // 检查过期：标记并返回
        if (sessionService.isSessionExpired(session)) {
            sessionService.markExpiredIfDue(session);
            log.debug("会话 {} 已过期，无法发送消息", id);
            return session;
        }

        // 已关闭的会话无法发送
        if (session.getPhase() == SessionPhase.closed) {
            log.debug("会话 {} 已关闭，无法发送消息", id);
            return session;
        }

        // matching 阶段发送首条消息后自动转 active
        if (session.getPhase() == SessionPhase.matching) {
            session.setPhase(SessionPhase.active);
        }

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);

        // FIN HIGH-3：sender 由服务端判定，不信任客户端传入值
        String sender = session.getUserAId().equals(currentUserId) ? "self" : "peer";

        // infra R2-00252: 临时聊天消息补敏感词过滤（村口/私信已有，此处此前可绕过）
        String filteredBody = sensitiveWordFilter != null
                ? sensitiveWordFilter.filterWithLog(request.body(), currentUserId, "TEMP_CHAT")
                : request.body();

        TempChatMessage message = new TempChatMessage();
        message.setSession(session);
        message.setSender(sender);
        message.setKind(request.kind());
        message.setBody(filteredBody);
        message.setDurationSeconds(request.durationSeconds());
        message.setDeliveryStatus("sent");
        message.setRecalled(false);
        message.setCreatedAt(now);

        // 引用回复：构造 quoteSnapshot JSON（FIN MED-36：对 JSON 特殊字符转义，防止注入/解析错乱）
        // infra R2-00253: 引用消息校验必须属于同一会话，防止引用其他会话消息 ID
        if (request.quoteRef() != null && !request.quoteRef().isBlank()) {
            try {
                Long quotedMsgId = Long.parseLong(request.quoteRef());
                // lambda 捕获要求变量 effectively final，而 message 在下方会被重新赋值，
                // 因此引入 final 局部变量供 lambda 使用
                final TempChatMessage quoteTarget = message;
                messageRepository.findById(quotedMsgId)
                        .filter(quoted -> quoted.getSession() != null
                                && quoted.getSession().getId().equals(session.getId()))
                        .ifPresent(quoted -> {
                            String snapshot = String.format(
                                    "{\"id\":\"%s\",\"body\":\"%s\",\"sender\":\"%s\"}",
                                    escapeJson(quoted.getId() == null ? "" : String.valueOf(quoted.getId())),
                                    escapeJson(quoted.getBody()),
                                    escapeJson(quoted.getSender())
                            );
                            quoteTarget.setQuoteSnapshot(snapshot);
                        });
            } catch (NumberFormatException ignored) {
                // Task 10（FIN-00031）复核：此处 catch NumberFormatException 为输入解析异常，
                // 触发时尚未执行任何 DB 写操作（messageRepository.save 在下方），
                // 不存在"事务部分提交"风险；按设计意图跳过 quoteSnapshot 字段继续发送消息，
                // 无需 setRollbackOnly 或重新抛出（spec SubTask 10.3 适用于 DB 异常场景）。
            }
        }

        // 实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id，
        // 否则下方 toMessageView 中 message.getId() 为 null
        message = messageRepository.save(message);

        // 更新会话最后消息信息和未读计数
        String preview = buildMessagePreview(request.kind(), filteredBody);
        session.setLastMessagePreview(preview);
        session.setLastMessageAt(now);
        session.setUpdatedAt(now);

        boolean isPeerMessage = "peer".equals(sender);
        if (isPeerMessage) {
            session.setUserAUnreadCount(session.getUserAUnreadCount() + 1);
        } else {
            session.setUserBUnreadCount(session.getUserBUnreadCount() + 1);
        }

        sessionService.saveSession(session);

        // WebSocket 推送给对方
        Long recipientId = isPeerMessage ? session.getUserAId() : session.getUserBId();
        ChatMessageView messageView = sessionService.toMessageView(message);
        sessionService.getMessagingTemplate().convertAndSendToUser(
                String.valueOf(recipientId),
                "/queue/temp-chat/messages",
                messageView
        );

        log.debug("会话 {} 发送消息: sender={}, kind={}", id, sender, request.kind());
        return session;
    }

    /**
     * JSON 字符串转义（FIN MED-36）：转义反斜杠、双引号、换行、回车、制表符。
     *
     * @param value 原始字符串（可为 null）
     * @return 转义后的字符串（null 返回空字符串）
     */
    private static String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(value.length() + 16);
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '"' -> sb.append("\\\"");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }

    /**
     * 撤回指定会话中的某条消息。
     * 仅发送者本人（self/peer）可在发送后 {@value #RECALL_WINDOW_MINUTES} 分钟内撤回。
     *
     * <p>安全修复（FIN HIGH-4）：校验 currentUserId 为消息发送者本人
     * （sender=self 且当前用户为 userA，或 sender=peer 且当前用户为 userB），
     * 任意用户无法撤回他人消息。</p>
     *
     * @param sessionId  会话 ID
     * @param messageId  消息 ID
     * @param currentUserId 当前用户 ID（用于权限校验）
     * @return 会话实体（用于调用方转换为视图）
     */
    @Transactional
    public TempChatSession recallMessage(String sessionId, String messageId, Long currentUserId) {
        if (currentUserId == null) {
            throw new IllegalArgumentException("当前用户 ID 不能为空");
        }
        TempChatSession session = sessionService.resolveSession(sessionId);
        // FIN HIGH-1：校验当前用户是会话参与者
        sessionService.requireParticipant(session, currentUserId);

        Long msgId;
        try {
            msgId = Long.parseLong(messageId);
        } catch (NumberFormatException e) {
            // Task 10（FIN-00031）复核：此处 catch NumberFormatException 为输入解析异常，
            // 触发时尚未执行任何 DB 写操作（messageRepository.findById/save 在下方 L169/L192），
            // 不存在"事务部分提交"风险；按设计意图对非法 messageId 做静默 no-op 返回原会话，
            // 无需 setRollbackOnly 或重新抛出（spec SubTask 10.3 适用于 DB 异常场景）。
            log.warn("非法消息ID: {}", messageId);
            return session;
        }

        TempChatMessage message = messageRepository.findById(msgId)
                .filter(m -> m.getSession().getId().equals(session.getId()))
                .orElse(null);

        if (message == null) {
            log.warn("消息 {} 不属于会话 {}", messageId, sessionId);
            return session;
        }

        // 系统消息不可撤回
        if (!message.getSender().equals("self") && !message.getSender().equals("peer")) {
            log.debug("系统消息不可撤回: {}", messageId);
            return session;
        }

        // FIN HIGH-4：只能撤回自己发送的消息
        // sender=self 表示消息由 userA 发出，仅 userA 可撤回；sender=peer 同理。
        boolean isSender = ("self".equals(message.getSender())
                && session.getUserAId() != null && session.getUserAId().equals(currentUserId))
                || ("peer".equals(message.getSender())
                && session.getUserBId() != null && session.getUserBId().equals(currentUserId));
        if (!isSender) {
            log.warn("用户 {} 尝试撤回非本人消息 {} (会话 {})", currentUserId, messageId, sessionId);
            return session;
        }

        // 超过撤回时间窗口
        if (message.getCreatedAt() != null
                && message.getCreatedAt().isBefore(LocalDateTime.now(TimeZones.BUSINESS).minusMinutes(RECALL_WINDOW_MINUTES))) {
            log.debug("消息 {} 已超过 {} 分钟撤回时限", messageId, RECALL_WINDOW_MINUTES);
            return session;
        }

        // 记录撤回前的预览，用于判断会话预览是否需要同步更新
        String oldPreview = buildMessagePreview(message.getKind(), message.getBody());

        message.setRecalled(true);
        message.setBody("[已撤回]");
        messageRepository.save(message);

        // infra R2-00251: 撤回后同步更新会话预览，避免已撤回内容仍展示在会话列表
        String recalledPreview = buildMessagePreview(message.getKind(), message.getBody());
        if (oldPreview != null && oldPreview.equals(session.getLastMessagePreview())) {
            session.setLastMessagePreview(recalledPreview);
            sessionService.saveSession(session);
        }

        log.debug("消息 {} 已被撤回 (会话 {})", messageId, sessionId);
        return session;
    }

    /**
     * 构建消息预览文本（用于会话列表 lastMessagePreview 字段）。
     * 根据消息类型生成不同预览：voice -> "语音消息"；emoji -> "表情消息"；超长文本截断。
     *
     * @param kind 消息类型
     * @param body 消息正文
     * @return 预览文本
     */
    public static String buildMessagePreview(String kind, String body) {
        if (kind == null) return body;
        return switch (kind) {
            case "voice" -> "语音消息";
            case "emoji" -> "表情消息";
            case "system" -> body;
            default -> body != null && body.length() > 50 ? body.substring(0, 50) + "..." : body;
        };
    }
}
