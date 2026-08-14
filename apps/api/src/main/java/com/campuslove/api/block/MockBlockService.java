package com.campuslove.api.block;

import com.campuslove.api.common.ErrorMessages;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 拉黑服务实现（@Profile("mock")）。
 *
 * <p>展示版（showcase）与本地开发在 mock profile 下运行：无数据库，本实现用内存
 * {@link ConcurrentHashMap} 模拟拉黑关系，使 /api/v1/users/{id}/block 端点可用，
 * 且拉黑判定（isBlockedBetween / getBlockedRelationUserIds）与 real 行为一致，
 * 供 mock 模式的会话过滤 / 消息拦截链路复用。</p>
 *
 * <p>与 {@link RealBlockService} 行为对齐：</p>
 * <ul>
 *   <li>拉黑幂等：重复拉黑同一用户直接返回</li>
 *   <li>解除幂等：未拉黑时解除无操作</li>
 *   <li>不能拉黑自己：抛 IllegalArgumentException</li>
 * </ul>
 */
@Profile("mock")
@Service
public class MockBlockService implements BlockService {

    /** 拉黑关系：userId -> 被拉黑 userId 集合 */
    private final Map<Long, Set<Long>> blockMap = new ConcurrentHashMap<>();

    @Override
    public void block(Long userId, Long targetUserId) {
        if (userId == null || targetUserId == null) {
            throw new IllegalArgumentException("userId and targetUserId are required");
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalArgumentException(ErrorMessages.CANNOT_BLOCK_SELF);
        }
        blockMap.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>()).add(targetUserId);
    }

    @Override
    public void unblock(Long userId, Long targetUserId) {
        Set<Long> blocked = blockMap.get(userId);
        if (blocked != null) {
            blocked.remove(targetUserId);
        }
    }

    @Override
    public List<BlockedUserView> getBlockedUsers(Long userId) {
        Set<Long> blocked = blockMap.getOrDefault(userId, Set.of());
        String now = LocalDateTime.now().toString();
        return blocked.stream()
                .map(id -> new BlockedUserView(id, "Mock用户" + id, null, now))
                .sorted((a, b) -> b.blockedAt().compareTo(a.blockedAt()))
                .toList();
    }

    @Override
    public boolean isBlockedBetween(Long userId, Long otherId) {
        if (userId == null || otherId == null) {
            return false;
        }
        Set<Long> mine = blockMap.getOrDefault(userId, Set.of());
        Set<Long> theirs = blockMap.getOrDefault(otherId, Set.of());
        return mine.contains(otherId) || theirs.contains(userId);
    }

    @Override
    public List<Long> getBlockedRelationUserIds(Long userId) {
        Set<Long> result = new CopyOnWriteArraySet<>(blockMap.getOrDefault(userId, Set.of()));
        blockMap.forEach((k, v) -> {
            if (v.contains(userId)) {
                result.add(k);
            }
        });
        return result.stream().collect(Collectors.toList());
    }
}
