package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;

/**
 * VIP 红包实体，对应 vip_red_packets 表。
 * <p>支持普通红包（等额）与拼手气红包（随机金额）两种类型，
 * 可关联聊天会话用于"聊天红包"场景，也可作为独立 VIP 红包发送。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>senderId：发送者用户 ID</li>
 *   <li>totalAmount：红包总金额（单位：分，避免浮点精度问题）</li>
 *   <li>totalCount：红包总个数</li>
 *   <li>claimedCount：已被领取的个数（冗余字段，便于列表展示）</li>
 *   <li>claimedAmount：已被领取的金额（冗余字段）</li>
 *   <li>type：红包类型 NORMAL(普通) / LUCKY(拼手气)</li>
 *   <li>chatId：关联的聊天会话 ID（可选，用于聊天红包场景）</li>
 *   <li>blessing：祝福语</li>
 *   <li>expireAt：过期时间，过期后不可领取</li>
 *   <li>status：状态 PENDING(可领取) / EXPIRED(已过期) / DEPLETED(已领完)</li>
 * </ul>
 */
@Entity
@Table(name = "vip_red_packets")
public class VipRedPacket {

    /** 红包类型枚举 */
    public enum RedPacketType {
        /** 普通红包：每个领取金额相等 */
        NORMAL,
        /** 拼手气红包：随机金额分配 */
        LUCKY
    }

    /** 红包状态枚举 */
    public enum RedPacketStatus {
        /** 可领取 */
        PENDING,
        /** 已过期 */
        EXPIRED,
        /** 已领完 */
        DEPLETED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 发送者用户 ID */
    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    /** 红包总金额（单位：分） */
    @Column(name = "total_amount", nullable = false)
    private Integer totalAmount;

    /** 红包总个数 */
    @Column(name = "total_count", nullable = false)
    private Integer totalCount;

    /** 已领取个数 */
    @Column(name = "claimed_count", nullable = false)
    private Integer claimedCount = 0;

    /** 已领取金额（单位：分） */
    @Column(name = "claimed_amount", nullable = false)
    private Integer claimedAmount = 0;

    /** 红包类型 */
    @Column(name = "type", nullable = false, length = 16)
    private String type = "NORMAL";

    /** 关联的聊天会话 ID（可选，用于聊天红包场景） */
    @Column(name = "chat_id")
    private String chatId;

    /** 祝福语 */
    @Column(name = "blessing", length = 200)
    private String blessing;

    /** 过期时间 */
    @Column(name = "expire_at", nullable = false)
    private LocalDateTime expireAt;

    /** 状态 */
    @Column(name = "status", nullable = false, length = 16)
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
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


    public VipRedPacket() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public Integer getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Integer totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Integer getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(Integer totalCount) {
        this.totalCount = totalCount;
    }

    public Integer getClaimedCount() {
        return claimedCount;
    }

    public void setClaimedCount(Integer claimedCount) {
        this.claimedCount = claimedCount;
    }

    public Integer getClaimedAmount() {
        return claimedAmount;
    }

    public void setClaimedAmount(Integer claimedAmount) {
        this.claimedAmount = claimedAmount;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getChatId() {
        return chatId;
    }

    public void setChatId(String chatId) {
        this.chatId = chatId;
    }

    public String getBlessing() {
        return blessing;
    }

    public void setBlessing(String blessing) {
        this.blessing = blessing;
    }

    public LocalDateTime getExpireAt() {
        return expireAt;
    }

    public void setExpireAt(LocalDateTime expireAt) {
        this.expireAt = expireAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
