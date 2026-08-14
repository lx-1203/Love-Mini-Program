package com.campuslove.api.verification;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 恋爱认证申请 Repository。
 * 提供基于用户 ID 的查询能力（每用户一条申请记录）。
 */
public interface LoveVerificationApplicationRepository extends JpaRepository<LoveVerificationApplication, Long> {

    /**
     * 根据用户 ID 查询认证申请记录。
     *
     * @param userId 用户 ID
     * @return 申请记录（Optional，未提交过为 empty）
     */
    Optional<LoveVerificationApplication> findByUserId(Long userId);
}
