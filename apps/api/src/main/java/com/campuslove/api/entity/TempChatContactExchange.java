package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 临时聊天联系交换实体，对应 temp_chat_contact_exchange 表。
 * 关联 TempChatSession，记录双方联系交换的状态流转。
 * 状态: idle(未发起) / accepted-by-self(自己已同意) / accepted-by-peer(对方已同意) / completed(双方同意) / rejected(已拒绝)。
 */
@Entity
@Table(name = "temp_chat_contact_exchange")
public class TempChatContactExchange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 所属会话 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, unique = true, foreignKey = @jakarta.persistence.ForeignKey(name = "fk_temp_chat_contact_exchange_session"))
    private TempChatSession session;

    /** 发起交换请求的用户标识: self / peer */
    @Column(name = "proposer", length = 16)
    private String proposer;

    /** 交换状态: idle / accepted-by-self / accepted-by-peer / completed / rejected */
    @Column(name = "status", nullable = false, length = 32)
    private String status = "idle";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public TempChatContactExchange() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TempChatSession getSession() {
        return session;
    }

    public void setSession(TempChatSession session) {
        this.session = session;
    }

    public String getProposer() {
        return proposer;
    }

    public void setProposer(String proposer) {
        this.proposer = proposer;
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
}
