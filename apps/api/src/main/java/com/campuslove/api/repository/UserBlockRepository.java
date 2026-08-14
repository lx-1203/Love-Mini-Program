package com.campuslove.api.repository;

import com.campuslove.api.entity.UserBlock;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 用户拉黑关系 Repository（3-F 拉黑）。
 */
public interface UserBlockRepository extends JpaRepository<UserBlock, Long> {

    /**
     * 按（拉黑方, 被拉黑方）查询拉黑记录。
     *
     * @param userId        拉黑发起方用户 ID
     * @param blockedUserId 被拉黑用户 ID
     * @return 拉黑记录（可能为空）
     */
    Optional<UserBlock> findByUserIdAndBlockedUserId(Long userId, Long blockedUserId);

    /**
     * 判断两个用户之间是否存在拉黑记录（单向：userId 拉黑 blockedUserId）。
     *
     * @param userId        拉黑发起方用户 ID
     * @param blockedUserId 被拉黑用户 ID
     * @return 是否存在
     */
    boolean existsByUserIdAndBlockedUserId(Long userId, Long blockedUserId);

    /**
     * 判断两个用户之间是否「任一方拉黑了另一方」（双向校验）。
     *
     * <p>用于消息发送拦截：我拉黑对方或对方拉黑我，均不可发送消息。</p>
     *
     * @param userId  用户 A ID
     * @param otherId 用户 B ID
     * @return 任一方拉黑另一方时为 true
     */
    @Query("SELECT COUNT(b) > 0 FROM UserBlock b "
            + "WHERE (b.userId = :userId AND b.blockedUserId = :otherId) "
            + "   OR (b.userId = :otherId AND b.blockedUserId = :userId)")
    boolean existsBlockedBetween(@Param("userId") Long userId, @Param("otherId") Long otherId);

    /**
     * 查询用户的被拉黑用户列表（按拉黑时间倒序）。
     *
     * @param userId 拉黑发起方用户 ID
     * @return 被拉黑用户 ID 列表（不含空）
     */
    List<UserBlock> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 查询与当前用户存在拉黑关系的全部对方用户 ID（双向，去重）。
     *
     * <p>用于会话列表过滤与推荐/匹配排除：返回「我拉黑的 + 拉黑我的」并集。</p>
     *
     * @param userId 当前用户 ID
     * @return 存在拉黑关系的对方用户 ID 列表
     */
    @Query("SELECT DISTINCT CASE WHEN b.userId = :userId THEN b.blockedUserId ELSE b.userId END "
            + "FROM UserBlock b WHERE b.userId = :userId OR b.blockedUserId = :userId")
    List<Long> findBlockedRelationUserIds(@Param("userId") Long userId);

    /**
     * 解除拉黑（幂等：不存在则影响 0 行）。
     *
     * @param userId        拉黑发起方用户 ID
     * @param blockedUserId 被拉黑用户 ID
     * @return 删除的行数
     */
    long deleteByUserIdAndBlockedUserId(Long userId, Long blockedUserId);
}
