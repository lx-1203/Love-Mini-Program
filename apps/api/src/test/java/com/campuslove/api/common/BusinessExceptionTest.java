package com.campuslove.api.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/**
 * 业务异常层次单元测试（Task 2.5.6）。
 *
 * <p>覆盖 {@link BusinessException} 基类及核心子类的构造、属性访问、异常链传递：
 * <ul>
 *   <li>{@link BusinessException} 基类构造（带/不带 cause）</li>
 *   <li>{@link BusinessException#getHttpStatus()} 返回正确 HTTP 状态码</li>
 *   <li>{@link BusinessException#getErrorCode()} 返回标准化业务错误码</li>
 *   <li>{@link UserNotFoundException} 子类（404 + USER_NOT_FOUND）</li>
 *   <li>{@link ResourceConflictException} 子类（409 + RESOURCE_CONFLICT）</li>
 *   <li>{@link OperationForbiddenException} 子类（403 + OPERATION_FORBIDDEN）</li>
 *   <li>{@link InvalidOperationException} 子类（422 + INVALID_OPERATION）</li>
 *   <li>{@link ResourceNotFoundException} 子类（404 + RESOURCE_NOT_FOUND）</li>
 *   <li>{@link MatchAlreadyExistsException} 子类（409 + MATCH_ALREADY_EXISTS）</li>
 *   <li>{@link IdempotencyException} 子类（409 + IDEMPOTENT_CONFLICT）</li>
 *   <li>{@link DailyLimitExceededException} 子类（429 + DAILY_LIMIT_EXCEEDED）</li>
 * </ul>
 *
 * <p>测试策略：纯单元测试，直接 new 异常实例，验证属性。不依赖 Spring 上下文。</p>
 */
@DisplayName("BusinessException 业务异常层次测试")
class BusinessExceptionTest {

    /* ========== BusinessException 基类（通过具体子类验证） ========== */

    @Test
    @DisplayName("BusinessException 子类应继承 RuntimeException")
    void businessException_shouldExtendRuntimeException() {
        // Arrange & Act
        UserNotFoundException ex = new UserNotFoundException(123L);

        // Assert：UserNotFoundException 应是 RuntimeException 的子类
        assertTrue(ex instanceof RuntimeException,
                "BusinessException 子类应继承 RuntimeException");
        assertTrue(ex instanceof BusinessException,
                "UserNotFoundException 应是 BusinessException 的子类");
    }

    @Test
    @DisplayName("BusinessException 应携带 message（继承自 RuntimeException）")
    void businessException_shouldCarryMessage() {
        // Arrange & Act
        UserNotFoundException ex = new UserNotFoundException("用户不存在: 123");

        // Assert
        assertEquals("用户不存在: 123", ex.getMessage(),
                "异常应携带 message 字段");
    }

    @Test
    @DisplayName("BusinessException 带原因构造（cause 传递）")
    void businessException_shouldPreserveCause() {
        // Arrange：原始异常
        Throwable cause = new RuntimeException("数据库连接失败");

        // Act：构造带 cause 的异常
        UserNotFoundException ex = new UserNotFoundException("用户不存在: 123", cause);

        // Assert
        assertEquals(cause, ex.getCause(), "cause 应被正确传递");
        assertEquals("用户不存在: 123", ex.getMessage());
    }

    /* ========== UserNotFoundException (404 + USER_NOT_FOUND) ========== */

    @Test
    @DisplayName("UserNotFoundException(userId) 应返回 404 + USER_NOT_FOUND")
    void userNotFoundException_withUserId_shouldReturn404AndErrorCode() {
        // Arrange
        Long userId = 123L;

        // Act
        UserNotFoundException ex = new UserNotFoundException(userId);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, ex.getHttpStatus(),
                "HTTP 状态码应为 404 NOT_FOUND");
        assertEquals(UserNotFoundException.ERROR_CODE, ex.getErrorCode(),
                "错误码应为 USER_NOT_FOUND");
        assertEquals("USER_NOT_FOUND", ex.getErrorCode());
        assertTrue(ex.getMessage().contains("123"),
                "message 应包含 userId");
    }

    @Test
    @DisplayName("UserNotFoundException(message) 应使用自定义消息")
    void userNotFoundException_withMessage_shouldUseCustomMessage() {
        // Act
        UserNotFoundException ex = new UserNotFoundException("自定义消息");

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, ex.getHttpStatus());
        assertEquals("USER_NOT_FOUND", ex.getErrorCode());
        assertEquals("自定义消息", ex.getMessage());
    }

    /* ========== ResourceConflictException (409 + RESOURCE_CONFLICT) ========== */

    @Test
    @DisplayName("ResourceConflictException 应返回 409 + RESOURCE_CONFLICT")
    void resourceConflictException_shouldReturn409AndErrorCode() {
        // Act
        ResourceConflictException ex = new ResourceConflictException("资源已存在");

        // Assert
        assertEquals(HttpStatus.CONFLICT, ex.getHttpStatus(),
                "HTTP 状态码应为 409 CONFLICT");
        assertEquals("RESOURCE_CONFLICT", ex.getErrorCode());
        assertEquals("资源已存在", ex.getMessage());
    }

    /* ========== OperationForbiddenException (403 + OPERATION_FORBIDDEN) ========== */

    @Test
    @DisplayName("OperationForbiddenException 应返回 403 + OPERATION_FORBIDDEN")
    void operationForbiddenException_shouldReturn403AndErrorCode() {
        // Act
        OperationForbiddenException ex = new OperationForbiddenException("无权操作");

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, ex.getHttpStatus(),
                "HTTP 状态码应为 403 FORBIDDEN");
        assertEquals("OPERATION_FORBIDDEN", ex.getErrorCode());
        assertEquals("无权操作", ex.getMessage());
    }

    /* ========== InvalidOperationException (422 + INVALID_OPERATION) ========== */

    @Test
    @DisplayName("InvalidOperationException 应返回 422 + INVALID_OPERATION")
    void invalidOperationException_shouldReturn422AndErrorCode() {
        // Act
        InvalidOperationException ex = new InvalidOperationException("操作非法");

        // Assert
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, ex.getHttpStatus(),
                "HTTP 状态码应为 422 UNPROCESSABLE_ENTITY");
        assertEquals("INVALID_OPERATION", ex.getErrorCode());
        assertEquals("操作非法", ex.getMessage());
    }

    /* ========== ResourceNotFoundException (404 + RESOURCE_NOT_FOUND) ========== */

    @Test
    @DisplayName("ResourceNotFoundException 应返回 404 + RESOURCE_NOT_FOUND")
    void resourceNotFoundException_shouldReturn404AndErrorCode() {
        // Act
        ResourceNotFoundException ex = new ResourceNotFoundException("帖子不存在");

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, ex.getHttpStatus(),
                "HTTP 状态码应为 404 NOT_FOUND");
        assertEquals("RESOURCE_NOT_FOUND", ex.getErrorCode());
        assertEquals("帖子不存在", ex.getMessage());
    }

    /* ========== MatchAlreadyExistsException (409 + MATCH_ALREADY_EXISTS) ========== */

    @Test
    @DisplayName("MatchAlreadyExistsException 应返回 409 + MATCH_ALREADY_EXISTS")
    void matchAlreadyExistsException_shouldReturn409AndErrorCode() {
        // Act
        MatchAlreadyExistsException ex = new MatchAlreadyExistsException("匹配已存在");

        // Assert
        assertEquals(HttpStatus.CONFLICT, ex.getHttpStatus(),
                "HTTP 状态码应为 409 CONFLICT");
        assertEquals("MATCH_ALREADY_EXISTS", ex.getErrorCode());
        assertEquals("匹配已存在", ex.getMessage());
    }

    /* ========== IdempotencyException (409 + IDEMPOTENT_CONFLICT) ========== */

    @Test
    @DisplayName("IdempotencyException 应返回 409 + IDEMPOTENT_CONFLICT")
    void idempotencyException_shouldReturn409AndErrorCode() {
        // Act
        IdempotencyException ex = new IdempotencyException("重复请求已被拦截");

        // Assert
        assertEquals(HttpStatus.CONFLICT, ex.getHttpStatus(),
                "HTTP 状态码应为 409 CONFLICT");
        assertEquals("IDEMPOTENT_CONFLICT", ex.getErrorCode());
        assertEquals("重复请求已被拦截", ex.getMessage());
        assertTrue(ex instanceof BusinessException);
    }

    /* ========== DailyLimitExceededException (429 + DAILY_LIMIT_EXCEEDED) ========== */

    @Test
    @DisplayName("DailyLimitExceededException 应返回 429 + DAILY_LIMIT_EXCEEDED")
    void dailyLimitExceededException_shouldReturn429AndErrorCode() {
        // Act
        DailyLimitExceededException ex = new DailyLimitExceededException("反悔", 1, "今日反悔次数已用完");

        // Assert
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getHttpStatus(),
                "HTTP 状态码应为 429 TOO_MANY_REQUESTS");
        assertEquals("DAILY_LIMIT_EXCEEDED", ex.getErrorCode());
        assertNotNull(ex.getMessage());
        assertTrue(ex.getMessage().contains("反悔"),
                "message 应包含操作名称");
    }

    @Test
    @DisplayName("DailyLimitExceededException 应携带 operationName 与 dailyLimit")
    void dailyLimitExceededException_shouldCarryOperationNameAndLimit() {
        // Act
        DailyLimitExceededException ex = new DailyLimitExceededException("反悔", 1, "今日反悔次数已用完");

        // Assert
        assertEquals("反悔", ex.getOperationName(),
                "operationName 应为 '反悔'");
        assertEquals(1, ex.getDailyLimit(),
                "dailyLimit 应为 1");
    }

    /* ========== 异常可被 throw 与 catch ========== */

    @Test
    @DisplayName("BusinessException 子类应可被 throw 与 catch(BusinessException)")
    void businessException_shouldBeThrowableAndCatchableByBaseType() {
        // Act & Assert：抛出子类异常，用基类捕获
        try {
            throw new UserNotFoundException(123L);
        } catch (BusinessException ex) {
            // 验证可以通过基类捕获，并访问 errorCode 与 httpStatus
            assertEquals("USER_NOT_FOUND", ex.getErrorCode());
            assertEquals(HttpStatus.NOT_FOUND, ex.getHttpStatus());
        }
    }

    @Test
    @DisplayName("BusinessException 子类应可被 catch(RuntimeException)")
    void businessException_shouldBeCatchableByRuntimeException() {
        // Act & Assert
        try {
            throw new ResourceConflictException("冲突");
        } catch (RuntimeException ex) {
            assertTrue(ex instanceof BusinessException);
            assertEquals("RESOURCE_CONFLICT", ((BusinessException) ex).getErrorCode());
        }
    }

    @Test
    @DisplayName("BusinessException 无 cause 时 getCause 返回 null")
    void businessException_withoutCause_shouldHaveNullCause() {
        // Act
        UserNotFoundException ex = new UserNotFoundException(123L);

        // Assert
        assertNull(ex.getCause(), "无 cause 构造时 getCause 应返回 null");
    }

    @Test
    @DisplayName("BusinessException 的 ERROR_CODE 常量在各子类中独立")
    void businessException_errorCodeShouldBeUniquePerSubclass() {
        // Assert：各子类的 ERROR_CODE 应不同
        assertEquals("USER_NOT_FOUND", UserNotFoundException.ERROR_CODE);
        assertEquals("RESOURCE_CONFLICT", ResourceConflictException.ERROR_CODE);
        assertEquals("OPERATION_FORBIDDEN", OperationForbiddenException.ERROR_CODE);
        assertEquals("INVALID_OPERATION", InvalidOperationException.ERROR_CODE);
        assertEquals("RESOURCE_NOT_FOUND", ResourceNotFoundException.ERROR_CODE);
        assertEquals("MATCH_ALREADY_EXISTS", MatchAlreadyExistsException.ERROR_CODE);
        assertEquals("IDEMPOTENT_CONFLICT", IdempotencyException.ERROR_CODE);
        assertEquals("DAILY_LIMIT_EXCEEDED", DailyLimitExceededException.ERROR_CODE);
    }
}
