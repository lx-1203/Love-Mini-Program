package com.campuslove.api.repository;

import com.campuslove.api.entity.AdminAppSwitch;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 功能开关 Repository。
 * 提供按开关键查询的方法。
 */
public interface AdminAppSwitchRepository extends JpaRepository<AdminAppSwitch, Long> {

    /**
     * 根据开关键查询开关。
     *
     * @param switchKey 开关键
     * @return 匹配的开关（可能为空）
     */
    Optional<AdminAppSwitch> findBySwitchKey(String switchKey);
}
