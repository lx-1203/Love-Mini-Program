package com.campuslove.api.wallet;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 商业化解锁记录 Repository（P0-17）。
 *
 * <p>提供按用户+目标类型查询解锁记录的能力，供解锁校验与列表 unlocked 状态标记使用。</p>
 */
public interface WalletUnlockRepository extends JpaRepository<WalletUnlock, Long> {

    /**
     * 查询用户对指定目标类型+目标 ID 的解锁记录。
     *
     * @param userId     解锁用户 ID
     * @param targetType 解锁目标类型（LIKED_ME / VISITOR）
     * @param targetId   解锁目标 ID
     * @return 解锁记录（可能为空）
     */
    Optional<WalletUnlock> findByUserIdAndTargetTypeAndTargetId(
            Long userId, String targetType, Long targetId);

    /**
     * 批量查询用户对指定目标类型下多个目标 ID 的解锁记录。
     *
     * @param userId     解锁用户 ID
     * @param targetType 解锁目标类型（LIKED_ME / VISITOR）
     * @param targetIds  目标 ID 集合
     * @return 已解锁的目标 ID 列表
     */
    List<WalletUnlock> findByUserIdAndTargetTypeAndTargetIdIn(
            Long userId, String targetType, Collection<Long> targetIds);
}
