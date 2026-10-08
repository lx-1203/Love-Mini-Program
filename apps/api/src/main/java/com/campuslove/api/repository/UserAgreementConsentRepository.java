package com.campuslove.api.repository;

import com.campuslove.api.entity.UserAgreementConsent;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 协议同意留痕仓库（2026-10-05 合规落库，任务 9）。
 *
 * <p>对应 user_agreement_consent 表，语义唯一键 (user_id, legal_version, source)，
 * 重复同意（同用户+同版本+同来源）幂等跳过。</p>
 */
public interface UserAgreementConsentRepository
        extends JpaRepository<UserAgreementConsent, Long> {

    /**
     * 判断某用户对指定版本+来源是否已留痕（幂等预检）。
     *
     * @param userId       用户 ID
     * @param legalVersion 法律文本版本（如 v1.0.0）
     * @param source       同意来源（REGISTER/PAYMENT/BACKFILL）
     * @return true 表示已存在留痕记录
     */
    boolean existsByUserIdAndLegalVersionAndSource(Long userId, String legalVersion, String source);
}
