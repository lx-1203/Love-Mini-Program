package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

/**
 * 第三方账号实体（功能2：登录第三方账号）。
 *
 * <p>用于记录用户与第三方平台（微信 / Apple）账号的绑定关系，
 * 支持通过第三方账号直接登录或绑定后切换登录方式。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>id：主键，自增</li>
 *   <li>userId：本系统用户 ID（关联 users.id）</li>
 *   <li>provider：第三方平台标识，取值 WECHAT / APPLE</li>
 *   <li>openId：第三方平台的 openId（微信 openId 或 Apple Sub Identifier）</li>
 *   <li>unionId：第三方平台的 unionId（仅微信有，Apple 为 null）</li>
 *   <li>createdAt：绑定时间</li>
 * </ul>
 *
 * <p>唯一约束：(provider, openId) 唯一，避免同一第三方账号绑定多个本系统用户。</p>
 */
@Entity
@Table(
    name = "third_party_account",
    indexes = {
        @Index(name = "idx_third_party_user_id", columnList = "user_id"),
        @Index(name = "idx_third_party_union_id", columnList = "union_id"),
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_third_party_provider_open_id", columnNames = {"provider", "open_id"})
    }
)
public class ThirdPartyAccount {

    /** 主键 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 本系统用户 ID（关联 users.id） */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * 第三方平台标识。
     * 取值：WECHAT（微信）、APPLE（Apple ID）。
     */
    @Column(name = "provider", length = 16, nullable = false)
    private String provider;

    /**
     * 第三方平台的 openId。
     * - WECHAT：微信 openId（每个小程序下唯一）
     * - APPLE：Apple Sub Identifier（开发者账号下唯一）
     */
    @Column(name = "open_id", length = 128, nullable = false)
    private String openId;

    /**
     * 第三方平台的 unionId。
     * - WECHAT：微信 unionId（同一开发者账号下唯一，可空）
     * - APPLE：始终为 null
     */
    @Column(name = "union_id", length = 128)
    private String unionId;

    /** 绑定时间 */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ThirdPartyAccount() {
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

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getOpenId() {
        return openId;
    }

    public void setOpenId(String openId) {
        this.openId = openId;
    }

    public String getUnionId() {
        return unionId;
    }

    public void setUnionId(String unionId) {
        this.unionId = unionId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
