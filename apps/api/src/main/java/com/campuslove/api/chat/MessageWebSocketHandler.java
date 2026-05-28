package com.campuslove.api.chat;

import com.campuslove.api.match.HeartSignalView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 */
@Controller
public class MessageWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(MessageWebSocketHandler.class);

    private final SimpMessagingTemplate messagingTemplate;

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

        // 将认证后的 senderId 覆盖到 payload，确保数据可信
        payload.put("senderId", senderId);

        // 将消息推送到接收者的私信队列
        messagingTemplate.convertAndSendToUser(
                recipientId,
                "/queue/messages",
                payload
        );
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
