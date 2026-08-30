package com.campuslove.api.entity.circle;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * RBAC 三级圈层实体（L1 公司 / L2 区域 / L3 学校）。
 * 对齐 `后台RBAC三级圈层规格.md` §2 数据模型。
 */
@Entity
@Table(name = "circle_layer", indexes = {
    @Index(name = "idx_cl_parent", columnList = "parent_id"),
    @Index(name = "idx_cl_path", columnList = "circle_path"),
    @Index(name = "idx_cl_level", columnList = "level"),
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_circle_path", columnNames = "circle_path")
})
public class CircleLayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false, columnDefinition = "TINYINT")
    private Integer level;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private CircleLayer parent;

    @Column(name = "circle_path", nullable = false, length = 256)
    private String circlePath;

    @Column(nullable = false, length = 16)
    private String status = "active";

    @Column(nullable = false, length = 16)
    private String color = "#0064e0";

    @Column(nullable = false)
    private Integer sort = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Getters/Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getLevel() { return level; }
    public void setLevel(Integer level) { this.level = level; }
    public CircleLayer getParent() { return parent; }
    public void setParent(CircleLayer parent) { this.parent = parent; }
    public String getCirclePath() { return circlePath; }
    public void setCirclePath(String circlePath) { this.circlePath = circlePath; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public Integer getSort() { return sort; }
    public void setSort(Integer sort) { this.sort = sort; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}