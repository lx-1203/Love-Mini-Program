package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

/**
 * 视频通话记录实体，对应 video_calls 表。
 *
 * <p>记录一次视频通话的发起方、接收方、开始时间、结束时间、通话时长及通话状态。
 * 用于视频通话历史查询、统计分析与异常排查。</p>
 *
 * <p>状态流转：</p>
 * <ul>
 *   <li>RINGING：振铃中（发起方已发起，等待接收方接听）</li>
 *   <li>ONGOING：通话中（接收方已接听）</li>
 *   <li>ENDED：已结束（任一方主动挂断或超时）</li>
 *   <li>MISSED：未接听（发起后超时未接听）</li>
 *   <li>REJECTED：已拒绝（接收方拒绝接听）</li>
 * </ul>
 *
 * <p>说明：实际音视频流由 WebRTC + 信令服务器处理，本实体仅记录通话元信息。</p>
 */
@Entity
@Table(name = "video_calls", uniqueConstraints = {
        @UniqueConstraint(name = "uk_video_calls_room_id", columnNames = {"room_id"})
})
public class VideoCall {

    /** 主键 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 通话房间 ID（WebRTC 房间号，全局唯一） */
    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    /** 发起方用户 ID */
    @Column(name = "caller_id", nullable = false)
    private Long callerId;

    /** 接收方用户 ID */
    @Column(name = "callee_id", nullable = false)
    private Long calleeId;

    /** 通话状态：RINGING/ONGOING/ENDED/MISSED/REJECTED */
    @Column(name = "status", nullable = false, length = 16)
    private String status;

    /** 通话开始时间（接听时刻） */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /** 通话结束时间（挂断时刻） */
    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    /** 通话时长（秒），结束后填充 */
    @Column(name = "duration_sec")
    private Integer durationSec;

    /** 结束原因：CALLER_HANGUP/CALLEE_HANGUP/TIMEOUT/NETWORK_ERROR */
    @Column(name = "end_reason", length = 32)
    private String endReason;

    /** 创建时间 */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 更新时间 */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** 默认构造方法，JPA 要求 */
    public VideoCall() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public Long getCallerId() {
        return callerId;
    }

    public void setCallerId(Long callerId) {
        this.callerId = callerId;
    }

    public Long getCalleeId() {
        return calleeId;
    }

    public void setCalleeId(Long calleeId) {
        this.calleeId = calleeId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }

    public Integer getDurationSec() {
        return durationSec;
    }

    public void setDurationSec(Integer durationSec) {
        this.durationSec = durationSec;
    }

    public String getEndReason() {
        return endReason;
    }

    public void setEndReason(String endReason) {
        this.endReason = endReason;
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
