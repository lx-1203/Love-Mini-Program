package com.campuslove.api.repository;

import com.campuslove.api.entity.Menu;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 菜单 Repository。
 */
public interface MenuRepository extends JpaRepository<Menu, Long> {

    /**
     * 查询全部菜单按排序权重升序。
     *
     * @return 全部菜单列表
     */
    List<Menu> findAllByOrderBySortAsc();

    /**
     * 按 ID 集合查询菜单（角色关联用）。
     *
     * @param ids 菜单 ID 集合
     * @return 菜单列表
     */
    List<Menu> findByIdIn(Collection<Long> ids);

    /**
     * 查询指定角色可见的菜单（通过 role_menus 关联），按排序权重升序。
     *
     * @param roleId 角色 ID
     * @return 菜单列表
     */
    @Query("SELECT DISTINCT m FROM Menu m JOIN RoleMenu rm ON rm.menu.id = m.id "
            + "WHERE rm.role.id = :roleId ORDER BY m.sort ASC")
    List<Menu> findMenusByRoleId(@Param("roleId") Long roleId);

    /**
     * 查询指定角色集合可见的菜单（角色多对一时取并集），按排序权重升序。
     *
     * @param roleIds 角色 ID 集合
     * @return 菜单列表
     */
    @Query("SELECT DISTINCT m FROM Menu m JOIN RoleMenu rm ON rm.menu.id = m.id "
            + "WHERE rm.role.id IN :roleIds ORDER BY m.sort ASC")
    List<Menu> findMenusByRoleIds(@Param("roleIds") Collection<Long> roleIds);
}
