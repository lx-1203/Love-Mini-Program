package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;

/**
 * {@link TraceIdFilter} 请求追踪 ID 过滤器单元测试（Task 2.6.4）。
 *
 * <p>覆盖核心场景：
 * <ul>
 *   <li>无 X-Trace-Id 请求头 → 生成 32 字符 UUID（去除横线）</li>
 *   <li>合法 X-Trace-Id 请求头 → 复用上游 traceId</li>
 *   <li>非法 X-Trace-Id（含特殊字符）→ 降级为新 UUID，防日志注入</li>
 *   <li>非法 X-Trace-Id（长度 &lt; 8）→ 降级为新 UUID</li>
 *   <li>非法 X-Trace-Id（长度 &gt; 128）→ 降级为新 UUID</li>
 *   <li>MDC 注入与清除：filter 执行期间 MDC 必须有 traceId，执行后必须清除</li>
 *   <li>响应头 X-Trace-Id 被正确设置</li>
 *   <li>filterChain.doFilter 被调用</li>
 *   <li>filterChain 抛异常时 MDC 仍应被清除（finally 块）</li>
 * </ul>
 *
 * <p>测试策略：纯 Mockito，模拟 HttpServletRequest / HttpServletResponse / FilterChain。
 * 关键点：TraceIdFilter 在 finally 块中清除 MDC，因此测试需在 filterChain.doFilter()
 * 执行期间通过 doAnswer 捕获 MDC 状态，而非在 filter 返回后检查。</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TraceIdFilter 请求追踪 ID 过滤器测试")
class TraceIdFilterTest {

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private TraceIdFilter filter;

    @BeforeEach
    void setUp() {
        filter = new TraceIdFilter();
        // 清空 MDC，避免上一用例残留
        MDC.clear();
    }

    @AfterEach
    void tearDown() {
        // 清空 MDC，避免影响后续测试
        MDC.clear();
    }

    /**
     * 在 filterChain.doFilter() 执行期间捕获 MDC 中的 traceId。
     *
     * <p>TraceIdFilter 在 finally 块中清除 MDC，因此不能在 filter 返回后检查 MDC。
     * 本方法通过 doAnswer 在 filterChain.doFilter() 被调用的瞬间读取 MDC，
     * 捕获到的值即为 filter 设置的 traceId。</p>
     *
     * @return 捕获到的 traceId（数组形式，便于 lambda 引用）
     */
    private String[] captureMdcDuringFilterChain() throws ServletException, IOException {
        final String[] captured = new String[1];
        doAnswer(invocation -> {
            // 在 filterChain.doFilter() 执行期间读取 MDC
            captured[0] = MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY);
            return null;
        }).when(filterChain).doFilter(any(), any());
        return captured;
    }

    /* ========== 场景 1：无 X-Trace-Id 请求头 → 生成新 UUID ========== */

    @Test
    @DisplayName("无 X-Trace-Id 请求头 → 生成 32 字符 UUID（去除横线）")
    void doFilter_whenNoTraceIdHeader_shouldGenerateNewUuid() throws ServletException, IOException {
        // Arrange
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(null);
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：MDC 应注入 traceId（在 filterChain 执行期间捕获）
        String traceId = captured[0];
        assertNotNull(traceId, "MDC 中应注入 traceId");
        assertEquals(32, traceId.length(), "traceId 应为 32 字符 UUID（去除横线）");
        assertFalse(traceId.contains("-"), "traceId 不应包含横线");

        // Assert：响应头应被设置
        verify(response).setHeader(TraceIdFilter.TRACE_ID_HEADER, traceId);
        // Assert：filterChain 应被调用
        verify(filterChain).doFilter(request, response);
    }

    /* ========== 场景 2：合法 X-Trace-Id → 复用上游 traceId ========== */

    @Test
    @DisplayName("合法 X-Trace-Id（32 字符 UUID）→ 复用上游 traceId")
    void doFilter_whenValidTraceIdHeader_shouldReuseUpstreamTraceId() throws ServletException, IOException {
        // Arrange
        String upstreamTraceId = "550e8400e29b41d4a716446655440000";
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(upstreamTraceId);
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：MDC 应注入上游 traceId
        assertEquals(upstreamTraceId, captured[0],
                "MDC 中 traceId 应为上游传入的值");

        // Assert：响应头应与上游一致
        verify(response).setHeader(TraceIdFilter.TRACE_ID_HEADER, upstreamTraceId);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("合法 X-Trace-Id（含短横线，长度 ≥ 8）→ 复用上游 traceId")
    void doFilter_whenValidTraceIdWithHyphens_shouldReuseUpstreamTraceId() throws ServletException, IOException {
        // Arrange：标准 UUID 格式（含短横线，36 字符）
        String upstreamTraceId = "550e8400-e29b-41d4-a716-446655440000";
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(upstreamTraceId);
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert
        assertEquals(upstreamTraceId, captured[0]);
        verify(response).setHeader(TraceIdFilter.TRACE_ID_HEADER, upstreamTraceId);
        verify(filterChain).doFilter(request, response);
    }

    /* ========== 场景 3：非法 X-Trace-Id（含特殊字符）→ 降级为新 UUID ========== */

    @Test
    @DisplayName("非法 X-Trace-Id（含换行符，日志注入攻击）→ 降级为新 UUID")
    void doFilter_whenTraceIdContainsNewline_shouldDegradeToNewUuid() throws ServletException, IOException {
        // Arrange：恶意 traceId 尝试日志注入
        String maliciousTraceId = "abc12345\nFAKE_LOG_LINE";
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(maliciousTraceId);
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：MDC 中的 traceId 不应包含换行符
        String traceId = captured[0];
        assertNotNull(traceId);
        assertFalse(traceId.contains("\n"), "traceId 不应包含换行符（防日志注入）");
        assertFalse(traceId.contains("FAKE_LOG_LINE"), "traceId 不应包含恶意内容");
        assertEquals(32, traceId.length(), "应降级为 32 字符 UUID");

        verify(response).setHeader(TraceIdFilter.TRACE_ID_HEADER, traceId);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("非法 X-Trace-Id（含空格）→ 降级为新 UUID")
    void doFilter_whenTraceIdContainsSpace_shouldDegradeToNewUuid() throws ServletException, IOException {
        // Arrange
        String invalidTraceId = "trace id with spaces";
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(invalidTraceId);
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert
        String traceId = captured[0];
        assertNotNull(traceId);
        assertFalse(traceId.contains(" "), "traceId 不应包含空格");
        assertEquals(32, traceId.length());
    }

    /* ========== 场景 4：非法 X-Trace-Id（长度 < 8）→ 降级为新 UUID ========== */

    @Test
    @DisplayName("非法 X-Trace-Id（长度 < 8）→ 降级为新 UUID")
    void doFilter_whenTraceIdTooShort_shouldDegradeToNewUuid() throws ServletException, IOException {
        // Arrange：长度仅 7 字符（小于最小长度 8）
        String shortTraceId = "abc1234";
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(shortTraceId);
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert
        String traceId = captured[0];
        assertNotNull(traceId);
        assertEquals(32, traceId.length(), "应降级为 32 字符 UUID");
        assertFalse(traceId.equals(shortTraceId), "不应使用过短的 traceId");
    }

    /* ========== 场景 5：非法 X-Trace-Id（长度 > 128）→ 降级为新 UUID ========== */

    @Test
    @DisplayName("非法 X-Trace-Id（长度 > 128）→ 降级为新 UUID")
    void doFilter_whenTraceIdTooLong_shouldDegradeToNewUuid() throws ServletException, IOException {
        // Arrange：构造长度 129 的 traceId（超过最大长度 128）
        StringBuilder sb = new StringBuilder(129);
        for (int i = 0; i < 129; i++) {
            sb.append('a');
        }
        String tooLongTraceId = sb.toString();
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(tooLongTraceId);
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert
        String traceId = captured[0];
        assertNotNull(traceId);
        assertEquals(32, traceId.length(), "应降级为 32 字符 UUID");
        assertTrue(traceId.length() <= 128, "traceId 长度应 ≤ 128");
    }

    /* ========== 场景 6：MDC 在 filter 完成后必须清除 ========== */

    @Test
    @DisplayName("filter 执行完毕后 MDC 应清除 traceId（避免线程池复用串流）")
    void doFilter_afterCompletion_shouldClearMdc() throws ServletException, IOException {
        // Arrange
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(null);
        captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：filter 执行完毕后，MDC 应已清除（finally 块）
        assertNull(MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY),
                "filter 完成后 MDC 应清除 traceId，避免线程池复用串流");
    }

    /* ========== 场景 7：filterChain 抛异常时 MDC 仍应清除（finally 块） ========== */

    @Test
    @DisplayName("filterChain 抛异常时 MDC 仍应清除（finally 块保障）")
    void doFilter_whenFilterChainThrowsException_shouldStillClearMdc() throws ServletException, IOException {
        // Arrange：filterChain 抛出 ServletException
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(null);
        doThrow(new ServletException("downstream error"))
                .when(filterChain).doFilter(any(), any());

        // Act & Assert：异常应向上抛出，但 MDC 应被清除
        ServletException ex = assertThrows(ServletException.class,
                () -> filter.doFilterInternal(request, response, filterChain));
        assertEquals("downstream error", ex.getMessage());

        // Assert：MDC 仍应被清除（finally 块保障）
        assertNull(MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY),
                "即使 filterChain 抛异常，MDC 也应被清除");

        // Assert：响应头仍应被设置（在 doFilter 之前）
        verify(response).setHeader(eq(TraceIdFilter.TRACE_ID_HEADER), anyString());
    }

    /* ========== 场景 8：响应头 X-Trace-Id 应被设置 ========== */

    @Test
    @DisplayName("响应头 X-Trace-Id 应被设置为最终 traceId")
    void doFilter_shouldSetResponseHeader() throws ServletException, IOException {
        // Arrange
        String upstreamTraceId = "valid-trace-id-001";
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(upstreamTraceId);

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：响应头应与 traceId 一致
        verify(response).setHeader(TraceIdFilter.TRACE_ID_HEADER, upstreamTraceId);
    }

    /* ========== 场景 9：空字符串 X-Trace-Id → 视为缺失，生成新 UUID ========== */

    @Test
    @DisplayName("空字符串 X-Trace-Id → 视为缺失，生成新 UUID")
    void doFilter_whenEmptyTraceIdHeader_shouldGenerateNewUuid() throws ServletException, IOException {
        // Arrange
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn("");
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert
        String traceId = captured[0];
        assertNotNull(traceId, "空字符串应视为缺失，生成新 UUID");
        assertEquals(32, traceId.length());
    }

    /* ========== 场景 10：纯空白 X-Trace-Id → 视为缺失 ========== */

    @Test
    @DisplayName("纯空白 X-Trace-Id → 视为缺失，生成新 UUID")
    void doFilter_whenBlankTraceIdHeader_shouldGenerateNewUuid() throws ServletException, IOException {
        // Arrange
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn("   ");
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert
        String traceId = captured[0];
        assertNotNull(traceId);
        assertEquals(32, traceId.length());
        assertFalse(traceId.contains(" "));
    }

    /* ========== 场景 11：边界长度 8 的 traceId 应被接受 ========== */

    @Test
    @DisplayName("边界长度 8 的 X-Trace-Id → 合法，复用上游 traceId")
    void doFilter_whenTraceIdLengthIs8_shouldReuse() throws ServletException, IOException {
        // Arrange：恰好 8 字符（最小合法长度）
        String boundaryTraceId = "abcd1234";
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(boundaryTraceId);
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert
        assertEquals(boundaryTraceId, captured[0],
                "长度 8 的 traceId 应被接受");
        verify(response).setHeader(TraceIdFilter.TRACE_ID_HEADER, boundaryTraceId);
    }

    /* ========== 场景 12：边界长度 128 的 traceId 应被接受 ========== */

    @Test
    @DisplayName("边界长度 128 的 X-Trace-Id → 合法，复用上游 traceId")
    void doFilter_whenTraceIdLengthIs128_shouldReuse() throws ServletException, IOException {
        // Arrange：构造长度 128 的 traceId（最大合法长度）
        StringBuilder sb = new StringBuilder(128);
        for (int i = 0; i < 128; i++) {
            sb.append('a');
        }
        String boundaryTraceId = sb.toString();
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(boundaryTraceId);
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert
        assertEquals(boundaryTraceId, captured[0],
                "长度 128 的 traceId 应被接受");
    }

    /* ========== 场景 13：生成的 UUID 应为合法格式（去除横线） ========== */

    @Test
    @DisplayName("生成的 traceId 应为合法 UUID 格式（32 字符十六进制）")
    void doFilter_generatedTraceId_shouldBeValidUuidFormat() throws ServletException, IOException {
        // Arrange
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(null);
        String[] captured = captureMdcDuringFilterChain();

        // Act
        filter.doFilterInternal(request, response, filterChain);

        // Assert：UUID 去除横线后应为 32 字符十六进制
        String traceId = captured[0];
        assertNotNull(traceId);
        assertTrue(traceId.matches("^[a-fA-F0-9]{32}$"),
                "生成的 traceId 应为 32 字符十六进制，实际: " + traceId);
    }

    /* ========== 场景 14：每次请求生成不同的 traceId ========== */

    @Test
    @DisplayName("两次无 X-Trace-Id 请求应生成不同的 traceId")
    void doFilter_twoRequestsWithoutHeader_shouldGenerateDifferentTraceIds() throws ServletException, IOException {
        // Arrange
        when(request.getHeader(TraceIdFilter.TRACE_ID_HEADER)).thenReturn(null);
        String[] captured1 = new String[1];
        String[] captured2 = new String[1];
        doAnswer(invocation -> {
            captured1[0] = MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY);
            return null;
        }).when(filterChain).doFilter(any(), any());

        // Act：第一次请求
        filter.doFilterInternal(request, response, filterChain);
        String traceId1 = captured1[0];
        assertNotNull(traceId1);

        // 重置 mock 以便第二次调用
        org.mockito.Mockito.reset(filterChain);
        doAnswer(invocation -> {
            captured2[0] = MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY);
            return null;
        }).when(filterChain).doFilter(any(), any());

        // Act：第二次请求
        filter.doFilterInternal(request, response, filterChain);
        String traceId2 = captured2[0];
        assertNotNull(traceId2);

        // Assert：两次生成的 traceId 应不同
        assertFalse(traceId1.equals(traceId2),
                "两次请求应生成不同的 traceId，但实际均为: " + traceId1);
    }
}
