package com.campuslove.api.profile;

import com.campuslove.api.chat.InteractionEventService;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Notification.NotificationType;
import com.campuslove.api.entity.Notification.ReferenceType;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserFollow;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.user.FollowView;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 用户关注关系服务（Task 4.2.4 拆分，Task 4.2 进一步抽取）。
 *
 * <p>职责：</p>
 * <ul>
 *   <li>{@link #followUser}：创建关注关系，更新双方计数，触发通知与互动事件</li>
 *   <li>{@link #unfollowUser}：删除关注关系，回退双方计数（不低于 0）</li>
 * </ul>
 *
 * <p>从 {@link ProfileUpdateService} 抽离，避免个人资料更新类承担过多社交关系维护职责。
 * 关注/取关均为写操作，使用 {@code @Transactional} 保证事务一致性。</p>
 */
@Profile("real")
@Component
public class FollowService {

    private static final Logger log = LoggerFactory.getLogger(FollowService.class);

    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;
    private final NotificationRepository notificationRepository;
    private final InteractionEventService interactionEventService;

    public FollowService(
            UserRepository userRepository,
            UserFollowRepository userFollowRepository,
            NotificationRepository notificationRepository,
            InteractionEventService interactionEventService) {
        this.userRepository = userRepository;
        this.userFollowRepository = userFollowRepository;
        this.notificationRepository = notificationRepository;
        this.interactionEventService = interactionEventService;
    }

    /**
     * 关注用户。
     * 创建关注关系，更新双方 followingCount/followersCount，并触发通知与互动事件。
     */
    @Transactional
    public FollowView followUser(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId 和 targetUserId 不能为空");
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException("不能关注自己");
        }

        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("关注者用户不存在: " + userId));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("目标用户不存在: " + targetUserId));

        if (userFollowRepository.existsByFollowerIdAndFollowingId(userId, targetUserId)) {
            throw new IllegalArgumentException("已经关注了该用户");
        }

        LocalDateTime now = LocalDateTime.now();
        UserFollow userFollow = new UserFollow(userId, targetUserId);
        userFollow.setCreatedAt(now);
        userFollowRepository.save(userFollow);

        follower.setFollowingCount(follower.getFollowingCount() + 1);
        follower.setUpdatedAt(now);
        userRepository.save(follower);

        target.setFollowersCount(target.getFollowersCount() + 1);
        target.setUpdatedAt(now);
        userRepository.save(target);

        Notification notification = new Notification();
        notification.setUserId(targetUserId);
        notification.setType(NotificationType.follow);
        notification.setSourceUserId(userId);
        notification.setReferenceId(userId);
        notification.setReferenceType(ReferenceType.user);
        notification.setIsRead(false);
        notification.setCreatedAt(now);
        notificationRepository.save(notification);

        interactionEventService.recordEvent(
                targetUserId, userId, "NEW_FOLLOW", userId, "USER",
                "有人关注了你"
        );

        log.debug("用户 {} 关注了用户 {}", userId, targetUserId);
        return new FollowView(true, userId, targetUserId,
                follower.getFollowingCount(), target.getFollowersCount());
    }

    /**
     * 取消关注用户。
     * 删除关注关系，更新双方 followingCount/followersCount（不低于 0）。
     */
    @Transactional
    public FollowView unfollowUser(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId 和 targetUserId 不能为空");
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException("不能取消关注自己");
        }

        if (!userFollowRepository.existsByFollowerIdAndFollowingId(userId, targetUserId)) {
            throw new IllegalArgumentException("未关注该用户，无法取关");
        }

        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("关注者用户不存在: " + userId));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("目标用户不存在: " + targetUserId));

        userFollowRepository.deleteByFollowerIdAndFollowingId(userId, targetUserId);

        LocalDateTime now = LocalDateTime.now();
        follower.setFollowingCount(Math.max(0, follower.getFollowingCount() - 1));
        follower.setUpdatedAt(now);
        userRepository.save(follower);

        target.setFollowersCount(Math.max(0, target.getFollowersCount() - 1));
        target.setUpdatedAt(now);
        userRepository.save(target);

        log.debug("用户 {} 取消关注了用户 {}", userId, targetUserId);
        return new FollowView(false, userId, targetUserId,
                follower.getFollowingCount(), target.getFollowersCount());
    }
}
