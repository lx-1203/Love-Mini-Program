package com.campuslove.api.repository;

import com.campuslove.api.entity.OfficialAccount;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 官方账号 Repository。
 * 提供按启用状态排序查询、按 code 查询等方法。
 */
@Repository
public interface OfficialAccountRepository extends JpaRepository<OfficialAccount, Long> {

    /**
     * 查询全部启用账号，按展示顺序升序。
     *
     * @return 启用账号列表
     */
    List<OfficialAccount> findByEnabledTrueOrderBySortOrderAsc();

    /**
     * 按唯一标识查询账号。
     *
     * @param code 官方号 code（official-assistant / official-promoter）
     * @return 账号（可为空）
     */
    Optional<OfficialAccount> findByCode(String code);
}
