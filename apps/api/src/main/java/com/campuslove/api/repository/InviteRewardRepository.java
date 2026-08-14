package com.campuslove.api.repository;

import com.campuslove.api.entity.InviteReward;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 邀请奖励 Repository（3-K 邀请奖励）。
 */
public interface InviteRewardRepository extends JpaRepository<InviteReward, Long> {

    /**
     * 按被邀请人查询奖励记录（每人至多一条，唯一约束兜底）。
     *
     * @param inviteeUserId 被邀请人用户 ID
     * @return 奖励记录（可能为空）
     */
    Optional<InviteReward> findByInviteeUserId(Long inviteeUserId);

    /**
     * 查询邀请人的全部奖励记录（按发放时间倒序）。
     *
     * @param inviterUserId 邀请人用户 ID
     * @return 奖励记录列表
     */
    List<InviteReward> findByInviterUserIdOrderByCreatedAtDesc(Long inviterUserId);
}
