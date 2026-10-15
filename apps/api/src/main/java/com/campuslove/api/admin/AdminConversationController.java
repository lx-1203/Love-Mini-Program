package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.PrivateConversation;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 私信会话只读视图（阶段 4b，隐私敏感读接口）。
 *
 * <p>本控制器仅提供<b>只读</b>能力（列表 / 详情 / 消息分页），不含任何写操作，
 * 与既有 {@code whisper_message} 管理（{@link AdminWhisperController}）互不影响。</p>
 *
 * <p>权限与脱敏（服务端裁决，前端仅据 {@code redacted} 标记展示）：</p>
 * <ul>
 *   <li><b>SUPER_ADMIN</b>：可见消息正文（{@code content}）、会话预览
 *       （{@code last_message_preview}）与引用上下文（{@code quote_context}）</li>
 *   <li><b>其余管理员（含校区 ADMIN / 无校区运营 ADMIN）</b>：仅可见元数据
 *       （计数、时间、消息类型、发送者、投递/已读/撤回状态），正文类字段一律返回 null</li>
 * </ul>
 *
 * <p>校区隔离：会话对校区管理员仅当<b>双方参与者均属于其管辖校区</b>时可见；
 * 参与者校区取自 {@code user_campus_profile.campus_name}（与 AdminUserController 语义一致），
 * 兼容回退 {@code users.campus_name}。未知校区视为「不属于」，予以排除（比
 * {@link AdminDataScope#assertCampusAccess(String)} 的「null 视为全局资源放行」更严格，
 * 避免跨校区私信泄露）。</p>
 *
 * <p>安全约束：不打印消息正文；分页大小硬上限 100。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/conversations")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
@Validated
public class AdminConversationController {

    /** 每页最大记录数（与 AdminVillagePostController 对齐，防止无界分页）。 */
    private static final int MAX_PAGE_SIZE = 100;

    private final PrivateConversationRepository conversationRepository;
    private final PrivateMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final AdminDataScope adminDataScope;

    public AdminConversationController(
            PrivateConversationRepository conversationRepository,
            PrivateMessageRepository messageRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            AdminDataScope adminDataScope) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 分页查询私信会话列表（含参与者摘要）。
     *
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 标准后台分页信封 {@link AdminPageView}
     */
    @GetMapping
    @Transactional(readOnly = true)
    public AdminPageView<AdminConversationView> listConversations(
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int pageSize) {
        SecurityUtils.getCurrentUserId();
        boolean canSeeContent = adminDataScope.isCurrentSuperAdmin();
        String adminCampus = adminDataScope.getCurrentAdminCampusName();

        int safePage = Math.max(1, page);
        int safeSize = clampSize(pageSize);
        Pageable pageable = PageRequest.of(safePage - 1, safeSize,
                Sort.by(Sort.Direction.DESC, "lastMessageAt"));

        // 全局管理员（SUPER_ADMIN 或无校区 ADMIN）：DB 侧直接分页，高效
        // 校区管理员：会话无 campus 列，需按「双方均属本校区」过滤，故在内存过滤后分页
        List<PrivateConversation> pageContent;
        long total;
        if (adminCampus == null) {
            Page<PrivateConversation> result = conversationRepository.findAll(pageable);
            pageContent = result.getContent();
            total = result.getTotalElements();
        } else {
            List<PrivateConversation> scoped = filterConversationsByCampus(adminCampus);
            total = scoped.size();
            int from = Math.min((safePage - 1) * safeSize, scoped.size());
            int to = Math.min(from + safeSize, scoped.size());
            pageContent = scoped.subList(from, to);
        }

        Map<Long, User> participantMap = loadParticipants(pageContent);
        List<AdminConversationView> items = pageContent.stream()
                .map(c -> toConversationView(c, participantMap, canSeeContent))
                .toList();

        return new AdminPageView<>(
                items,
                total,
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(total, safeSize)
        );
    }

    /**
     * 查询单个会话详情（参与者摘要 + 计数 + 时间；正文按角色脱敏）。
     *
     * @param id 会话 ID
     * @return 详情视图；会话不存在返回 404；校区越权返回 403
     */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<AdminConversationDetailView> getConversation(
            @PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();
        boolean canSeeContent = adminDataScope.isCurrentSuperAdmin();

        Optional<PrivateConversation> opt = conversationRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        PrivateConversation conversation = opt.get();
        assertConversationCampusAccess(conversation);

        Map<Long, User> participantMap = loadParticipants(List.of(conversation));
        return ResponseEntity.ok(toDetailView(conversation, participantMap, canSeeContent));
    }

    /**
     * 分页查询指定会话的消息（按创建时间倒序；正文按角色脱敏）。
     *
     * @param id       会话 ID
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 标准后台分页信封；会话不存在返回 404；校区越权返回 403
     */
    @GetMapping("/{id}/messages")
    @Transactional(readOnly = true)
    public AdminPageView<AdminMessageView> listMessages(
            @PathVariable("id") @Positive Long id,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int pageSize) {
        SecurityUtils.getCurrentUserId();
        boolean canSeeContent = adminDataScope.isCurrentSuperAdmin();

        // 会话不存在 → 404（由 GlobalExceptionHandler 转 ResourceNotFoundException）；
        // 存在则先做校区越权拦截
        conversationRepository.findById(id)
                .ifPresentOrElse(this::assertConversationCampusAccess,
                        () -> {
                            throw new com.campuslove.api.common.ResourceNotFoundException(
                                    "Conversation not found: " + id);
                        });

        int safePage = Math.max(1, page);
        int safeSize = clampSize(pageSize);
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<PrivateMessage> result =
                messageRepository.findWithConversationByConversationIdOrderByCreatedAtDesc(id, pageable);

        // 批量预加载发送者昵称/头像，避免 N+1
        List<Long> senderIds = result.getContent().stream()
                .map(PrivateMessage::getSenderId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> senderMap = senderIds.isEmpty() ? Map.of()
                : userRepository.findByIdIn(senderIds).stream()
                        .collect(java.util.stream.Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        List<AdminMessageView> items = result.getContent().stream()
                .map(m -> toMessageView(m, senderMap, canSeeContent))
                .toList();

        return new AdminPageView<>(
                items,
                result.getTotalElements(),
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(result.getTotalElements(), safeSize)
        );
    }

    // ---- 内部辅助 ----

    /** 每页大小钳制到 [1, MAX_PAGE_SIZE]。 */
    private int clampSize(int pageSize) {
        return Math.max(1, Math.min(MAX_PAGE_SIZE, pageSize));
    }

    /**
     * 校区管理员专用：过滤出「双方参与者均属本校区」的会话，按最后消息时间倒序。
     *
     * <p>private_conversations 无 campus 列，且共享文件（Repository）本任务禁止修改，
     * 故在此以 {@code findAll} 全量加载后内存过滤（当前会话量级为数百行，只读后台可接受）。
     * 参与者校区批量解析，避免逐会话 N+1。</p>
     *
     * @param adminCampus 当前管理员管辖校区名（非空）
     * @return 双方均属本校区的会话列表（按 lastMessageAt 倒序）
     */
    private List<PrivateConversation> filterConversationsByCampus(String adminCampus) {
        List<PrivateConversation> all = conversationRepository.findAll(
                Sort.by(Sort.Direction.DESC, "lastMessageAt"));
        List<Long> participantIds = all.stream()
                .flatMap(c -> java.util.stream.Stream.of(c.getUserAId(), c.getUserBId()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, String> campusMap = resolveCampusMap(participantIds);
        List<PrivateConversation> scoped = new ArrayList<>();
        for (PrivateConversation c : all) {
            if (belongs(c.getUserAId(), adminCampus, campusMap)
                    && belongs(c.getUserBId(), adminCampus, campusMap)) {
                scoped.add(c);
            }
        }
        return scoped;
    }

    /**
     * 校验当前校区管理员对目标会话的访问权：非全局管理员时，双方参与者必须均属其校区，否则 403。
     *
     * @param conversation 目标会话
     * @throws OperationForbiddenException 校区越权时
     */
    private void assertConversationCampusAccess(PrivateConversation conversation) {
        String adminCampus = adminDataScope.getCurrentAdminCampusName();
        if (adminCampus == null) {
            return; // 全局管理员放行
        }
        Map<Long, String> campusMap = resolveCampusMap(
                List.of(conversation.getUserAId(), conversation.getUserBId()));
        if (!belongs(conversation.getUserAId(), adminCampus, campusMap)
                || !belongs(conversation.getUserBId(), adminCampus, campusMap)) {
            throw new OperationForbiddenException(ErrorMessages.CAMPUS_ADMIN_SCOPE_FORBIDDEN);
        }
    }

    /** 判断用户是否属于指定校区（校区缺失视为不属于）。 */
    private boolean belongs(Long userId, String adminCampus, Map<Long, String> campusMap) {
        String campus = trimToNull(campusMap.get(userId));
        return campus != null && campus.equalsIgnoreCase(adminCampus);
    }

    /**
     * 批量解析用户所属校区：优先 {@code user_campus_profile.campus_name}，
     * 回退 {@code users.campus_name}（兼容管理员账号/旧数据）。
     *
     * @param userIds 用户 ID 集合
     * @return userId -> campusName 映射
     */
    private Map<Long, String> resolveCampusMap(List<Long> userIds) {
        List<Long> ids = userIds.stream().filter(Objects::nonNull).distinct().toList();
        Map<Long, String> map = new HashMap<>();
        if (ids.isEmpty()) {
            return map;
        }
        for (UserCampusProfile p : userCampusProfileRepository.findByUserIdIn(ids)) {
            if (p.getUserId() != null && isNotBlank(p.getCampusName())) {
                map.put(p.getUserId(), p.getCampusName().trim());
            }
        }
        // 校区资料缺失的用户，回退 users.campus_name
        List<Long> missing = ids.stream().filter(id -> !map.containsKey(id)).toList();
        if (!missing.isEmpty()) {
            for (User u : userRepository.findByIdIn(missing)) {
                if (isNotBlank(u.getCampusName())) {
                    map.put(u.getId(), u.getCampusName().trim());
                }
            }
        }
        return map;
    }

    /**
     * 批量加载当前页全部会话的参与者用户（昵称/头像），避免 N+1。
     *
     * @param conversations 当前页会话
     * @return userId -> User 映射
     */
    private Map<Long, User> loadParticipants(List<PrivateConversation> conversations) {
        List<Long> ids = conversations.stream()
                .flatMap(c -> java.util.stream.Stream.of(c.getUserAId(), c.getUserBId()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, User> map = new HashMap<>();
        if (ids.isEmpty()) {
            return map;
        }
        for (User u : userRepository.findByIdIn(ids)) {
            map.put(u.getId(), u);
        }
        return map;
    }

    /** 会话 → 列表视图；非超管时 lastMessagePreview 置 null（服务端脱敏）。 */
    private AdminConversationView toConversationView(
            PrivateConversation c, Map<Long, User> participants, boolean canSeeContent) {
        User a = participants.get(c.getUserAId());
        User b = participants.get(c.getUserBId());
        return new AdminConversationView(
                c.getId(),
                c.getConversationUid(),
                c.getUserAId(),
                a != null ? a.getNickname() : null,
                a != null ? a.getAvatarUrl() : null,
                c.getUserBId(),
                b != null ? b.getNickname() : null,
                b != null ? b.getAvatarUrl() : null,
                canSeeContent ? c.getLastMessagePreview() : null,
                c.getLastMessageAt(),
                c.getPinned(),
                messageRepository.countByConversationId(c.getId()),
                !canSeeContent
        );
    }

    /** 会话 → 详情视图。 */
    private AdminConversationDetailView toDetailView(
            PrivateConversation c, Map<Long, User> participants, boolean canSeeContent) {
        User a = participants.get(c.getUserAId());
        User b = participants.get(c.getUserBId());
        return new AdminConversationDetailView(
                c.getId(),
                c.getConversationUid(),
                c.getUserAId(),
                a != null ? a.getNickname() : null,
                a != null ? a.getAvatarUrl() : null,
                c.getUserBId(),
                b != null ? b.getNickname() : null,
                b != null ? b.getAvatarUrl() : null,
                canSeeContent ? c.getLastMessagePreview() : null,
                c.getLastMessageAt(),
                c.getCreatedAt(),
                c.getPinned(),
                c.getUserAMuted(),
                c.getUserBMuted(),
                messageRepository.countByConversationId(c.getId()),
                !canSeeContent
        );
    }

    /** 消息 → 视图；非超管时 content/quoteContext 置 null（服务端脱敏）。 */
    private AdminMessageView toMessageView(
            PrivateMessage m, Map<Long, User> senders, boolean canSeeContent) {
        User sender = senders.get(m.getSenderId());
        return new AdminMessageView(
                m.getId(),
                m.getConversation() != null ? m.getConversation().getId() : null,
                m.getSenderId(),
                sender != null ? sender.getNickname() : null,
                canSeeContent ? m.getContent() : null,
                m.getMessageKind(),
                m.getDurationSeconds(),
                canSeeContent ? m.getQuoteContext() : null,
                m.getIsRead(),
                m.getRecalled(),
                m.getDeliveryStatus(),
                m.getCreatedAt(),
                !canSeeContent
        );
    }

    /** trim 后空串视为 null。 */
    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** 非 null 且 trim 后非空。 */
    private boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }
}

/**
 * 私信会话列表视图（参与者摘要 + 元数据）。
 *
 * @param id                 会话 ID
 * @param conversationUid    会话唯一标识
 * @param userAId            用户 A ID
 * @param userANickname      用户 A 昵称
 * @param userAAvatarUrl     用户 A 头像
 * @param userBId            用户 B ID
 * @param userBNickname      用户 B 昵称
 * @param userBAvatarUrl     用户 B 头像
 * @param lastMessagePreview 最后消息预览（非超管为 null）
 * @param lastMessageAt      最后消息时间
 * @param pinned             是否置顶
 * @param messageCount       消息总数（元数据，恒可见）
 * @param redacted           正文类字段是否被脱敏（true 表示当前角色看不到正文）
 */
record AdminConversationView(
        Long id,
        String conversationUid,
        Long userAId,
        String userANickname,
        String userAAvatarUrl,
        Long userBId,
        String userBNickname,
        String userBAvatarUrl,
        String lastMessagePreview,
        LocalDateTime lastMessageAt,
        Boolean pinned,
        long messageCount,
        boolean redacted
) {
}

/**
 * 私信会话详情视图（含创建时间与静音状态元数据）。
 */
record AdminConversationDetailView(
        Long id,
        String conversationUid,
        Long userAId,
        String userANickname,
        String userAAvatarUrl,
        Long userBId,
        String userBNickname,
        String userBAvatarUrl,
        String lastMessagePreview,
        LocalDateTime lastMessageAt,
        LocalDateTime createdAt,
        Boolean pinned,
        Boolean userAMuted,
        Boolean userBMuted,
        long messageCount,
        boolean redacted
) {
}

/**
 * 私信消息视图（正文按角色脱敏）。
 *
 * @param id             消息 ID
 * @param conversationId 所属会话 ID
 * @param senderId       发送者 ID
 * @param senderNickname 发送者昵称
 * @param content        消息正文（非超管为 null）
 * @param messageKind    消息类型：text/image/voice/quote 等（元数据，恒可见）
 * @param durationSeconds 语音时长（voice）
 * @param quoteContext   引用上下文（非超管为 null）
 * @param isRead         是否已读
 * @param recalled       是否撤回
 * @param deliveryStatus 投递状态
 * @param createdAt      发送时间
 * @param redacted       正文类字段是否被脱敏
 */
record AdminMessageView(
        Long id,
        Long conversationId,
        Long senderId,
        String senderNickname,
        String content,
        String messageKind,
        Integer durationSeconds,
        String quoteContext,
        Boolean isRead,
        Boolean recalled,
        String deliveryStatus,
        LocalDateTime createdAt,
        boolean redacted
) {
}
