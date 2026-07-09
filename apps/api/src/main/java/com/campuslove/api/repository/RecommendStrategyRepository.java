package com.campuslove.api.repository;

import com.campuslove.api.entity.RecommendStrategyEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 推荐策略配置 Repository。
 * 提供按策略键查询的方法。
 */
public interface RecommendStrategyRepository extends JpaRepository<RecommendStrategyEntity, Long> {

    /**
     * 根据策略键查询推荐策略配置。
     *
     * @param strategyKey 策略键
     * @return 匹配的配置项（可能为空）
     */
    Optional<RecommendStrategyEntity> findByStrategyKey(String strategyKey);
}
