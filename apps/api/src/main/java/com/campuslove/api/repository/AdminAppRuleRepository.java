package com.campuslove.api.repository;

import com.campuslove.api.entity.AdminAppRule;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 业务规则 Repository。
 * 提供按规则名称查询的方法。
 */
public interface AdminAppRuleRepository extends JpaRepository<AdminAppRule, Long> {

    /**
     * 根据规则名称查询规则。
     *
     * @param ruleName 规则名称
     * @return 匹配的规则（可能为空）
     */
    Optional<AdminAppRule> findByRuleName(String ruleName);
}
