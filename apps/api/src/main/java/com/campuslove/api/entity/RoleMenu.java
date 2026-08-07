package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 角色-菜单关联实体，对应 role_menus 表。
 * <p>复合主键 {@link RoleMenuId}（roleId + menuId），
 * 一个角色可关联多个菜单，一个菜单可被多个角色使用。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "role_menus")
@IdClass(RoleMenu.RoleMenuId.class)
public class RoleMenu {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false, foreignKey = @jakarta.persistence.ForeignKey(name = "fk_role_menus_role"))
    private Role role;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_id", nullable = false, foreignKey = @jakarta.persistence.ForeignKey(name = "fk_role_menus_menu"))
    private Menu menu;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public RoleMenu() {
    }

    public RoleMenu(Role role, Menu menu) {
        this.role = role;
        this.menu = menu;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public Menu getMenu() {
        return menu;
    }

    public void setMenu(Menu menu) {
        this.menu = menu;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    /** 复合主键：roleId + menuId */
    public static class RoleMenuId implements Serializable {
        private Long role;
        private Long menu;

        public RoleMenuId() {
        }

        public RoleMenuId(Long role, Long menu) {
            this.role = role;
            this.menu = menu;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof RoleMenuId that)) {
                return false;
            }
            return Objects.equals(role, that.role) && Objects.equals(menu, that.menu);
        }

        @Override
        public int hashCode() {
            return Objects.hash(role, menu);
        }
    }
}
