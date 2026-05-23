package com.campuslove.api.repository;

import com.campuslove.api.entity.UserBasicProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 用户基础资料 Repository。
 * 提供基于用户 ID 的查询方法。
 */
public interface UserBasicProfileRepository extends JpaRepository<UserBasicProfile, Long> {

    /**
     * 根据用户 ID 查询基础资料。
     *
     * @param userId 用户 ID
     * @return 匹配的基础资料（可能为空）
     */
    Optional<UserBasicProfile> findByUserId(Long userId);
}
