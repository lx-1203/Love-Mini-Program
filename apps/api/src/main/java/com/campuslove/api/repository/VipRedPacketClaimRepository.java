package com.campuslove.api.repository;

import com.campuslove.api.entity.VipRedPacketClaim;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * VIP 红包领取记录 Repository。
 * <p>提供领取记录的持久化与查询能力，
 * 支持按红包 ID 查询所有领取记录、按红包+用户查询是否已领取。</p>
 */
public interface VipRedPacketClaimRepository extends JpaRepository<VipRedPacketClaim, Long> {

    /**
     * 按红包 ID 查询所有领取记录，按领取时间倒序。
     *
     * @param redPacketId 红包 ID
     * @return 领取记录列表
     */
    List<VipRedPacketClaim> findByRedPacketIdOrderByClaimedAtDesc(Long redPacketId);

    /**
     * 按红包 ID + 领取人 ID 查询领取记录。
     * <p>用于判断用户是否已领取该红包，避免重复领取。</p>
     *
     * @param redPacketId 红包 ID
     * @param claimerId   领取人用户 ID
     * @return 领取记录（可选）
     */
    Optional<VipRedPacketClaim> findByRedPacketIdAndClaimerId(Long redPacketId, Long claimerId);
}
