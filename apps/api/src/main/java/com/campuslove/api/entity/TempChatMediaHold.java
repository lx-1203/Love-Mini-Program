package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 临时会话媒体举报保留（2026-10-28）。
 * 命中的资产在 hold_until 之前不被保留期清理任务删除，仅后台可取证。
 */
@Entity
@Table(name = "temp_chat_media_holds")
public class TempChatMediaHold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "media_asset_id", nullable = false)
    private Long mediaAssetId;

    @Column(name = "session_uid", nullable = false, length = 64)
    private String sessionUid;

    @Column(name = "reason", length = 255)
    private String reason;

    @Column(name = "hold_until", nullable = false)
    private LocalDateTime holdUntil;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public TempChatMediaHold() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getMediaAssetId() {
        return mediaAssetId;
    }

    public void setMediaAssetId(Long mediaAssetId) {
        this.mediaAssetId = mediaAssetId;
    }

    public String getSessionUid() {
        return sessionUid;
    }

    public void setSessionUid(String sessionUid) {
        this.sessionUid = sessionUid;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public LocalDateTime getHoldUntil() {
        return holdUntil;
    }

    public void setHoldUntil(LocalDateTime holdUntil) {
        this.holdUntil = holdUntil;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
