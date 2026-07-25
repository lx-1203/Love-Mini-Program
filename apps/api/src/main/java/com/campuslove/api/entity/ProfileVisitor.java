package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 个人主页访客记录实体，对应 profile_visitors 表。
 *
 * <p>功能3：记录用户主页被访问的历史，与既有 visitors 表语义相近，
 * 但按用户需求独立建表以隔离业务边界（visitors 表服务于匹配模块，
 * profile_visitors 表服务于个人主页"谁看过我"入口）。</p>
 *
 * <p>字段说明：
 * <ul>
 *   <li>visitorId：访客用户 ID</li>
 *   <li>hostId：被访问的主页用户 ID</li>
 *   <li>visitedAt：访问时间</li>
 * </ul>
 * </p>
 *
 * <p>唯一约束：同一访客对同一主页每天只记录一次访问，
 * 通过迁移脚本的 UNIQUE KEY (visitor_id, host_id, DATE(visited_at)) 实现。</p>
 */
@Entity
@Table(name = "profile_visitors")
public class ProfileVisitor {

    /** 主键 ID，自增 */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 访客用户 ID */
    @Column(name = "visitor_id", nullable = false)
    private Long visitorId;

    /** 被访主页用户 ID */
    @Column(name = "host_id", nullable = false)
    private Long hostId;

    /** 访问时间 */
    @Column(name = "visited_at", nullable = false)
    private LocalDateTime visitedAt;

    /** 默认构造函数，JPA 需要 */
    public ProfileVisitor() {
    }

    /**
     * 便捷构造函数，用于业务层快速创建实例。
     *
     * @param visitorId 访客用户 ID
     * @param hostId    被访主页用户 ID
     * @param visitedAt 访问时间
     */
    public ProfileVisitor(Long visitorId, Long hostId, LocalDateTime visitedAt) {
        this.visitorId = visitorId;
        this.hostId = hostId;
        this.visitedAt = visitedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVisitorId() {
        return visitorId;
    }

    public void setVisitorId(Long visitorId) {
        this.visitorId = visitorId;
    }

    public Long getHostId() {
        return hostId;
    }

    public void setHostId(Long hostId) {
        this.hostId = hostId;
    }

    public LocalDateTime getVisitedAt() {
        return visitedAt;
    }

    public void setVisitedAt(LocalDateTime visitedAt) {
        this.visitedAt = visitedAt;
    }
}
