package com.campuslove.api.repository;

import com.campuslove.api.entity.AdminAppConfig;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 系统参数配置 Repository。
 * 提供按配置键查询的方法。
 */
public interface AdminAppConfigRepository extends JpaRepository<AdminAppConfig, Long> {

    /**
     * 根据配置键查询配置项。
     *
     * @param configKey 配置键
     * @return 匹配的配置项（可能为空）
     */
    Optional<AdminAppConfig> findByConfigKey(String configKey);
}
