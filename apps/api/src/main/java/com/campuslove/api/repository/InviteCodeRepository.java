package com.campuslove.api.repository;

import com.campuslove.api.entity.InviteCode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 邀请码 Repository（3-K 邀请奖励）。
 */
public interface InviteCodeRepository extends JpaRepository<InviteCode, Long> {

    /**
     * 按用户查询邀请码（每人至多一个）。
     *
     * @param userId 用户 ID
     * @return 邀请码记录（可能为空）
     */
    Optional<InviteCode> findByUserId(Long userId);

    /**
     * 按邀请码查询（全局唯一）。
     *
     * @param code 邀请码
     * @return 邀请码记录（可能为空）
     */
    Optional<InviteCode> findByCode(String code);

    /**
     * 邀请码是否已被占用（生成去重）。
     *
     * @param code 邀请码
     * @return 是否已存在
     */
    boolean existsByCode(String code);
}
