package com.campuslove.api.repository;

import com.campuslove.api.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 用户主表 Repository。
 * 提供基于 openid 的查询方法。
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * 根据微信 openid 查询用户。
     *
     * @param openid 微信 openid
     * @return 匹配的用户（可能为空）
     */
    Optional<User> findByOpenid(String openid);
}
