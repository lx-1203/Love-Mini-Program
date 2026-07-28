package com.campuslove.api.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

/**
 * {@link ApiResponse} 单元测试（Task 2.4.6）。
 *
 * <p>覆盖统一响应包装类的核心场景：
 * <ul>
 *   <li>{@link ApiResponse#ok(Object)} 构造成功响应（默认消息 "ok"）</li>
 *   <li>{@link ApiResponse#ok(String, Object)} 构造成功响应（自定义消息）</li>
 *   <li>{@link ApiResponse#empty()} 构造无数据载荷的成功响应</li>
 *   <li>{@link ApiResponse#error(int, String)} 构造失败响应</li>
 *   <li>{@link ApiResponse#isSuccess()} 判断响应是否成功</li>
 *   <li>traceId 从 MDC 读取，MDC 无值时降级为空字符串</li>
 *   <li>常量 {@link ApiResponse#SUCCESS_CODE} / {@link ApiResponse#SUCCESS_MESSAGE} 校验</li>
 * </ul>
 *
 * <p>测试策略：纯单元测试，不依赖 Spring 上下文。通过 {@link MDC} 模拟 traceId
 * 注入，验证 ApiResponse 与 MDC 的集成行为。</p>
 */
@DisplayName("ApiResponse 统一响应包装类测试")
class ApiResponseTest {

    /** 测试用 traceId（UUID 格式，去除横线） */
    private static final String TEST_TRACE_ID = "550e8400e29b41d4a716446655440000";

    /** 测试用业务数据 */
    private static final String TEST_DATA = "test-payload";

    @BeforeEach
    void setUp() {
        // 清空 MDC，避免上一用例残留
        MDC.clear();
    }

    @AfterEach
    void tearDown() {
        // 清空 MDC，避免影响后续测试
        MDC.clear();
    }

    /* ========== 常量校验 ========== */

    @Test
    @DisplayName("SUCCESS_CODE 常量应为 0")
    void successCode_constantShouldBeZero() {
        assertEquals(0, ApiResponse.SUCCESS_CODE, "成功状态码应为 0");
    }

    @Test
    @DisplayName("SUCCESS_MESSAGE 常量应为 'ok'")
    void successMessage_constantShouldBeOk() {
        assertEquals("ok", ApiResponse.SUCCESS_MESSAGE, "成功消息应为 'ok'");
    }

    /* ========== ok(T data) 方法 ========== */

    @Test
    @DisplayName("ok(data) 应返回成功响应，code=0, message='ok', data=传入值, traceId 来自 MDC")
    void ok_withData_shouldReturnSuccessResponse() {
        // Arrange：注入 traceId 到 MDC
        MDC.put("traceId", TEST_TRACE_ID);

        // Act
        ApiResponse<String> response = ApiResponse.ok(TEST_DATA);

        // Assert
        assertEquals(ApiResponse.SUCCESS_CODE, response.code(), "code 应为成功码 0");
        assertEquals(ApiResponse.SUCCESS_MESSAGE, response.message(), "message 应为默认 'ok'");
        assertEquals(TEST_DATA, response.data(), "data 应为传入的 payload");
        assertEquals(TEST_TRACE_ID, response.traceId(), "traceId 应从 MDC 读取");
        assertTrue(response.isSuccess(), "isSuccess 应返回 true");
    }

    @Test
    @DisplayName("ok(data) 在 MDC 无 traceId 时应降级为空字符串")
    void ok_withoutMdcTraceId_shouldFallbackToEmptyString() {
        // Arrange：MDC 不设置 traceId

        // Act
        ApiResponse<String> response = ApiResponse.ok(TEST_DATA);

        // Assert
        assertEquals("", response.traceId(), "MDC 无 traceId 时应降级为空字符串");
        assertTrue(response.isSuccess(), "isSuccess 仍应返回 true");
    }

    /* ========== ok(String message, T data) 方法 ========== */

    @Test
    @DisplayName("ok(message, data) 应使用自定义消息")
    void ok_withCustomMessage_shouldUseCustomMessage() {
        // Arrange
        MDC.put("traceId", TEST_TRACE_ID);
        String customMessage = "操作成功";

        // Act
        ApiResponse<String> response = ApiResponse.ok(customMessage, TEST_DATA);

        // Assert
        assertEquals(customMessage, response.message(), "message 应为自定义值");
        assertEquals(TEST_DATA, response.data(), "data 应为传入的 payload");
        assertEquals(TEST_TRACE_ID, response.traceId(), "traceId 应从 MDC 读取");
        assertTrue(response.isSuccess(), "isSuccess 应返回 true");
    }

    /* ========== empty() 方法 ========== */

    @Test
    @DisplayName("empty() 应返回无数据载荷的成功响应")
    void empty_shouldReturnSuccessResponseWithoutData() {
        // Arrange
        MDC.put("traceId", TEST_TRACE_ID);

        // Act
        ApiResponse<Void> response = ApiResponse.empty();

        // Assert
        assertEquals(ApiResponse.SUCCESS_CODE, response.code(), "code 应为成功码 0");
        assertEquals(ApiResponse.SUCCESS_MESSAGE, response.message(), "message 应为默认 'ok'");
        assertNull(response.data(), "data 应为 null");
        assertEquals(TEST_TRACE_ID, response.traceId(), "traceId 应从 MDC 读取");
        assertTrue(response.isSuccess(), "isSuccess 应返回 true");
    }

    /* ========== error(int code, String message) 方法 ========== */

    @Test
    @DisplayName("error(code, message) 应返回失败响应")
    void error_shouldReturnErrorResponse() {
        // Arrange
        MDC.put("traceId", TEST_TRACE_ID);
        int errorCode = 1001;
        String errorMessage = "用户不存在";

        // Act
        ApiResponse<Object> response = ApiResponse.error(errorCode, errorMessage);

        // Assert
        assertEquals(errorCode, response.code(), "code 应为错误码");
        assertEquals(errorMessage, response.message(), "message 应为错误消息");
        assertNull(response.data(), "data 应为 null");
        assertEquals(TEST_TRACE_ID, response.traceId(), "traceId 应从 MDC 读取");
    }

    @Test
    @DisplayName("error(code, message) 的 isSuccess 应返回 false（code != 0）")
    void error_isSuccessShouldReturnFalseWhenCodeNonZero() {
        // Arrange
        MDC.put("traceId", TEST_TRACE_ID);

        // Act
        ApiResponse<Object> response = ApiResponse.error(500, "服务器内部错误");

        // Assert
        assertNotNull(response);
        assertEquals(false, response.isSuccess(), "code != 0 时 isSuccess 应返回 false");
    }

    @Test
    @DisplayName("error(0, message) 的 isSuccess 应返回 true（边界场景：code=0）")
    void error_isSuccessShouldReturnTrueWhenCodeIsZero() {
        // Arrange
        MDC.put("traceId", TEST_TRACE_ID);

        // Act：尽管使用 error 方法，但 code=0 时 isSuccess 仍返回 true
        // 这是因为 isSuccess 仅根据 code 判断，与方法名无关
        ApiResponse<Object> response = ApiResponse.error(0, "边界场景");

        // Assert
        assertTrue(response.isSuccess(), "code=0 时 isSuccess 应返回 true");
    }

    /* ========== traceId 集成 ========== */

    @Test
    @DisplayName("traceId 应实时读取 MDC，多次调用应反映 MDC 变化")
    void traceId_shouldReflectMdcChanges() {
        // Arrange：第一次设置 traceId
        MDC.put("traceId", "trace-id-1");

        // Act：构造第一个响应
        ApiResponse<String> response1 = ApiResponse.ok(TEST_DATA);

        // 修改 MDC 中的 traceId
        MDC.put("traceId", "trace-id-2");

        // Act：构造第二个响应
        ApiResponse<String> response2 = ApiResponse.ok(TEST_DATA);

        // Assert：两个响应应携带不同的 traceId
        assertEquals("trace-id-1", response1.traceId(), "第一个响应应携带第一次的 traceId");
        assertEquals("trace-id-2", response2.traceId(), "第二个响应应携带第二次的 traceId");
    }

    @Test
    @DisplayName("traceId 在 MDC 被清除后应降级为空字符串")
    void traceId_shouldFallbackToEmptyAfterMdcClear() {
        // Arrange：先设置 traceId
        MDC.put("traceId", TEST_TRACE_ID);
        ApiResponse<String> response1 = ApiResponse.ok(TEST_DATA);
        assertEquals(TEST_TRACE_ID, response1.traceId());

        // Act：清除 MDC 后再构造响应
        MDC.clear();
        ApiResponse<String> response2 = ApiResponse.ok(TEST_DATA);

        // Assert
        assertEquals("", response2.traceId(), "MDC 清除后 traceId 应降级为空字符串");
    }

    /* ========== 不同数据类型 ========== */

    @Test
    @DisplayName("ok(data) 应支持任意类型的数据载荷")
    void ok_shouldSupportAnyDataType() {
        // Arrange
        MDC.put("traceId", TEST_TRACE_ID);

        // Act：测试 Integer 类型
        ApiResponse<Integer> intResponse = ApiResponse.ok(42);
        // 测试 Long 类型
        ApiResponse<Long> longResponse = ApiResponse.ok(123L);
        // 测试复杂对象
        TestDto dto = new TestDto("alice", 25);
        ApiResponse<TestDto> dtoResponse = ApiResponse.ok(dto);

        // Assert
        assertEquals(42, intResponse.data());
        assertEquals(123L, longResponse.data());
        assertNotNull(dtoResponse.data());
        assertEquals("alice", dtoResponse.data().name());
        assertEquals(25, dtoResponse.data().age());
    }

    /** 测试用 DTO record */
    private record TestDto(String name, int age) {}
}
