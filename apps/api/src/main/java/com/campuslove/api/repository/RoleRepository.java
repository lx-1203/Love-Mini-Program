package com.campuslove.api.repository;

import com.campuslove.api.entity.Role;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 角色 Repository。
 */
public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByCode(String code);

    /**
     * 是否存在指定编码的角色。
     *
     * @param code 角色编码
     * @return true 存在
     */
    boolean existsByCode(String code);
}
