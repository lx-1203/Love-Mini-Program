package com.campuslove.api.repository;

import com.campuslove.api.entity.PushPreference;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 推送偏好设置 Repository。
 * 提供基于用户 ID 的查询方法。
 */
public interface PushPreferenceRepository extends JpaRepository<PushPreference, Long> {

    /**
     * 根据用户 ID 查询推送偏好设置。
     *
     * @param userId 用户 ID
     * @return 匹配的推送偏好设置（可能为空）
     */
    Optional<PushPreference> findByUserId(Long userId);
}