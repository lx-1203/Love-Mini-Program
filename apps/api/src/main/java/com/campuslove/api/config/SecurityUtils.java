package com.campuslove.api.config;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 安全工具类：获取当前登录用户ID。
 * Phase 1 兼容实现：优先尝试从 SecurityContextHolder 获取（反射方式，兼容未集成 Spring Security 的场景），
 * 回退到 HTTP 请求参数 userId，最终回退到默认值。
 * 后续集成 Spring Security 后可直接使用 SecurityContextHolder.getContext().getAuthentication()。
 */
public final class SecurityUtils {

    private static final Logger log = LoggerFactory.getLogger(SecurityUtils.class);

    private SecurityUtils() {}

    /**
     * 获取当前登录用户ID。
     * 优先从 SecurityContextHolder 获取认证信息（反射方式兼容无 Spring Security 依赖的场景），
     * 回退到 HTTP 请求参数 userId。
     *
     * @return 当前用户ID
     * @throws IllegalStateException 未认证或无法解析用户ID时抛出
     */
    public static Long getCurrentUserId() {
        // 1. 尝试从 Spring Security SecurityContextHolder 获取（反射方式）
        Long userIdFromSecurity = tryGetFromSecurityContext();
        if (userIdFromSecurity != null) {
            return userIdFromSecurity;
        }

        // 2. 尝试从 HTTP 请求参数获取 userId
        Long userIdFromRequest = tryGetFromRequest();
        if (userIdFromRequest != null) {
            return userIdFromRequest;
        }

        throw new IllegalStateException("未认证的用户请求：无法获取当前用户ID");
    }

    /**
     * 获取当前登录用户ID，未认证时返回默认值。
     * 此方法仅用于 Phase 1 兼容过渡，后续集成 Spring Security 后
     * 应全部替换为 getCurrentUserId()。
     *
     * @param defaultValue 未认证时的默认返回值
     * @return 当前用户ID，未认证时返回 defaultValue
     */
    public static Long getCurrentUserIdOrDefault(Long defaultValue) {
        try {
            return getCurrentUserId();
        } catch (Exception e) {
            return defaultValue;
        }
    }

    /**
     * 尝试从 Spring Security 的 SecurityContextHolder 获取用户ID（反射方式）。
     * 兼容项目未引入 Spring Security 依赖的场景，此时反射调用会失败并返回 null。
     *
     * @return 用户ID，获取失败返回 null
     */
    private static Long tryGetFromSecurityContext() {
        try {
            Class<?> holderClass = Class.forName(
                    "org.springframework.security.core.context.SecurityContextHolder");
            Object context = holderClass.getMethod("getContext").invoke(null);
            Object authentication = context.getClass().getMethod("getAuthentication").invoke(context);
            if (authentication == null) {
                return null;
            }
            // 检查 isAuthenticated
            Boolean isAuthenticated = (Boolean) authentication.getClass()
                    .getMethod("isAuthenticated").invoke(authentication);
            if (!isAuthenticated) {
                return null;
            }
            Object principal = authentication.getClass().getMethod("getPrincipal").invoke(authentication);
            return parsePrincipal(principal);
        } catch (ClassNotFoundException e) {
            // Spring Security 未引入，跳过
            return null;
        } catch (Exception e) {
            log.debug("从 SecurityContext 获取用户ID失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 尝试从当前 HTTP 请求的参数中获取 userId。
     *
     * @return 用户ID，获取失败返回 null
     */
    private static Long tryGetFromRequest() {
        try {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes == null) {
                return null;
            }
            HttpServletRequest request = attributes.getRequest();
            String userIdParam = request.getParameter("userId");
            if (userIdParam != null && !userIdParam.isBlank()) {
                return Long.parseLong(userIdParam);
            }
        } catch (Exception e) {
            log.debug("从 HTTP 请求参数获取 userId 失败: {}", e.getMessage());
        }
        return null;
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
