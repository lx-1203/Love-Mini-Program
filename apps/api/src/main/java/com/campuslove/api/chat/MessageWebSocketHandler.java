package com.campuslove.api.chat;

import com.campuslove.api.entity.PrivateConversation;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.match.HeartSignalView;
import com.campuslove.api.repository.PrivateConversationRepository;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

/**
 * WebSocket 消息处理器。
 * 监听客户端通过 /app/chat/send 发送的消息，
 * 并通过 SimpMessagingTemplate 将消息推送到对应用户的专属队列。
 *
 * 推送路径:
 * - 私信: /user/{userId}/queue/messages
 * - 心动信号: /user/{userId}/queue/signals
 * - 通知: /user/{userId}/queue/notifications
 *
 * 安全控制:
 * - senderId 从 STOMP 认证用户中获取，不信任客户端 payload
 * - 禁止给自己发送消息
 * - FIN HIGH-2：校验会话关系（recipientId 必须是当前用户在该会话中的伙伴），
 *   临时聊天会话场景下将消息落库（委托 TempChatMessageService，其内部完成
 *   参与者校验、sender 服务端判定与 WebSocket 推送）。
 *
 * <p>注入说明：TempChatSessionService / TempChatMessageService 为 real profile
 * 专属 Bean，mock 模式下不存在，故使用 {@code @Autowired(required = false)}
 * 注入；mock 模式下为 null 时退化为仅转发（不校验/不落库），保证 mock 模式可用。</p>
 */
@Controller
public class MessageWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(MessageWebSocketHandler.class);

    /** WS 消息内容最大长度，与 REST 端 SendMessageRequest @Size(max=5000) 保持一致 */
    private static final int MAX_MESSAGE_CONTENT_LENGTH = 5000;

    /** WS 消息类型字段最大长度 */
    private static final int MAX_MESSAGE_KIND_LENGTH = 32;

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 临时聊天会话服务（real profile Bean；mock 模式为 null）。
     * 用于解析会话并校验收发双方的关系。
     */
    @Autowired(required = false)
    private TempChatSessionService tempChatSessionService;

    /**
     * 临时聊天消息服务（real profile Bean；mock 模式为 null）。
     * 用于将 /chat/send 的消息真实落库。
     */
    @Autowired(required = false)
    private TempChatMessageService tempChatMessageService;

    /**
     * 私信会话 Repository（Spring Data Bean，所有 profile 可用）。
     * 用于校验私信会话中收发双方的关系。
     */
    @Autowired(required = false)
    private PrivateConversationRepository privateConversationRepository;

    /**
     * 私信消息服务（real profile Bean；mock 模式为 null）。
     * R4-00321：WS 私信复用 {@link RealPrivateMessageService#sendMessage} 落库——
     * 持久化消息 + 更新会话预览/未读计数 + 推送 MessageView，修复「WS 私信仅推送不落库」
     * 导致的历史消息、未读计数、会话预览缺失与双通道数据不一致。
     */
    @Autowired(required = false)
    private PrivateMessageService privateMessageService;

    public MessageWebSocketHandler(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * 处理客户端发送的聊天消息。
     * 监听路径: /app/chat/send
     *
     * 消息体需包含:
     * - conversationId: 会话 ID
     * - recipientId: 接收者 ID
     * - content: 消息内容
     * - kind: 消息类型 (text/image/voice)
     *
     * 安全说明:
     * - senderId 从 STOMP 认证用户（Principal）中获取，不使用 payload 中的值
     * - 验证发送者不能给自己发消息
     * - FIN HIGH-2：校验会话关系，recipientId 必须是当前用户在该会话中的伙伴；
     *   临时聊天会话场景下调用 TempChatMessageService 落库（含推送），
     *   私信会话场景校验通过后按原逻辑推送
     */
    @MessageMapping("/chat/send")
    public void handleChatMessage(@Payload Map<String, Object> payload,
                                  SimpMessageHeaderAccessor headerAccessor) {
        // 从 STOMP 认证用户中获取 senderId，不信任客户端 payload
        Principal user = headerAccessor.getUser();
        if (user == null) {
            log.warn("WebSocket SEND 拒绝: 用户未认证，无法发送消息");
            return;
        }

        String senderId = user.getName();

        // infra R2-00212: WS 消息 content/kind 无 REST 端 @Size 校验，此处统一限长，
        // 防止超大消息刷内存/带宽（含 mock 降级转发路径）
        String rawContent = extractString(payload, "content");
        String rawKind = extractString(payload, "kind");
        if (rawContent != null && rawContent.length() > MAX_MESSAGE_CONTENT_LENGTH) {
            log.warn("WebSocket SEND 拒绝: content 超长, senderId={}, length={}",
                    senderId, rawContent.length());
            return;
        }
        if (rawKind != null && !rawKind.isBlank() && rawKind.length() > MAX_MESSAGE_KIND_LENGTH) {
            log.warn("WebSocket SEND 拒绝: kind 超长, senderId={}", senderId);
            return;
        }
        if (senderId == null || senderId.isBlank()) {
            log.warn("WebSocket SEND 拒绝: 无法获取认证用户ID");
            return;
        }

        String recipientId = extractString(payload, "recipientId");
        if (recipientId == null || recipientId.isBlank()) {
            log.warn("WebSocket SEND 拒绝: 缺少 recipientId, senderId={}", senderId);
            return;
        }

        // 验证发送者不能给自己发消息
        if (senderId.equals(recipientId)) {
            log.warn("WebSocket SEND 拒绝: 发送者不能给自己发消息, userId={}", senderId);
            return;
        }

        // FIN HIGH-2：会话关系校验与落库
        String conversationId = extractString(payload, "conversationId");
        if (conversationId == null || conversationId.isBlank()) {
            log.warn("WebSocket SEND 拒绝: 缺少 conversationId，无法校验会话关系, senderId={}", senderId);
            return;
        }

        Long senderLong;
        Long recipientLong;
        try {
            senderLong = Long.parseLong(senderId);
            recipientLong = Long.parseLong(recipientId);
        } catch (NumberFormatException e) {
            log.warn("WebSocket SEND 拒绝: senderId/recipientId 非数字格式, senderId={}, recipientId={}",
                    senderId, recipientId);
            return;
        }

        // 1) 尝试解析为临时聊天会话：校验双方关系并落库
        if (tempChatSessionService != null) {
            TempChatSession session = null;
            try {
                session = tempChatSessionService.resolveSession(conversationId);
            } catch (RuntimeException e) {
                // 不是临时聊天会话，继续尝试私信会话
                log.debug("conversationId={} 不是临时聊天会话: {}", conversationId, e.getMessage());
            }
            if (session != null) {
                boolean validPair = isTempChatPair(session, senderLong, recipientLong);
                if (!validPair) {
                    log.warn("WebSocket SEND 拒绝: 会话关系不匹配, conversationId={}, senderId={}, recipientId={}",
                            conversationId, senderId, recipientId);
                    return;
                }
                // 落库：TempChatMessageService 内部会推送 /queue/temp-chat/messages，此处不重复推送
                if (tempChatMessageService != null) {
                    String content = extractString(payload, "content");
                    String kind = extractString(payload, "kind");
                    if (content == null || content.isBlank()) {
                        log.warn("WebSocket SEND 拒绝: 缺少 content, senderId={}", senderId);
                        return;
                    }
                    try {
                        ChatMessageRequest request = new ChatMessageRequest(
                                "self", kind != null && !kind.isBlank() ? kind : "text",
                                content, null, null);
                        tempChatMessageService.sendMessage(conversationId, request, senderLong);
                        log.debug("WebSocket SEND 已落库并推送: conversationId={}, senderId={}", conversationId, senderId);
                        return;
                    } catch (RuntimeException e) {
                        log.warn("WebSocket SEND 落库失败，拒绝转发（避免未落库消息被传播）: conversationId={}, error={}",
                                conversationId, e.getMessage());
                        return;
                    }
                }
                // 消息服务不可用（理论不会发生）：仅校验通过后按原逻辑推送
                payload.put("senderId", senderId);
                messagingTemplate.convertAndSendToUser(
                        recipientId,
                        "/queue/messages",
                        payload
                );
                return;
            }
        }

        // 2) 尝试解析为私信会话：校验双方关系后复用 PrivateMessageService 落库
        //    （R4-00321：WS 私信不再仅推送不落库——sendMessage 内部完成持久化、
        //    会话预览/最后消息时间更新与 /queue/messages 推送，避免双通道数据不一致）。
        if (privateConversationRepository != null) {
            boolean privateValid = false;
            PrivateConversation privateConv = null;
            try {
                Optional<PrivateConversation> conv = findPrivateConversation(conversationId);
                if (conv.isPresent()) {
                    privateConv = conv.get();
                    privateValid = isPrivatePair(privateConv, senderLong, recipientLong);
                }
            } catch (RuntimeException e) {
                log.debug("私信会话校验异常: {}", e.getMessage());
            }
            if (privateValid && privateMessageService != null) {
                String content = extractString(payload, "content");
                String kind = extractString(payload, "kind");
                if (content == null || content.isBlank()) {
                    log.warn("WebSocket SEND 拒绝: 缺少 content, senderId={}", senderId);
                    return;
                }
                try {
                    // 落库 + 推送（sendMessage 内部完成敏感词过滤、会话预览更新与 WS 推送，
                    // 此处不再重复推送，避免接收方收到两份消息）
                    privateMessageService.sendMessage(
                            privateConv.getId(), senderLong, content,
                            kind != null && !kind.isBlank() ? kind : "text", null);
                    log.debug("WebSocket SEND 私信已落库并推送: conversationId={}, senderId={}",
                            conversationId, senderId);
                    return;
                } catch (RuntimeException e) {
                    log.warn("WebSocket SEND 私信落库失败，拒绝转发（避免未落库消息被传播）: conversationId={}, error={}",
                            conversationId, e.getMessage());
                    return;
                }
            }
            if (privateValid) {
                // 服务不可用（理论不会发生）：仅校验通过后按原逻辑推送
                payload.put("senderId", senderId);
                messagingTemplate.convertAndSendToUser(
                        recipientId,
                        "/queue/messages",
                        payload
                );
                return;
            }
            log.warn("WebSocket SEND 拒绝: 会话关系校验失败或会话不存在, conversationId={}, senderId={}",
                    conversationId, senderId);
            return;
        }

        // 3) 组件不可用（mock 模式）：退化为原行为——覆盖 senderId 后转发
        payload.put("senderId", senderId);
        messagingTemplate.convertAndSendToUser(
                recipientId,
                "/queue/messages",
                payload
        );
    }

    /** 校验 (sender, recipient) 是否为临时聊天会话的双方（sender=userA∧recipient=userB 或反之）。 */
    private boolean isTempChatPair(TempChatSession session, Long sender, Long recipient) {
        if (session.getUserAId() == null || session.getUserBId() == null) {
            return false;
        }
        return (session.getUserAId().equals(sender) && session.getUserBId().equals(recipient))
                || (session.getUserBId().equals(sender) && session.getUserAId().equals(recipient));
    }

    /** 校验 (sender, recipient) 是否为私信会话的双方。 */
    private boolean isPrivatePair(PrivateConversation conversation, Long sender, Long recipient) {
        if (conversation.getUserAId() == null || conversation.getUserBId() == null) {
            return false;
        }
        return (conversation.getUserAId().equals(sender) && conversation.getUserBId().equals(recipient))
                || (conversation.getUserBId().equals(sender) && conversation.getUserAId().equals(recipient));
    }

    /** 按数据库 ID 或 conversationUid 查找私信会话。 */
    private Optional<PrivateConversation> findPrivateConversation(String conversationId) {
        try {
            Long dbId = Long.parseLong(conversationId);
            Optional<PrivateConversation> byId = privateConversationRepository.findById(dbId);
            if (byId.isPresent()) {
                return byId;
            }
        } catch (NumberFormatException ignored) {
            // 不是数字格式，按 UID 查询
        }
        return privateConversationRepository.findByConversationUid(conversationId);
    }

    /**
     * 向指定用户推送心动信号。
     * 由 RealMatchService 在互相喜欢时调用。
     *
     * @param userId 目标用户 ID
     * @param signal 心动信号视图
     */
    public void sendHeartSignal(String userId, HeartSignalView signal) {
        if (userId == null || signal == null) {
            return;
        }
        messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/signals",
                signal
        );
    }

    /**
     * 向指定用户推送通知。
     * 由 RealNotificationService 在创建通知时调用。
     *
     * @param userId         目标用户 ID
     * @param notificationView 通知视图
     */
    public void sendNotification(String userId, NotificationView notificationView) {
        if (userId == null || notificationView == null) {
            return;
        }
        messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/notifications",
                notificationView
        );
    }

    /**
     * 向指定用户推送私信。
     * 由 RealPrivateMessageService 在发送消息时调用。
     *
     * @param userId      目标用户 ID
     * @param messageView 消息视图
     */
    public void sendPrivateMessage(String userId, MessageView messageView) {
        if (userId == null || messageView == null) {
            return;
        }
        messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/messages",
                messageView
        );
    }

    /**
     * 从 payload Map 中安全提取字符串值。
     */
    private String extractString(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value != null ? value.toString() : null;
    }
}
