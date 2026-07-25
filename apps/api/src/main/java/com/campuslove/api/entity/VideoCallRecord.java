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
 * 视频通话记录实体（聊天视频通话历史专用），对应 video_call_records 表。
 *
 * <p>与 {@link VideoCall} 区别：
 * <ul>
 *   <li>{@code VideoCall}：通话进行中的实时状态表，状态为 RINGING/ONGOING/ENDED/MISSED/REJECTED</li>
 *   <li>{@code VideoCallRecord}：通话历史记录表，状态为 INITIATING/CONNECTED/MISSED/REJECTED/FAILED，
 *       用于前端"通话记录"列表展示与统计</li>
 * </ul>
 * </p>
 *
 * <p>状态流转：</p>
 * <ul>
 *   <li>INITIATING：发起中（发起方已发起，等待对方接听）</li>
 *   <li>CONNECTED：已接通（双方建立连接，通话中或已正常结束）</li>
 *   <li>MISSED：未接听（发起后超时未接听）</li>
 *   <li>REJECTED：已拒绝（接收方主动拒绝）</li>
 *   <li>FAILED：失败（网络异常或信令错误）</li>
 * </ul>
 *
 * <p>字段说明：
 * <ul>
 *   <li>{@code callerId}：发起方用户 ID</li>
 *   <li>{@code receiverId}：接收方用户 ID</li>
 *   <li>{@code startTime}：通话开始时间（发起时刻）</li>
 *   <li>{@code endTime}：通话结束时间（挂断/拒绝/超时时刻）</li>
 *   <li>{@code duration}：通话时长（秒），仅 CONNECTED 状态下有意义</li>
 *   <li>{@code status}：通话状态枚举字符串</li>
 * </ul>
 * </p>
 */
@Entity
@Table(name = "video_call_records", uniqueConstraints = {
        @UniqueConstraint(name = "uk_video_call_records_room_id", columnNames = {"room_id"})
})
public class VideoCallRecord {

    /** 主键 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 通话房间 ID（与 VideoCall.roomId 关联） */
    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    /** 发起方用户 ID */
    @Column(name = "caller_id", nullable = false)
    private Long callerId;

    /** 接收方用户 ID */
    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    /** 通话开始时间（发起时刻） */
    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    /** 通话结束时间（挂断/拒绝/超时时刻） */
    @Column(name = "end_time")
    private LocalDateTime endTime;

    /** 通话时长（秒），仅 CONNECTED 状态下有意义 */
    @Column(name = "duration")
    private Integer duration;

    /** 通话状态：INITIATING/CONNECTED/MISSED/REJECTED/FAILED */
    @Column(name = "status", nullable = false, length = 16)
    private String status;

    /** 创建时间 */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 更新时间 */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** 默认构造方法，JPA 要求 */
    public VideoCallRecord() {
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

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public Integer getDuration() {
        return duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
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
