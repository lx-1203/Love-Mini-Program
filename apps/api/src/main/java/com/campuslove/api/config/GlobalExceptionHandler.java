package com.campuslove.api.config;

import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException;

/**
 * 全局异常处理器。
 * 统一处理各类异常，返回标准化的错误响应格式。
 * 错误响应格式: { "error": string, "message": string, "status": int }
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * 处理请求参数校验异常。
     * 当 @Valid 注解校验失败时触发，返回 400 Bad Request。
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(
            MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("请求参数校验失败");

        log.warn("参数校验失败: {}", errorMessage);
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Validation Failed", errorMessage);
    }

    /**
     * 处理 401 Unauthorized 异常。
     * 当 HttpClientErrorException.Unauthorized 抛出时触发。
     */
    @ExceptionHandler(HttpClientErrorException.Unauthorized.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorized(
            HttpClientErrorException.Unauthorized ex) {
        log.warn("未授权访问: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Unauthorized",
                ex.getStatusText() != null ? ex.getStatusText() : "未认证的用户请求，请先登录");
    }

    /**
     * 处理非法参数异常。
     * 当业务逻辑校验失败时触发，返回 400 Bad Request。
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex) {
        log.warn("非法参数: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
    }

    /**
     * 处理访问拒绝异常。
     * 当用户无权限访问资源时触发，返回 403 Forbidden。
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            AccessDeniedException ex) {
        log.warn("访问被拒绝: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Forbidden", "您没有权限执行此操作");
    }

    /**
     * 处理通用异常。
     * 捕获所有未处理的异常，返回 500 Internal Server Error。
     * 生产环境不暴露堆栈信息。
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("服务器内部错误", ex);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "服务器内部错误，请稍后重试");
    }

    /**
     * 构建统一的错误响应体。
     *
     * @param status  HTTP 状态码
     * @param error   错误类型描述
     * @param message 详细错误信息
     * @return 标准化的错误响应
     */
    private ResponseEntity<Map<String, Object>> buildErrorResponse(
            HttpStatus status, String error, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", error);
        body.put("message", message);
        body.put("status", status.value());
        return ResponseEntity.status(status).body(body);
    }
}
