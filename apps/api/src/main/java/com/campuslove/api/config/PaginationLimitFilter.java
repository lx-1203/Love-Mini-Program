package com.campuslove.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 统一分页上限过滤器（P2-6，2026-11-03）。
 *
 * <p><b>背景</b>：列表端点的 pageSize/size/limit 上限此前完全依赖各 Controller
 * 手工 {@code @Max} 标注（审查发现 search/discover 逐接口核验不齐，新增端点
 * 漏标即暴露大分页拉全表的风险）。本过滤器在参数解析之前统一钳制：
 * 三个常见分页参数名中任何值 &gt; {@link #MAX_PAGE_SIZE}（100）的都按 100 处理。</p>
 *
 * <p><b>钳制而不是报错</b>：端点自身的 {@code @Max(50)} 等更严校验仍在参数校验层
 * 生效（本过滤器只收上限，不放宽任何既有约束）；超过 100 的值先前多半是 400，
 * 现在按 100 正常返回——「要 500 条」降级为「给 100 条」比报错对客户端更友好，
 * 且彻底封死漏标端点被一次请求拉全表的慢查询面。</p>
 *
 * <p>只包 GET 请求的查询参数：写请求的分页语义不存在，body 不经过本过滤器。</p>
 */
public class PaginationLimitFilter extends OncePerRequestFilter {

    /** 统一上限：与仓内既有最宽的 @Max(100) 口径一致 */
    public static final int MAX_PAGE_SIZE = 100;

    /** 纳入钳制的分页参数名（覆盖仓内三类命名：pageSize / size / limit） */
    private static final String[] PAGE_SIZE_PARAMS = {"pageSize", "size", "limit"};

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 只处理 GET/HEAD（分页语义仅存在于读请求）；写请求原样放行
        String method = request.getMethod();
        if (!"GET".equalsIgnoreCase(method) && !"HEAD".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }
        boolean needsWrap = false;
        for (String name : PAGE_SIZE_PARAMS) {
            String value = request.getParameter(name);
            if (value != null && clampNeeded(value)) {
                needsWrap = true;
                break;
            }
        }
        filterChain.doFilter(needsWrap ? new ClampedRequest(request) : request, response);
    }

    /** 该参数值是否超过统一上限（非数字值不动，交给后续校验层报 400）。 */
    private static boolean clampNeeded(String rawValue) {
        try {
            return Integer.parseInt(rawValue.trim()) > MAX_PAGE_SIZE;
        } catch (NumberFormatException notNumeric) {
            return false;
        }
    }

    /** 超限参数按 100 钳制的请求包装。 */
    static final class ClampedRequest extends HttpServletRequestWrapper {

        private final Map<String, String[]> clampedParameters;

        ClampedRequest(HttpServletRequest request) {
            super(request);
            Map<String, String[]> clamped = new HashMap<>(request.getParameterMap());
            for (String name : PAGE_SIZE_PARAMS) {
                String[] values = clamped.get(name);
                if (values != null) {
                    String[] replaced = new String[values.length];
                    for (int i = 0; i < values.length; i++) {
                        replaced[i] = clampNeeded(values[i])
                                ? String.valueOf(MAX_PAGE_SIZE)
                                : values[i];
                    }
                    clamped.put(name, replaced);
                }
            }
            this.clampedParameters = clamped;
        }

        @Override
        public String getParameter(String name) {
            String[] values = clampedParameters.get(name);
            return values == null || values.length == 0 ? null : values[0];
        }

        @Override
        public Map<String, String[]> getParameterMap() {
            return clampedParameters;
        }

        @Override
        public String[] getParameterValues(String name) {
            return clampedParameters.get(name);
        }
    }
}
