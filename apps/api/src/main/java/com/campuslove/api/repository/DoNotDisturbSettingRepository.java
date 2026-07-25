package com.campuslove.api.repository;

import com.campuslove.api.entity.DoNotDisturbSetting;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 通知免打扰设置 Repository（功能6）。
 * 提供基于用户 ID 的查询方法。
 */
public interface DoNotDisturbSettingRepository extends JpaRepository<DoNotDisturbSetting, Long> {

    /**
     * 根据用户 ID 查询免打扰设置。
     *
     * @param userId 用户 ID
     * @return 匹配的免打扰设置（可能为空）
     */
    Optional<DoNotDisturbSetting> findByUserId(Long userId);
}
