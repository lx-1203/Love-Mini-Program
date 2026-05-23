package com.campuslove.api.repository;

import com.campuslove.api.entity.AppLoginHeroConfig;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 登录主视觉配置 Repository。
 * 提供按场景标识和激活状态查询配置的方法。
 */
public interface AppLoginHeroConfigRepository extends JpaRepository<AppLoginHeroConfig, Long> {

    /**
     * 根据场景标识和激活状态查询配置。
     * 用于获取指定场景下当前生效的配置行。
     *
     * @param sceneKey 场景标识（如 "default"）
     * @param isActive 是否激活（true = 当前生效）
     * @return 匹配的配置（可能为空）
     */
    Optional<AppLoginHeroConfig> findBySceneKeyAndIsActive(String sceneKey, Boolean isActive);
}
