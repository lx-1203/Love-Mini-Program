package com.campuslove.api.content;

import com.campuslove.api.chat.NotificationService;
import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.ContentMention;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.ContentMentionRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 内容 @ 提及统一服务（2026-10-28）：帖子 / 圈子话题 / 圈子回复。
 *
 * <p>落关系与发通知分离：帖子/话题先落 {@code notified=0}，审核通过后再通知；
 * 回复创建即通知。话题/回复只允许提及同圈成员，避免被提及人点开通知 404。</p>
 */
@Profile("real")
@Service
public class ContentMentionService {

    private static final Logger log = LoggerFactory.getLogger(ContentMentionService.class);
    private static final int MAX_MENTIONS = 10;

    private final ContentMentionRepository contentMentionRepository;
    private final UserRepository userRepository;
    private final CircleMembershipRepository circleMembershipRepository;

    @Autowired(required = false)
    private NotificationService notificationService;

    public ContentMentionService(ContentMentionRepository contentMentionRepository,
                                 UserRepository userRepository,
                                 CircleMembershipRepository circleMembershipRepository) {
        this.contentMentionRepository = contentMentionRepository;
        this.userRepository = userRepository;
        this.circleMembershipRepository = circleMembershipRepository;
    }

    /**
     * 保存提及关系（去重、排除自己、上限 10、校验用户存在与圈成员资格）。
     *
     * @param targetType 目标类型（post/topic/reply）
     * @param targetId   目标 ID
     * @param authorId   作者 ID（排除自己）
     * @param circleId   圈子 ID（null 表示帖子，不做圈成员校验）
     * @param mentionedUserIds 被提及人
     */
    @Transactional
    public void saveMentions(String targetType, Long targetId, Long authorId,
                             Long circleId, List<Long> mentionedUserIds) {
        if (targetId == null || mentionedUserIds == null || mentionedUserIds.isEmpty()) {
            return;
        }
        Set<Long> ids = new LinkedHashSet<>(mentionedUserIds);
        ids.remove(null);
        ids.remove(authorId);
        List<Long> limited = ids.stream().limit(MAX_MENTIONS).toList();
        if (limited.isEmpty()) {
            return;
        }
        Set<Long> existingUsers = userRepository.findAllById(limited).stream()
                .map(User::getId)
                .collect(Collectors.toSet());
        if (circleId != null) {
            Set<Long> members = new HashSet<>(circleMembershipRepository.findUserIdsByCircleId(circleId));
            boolean hasOutsider = limited.stream()
                    .anyMatch(id -> existingUsers.contains(id) && !members.contains(id));
            if (hasOutsider) {
                throw new IllegalArgumentException(ErrorMessages.CIRCLE_MENTION_MEMBER_ONLY);
            }
        }
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        for (Long id : limited) {
            if (!existingUsers.contains(id)) {
                continue;
            }
            if (contentMentionRepository.existsByTargetTypeAndTargetIdAndMentionedUserId(
                    targetType, targetId, id)) {
                continue;
            }
            ContentMention mention = new ContentMention();
            mention.setTargetType(targetType);
            mention.setTargetId(targetId);
            mention.setMentionedUserId(id);
            mention.setNotified(false);
            mention.setCreatedAt(now);
            contentMentionRepository.save(mention);
        }
    }

    /**
     * 发送未通知的提及（审核通过 / 回复创建后调用），已通知的不重复发。
     *
     * @param targetType    目标类型
     * @param targetId      目标 ID
     * @param authorId      触发通知的源用户
     * @param referenceType 通知引用类型（post/topic/comment）
     * @param referenceId   通知引用 ID（客户端跳转用）
     * @return 实际发出条数
     */
    @Transactional
    public int notifyMentions(String targetType, Long targetId, Long authorId,
                              String referenceType, Long referenceId) {
        if (targetId == null || notificationService == null) {
            return 0;
        }
        int sent = 0;
        List<ContentMention> pending =
                contentMentionRepository.findByTargetTypeAndTargetIdAndNotifiedFalse(targetType, targetId);
        for (ContentMention mention : pending) {
            try {
                notificationService.createNotification(
                        mention.getMentionedUserId(), "mention", authorId, referenceId, referenceType);
                mention.setNotified(true);
                contentMentionRepository.save(mention);
                sent += 1;
            } catch (RuntimeException e) {
                log.warn("发送 @提及通知失败 targetType={} targetId={} userId={}: {}",
                        targetType, targetId, mention.getMentionedUserId(), e.toString());
            }
        }
        return sent;
    }
}
