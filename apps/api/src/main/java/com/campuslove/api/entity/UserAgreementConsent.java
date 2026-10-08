package com.campuslove.api.entity;

import com.campuslove.api.common.TimeZones;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 协议同意留痕实体，对应 user_agreement_consent 表（2026-10-05 合规落库）。
 *
 * <p>记录用户对法律文本（用户协议/隐私政策，按版本号标识）的同意行为，
 * 满足「网络数据处理/个人信息保护」类合规对同意可追溯的要求：</p>
 * <ul>
 *   <li>REGISTER —— 注册时勾选同意（RealAuthService.registerUser 落库）</li>
   *   <li>PAYMENT —— 支付前确认（预留，未来支付链路写入）</li>
 *   <li>BACKFILL —— 存量用户回填（迁移 V2026.10.05.0003，以其注册时间作为 agreed_at）</li>
 * </ul>
 *
 * <p>语义唯一键 (user_id, legal_version, source)：同一用户对同一版本+来源只留一条，
 * 重复写入幂等跳过（服务层 existsBy 预检 + 唯一索引兜底）。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "user_agreement_consent")
public class UserAgreementConsent {

    /** 主键 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户 ID（外键 users.id） */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 同意的法律文本版本（如 v1.0.0，与 LegalTextProvider 当前版本对齐） */
    @Column(name = "legal_version", nullable = false, length = 32)
    private String legalVersion;

    /** 同意时间 */
    @CreatedDate
    @Column(name = "agreed_at", nullable = false, updatable = false)
    private LocalDateTime agreedAt;

    /** 同意时的客户端 IP（尽力记录，可空） */
    @Column(name = "ip", length = 64)
    private String ip;

    /** 同意来源：REGISTER / PAYMENT / BACKFILL */
    @Column(name = "source", nullable = false, length = 16)
    private String source;

    /** 默认构造函数，JPA 要求 */
    public UserAgreementConsent() {
    }

    /**
     * 持久化前自动设置同意时间（@PrePersist 而非 DB 默认值，避免方言差异）。
     */
    @PrePersist
    protected void onCreate() {
        if (this.agreedAt == null) {
            this.agreedAt = LocalDateTime.now(TimeZones.BUSINESS);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getLegalVersion() {
        return legalVersion;
    }

    public void setLegalVersion(String legalVersion) {
        this.legalVersion = legalVersion;
    }

    public LocalDateTime getAgreedAt() {
        return agreedAt;
    }

    public void setAgreedAt(LocalDateTime agreedAt) {
        this.agreedAt = agreedAt;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}
