package com.campuslove.api.repository;

import com.campuslove.api.entity.NotifyConfig;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 通知配置 Repository。
 */
public interface NotifyConfigRepository extends JpaRepository<NotifyConfig, Long> {

    /**
     * 按通知类型查找配置。
     *
     * @param type 通知类型
     * @return 配置 Optional
     */
    Optional<NotifyConfig> findByType(String type);

    /**
     * 查询所有配置，按类型升序。
     *
     * @return 配置列表
     */
    List<NotifyConfig> findAllByOrderByTypeAsc();
}
