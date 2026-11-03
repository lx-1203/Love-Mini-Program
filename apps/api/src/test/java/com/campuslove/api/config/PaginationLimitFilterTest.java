package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import jakarta.servlet.ServletException;
import java.io.IOException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/**
 * P2-6（2026-11-03）：统一分页上限过滤器测试。
 *
 * <p>判点：pageSize/size/limit 超过 100 一律按 100 钳制；≤100 的值原样保留；
 * 非数字值不动（交给参数校验层报 400）；GET/HEAD 之外的请求不包。</p>
 */
class PaginationLimitFilterTest {

    /** 跑一遍过滤器，返回过滤链（chain.getRequest() 即包装后的请求）。 */
    private static MockFilterChain chainOf(String name, String value) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/posts");
        request.addParameter(name, value);
        MockFilterChain chain = new MockFilterChain();
        try {
            new PaginationLimitFilter().doFilter(request, new MockHttpServletResponse(), chain);
        } catch (IOException | ServletException e) {
            throw new IllegalStateException(e);
        }
        return chain;
    }

    /** 从过滤链透出的请求（可能已被包装）读参数。 */
    private static String paramOf(MockFilterChain chain, String name) {
        return ((jakarta.servlet.ServletRequest) chain.getRequest()).getParameter(name);
    }

    @Test
    @DisplayName("pageSize=500 → 钳制为 100；size/limit 同口径")
    void oversizedParams_areClamped() {
        assertEquals("100", paramOf(chainOf("pageSize", "500"), "pageSize"));
        assertEquals("100", paramOf(chainOf("size", "100000"), "size"));
        assertEquals("100", paramOf(chainOf("limit", "999"), "limit"));
    }

    @Test
    @DisplayName("未超限值原样保留（不放宽端点自身更严的 @Max 校验）")
    void normalParams_passThrough() {
        assertEquals("20", paramOf(chainOf("pageSize", "20"), "pageSize"));
        assertEquals("100", paramOf(chainOf("pageSize", "100"), "pageSize"));
        assertEquals("1", paramOf(chainOf("page", "1"), "page"), "非分页尺寸参数不动");
    }

    @Test
    @DisplayName("非数字值不动——交给 @Min/@Max 校验层报 400，而不是这里猜")
    void nonNumericParams_untouched() {
        assertEquals("abc", paramOf(chainOf("pageSize", "abc"), "pageSize"));
    }
}
