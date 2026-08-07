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
 * 数据字典实体，对应 dicts 表。
 * <p>eladmin 风格数据字典：维护固定枚举（活动类型/帖子状态/性别等），
 * 后台可配置，前端下拉从此字典加载。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "dicts",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_dicts_code", columnNames = {"code"})
    }
)
public class Dict {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 字典名称（中文，如 活动类型） */
    @Column(name = "name", nullable = false, length = 64)
    private String name;

    /** 字典编码（如 ACTIVITY_TYPE，唯一） */
    @Column(name = "code", nullable = false, length = 64)
    private String code;

    /** 字典描述 */
    @Column(name = "description", nullable = false, length = 255)
    private String description = "";

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Dict() {
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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
