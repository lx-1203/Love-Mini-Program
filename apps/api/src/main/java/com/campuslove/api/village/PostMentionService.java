package com.campuslove.api.village;

import com.campuslove.api.chat.NotificationService;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.PostMention;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.PostMentionRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 发帖 @提及：落关系、审核通过后逐条发 mention 通知。
 */
@Profile("real")
@Service
public class PostMentionService {

    private static final Logger log = LoggerFactory.getLogger(PostMentionService.class);
    private static final int MAX_MENTIONS = 10;

    private final PostMentionRepository postMentionRepository;
    private final UserRepository userRepository;

    @Autowired(required = false)
    private NotificationService notificationService;

    public PostMentionService(PostMentionRepository postMentionRepository, UserRepository userRepository) {
        this.postMentionRepository = postMentionRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void saveMentions(Long postId, Long authorId, List<Long> mentionedUserIds) {
        if (postId == null || mentionedUserIds == null || mentionedUserIds.isEmpty()) {
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
                .collect(java.util.stream.Collectors.toSet());
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        for (Long id : limited) {
            if (!existingUsers.contains(id)) {
                continue;
            }
            PostMention mention = new PostMention();
            mention.setPostId(postId);
            mention.setMentionedUserId(id);
            mention.setNotified(false);
            mention.setCreatedAt(now);
            postMentionRepository.save(mention);
        }
    }

    /** 帖子审核通过后调用；已通知过的不重复发。 */
    @Transactional
    public void notifyMentions(Long postId, Long authorId) {
        if (postId == null || notificationService == null) {
            return;
        }
        List<PostMention> pending = postMentionRepository.findByPostIdAndNotifiedFalse(postId);
        for (PostMention mention : pending) {
            try {
                notificationService.createNotification(
                        mention.getMentionedUserId(), "mention", authorId, postId, "post");
                mention.setNotified(true);
                postMentionRepository.save(mention);
            } catch (RuntimeException e) {
                log.warn("发送 @提及通知失败 postId={} userId={}: {}", postId, mention.getMentionedUserId(), e.toString());
            }
        }
    }
}
