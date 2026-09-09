package com.campuslove.api.repository;

import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 用户喜欢记录 Repository。
 * 提供基于用户对和状态的查询方法。
 */
public interface LikeRepository extends JpaRepository<Like, Long> {

    /**
     * 根据发起者和目标用户查询喜欢记录。
     *
     * @param userId       发起喜欢的用户 ID
     * @param targetUserId 被喜欢的用户 ID
     * @return 匹配的喜欢记录（可能为空）
     */
    Optional<Like> findByUserIdAndTargetUserId(Long userId, Long targetUserId);

    /**
     * 统计被喜欢的次数。
     *
     * @param targetUserId 被喜欢的用户 ID
     * @return 被喜欢次数
     */
    long countByTargetUserId(Long targetUserId);

    /**
     * 根据目标用户和状态统计被喜欢的次数。
     *
     * @param targetUserId 被喜欢的用户 ID
     * @param status       喜欢状态
     * @return 被喜欢次数
     */
    long countByTargetUserIdAndStatus(Long targetUserId, LikeStatus status);

    /**
     * 根据目标用户和状态查询喜欢记录。
     *
     * @param targetUserId 被喜欢的用户 ID
     * @param status       喜欢状态
     * @return 匹配的喜欢记录列表
     */
    List<Like> findByTargetUserIdAndStatus(Long targetUserId, LikeStatus status);

    /**
     * 根据发起用户和状态查询喜欢记录（用于获取我喜欢的列表）。
     *
     * @param userId 发起喜欢的用户 ID
     * @param status 喜欢状态
     * @return 匹配的喜欢记录列表
     */
    List<Like> findByUserIdAndStatus(Long userId, LikeStatus status);

    /**
     * 根据发起用户和状态查询所有被喜欢的目标用户 ID 列表。
     *
     * @param userId 发起喜欢的用户 ID
     * @param status 喜欢状态
     * @return 被喜欢的目标用户 ID 列表
     */
    List<Like> findByUserIdAndStatusIn(Long userId, List<LikeStatus> statuses);

    /**
     * R16（2026-09-07）：统计互赞数——我喜欢的目标用户里，有多少也 active 喜欢我。
     * 单条 COUNT 查询替代逐条 isMutualLike 的 N+1（他人主页 socialProof 性能修复）。
     *
     * @param targetUserId 我自己的用户 ID（作为对方的被喜欢方向）
     * @param userIds      我喜欢的目标用户 ID 集合
     * @param status       对方对我的喜欢状态（active）
     * @return 互赞数量
     */
    long countByTargetUserIdAndUserIdInAndStatus(Long targetUserId, java.util.Collection<Long> userIds,
                                                 LikeStatus status);
}
