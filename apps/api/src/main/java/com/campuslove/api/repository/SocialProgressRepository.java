package com.campuslove.api.repository;

import com.campuslove.api.entity.SocialProgress;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 社交升温进度 Repository。
 * 提供基于用户 ID 的查询方法。
 */
public interface SocialProgressRepository extends JpaRepository<SocialProgress, Long> {

    /**
     * 根据用户 ID 查询社交升温进度记录。
     *
     * @param userId 用户 ID
     * @return 匹配的社交进度记录（可能为空）
     */
    Optional<SocialProgress> findByUserId(Long userId);
}