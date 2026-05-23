package com.campuslove.api.repository;

import com.campuslove.api.entity.RecommendationPreference;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 推荐偏好设置 Repository。
 * 提供基于用户 ID 的查询方法。
 */
public interface RecommendationPreferenceRepository extends JpaRepository<RecommendationPreference, Long> {

    /**
     * 根据用户 ID 查询推荐偏好设置。
     *
     * @param userId 用户 ID
     * @return 匹配的推荐偏好设置（可能为空）
     */
    Optional<RecommendationPreference> findByUserId(Long userId);
}
