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
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(RealPrivateMessageService.class);

    private final PrivateConversationRepository conversationRepository;
    private final PrivateMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SensitiveWordFilter sensitiveWordFilter;
    /** 活动卡片 JSON 解析（字段名后可能带空格，手写 indexOf 不可靠） */
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

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
        this.objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
    }

    /**
     * 获取用户的会话列表。
     *
     * <p>Task 2.2.1：批量预加载对方用户信息，避免在 toConversationView 中触发 N+1 查询。</p>
     */
    @Override
    @Transactional(readOnly = true)
    public List<ConversationView> getConversations(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        List<PrivateConversation> conversations =
                conversationRepository.findByUserAIdOrUserBIdOrderByLastMessageAtDesc(userId, userId);

        // 批量预加载对方用户信息，避免在循环中触发 N+1 查询
        List<Long> otherUserIds = conversations.stream()
                .map(conv -> conv.getUserAId().equals(userId) ? conv.getUserBId() : conv.getUserAId())
                .filter(id -> id != null)
                .distinct()
                .toList();
        Map<Long, User> otherUserMap = batchLoadUsers(otherUserIds);

        // infra R2-00247: 批量统计各会话未读数（GROUP BY），避免逐会话 count 查询（N+1）
        Map<Long, Long> unreadMap = batchLoadUnreadCounts(
                conversations.stream().map(PrivateConversation::getId).toList(), userId);

        return conversations.stream()
                .map(conv -> toConversationView(conv, userId, otherUserMap, unreadMap))
                .toList();
    }

    /**
     * 批量统计多个会话的未读消息数（会话 ID → 未读数）。
     *
     * @param conversationIds 会话 ID 列表
     * @param currentUserId   当前用户 ID
     * @return 会话 ID → 未读数 Map
     */
    private Map<Long, Long> batchLoadUnreadCounts(List<Long> conversationIds, Long currentUserId) {
        if (conversationIds == null || conversationIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return messageRepository.countUnreadGroupByConversationIds(conversationIds, currentUserId).stream()
                .collect(Collectors.toMap(PrivateMessageRepository.UnreadCountProjection::getConversationId,
                        p -> p.getCnt() == null ? 0L : p.getCnt(), (a, b) -> a));
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

        // infra R2-00209: 校验对方用户存在，避免对不存在的用户创建会话
        if (!userRepository.existsById(userBId)) {
            throw new IllegalArgumentException("User not found: " + userBId);
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

        // 缺陷修复：saveAndFlush 立即回填 IDENTITY 主键，保证会话视图 id 非空
        // （实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id）
        conversation = conversationRepository.saveAndFlush(conversation);
        return toConversationView(conversation, userAId);
    }

    /**
     * 在指定会话中发送消息。
     */
    @Override
    @Transactional
    public MessageView sendMessage(Long conversationId, Long senderId, String content, String kind,
                                   Integer durationSeconds) {
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

        // 录音修复：kind 统一规范化为小写（客户端发送小写 text/voice，
        // 与临时聊天链路 kind 约定及前端 mapToMessageItem(messageKind === "voice") 映射保持一致）
        String resolvedKind = kind != null ? kind.toLowerCase(Locale.ROOT) : "text";

        // 敏感词过滤：过滤私信内容
        String filteredContent = sensitiveWordFilter.filterWithLog(content, senderId, "MESSAGE");

        // 创建消息
        PrivateMessage message = new PrivateMessage();
        message.setConversation(conversation);
        message.setSenderId(senderId);
        message.setContent(filteredContent);
        message.setMessageKind(resolvedKind);
        message.setDurationSeconds(durationSeconds);
        message.setIsRead(false);
        message.setCreatedAt(now);

        // 缺陷修复：saveAndFlush 立即回填 IDENTITY 主键，保证消息视图 id 非空
        // （实体带 @Version 时 save 走 merge 返回新托管实例，必须接收返回值回填 id）
        message = messageRepository.saveAndFlush(message);

        // 更新会话的最后消息信息：quote 类型提取纯文本摘要；activity 卡片提取标题
        String preview;
        if ("quote".equals(resolvedKind)) {
            preview = buildQuotePreview(filteredContent);
        } else if ("activity".equals(resolvedKind)) {
            preview = buildActivityPreview(filteredContent);
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
     *
     * <p>2026-08-08 微信化重构：新增 order 参数。</p>
     * <ul>
     *   <li>desc（默认）：倒序分页，最新在前（首屏进入）</li>
     *   <li>asc：正序分页，最早在前（上拉加载更早历史，page+1 取下一段旧消息）</li>
     * </ul>
     */
    @Override
    @Transactional
    public List<MessageView> getMessages(Long conversationId, Long userId, Pageable pageable, String order) {
        if (conversationId == null || userId == null) {
            throw new IllegalArgumentException("conversationId and userId are required");
        }

        // 验证用户是否是会话参与者
        PrivateConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        if (!conversation.getUserAId().equals(userId) && !conversation.getUserBId().equals(userId)) {
            throw new IllegalArgumentException("User is not a participant of this conversation");
        }

        boolean asc = "asc".equalsIgnoreCase(order);
        // asc：正序分页（最早在前，@EntityGraph 预加载 conversation 避免 N+1）；
        // desc：倒序分页（最新在前）
        Page<PrivateMessage> messagePage = asc
                ? messageRepository.findWithConversationByConversationIdOrderByCreatedAtAscPage(conversationId, pageable)
                : messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable);

        // 标记非自己的未读消息为已读
        markAsRead(conversationId, userId);

        return messagePage.getContent().stream()
                .map(this::toMessageView)
                .toList();
    }

    /**
     * 标记指定会话中所有未读消息为已读。
     * 使用批量更新提高性能。
     */
    @Override
    @Transactional
    public void markAsRead(Long conversationId, Long userId) {
        if (conversationId == null || userId == null) {
            throw new IllegalArgumentException("conversationId and userId are required");
        }

        // 使用批量更新标记未读消息为已读
        messageRepository.markAsReadByConversationAndSenderNot(conversationId, userId);
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

    // ---- M-06/P0-07：删除会话 ----

    /**
     * 删除会话及其全部消息（仅会话参与者可操作）。
     *
     * <p>流程：校验参与者身份 → 批量删除会话消息 → 删除会话记录。
     * 同一事务内原子执行，任一步失败全部回滚。</p>
     */
    @Override
    @Transactional
    public void deleteConversation(Long conversationId, Long userId) {
        if (conversationId == null || userId == null) {
            throw new IllegalArgumentException("conversationId and userId are required");
        }

        PrivateConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        // 校验用户是否为会话参与者，防止任意用户删除他人会话（IDOR）
        if (!conversation.getUserAId().equals(userId) && !conversation.getUserBId().equals(userId)) {
            throw new IllegalArgumentException("User is not a participant of this conversation");
        }

        // 批量删除会话消息（级联清理）
        int deletedMessages = messageRepository.deleteByConversationId(conversationId);
        // 删除会话记录
        conversationRepository.delete(conversation);

        log.info("会话已删除：conversationId={}, userId={}, 消息清理 {} 条",
                conversationId, userId, deletedMessages);
    }

    // ---- 私有辅助方法 ----

    /**
     * 将 PrivateConversation 实体转换为 ConversationView（兼容单条调用场景）。
     * 单条调用时通过 userRepository.findById 加载对方用户信息。
     *
     * <p>Task 2.2.1：批量场景应使用 {@link #toConversationView(PrivateConversation, Long, Map)}，
     * 配合 {@link #batchLoadUsers(List)} 预加载 Map 复用，避免 N+1 查询。</p>
     */
    private ConversationView toConversationView(PrivateConversation conv, Long currentUserId) {
        Map<Long, User> otherUserMap = batchLoadUsers(List.of(
                conv.getUserAId().equals(currentUserId) ? conv.getUserBId() : conv.getUserAId()));
        return toConversationView(conv, currentUserId, otherUserMap);
    }

    /**
     * 将 PrivateConversation 实体转换为 ConversationView（批量场景）。
     *
     * <p>Task 2.2.1：从预加载的 otherUserMap 中按 otherUserId 取出 User 实体（O(1)，无 N+1 查询），
     * Map 中不存在时按"未知用户"处理。</p>
     *
     * @param conv          会话实体
     * @param currentUserId 当前用户 ID
     * @param otherUserMap  对方用户 ID → User 实体的 Map（可能为空 Map）
     * @return 会话视图
     */
    private ConversationView toConversationView(PrivateConversation conv, Long currentUserId,
                                                Map<Long, User> otherUserMap) {
        // 单会话场景（创建/详情）：无批量未读 Map 时逐会话计数
        return toConversationView(conv, currentUserId, otherUserMap, Collections.emptyMap());
    }

    private ConversationView toConversationView(PrivateConversation conv, Long currentUserId,
                                                Map<Long, User> otherUserMap,
                                                Map<Long, Long> unreadMap) {
        // 确定对方用户 ID
        Long otherUserId = conv.getUserAId().equals(currentUserId) ? conv.getUserBId() : conv.getUserAId();

        // 从预加载的 Map 中获取对方用户信息（O(1)，无 N+1 查询）
        User otherUser = otherUserMap != null ? otherUserMap.get(otherUserId) : null;
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

        // 计算未读消息数（优先使用批量预加载 Map，避免 N+1 计数）
        int unreadCount;
        if (unreadMap == null || unreadMap.isEmpty()) {
            unreadCount = (int) messageRepository.countByConversationIdAndSenderIdNotAndIsRead(
                    conv.getId(), currentUserId, false);
        } else {
            Long cnt = unreadMap.get(conv.getId());
            unreadCount = cnt == null ? 0 : cnt.intValue();
        }

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
                message.getQuoteContext(),
                message.getDurationSeconds()
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
        } catch (StringIndexOutOfBoundsException e) {
            // 手动解析 JSON 字符串时索引越界（字段缺失或格式异常），回退到截取
        }
        return content.length() > 50 ? content.substring(0, 50) + "..." : content;
    }

    /**
     * 构建 activity 卡片类型消息的预览文本。
     * content 为 JSON：{"title","desc","tag","targetUrl"}，
     * 会话列表展示「[活动] 标题」，解析失败回退「[活动] 活动卡片」。
     *
     * @param content 消息内容（JSON）
     * @return 预览文本
     */
    private String buildActivityPreview(String content) {
        try {
            var node = objectMapper.readTree(content);
            var title = node.path("title").asText("");
            if (!title.isBlank()) {
                String preview = "[活动] " + title;
                return preview.length() > 50 ? preview.substring(0, 50) + "..." : preview;
            }
        } catch (Exception e) {
            // JSON 解析失败（非 JSON 内容/字段缺失），回退默认文案
        }
        return "[活动] 活动卡片";
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

    /**
     * 批量查询用户信息，避免 N+1 查询。
     *
     * <p>Task 2.2.1：原 toConversationView 在循环中调用 {@code userRepository.findById(id)}
     * 会触发 N 次 SELECT user。本方法先收集 distinct userId 列表，再通过
     * {@link org.springframework.data.jpa.repository.JpaRepository#findAllById(Iterable)}
     * 一次性查询并组装为 Map，由调用方按 ID 取值（O(1)），将 N 次查询压缩为 1 次。</p>
     *
     * @param userIds 用户 ID 列表（可能含 null，已内部过滤）
     * @return userId → User 实体的 Map（空列表时返回空 Map）
     */
    private Map<Long, User> batchLoadUsers(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> distinctIds = userIds.stream()
                .filter(id -> id != null)
                .distinct()
                .toList();
        if (distinctIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findAllById(distinctIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }
}
