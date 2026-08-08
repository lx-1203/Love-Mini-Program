package com.campuslove.api.profile;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
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
import org.springframework.dao.DataIntegrityViolationException;
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
            throw new IllegalArgumentException(ErrorMessages.USER_AND_TARGET_USER_ID_REQUIRED);
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException(ErrorMessages.CANNOT_FOLLOW_SELF);
        }

        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.FOLLOWER_USER_NOT_FOUND_PREFIX + userId));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.TARGET_USER_NOT_FOUND_PREFIX + targetUserId));

        if (userFollowRepository.existsByFollowerIdAndFollowingId(userId, targetUserId)) {
            throw new IllegalArgumentException(ErrorMessages.ALREADY_FOLLOWING);
        }

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        UserFollow userFollow = new UserFollow(userId, targetUserId);
        userFollow.setCreatedAt(now);
        try {
            userFollowRepository.save(userFollow);
        } catch (DataIntegrityViolationException ex) {
            // R4-00295：并发重复关注（不同幂等键绕过 existsBy 检查）触发唯一约束冲突时，
            // 转换为业务异常而非 500
            log.warn("并发重复关注唯一约束冲突: followerId={}, followingId={}: {}",
                    userId, targetUserId, ex.getMessage());
            throw new IllegalArgumentException(ErrorMessages.ALREADY_FOLLOWING);
        }

        // infra R2-00263: 关注/粉丝计数改为数据库侧原子递增（消除并发丢失更新）；
        // 不再修改 managed 实体计数，避免事务提交时 flush 用陈旧值覆盖原子结果
        userRepository.incrementFollowingCount(userId, now);
        userRepository.incrementFollowersCount(targetUserId, now);
        // R4-00296：返回 DB 原子递增后的最新计数（实体陈旧值 +1 与 DB 可能不一致；
        // 投影查询执行前自动 flush，读到的是递增后的真实值）
        Integer followingCount = userRepository.findFollowingCountById(userId);
        Integer followersCount = userRepository.findFollowersCountById(targetUserId);

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
                followingCount, followersCount);
    }

    /**
     * 取消关注用户。
     * 删除关注关系，更新双方 followingCount/followersCount（不低于 0）。
     */
    @Transactional
    public FollowView unfollowUser(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_AND_TARGET_USER_ID_REQUIRED);
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException(ErrorMessages.CANNOT_UNFOLLOW_SELF);
        }

        if (!userFollowRepository.existsByFollowerIdAndFollowingId(userId, targetUserId)) {
            throw new IllegalArgumentException(ErrorMessages.NOT_FOLLOWING);
        }

        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.FOLLOWER_USER_NOT_FOUND_PREFIX + userId));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessages.TARGET_USER_NOT_FOUND_PREFIX + targetUserId));

        userFollowRepository.deleteByFollowerIdAndFollowingId(userId, targetUserId);

        // infra R2-00263: 计数改为数据库侧原子递减（下限 0），不修改 managed 实体避免脏写覆盖
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        userRepository.decrementFollowingCount(userId, now);
        userRepository.decrementFollowersCount(targetUserId, now);
        Integer followingCount = follower.getFollowingCount() == null
                ? 0 : Math.max(0, follower.getFollowingCount() - 1);
        Integer followersCount = target.getFollowersCount() == null
                ? 0 : Math.max(0, target.getFollowersCount() - 1);

        log.debug("用户 {} 取消关注了用户 {}", userId, targetUserId);
        return new FollowView(false, userId, targetUserId,
                followingCount, followersCount);
    }
}
