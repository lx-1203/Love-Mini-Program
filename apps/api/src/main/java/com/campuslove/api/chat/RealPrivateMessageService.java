package com.campuslove.api.chat;

import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.PrivateConversation;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实私信服务实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 * 提供私信会话管理、消息发送、消息读取等功能。
 */
@Profile("real")
@Service
public class RealPrivateMessageService implements PrivateMessageService {

    private final PrivateConversationRepository conversationRepository;
    private final PrivateMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SensitiveWordFilter sensitiveWordFilter;

    public RealPrivateMessageService(
            PrivateConversationRepository conversationRepository,
            PrivateMessageRepository messageRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate,
            SensitiveWordFilter sensitiveWordFilter) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.sensitiveWordFilter = sensitiveWordFilter;
    }

    /**
     * 获取用户的会话列表。
     */
    @Override
    @Transactional(readOnly = true)
    public List<ConversationView> getConversations(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        List<PrivateConversation> conversations =
                conversationRepository.findByUserAIdOrUserBIdOrderByLastMessageAtDesc(userId, userId);

        return conversations.stream()
                .map(conv -> toConversationView(conv, userId))
                .toList();
    }

    /**
     * 创建或获取两个用户之间的会话。
     * 如果已存在会话，则返回已有会话；否则创建新会话。
     */
    @Override
    @Transactional
    public ConversationView createOrGetConversation(Long userAId, Long userBId) {
        if (userAId == null || userBId == null) {
            throw new IllegalArgumentException("userAId and userBId are required");
        }
        if (userAId.equals(userBId)) {
            throw new IllegalArgumentException("Cannot create conversation with yourself");
        }

        // 查找已有会话
        Optional<PrivateConversation> existing = conversationRepository.findByUserPair(userAId, userBId);
        if (existing.isPresent()) {
            return toConversationView(existing.get(), userAId);
        }

        // 创建新会话
        LocalDateTime now = LocalDateTime.now();
        PrivateConversation conversation = new PrivateConversation();
        conversation.setConversationUid(generateConversationUid(userAId, userBId));
        conversation.setUserAId(userAId);
        conversation.setUserBId(userBId);
        conversation.setCreatedAt(now);
        conversation.setUpdatedAt(now);

        conversationRepository.save(conversation);
        return toConversationView(conversation, userAId);
    }

    /**
     * 在指定会话中发送消息。
     */
    @Override
    @Transactional
    public MessageView sendMessage(Long conversationId, Long senderId, String content, String kind) {
        if (conversationId == null || senderId == null) {
            throw new IllegalArgumentException("conversationId and senderId are required");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content is required");
        }

        PrivateConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        // 验证发送者是否是会话参与者
        if (!conversation.getUserAId().equals(senderId) && !conversation.getUserBId().equals(senderId)) {
            throw new IllegalArgumentException("Sender is not a participant of this conversation");
        }

        LocalDateTime now = LocalDateTime.now();

        String resolvedKind = kind != null ? kind : "text";

        // 敏感词过滤：过滤私信内容
        String filteredContent = sensitiveWordFilter.filterWithLog(content, senderId, "MESSAGE");

        // 创建消息
        PrivateMessage message = new PrivateMessage();
        message.setConversation(conversation);
        message.setSenderId(senderId);
        message.setContent(filteredContent);
        message.setMessageKind(resolvedKind);
        message.setIsRead(false);
        message.setCreatedAt(now);

        messageRepository.save(message);

        // 更新会话的最后消息信息：quote 类型提取纯文本摘要
        String preview;
        if ("quote".equals(resolvedKind)) {
            preview = buildQuotePreview(filteredContent);
        } else {
            preview = filteredContent.length() > 50 ? filteredContent.substring(0, 50) + "..." : filteredContent;
        }
        conversation.setLastMessagePreview(preview);
        conversation.setLastMessageAt(now);
        conversation.setUpdatedAt(now);
        conversationRepository.save(conversation);

        MessageView messageView = toMessageView(message);

        // 通过 WebSocket 推送消息给接收者
        Long recipientId = conversation.getUserAId().equals(senderId)
                ? conversation.getUserBId()
                : conversation.getUserAId();
        messagingTemplate.convertAndSendToUser(
                String.valueOf(recipientId),
                "/queue/messages",
                messageView
        );

        return messageView;
    }

    /**
     * 获取指定会话的消息列表（分页），同时标记消息为已读。
     */
    @Override
    @Transactional
    public List<MessageView> getMessages(Long conversationId, Long userId, Pageable pageable) {
        if (conversationId == null || userId == null) {
            throw new IllegalArgumentException("conversationId and userId are required");
        }

        // 验证用户是否是会话参与者
        PrivateConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        if (!conversation.getUserAId().equals(userId) && !conversation.getUserBId().equals(userId)) {
            throw new IllegalArgumentException("User is not a participant of this conversation");
        }

        // 获取消息列表（倒序分页，最新消息在前）
        Page<PrivateMessage> messagePage = messageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversationId, pageable);

        // 标记非自己的未读消息为已读
        markAsRead(conversationId, userId);

        return messagePage.getContent().stream()
                .map(this::toMessageView)
                .toList();
    }

    /**
     * 标记指定会话中所有未读消息为已读。
     */
    @Override
    @Transactional
    public void markAsRead(Long conversationId, Long userId) {
        if (conversationId == null || userId == null) {
            throw new IllegalArgumentException("conversationId and userId are required");
        }

        // 查找该会话中由对方发送的未读消息
        List<PrivateMessage> unreadMessages = messageRepository
                .findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .filter(msg -> !msg.getSenderId().equals(userId) && !msg.getIsRead())
                .toList();

        for (PrivateMessage msg : unreadMessages) {
            msg.setIsRead(true);
            messageRepository.save(msg);
        }
    }

    // ---- Phase 2 新增：会话置顶 ----

    /**
     * 设置会话置顶状态。
     */
    @Override
    @Transactional
    public void pinConversation(Long conversationId, boolean pinned, Long userId) {
        if (conversationId == null || userId == null) {
            throw new IllegalArgumentException("conversationId and userId are required");
        }

        PrivateConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        // 验证用户是否是会话参与者
        if (!conversation.getUserAId().equals(userId) && !conversation.getUserBId().equals(userId)) {
            throw new IllegalArgumentException("User is not a participant of this conversation");
        }

        conversation.setPinned(pinned);
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);
    }

    // ---- 私有辅助方法 ----

    /**
     * 将 PrivateConversation 实体转换为 ConversationView。
     * 填充对方用户信息、未读数、置顶状态、会话阶段和类型等字段。
     */
    private ConversationView toConversationView(PrivateConversation conv, Long currentUserId) {
        // 确定对方用户 ID
        Long otherUserId = conv.getUserAId().equals(currentUserId) ? conv.getUserBId() : conv.getUserAId();

        // 获取对方用户信息
        User otherUser = userRepository.findById(otherUserId).orElse(null);
        String otherUserName = otherUser != null ? otherUser.getNickname() : DisplayConstants.UNKNOWN_USER;
        String otherUserAvatar = otherUser != null ? otherUser.getAvatarUrl() : null;

        // 获取对方用户简介（从 User 的 bio 字段拼接年级和简介）
        String headline = "";
        if (otherUser != null) {
            StringBuilder sb = new StringBuilder();
            if (otherUser.getGradeLabel() != null && !otherUser.getGradeLabel().isBlank()) {
                sb.append(otherUser.getGradeLabel());
            }
            if (otherUser.getBio() != null && !otherUser.getBio().isBlank()) {
                if (!sb.isEmpty()) {
                    sb.append(" · ");
                }
                // 截取简介前 20 字符
                String bio = otherUser.getBio().length() > 20
                        ? otherUser.getBio().substring(0, 20) + "..."
                        : otherUser.getBio();
                sb.append(bio);
            }
            headline = sb.toString();
        }

        // 计算未读消息数
        int unreadCount = (int) messageRepository.countByConversationIdAndSenderIdNotAndIsRead(
                conv.getId(), currentUserId, false);

        // 获取置顶状态
        Boolean pinned = conv.getPinned() != null ? conv.getPinned() : false;

        // 会话阶段：有消息为 active，无消息为 matching
        String phase = conv.getLastMessageAt() != null ? "active" : "matching";

        // 会话类型：默认为 private（临时匿名会话后续迭代支持）
        String sessionType = "private";

        return new ConversationView(
                conv.getId(),
                conv.getConversationUid(),
                conv.getUserAId(),
                conv.getUserBId(),
                otherUserName,
                otherUserAvatar,
                conv.getLastMessagePreview(),
                conv.getLastMessageAt() != null ? conv.getLastMessageAt().toString() : null,
                unreadCount,
                headline,
                pinned,
                phase,
                sessionType
        );
    }

    /**
     * 将 PrivateMessage 实体转换为 MessageView。
     */
    private MessageView toMessageView(PrivateMessage message) {
        return new MessageView(
                message.getId(),
                message.getConversation().getId(),
                message.getSenderId(),
                message.getContent(),
                message.getMessageKind(),
                message.getIsRead(),
                message.getCreatedAt().toString(),
                message.getQuoteContext()
        );
    }

    /**
     * 构建 quote 类型消息的预览文本。
     * 如果 content 是 JSON 格式的 quote body，尝试提取其中的文本部分；
     * 否则直接截取前 50 个字符。
     *
     * @param content 消息内容（可能为 JSON）
     * @return 预览文本
     */
    private String buildQuotePreview(String content) {
        if (content == null || content.isBlank()) {
            return "[引用消息]";
        }
        // 尝试从 JSON 格式的 quote body 中提取 text 字段
        // 格式: {"text":"消息正文","quoteContext":{...}}
        try {
            int textStart = content.indexOf("\"text\":\"");
            if (textStart >= 0) {
                int valueStart = textStart + 8;
                int valueEnd = content.indexOf("\"", valueStart);
                if (valueEnd > valueStart) {
                    String text = content.substring(valueStart, valueEnd);
                    return text.length() > 50 ? text.substring(0, 50) + "..." : text;
                }
            }
        } catch (Exception e) {
            // JSON 解析失败，回退到截取
        }
        return content.length() > 50 ? content.substring(0, 50) + "..." : content;
    }

    /**
     * 生成会话唯一标识。
     * 使用两个用户 ID 的排序组合来确保唯一性。
     */
    private String generateConversationUid(Long userAId, Long userBId) {
        long min = Math.min(userAId, userBId);
        long max = Math.max(userAId, userBId);
        return "conv-" + min + "-" + max + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
