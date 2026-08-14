package com.campuslove.api.block;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.config.DisplayConstants;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBlock;
import com.campuslove.api.repository.UserBlockRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实拉黑服务实现（3-F 拉黑，real profile）。
 *
 * <p>使用 Repository 持久化拉黑关系；列表批量预加载对方用户信息避免 N+1
 * （与 RealPrivateMessageService 的 batchLoadUsers 同模式）。</p>
 */
@Profile("real")
@Service
public class RealBlockService implements BlockService {

    private static final Logger log = LoggerFactory.getLogger(RealBlockService.class);

    private final UserBlockRepository blockRepository;
    private final UserRepository userRepository;

    public RealBlockService(UserBlockRepository blockRepository, UserRepository userRepository) {
        this.blockRepository = blockRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void block(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId and targetUserId are required");
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException(ErrorMessages.CANNOT_BLOCK_SELF);
        }
        if (!userRepository.existsById(targetUserId)) {
            throw new IllegalArgumentException("User not found: " + targetUserId);
        }

        // 幂等：已拉黑则直接返回，不产生重复记录（(user_id, blocked_user_id) 唯一约束兜底）
        if (blockRepository.existsByUserIdAndBlockedUserId(userId, targetUserId)) {
            log.info("重复拉黑，幂等返回：userId={}, blockedUserId={}", userId, targetUserId);
            return;
        }

        UserBlock block = new UserBlock(userId, targetUserId);
        blockRepository.save(block);
        log.info("用户拉黑成功：userId={}, blockedUserId={}", userId, targetUserId);
    }

    @Override
    @Transactional
    public void unblock(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId and targetUserId are required");
        }
        // 幂等：不存在拉黑记录时影响 0 行，无操作
        long removed = blockRepository.deleteByUserIdAndBlockedUserId(userId, targetUserId);
        if (removed > 0) {
            log.info("用户解除拉黑：userId={}, blockedUserId={}", userId, targetUserId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlockedUserView> getBlockedUsers(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        List<UserBlock> blocks = blockRepository.findByUserIdOrderByCreatedAtDesc(userId);

        // 批量预加载被拉黑用户信息，避免循环中触发 N+1 查询
        List<Long> blockedUserIds = blocks.stream()
                .map(UserBlock::getBlockedUserId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        Map<Long, User> userMap = batchLoadUsers(blockedUserIds);

        return blocks.stream()
                .map(b -> {
                    User u = userMap.get(b.getBlockedUserId());
                    String nickname = u != null ? u.getNickname() : DisplayConstants.UNKNOWN_USER;
                    String avatar = u != null ? u.getAvatarUrl() : null;
                    String blockedAt = b.getCreatedAt() != null ? b.getCreatedAt().toString() : null;
                    return new BlockedUserView(b.getBlockedUserId(), nickname, avatar, blockedAt);
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isBlockedBetween(Long userId, Long otherId) {
        if (userId == null || otherId == null) {
            return false;
        }
        return blockRepository.existsBlockedBetween(userId, otherId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Long> getBlockedRelationUserIds(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return blockRepository.findBlockedRelationUserIds(userId);
    }

    /**
     * 批量查询用户信息，避免 N+1 查询（同 RealPrivateMessageService 模式）。
     */
    private Map<Long, User> batchLoadUsers(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }
}
