package com.campuslove.api.repository;

import com.campuslove.api.entity.MatchConfigEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 匹配算法配置 Repository。
 * 提供按配置键查询的方法。
 */
public interface MatchConfigEntityRepository extends JpaRepository<MatchConfigEntity, Long> {

    /**
     * 根据配置键查询匹配算法配置。
     *
     * @param configKey 配置键
     * @return 匹配的配置项（可能为空）
     */
    Optional<MatchConfigEntity> findByConfigKey(String configKey);
}
