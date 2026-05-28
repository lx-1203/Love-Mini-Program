package com.campuslove.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.client.HttpClientErrorException;

/**
 * 安全工具类：获取当前登录用户ID。
 * 从 Spring Security SecurityContextHolder 获取认证信息，
 * 未认证时抛出 401 Unauthorized 异常。
 */
public final class SecurityUtils {

    private static final Logger log = LoggerFactory.getLogger(SecurityUtils.class);

    private SecurityUtils() {}

    /**
     * 获取当前登录用户ID。
     * 从 SecurityContextHolder 获取认证信息，提取 principal 中的用户ID。
     * 未认证时抛出 401 Unauthorized 异常。
     *
     * @return 当前用户ID
     * @throws HttpClientErrorException.Unauthorized 未认证或无法解析用户ID时抛出 401 异常
     */
    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throwUnauthorized("未认证的用户请求：无法获取当前用户ID，请先登录");
        }

        Object principal = authentication.getPrincipal();
        Long userId = parsePrincipal(principal);

        if (userId == null) {
            throwUnauthorized("认证信息中无法解析用户ID，请重新登录");
        }

        return userId;
    }

    /**
     * 抛出 401 Unauthorized 异常。
     *
     * @param message 错误信息
     */
    private static void throwUnauthorized(String message) {
        throw HttpClientErrorException.create(
                HttpStatus.UNAUTHORIZED,
                message,
                null, null, null);
    }

    /**
     * 将 principal 对象解析为 Long 类型的用户ID。
     * 支持 Long、Integer、String 三种类型。
     *
     * @param principal 认证主体对象
     * @return 用户ID，解析失败返回 null
     */
    private static Long parsePrincipal(Object principal) {
        if (principal instanceof Long) {
            return (Long) principal;
        }
        if (principal instanceof Integer) {
            return ((Integer) principal).longValue();
        }
        if (principal instanceof String) {
            try {
                return Long.parseLong((String) principal);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
