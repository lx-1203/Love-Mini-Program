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
 * 菜单实体，对应 menus 表。
 * <p>eladmin 风格动态菜单：管理员登录后从
 * {@code GET /api/v1/admin/menus/current} 拉取当前角色可见菜单树，
 * 前端据此动态生成侧边栏与路由，替代硬编码。</p>
 *
 * <p>字段说明：</p>
 * <ul>
 *   <li>parentId：父菜单 ID（0 = 顶级），自关联支持多级菜单</li>
 *   <li>name：路由 name（前端路由唯一标识）</li>
 *   <li>path：路由路径（/users 等）</li>
 *   <li>component：前端组件路径（views/Users.vue，用于动态路由生成）</li>
 *   <li>hidden：1 = 不在侧边栏展示（预留）</li>
 *   <li>permission：权限标识（预留，如 system:user:list）</li>
 *   <li>menuType：DIR 目录 / MENU 菜单</li>
 * </ul>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "menus",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_menus_name", columnNames = {"name"})
    }
)
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 父菜单 ID（0 = 顶级） */
    @Column(name = "parent_id", nullable = false)
    private Long parentId = 0L;

    /** 菜单标题（中文） */
    @Column(name = "title", nullable = false, length = 64)
    private String title;

    /** 路由 name（前端路由唯一标识） */
    @Column(name = "name", nullable = false, length = 64)
    private String name;

    /** 路由路径（/users 等） */
    @Column(name = "path", nullable = false, length = 128)
    private String path;

    /** 前端组件路径（views/Users.vue），目录为 null */
    @Column(name = "component", length = 255)
    private String component;

    /** 图标文件名（icons/*.svg） */
    @Column(name = "icon", nullable = false, length = 64)
    private String icon = "";

    /** 排序权重（升序） */
    @Column(name = "sort", nullable = false)
    private Integer sort = 0;

    /** 是否隐藏（1=隐藏不出现在侧边栏） */
    @Column(name = "hidden", nullable = false)
    private Boolean hidden = false;

    /** 权限标识（预留，如 system:user:list） */
    @Column(name = "permission", length = 128)
    private String permission;

    /** 菜单类型：DIR 目录 / MENU 菜单 */
    @Column(name = "menu_type", nullable = false, length = 16)
    private String menuType = "MENU";

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Menu() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getComponent() {
        return component;
    }

    public void setComponent(String component) {
        this.component = component;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public Integer getSort() {
        return sort;
    }

    public void setSort(Integer sort) {
        this.sort = sort;
    }

    public Boolean getHidden() {
        return hidden;
    }

    public void setHidden(Boolean hidden) {
        this.hidden = hidden;
    }

    public String getPermission() {
        return permission;
    }

    public void setPermission(String permission) {
        this.permission = permission;
    }

    public String getMenuType() {
        return menuType;
    }

    public void setMenuType(String menuType) {
        this.menuType = menuType;
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
