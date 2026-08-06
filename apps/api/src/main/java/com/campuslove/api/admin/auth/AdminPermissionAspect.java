package com.campuslove.api.admin.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 管理端权限校验切面（双重保险）。
 *
 * <p>Task 0.4.3 新增：作为 {@code @PreAuthorize("hasRole('ADMIN')")} 与 SecurityConfig
 * URL 层 {@code hasRole("ADMIN")} 之外的第三层权限防线，捕获权限校验失败场景并记录
 * 结构化 warn 级别日志，含 userId、端点、IP，便于安全审计与异常入侵检测。</p>
 *
 * <p>切面策略：
 * <ul>
 *   <li>切点：拦截 {@code com.campuslove.api.admin} 包下所有 Controller 方法</li>
 *   <li>通知：{@code @Around} 环绕通知，捕获 {@link org.springframework.security.access.AccessDeniedException}
 *       及其子类（含 Spring Security 6 的 AuthorizationDeniedException）</li>
 *   <li>日志：warn 级别，字段含 userId、endpoint、httpMethod、clientIp、exceptionType</li>
 *   <li>透传：异常被原样抛出，不影响后续 GlobalExceptionHandler 或 Spring Security
 *       ExceptionTranslationFilter 的标准处理流程</li>
 * </ul>
 * </p>
 *
 * <p>Profile 限制：仅 real profile 激活，与 Admin Controller 的 {@code @Profile("real")}
 * 保持一致；mock profile 下 admin controller 不激活，切面无需生效。</p>
 *
 * <p>注意：切面在 @PreAuthorize 之后执行（@PreAuthorize 在方法调用前由 AopProxy 触发），
 * 当 @PreAuthorize 抛出 AccessDeniedException 时，本切面的 @Around 会捕获到该异常并记录日志，
 * 随后异常继续向上抛出由 Spring Security ExceptionTranslationFilter 或 GlobalExceptionHandler 处理。</p>
 */
@Aspect
@Component
@Profile("real")
public class AdminPermissionAspect {

    private static final Logger log = LoggerFactory.getLogger(AdminPermissionAspect.class);

    /** 未知用户标识（未认证或无法解析时使用） */
    private static final String UNKNOWN_USER = "anonymous";
    /** 未知 IP（无法获取请求时使用） */
    private static final String UNKNOWN_IP = "unknown";

    /**
     * 拦截 admin 包下所有 Controller 方法，捕获权限异常并记录日志。
     *
     * <p>execution 切点匹配 {@code com.campuslove.api.admin} 包及其子包下所有方法。
     * 由于 Admin Controller 类均位于该包下，能完整覆盖 8+ 个 Controller 的全部端点。</p>
     *
     * @param joinPoint AOP 连接点
     * @return 目标方法返回值
     * @throws Throwable 目标方法或权限校验抛出的异常（透传，不吞异常）
     */
    @Around("execution(* com.campuslove.api.admin..*(..))")
    public Object aroundAdminEndpoints(ProceedingJoinPoint joinPoint) throws Throwable {
        try {
            return joinPoint.proceed();
        } catch (org.springframework.security.access.AccessDeniedException ex) {
            // 双重保险：@PreAuthorize 抛出的 AuthorizationDeniedException（Spring Security 6）
            // 是 AccessDeniedException 的子类，本 catch 可一并捕获
            logPermissionFailure(ex);
            throw ex;
        }
    }

    /**
     * 记录权限校验失败日志（warn 级别）。
     *
     * <p>日志字段：
     * <ul>
     *   <li>userId：当前认证用户 ID（未认证为 anonymous）</li>
     *   <li>endpoint：请求 URI（无法获取为 unknown）</li>
     *   <li>httpMethod：HTTP 方法（GET/POST/...）</li>
     *   <li>clientIp：客户端 IP（X-Forwarded-For 优先，无法获取为 unknown）</li>
     *   <li>exceptionType：异常类名</li>
     * </ul>
     * </p>
     *
     * @param ex 权限校验异常
     */
    private void logPermissionFailure(org.springframework.security.access.AccessDeniedException ex) {
        String userId = resolveCurrentUserId();
        HttpServletRequest request = resolveCurrentRequest();
        String endpoint = request != null ? request.getRequestURI() : "unknown"; // infra R2-00231: 原误用 UNKNOWN_IP 常量名（值为 unknown），改为字面量避免语义混淆
        String httpMethod = request != null ? request.getMethod() : "UNKNOWN";
        String clientIp = request != null ? resolveClientIp(request) : UNKNOWN_IP;

        log.warn(
                "Admin 权限校验失败: userId={}, endpoint={}, method={}, clientIp={}, exception={}",
                userId, endpoint, httpMethod, clientIp, ex.getClass().getSimpleName());
    }

    /**
     * 解析当前认证用户 ID。
     *
     * @return 用户 ID 字符串，未认证或无法解析返回 {@value #UNKNOWN_USER}
     */
    private String resolveCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return UNKNOWN_USER;
            }
            Object principal = auth.getPrincipal();
            if (principal == null) {
                return UNKNOWN_USER;
            }
            return principal.toString();
        } catch (RuntimeException ignore) {
            // SecurityContext 解析失败不影响日志记录主流程
            return UNKNOWN_USER;
        }
    }

    /**
     * 获取当前 HTTP 请求对象。
     *
     * @return HttpServletRequest，非 HTTP 请求上下文返回 null
     */
    private HttpServletRequest resolveCurrentRequest() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attrs != null ? attrs.getRequest() : null;
        } catch (RuntimeException ignore) {
            return null;
        }
    }

    /**
     * 解析客户端真实 IP。
     *
     * <p>优先级：X-Forwarded-For > X-Real-IP > Proxy-Client-IP > WL-Proxy-Client-IP
     * > remoteAddr。X-Forwarded-For 多级代理时取第一个非 unknown IP。</p>
     *
     * @param request HTTP 请求
     * @return 客户端 IP
     */
    private String resolveClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // X-Forwarded-For 多级代理取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip != null ? ip : UNKNOWN_IP;
    }
}
