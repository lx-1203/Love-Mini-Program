package com.campuslove.api.repository;

import com.campuslove.api.entity.UserCampusProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 用户校园资料 Repository。
 * 提供基于用户 ID 的查询方法。
 */
public interface UserCampusProfileRepository extends JpaRepository<UserCampusProfile, Long> {

    /**
     * 根据用户 ID 查询校园资料。
     *
     * @param userId 用户 ID
     * @return 匹配的校园资料（可能为空）
     */
    Optional<UserCampusProfile> findByUserId(Long userId);
}
