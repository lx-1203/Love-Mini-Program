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

    /**
     * 查询某用户的全部协议同意留痕（按同意时间升序）。
     *
     * <p>S2-5（2026-10-30）：用户侧「查阅、复制自己的个人信息」端点需要列出同意记录本身，
     * 仅有 {@link #existsByUserIdAndLegalVersionAndSource} 的布尔判定不足以履行查阅权。
     * 派生查询按 {@code user_id} 等值过滤——userId 传 null 时条件恒不成立（返回空列表），
     * 不会退化成全表读取。</p>
     *
     * @param userId 用户 ID
     * @return 同意留痕列表（无记录时为空列表）
     */
    java.util.List<UserAgreementConsent> findByUserIdOrderByAgreedAtAsc(Long userId);
}
