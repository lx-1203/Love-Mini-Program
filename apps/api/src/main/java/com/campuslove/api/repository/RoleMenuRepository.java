package com.campuslove.api.repository;

import com.campuslove.api.entity.RoleMenu;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 角色-菜单关联 Repository。
 */
public interface RoleMenuRepository extends JpaRepository<RoleMenu, RoleMenu.RoleMenuId> {

    /**
     * 按角色 ID 查询关联（用于重建角色菜单权限）。
     *
     * @param roleId 角色 ID
     * @return 关联列表
     */
    List<RoleMenu> findByRoleId(Long roleId);

    /**
     * 删除指定角色的全部关联（重建角色菜单权限前调用）。
     *
     * @param roleId 角色 ID
     */
    void deleteByRoleId(Long roleId);
}
