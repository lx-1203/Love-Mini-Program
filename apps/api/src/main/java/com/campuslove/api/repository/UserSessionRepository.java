package com.campuslove.api.repository;

import com.campuslove.api.entity.UserSession;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 用户会话 Repository。
 * 提供基于 token 和过期时间的查询方法。
 */
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    /**
     * 根据 session token 和过期时间查询有效会话。
     *
     * @param sessionToken 会话令牌
     * @param now          当前时间
     * @return 匹配的有效会话（可能为空）
     */
    Optional<UserSession> findBySessionTokenAndExpiresAtAfter(String sessionToken, LocalDateTime now);
}
