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
}
