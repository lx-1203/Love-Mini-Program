package com.campuslove.api.entity.circle;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 管理员-圈层绑定实体。
 * 对齐 `后台RBAC三级圈层规格.md` §2 数据模型。
 */
@Entity
@Table(name = "admin_layer", uniqueConstraints = {
    @UniqueConstraint(name = "uk_admin_layer", columnNames = {"admin_id", "circle_layer_id"})
})
public class AdminLayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(name = "circle_layer_id", nullable = false)
    private Long circleLayerId;

    @Column(name = "role_code", nullable = false, length = 32)
    private String roleCode = "ADMIN";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters/Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public Long getCircleLayerId() { return circleLayerId; }
    public void setCircleLayerId(Long circleLayerId) { this.circleLayerId = circleLayerId; }
    public String getRoleCode() { return roleCode; }
    public void setRoleCode(String roleCode) { this.roleCode = roleCode; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
