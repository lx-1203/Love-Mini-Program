package com.campuslove.api.chat;

import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.InteractionEvent;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.InteractionEventRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 互动事件服务真实实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 * 提供记录互动事件、查询事件列表、获取未读数、标记已读等功能。
 */
@Profile("real")
@Service
public class RealInteractionEventService implements InteractionEventService {

    private static final Logger log = LoggerFactory.getLogger(RealInteractionEventService.class);

    private final InteractionEventRepository interactionEventRepository;
    private final UserRepository userRepository;

    public RealInteractionEventService(
            InteractionEventRepository interactionEventRepository,
            UserRepository userRepository) {
        this.interactionEventRepository = interactionEventRepository;
        this.userRepository = userRepository;
    }

    /**
     * 记录互动事件。
     * 创建 InteractionEvent 记录并保存到数据库。
     *
     * @param userId        事件接收者用户 ID（被互动的用户）
     * @param triggerUserId 触发事件的用户 ID（发起互动的用户）
     * @param eventType     事件类型
     * @param referenceId   关联实体 ID
     * @param referenceType 关联实体类型
     * @param summary       事件摘要
     */
    @Override
    @Transactional
    public void recordEvent(Long userId, Long triggerUserId, String eventType,
                            Long referenceId, String referenceType, String summary) {
        if (userId == null || triggerUserId == null) {
            throw new IllegalArgumentException("userId 和 triggerUserId 不能为空");
        }
        // 不记录自己对自己的互动
        if (userId.equals(triggerUserId)) {
            return;
        }

        InteractionEvent event = new InteractionEvent();
        event.setUserId(userId);
        event.setTriggerUserId(triggerUserId);
        event.setEventType(eventType);
        event.setReferenceId(referenceId);
        event.setReferenceType(referenceType);
        event.setSummary(summary);
        event.setIsRead(false);
        event.setCreatedAt(LocalDateTime.now());

        interactionEventRepository.save(event);

        log.debug("互动事件已记录, userId={}, triggerUserId={}, eventType={}", userId, triggerUserId, eventType);
    }

    /**
     * 查询互动事件列表（分页）。
     * 按创建时间倒序排列，包含触发用户的昵称和头像信息。
     *
     * @param userId 用户 ID
     * @param page   页码（从 0 开始）
     * @param size   每页大小
     * @return 互动事件视图列表
     */
    @Override
    @Transactional(readOnly = true)
    public List<InteractionEventView> getInteractionEvents(Long userId, int page, int size) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }

        Page<InteractionEvent> eventPage = interactionEventRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));

        return eventPage.getContent().stream()
                .map(this::toInteractionEventView)
                .toList();
    }

    /**
     * 获取未读互动事件数。
     *
     * @param userId 用户 ID
     * @return 未读互动事件数
     */
    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }
        return interactionEventRepository.countByUserIdAndIsRead(userId, false);
    }

    /**
     * 标记指定事件为已读。
     * 验证事件属于指定用户后才标记。
     *
     * @param eventId 事件 ID
     * @param userId  用户 ID（用于验证）
     */
    @Override
    @Transactional
    public void markAsRead(Long eventId, Long userId) {
        if (eventId == null || userId == null) {
            throw new IllegalArgumentException("eventId 和 userId 不能为空");
        }

        List<InteractionEvent> events = interactionEventRepository.findByUserIdAndId(userId, eventId);
        if (events.isEmpty()) {
            throw new IllegalArgumentException("互动事件不存在或不属于该用户: eventId=" + eventId);
        }

        InteractionEvent event = events.get(0);
        event.setIsRead(true);
        interactionEventRepository.save(event);
    }

    /**
     * 标记所有互动事件为已读。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId 不能为空");
        }

        List<InteractionEvent> unreadEvents = interactionEventRepository.findByUserIdAndIsRead(userId, false);
        for (InteractionEvent event : unreadEvents) {
            event.setIsRead(true);
        }
        interactionEventRepository.saveAll(unreadEvents);

        log.info("已标记 {} 个互动事件为已读, userId={}", unreadEvents.size(), userId);
    }

    /**
     * 将 InteractionEvent 实体转换为 InteractionEventView。
     * 从 UserRepository 查询触发用户的昵称和头像信息。
     *
     * @param event 互动事件实体
     * @return 互动事件视图
     */
    private InteractionEventView toInteractionEventView(InteractionEvent event) {
        // 查询触发用户信息
        User triggerUser = userRepository.findById(event.getTriggerUserId()).orElse(null);
        String nickname = triggerUser != null ? triggerUser.getNickname() : DisplayConstants.UNKNOWN_USER;
        String avatarUrl = triggerUser != null ? triggerUser.getAvatarUrl() : null;

        InteractionTriggerUserView triggerUserView = new InteractionTriggerUserView(
                event.getTriggerUserId(), nickname, avatarUrl);

        return new InteractionEventView(
                event.getId(),
                triggerUserView,
                event.getEventType(),
                event.getReferenceId(),
                event.getReferenceType(),
                event.getSummary(),
                event.getIsRead(),
                event.getCreatedAt().toString()
        );
    }
}
