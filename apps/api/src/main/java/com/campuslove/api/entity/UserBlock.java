package com.campuslove.api.entity;

import com.campuslove.api.common.TimeZones;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 用户拉黑关系实体，对应 user_block 表（3-F 拉黑，Flyway V2026.08.10.0020）。
 *
 * <p>语义：</p>
 * <ul>
 *   <li>拉黑是单向关系：userId 拉黑 blockedUserId，不隐含反向</li>
 *   <li>幂等：(user_id, blocked_user_id) 唯一约束，重复拉黑不产生重复记录</li>
 *   <li>生效范围：
 *     <ul>
 *       <li>消息发送拦截（双向校验：我拉黑对方或对方拉黑我，均不可发消息）</li>
 *       <li>会话列表过滤被拉黑会话</li>
 *       <li>推荐/匹配候选排除拉黑双方</li>
 *     </ul>
 *   </li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "user_block", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_block_pair", columnNames = {"user_id", "blocked_user_id"})
})
public class UserBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 拉黑发起方用户 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 被拉黑用户 ID */
    @Column(name = "blocked_user_id", nullable = false)
    private Long blockedUserId;

    /** 拉黑时间 */

    @CreatedDate

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    /**
     * 乐观锁版本号（Task 2.1.1 数据一致性基础设施）。
     *
     * <p>由 JPA 自动维护，每次实体更新时 version 自增。
     * 并发更新冲突时抛出 {@link org.springframework.orm.ObjectOptimisticLockingFailureException}，
     * 由 GlobalExceptionHandler 转换为 HTTP 409 Conflict。</p>
     *
     * <p>初始值 0L，对应数据库列 {@code version BIGINT DEFAULT 0}（Flyway V2026.07.26.0003）。</p>
     */
    @Version
    @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long version = 0L;

    public UserBlock() {
    }

    /**
     * 便捷构造方法。
     *
     * @param userId        拉黑发起方用户 ID
     * @param blockedUserId 被拉黑用户 ID
     */
    public UserBlock(Long userId, Long blockedUserId) {
        this.userId = userId;
        this.blockedUserId = blockedUserId;
        this.createdAt = LocalDateTime.now(TimeZones.BUSINESS);
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

    public Long getBlockedUserId() {
        return blockedUserId;
    }

    public void setBlockedUserId(Long blockedUserId) {
        this.blockedUserId = blockedUserId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
