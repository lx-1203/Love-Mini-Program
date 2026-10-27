package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * GlobalExceptionHandler 单元测试（缺陷修复：缺失 404/405 映射）。
 *
 * <p>验证未知路径（NoResourceFoundException）返回 404、请求方法不支持返回 405，
 * 而非落入通用兜底返回 500。</p>
 */
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    /**
     * 缺陷修复：未知路径应返回 404 Not Found（原实现兜底 500）。
     */
    @Test
    void handleNoResourceFound_returns404() {
        NoResourceFoundException ex = new NoResourceFoundException(HttpMethod.GET, "/api/v1/unknown-path");

        ResponseEntity<Map<String, Object>> response = handler.handleNoResourceFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals(404, response.getBody().get("status"));
        assertEquals("Not Found", response.getBody().get("error"));
    }

    /**
     * 缺陷修复：请求方法不支持应返回 405 Method Not Allowed（原实现兜底 500）。
     */
    @Test
    void handleMethodNotSupported_returns405() {
        HttpRequestMethodNotSupportedException ex =
                new HttpRequestMethodNotSupportedException("POST", List.of("GET"));

        ResponseEntity<Map<String, Object>> response = handler.handleMethodNotSupported(ex);

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        assertEquals(405, response.getBody().get("status"));
        assertEquals("Method Not Allowed", response.getBody().get("error"));
    }

    /**
     * 缺陷修复：请求体 JSON 不可读应返回 400（原实现兜底 500，客户端误判为服务端故障）。
     */
    @Test
    void handleHttpMessageNotReadable_returns400() {
        org.springframework.http.converter.HttpMessageNotReadableException ex =
                new org.springframework.http.converter.HttpMessageNotReadableException(
                        "JSON parse error", new RuntimeException("Illegal unquoted character"));

        ResponseEntity<Map<String, Object>> response = handler.handleHttpMessageNotReadable(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(400, response.getBody().get("status"));
        assertEquals("Bad Request", response.getBody().get("error"));
    }

    /**
     * resolveMappedStatus：审计切面用同一张映射表推断客户端实际收到的状态码。
     * 覆盖 AdminAuth 家族先于父类 IllegalArgumentException 判定（401 不得读成 400）、
     * 封存类先于 BusinessException（自带 httpStatus 不得读成兜底）、未匹配兜底 500。
     */
    @Test
    void resolveMappedStatus_mirrorsHandlerMapping() {
        // 管理端认证家族（父类 IllegalArgumentException 是 400，家族成员必须映射 401/403/404）
        assertEquals(401, GlobalExceptionHandler.resolveMappedStatus(
                new com.campuslove.api.admin.auth.InvalidCredentialsException("bad credentials")));
        assertEquals(403, GlobalExceptionHandler.resolveMappedStatus(
                new com.campuslove.api.admin.auth.AdminDisabledException("disabled")));
        assertEquals(404, GlobalExceptionHandler.resolveMappedStatus(
                new com.campuslove.api.admin.auth.AdminNotFoundException("not found")));
        // 参数与请求体错误
        assertEquals(400, GlobalExceptionHandler.resolveMappedStatus(new IllegalArgumentException("bad arg")));
        assertEquals(400, GlobalExceptionHandler.resolveMappedStatus(
                new org.springframework.http.converter.HttpMessageNotReadableException("bad json")));
        // 封存类（BusinessException 子类，但 handler 用自带 httpStatus=403）
        assertEquals(403, GlobalExceptionHandler.resolveMappedStatus(
                new com.campuslove.api.common.CommerceDisabledException("sealed")));
        assertEquals(403, GlobalExceptionHandler.resolveMappedStatus(
                new com.campuslove.api.common.VideoUploadDisabledException("sealed")));
        // 限流/未匹配兜底
        assertEquals(429, GlobalExceptionHandler.resolveMappedStatus(
                new com.campuslove.api.ratelimit.RateLimitExceededException("slow down")));
        assertEquals(500, GlobalExceptionHandler.resolveMappedStatus(new RuntimeException("boom")));
        assertEquals(500, GlobalExceptionHandler.resolveMappedStatus(null));
    }
}
