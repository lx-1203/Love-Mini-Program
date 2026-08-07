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
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 高校实体，对应 schools 表。
 * <p>商业模式「每个高校一个管理员」的一级管理对象。
 * 与 user.campus_name（字符串）对齐：school.name 即校区名。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>name：高校全称（唯一，与 user.campus_name 对齐）</li>
 *   <li>code：高校编码（唯一，如 NJU/ZJU）</li>
 *   <li>status：active 启用 / disabled 停用（停用时对应校区管理员登录被拒）</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "schools",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_schools_code", columnNames = {"code"}),
        @UniqueConstraint(name = "uk_schools_name", columnNames = {"name"})
    }
)
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 高校全称（唯一，与 user.campus_name 对齐） */
    @Column(name = "name", nullable = false, length = 128)
    private String name;

    /** 高校编码（唯一，如 NJU/ZJU） */
    @Column(name = "code", nullable = false, length = 32)
    private String code;

    /** 状态：active 启用 / disabled 停用 */
    @Column(name = "status", nullable = false, length = 16)
    private String status = "active";

    /** 排序权重（升序） */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public School() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
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
