package com.campuslove.api.chat;

import com.campuslove.api.block.BlockedException;
import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.config.SensitiveWordFilter;
import com.campuslove.api.entity.PrivateConversation;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.UserBlockRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.growth.SocialProgressService;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
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
 *
 * <p>3-F 拉黑生效范围：</p>
 * <ul>
 *   <li>发送消息拦截：任一方拉黑另一方时抛 {@link BlockedException}（业务错误码 BLOCKED）；
 *       WebSocket 私信链路（MessageWebSocketHandler）复用 sendMessage，同样被拦截</li>
 *   <li>会话列表过滤：过滤存在拉黑关系的会话（双方均不可见该会话）</li>
 *   <li>创建会话拦截：与已拉黑用户不可创建新会话</li>
 * </ul>
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
    /** 3-F 拉黑关系数据访问层（消息拦截 + 会话过滤） */
    private final UserBlockRepository blockRepository;
    /** 活动卡片 JSON 解析（字段名后可能带空格，手写 indexOf 不可靠） */
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /**
     * 社交升温漏斗服务（R4-00327：聊天主链路埋点）。
     * real profile 注入；单元测试 / mock 场景为 null 时跳过埋点。
     * 采用字段注入（required=false）而非构造器参数，避免破坏既有单测构造器。
     */
    @Autowired(required = false)
    private SocialProgressService socialProgressService;

    public RealPrivateMessageService(
            PrivateConversationRepository conversationRepository,
            PrivateMessageRepository messageRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate,
            SensitiveWordFilter sensitiveWordFilter,
            UserBlockRepository blockRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.sensitiveWordFilter = sensitiveWordFilter;
        this.blockRepository = blockRepository;
        this.objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
    }

    /**
     * 获取用户的会话列表。
     *
     * <p>Task 2.2.1：批量预加载对方用户信息，避免在 toConversationView 中触发 N+1 查询。</p>
     *
     * <p>3-F 拉黑：过滤存在拉黑关系的会话（我拉黑对方或对方拉黑我，该会话双方均不可见）。</p>
     */
    @Override
    @Transactional(readOnly = true)
    public List<ConversationView> getConversations(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        List<PrivateConversation> conversations =
                conversationRepository.findByUserAIdOrUserBIdOrderByLastMessageAtDesc(userId, userId);

        // 3-F：一次性查询当前用户全部拉黑关系（双向并集），内存过滤会话，
        // 避免逐会话查库（N+1）
        Set<Long> blockedRelationUserIds = Set.copyOf(blockRepository.findBlockedRelationUserIds(userId));
        if (!blockedRelationUserIds.isEmpty()) {
            conversations = conversations.stream()
                    .filter(conv -> {
                        Long otherUserId = conv.getUserAId().equals(userId)
                                ? conv.getUserBId()
                                : conv.getUserAId();
                        return !blockedRelationUserIds.contains(otherUserId);
                    })
                    .toList();
        }

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

        // 3-F：与已拉黑用户不可创建新会话（任一方拉黑另一方均拦截）
        if (blockRepository.existsBlockedBetween(userAId, userBId)) {
            throw new BlockedException(ErrorMessages.BLOCKED_MESSAGE_SEND_FORBIDDEN);
        }

        // 查找已有会话
        Optional<PrivateConversation> existing = conversationRepository.findByUserPair(userAId, userBId);
        if (existing.isPresent()) {
            return toConversationView(existing.get(), userAId);
        }

        // 创建新会话
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
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

        // 3-F：发送消息拦截——任一方拉黑另一方时拒绝发送（业务错误码 BLOCKED）。
        // 覆盖 HTTP 与 WebSocket 两条链路（MessageWebSocketHandler 复用 sendMessage）。
        Long recipientId = conversation.getUserAId().equals(senderId)
                ? conversation.getUserBId()
                : conversation.getUserAId();
        if (blockRepository.existsBlockedBetween(senderId, recipientId)) {
            throw new BlockedException(ErrorMessages.BLOCKED_MESSAGE_SEND_FORBIDDEN);
        }

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);

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

        // 通过 WebSocket 推送消息给接收者（recipientId 已在拉黑拦截处计算）
        messagingTemplate.convertAndSendToUser(
                String.valueOf(recipientId),
                "/queue/messages",
                messageView
        );

        // R4-00327：社交升温漏斗埋点——开启对话（L4_COMMUNICATION 计数）；
        // 埋点失败不影响消息主流程（仅记录日志）
        if (socialProgressService != null) {
            try {
                socialProgressService.recordChat(senderId);
            } catch (RuntimeException e) {
                log.debug("社交升温埋点（chat）失败：userId={}, error={}", senderId, e.getMessage());
            }
        }

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
        // 3-G：两路查询均按当前用户过滤已软删消息（发送者本人删除的对自己隐藏，对方仍可见）
        Page<PrivateMessage> messagePage = asc
                ? messageRepository.findWithConversationByConversationIdOrderByCreatedAtAscPage(conversationId, userId, pageable)
                : messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, userId, pageable);

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
        conversation.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        conversationRepository.save(conversation);
    }

    // ---- 2026-08-10 B1③：会话级免打扰 ----

    /**
     * 设置当前用户对指定会话的免打扰状态（按用户侧独立存储）。
     *
     * <p>userA 操作写入 user_a_muted，userB 操作写入 user_b_muted，
     * 防止 A 修改 B 的静音状态（越权）；仅会话参与者可操作。</p>
     */
    @Override
    @Transactional
    public void setConversationMuted(Long conversationId, boolean muted, Long userId) {
        if (conversationId == null || userId == null) {
            throw new IllegalArgumentException("conversationId and userId are required");
        }

        PrivateConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        // 验证用户是否是会话参与者
        if (!conversation.getUserAId().equals(userId) && !conversation.getUserBId().equals(userId)) {
            throw new IllegalArgumentException("User is not a participant of this conversation");
        }

        // 按当前用户侧写入（防越权：A 只能改自己的静音标记）
        if (conversation.getUserAId().equals(userId)) {
            conversation.setUserAMuted(muted);
        } else {
            conversation.setUserBMuted(muted);
        }
        conversation.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
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

    // ---- 3-G：删除消息（软删，微信语义：仅删除者对自己隐藏，不删对方） ----

    /**
     * 软删单条消息（仅消息发送者本人可操作）。
     *
     * <p>流程：按 ID 查消息 → 校验发送者身份（防 IDOR，非属主统一按「不存在」处理，
     * 不泄露消息归属）→ 置 deletedForSender=true 持久化。</p>
     *
     * <p>幂等：已删除的消息重复删除直接返回成功（同一属主、同一条消息）。</p>
     */
    @Override
    @Transactional
    public void softDeleteMessage(Long messageId, Long userId) {
        if (messageId == null || userId == null) {
            throw new IllegalArgumentException("messageId and userId are required");
        }

        PrivateMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("消息不存在或无权操作"));

        // 校验消息属主：仅发送者本人可删除自己的消息（防 IDOR）
        if (!message.getSenderId().equals(userId)) {
            throw new ResourceNotFoundException("消息不存在或无权操作");
        }

        // 幂等：已软删则无操作
        if (Boolean.TRUE.equals(message.getDeletedForSender())) {
            log.info("消息已删除过，幂等返回：messageId={}, userId={}", messageId, userId);
            return;
        }

        message.setDeletedForSender(true);
        messageRepository.save(message);
        log.info("消息已软删（仅发送者本人隐藏）：messageId={}, userId={}", messageId, userId);
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

        // 会话级免打扰（2026-08-10 B1③）：按当前用户侧读取
        boolean muted;
        if (currentUserId.equals(conv.getUserAId())) {
            muted = Boolean.TRUE.equals(conv.getUserAMuted());
        } else if (currentUserId.equals(conv.getUserBId())) {
            muted = Boolean.TRUE.equals(conv.getUserBMuted());
        } else {
            // 非参与者（理论不会发生，参与者校验在查询层完成）：默认未静音
            muted = false;
        }

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
                sessionType,
                muted
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
