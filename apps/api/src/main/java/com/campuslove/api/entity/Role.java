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
 * 角色实体，对应 roles 表。
 * <p>eladmin 风格角色管理。与 user.role 字符串双轨对齐
 * （roles.code = SUPER_ADMIN / ADMIN），通过 role_menus 关联角色可见菜单。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>code：角色编码（唯一，与 user.role 对齐）</li>
 *   <li>dataScope：数据范围 ALL 全局 / CAMPUS 校区隔离</li>
 *   <li>enabled：是否启用（禁用后该角色管理员无法登录）</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "roles",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_roles_code", columnNames = {"code"})
    }
)
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 角色名称（中文，如 超级管理员 / 校区管理员） */
    @Column(name = "name", nullable = false, length = 64)
    private String name;

    /** 角色编码（唯一，与 user.role 对齐：SUPER_ADMIN / ADMIN） */
    @Column(name = "code", nullable = false, length = 32)
    private String code;

    /** 数据范围：ALL 全局 / CAMPUS 校区隔离 */
    @Column(name = "data_scope", nullable = false, length = 16)
    private String dataScope = "CAMPUS";

    /** 角色描述 */
    @Column(name = "description", nullable = false, length = 255)
    private String description = "";

    /** 是否启用（1=启用，0=禁用） */
    @Column(name = "enabled", nullable = false)
    private Boolean enabled = true;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Role() {
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

    public String getDataScope() {
        return dataScope;
    }

    public void setDataScope(String dataScope) {
        this.dataScope = dataScope;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
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
