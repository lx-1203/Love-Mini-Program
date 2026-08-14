package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 用户邀请码实体，对应 invite_code 表（3-K 邀请奖励，Flyway V2026.08.10.0025）。
 *
 * <p>语义：每个用户至多一个邀请码（uk_invite_code_user），code 全局唯一；
 * 生成幂等：已存在邀请码时直接返回。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "invite_code", uniqueConstraints = {
        @UniqueConstraint(name = "uk_invite_code_code", columnNames = {"code"}),
        @UniqueConstraint(name = "uk_invite_code_user", columnNames = {"user_id"})
})
public class InviteCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 邀请人用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 邀请码（全局唯一） */
    @Column(name = "code", nullable = false, length = 16)
    private String code;

    /** 创建时间 */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public InviteCode() {
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

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
