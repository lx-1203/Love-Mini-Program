package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 用户在线状态实体，对应 user_online_status 表。
 * 记录用户心跳时间、在线状态和设备类型，用于在线状态感知功能。
 */
@Entity
@Table(name = "user_online_status")
public class UserOnlineStatus {

    /** 在线状态枚举 */
    public enum OnlineStatus {
        online, away, offline
    }

    /** 用户 ID（主键，与 users 表关联） */
    @Id
    @Column(name = "user_id")
    private Long userId;

    /** 最后心跳时间 */
    @Column(name = "last_heartbeat", nullable = false)
    private LocalDateTime lastHeartbeat;

    /** 在线状态: online / away / offline */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('online','away','offline') DEFAULT 'offline'")
    private OnlineStatus status = OnlineStatus.offline;

    /** 设备类型（如 android / ios / web） */
    @Column(name = "device_type", length = 20)
    private String deviceType;

    /** 更新时间 */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public UserOnlineStatus() {
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public LocalDateTime getLastHeartbeat() {
        return lastHeartbeat;
    }

    public void setLastHeartbeat(LocalDateTime lastHeartbeat) {
        this.lastHeartbeat = lastHeartbeat;
    }

    public OnlineStatus getStatus() {
        return status;
    }

    public void setStatus(OnlineStatus status) {
        this.status = status;
    }

    public String getDeviceType() {
        return deviceType;
    }

    public void setDeviceType(String deviceType) {
        this.deviceType = deviceType;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
