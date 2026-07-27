package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

/**
 * WebConfig CORS 配置单元测试（Task 0.6.2）。
 *
 * <p>验证 {@link WebConfig} 的 CORS 配置正确：
 * <ul>
 *   <li>允许的源被正确解析（去空白、去空项）</li>
 *   <li>使用 {@code allowedOriginPatterns}（而非 {@code allowedOrigins}）支持凭据跨域</li>
 *   <li>允许的方法 / 头部 / 凭据 / maxAge 配置正确</li>
 *   <li>空配置时不注册 CORS（避免误开放跨域）</li>
 * </ul>
 * </p>
 *
 * <p>测试策略：纯 Mockito 单元测试，不加载 Spring 上下文，避免被
 * {@code @SpringBootTest} 全量加载应用上下文时触发其他控制器对
 * JPA Repository 的依赖（mock profile 下 JPA 已被排除）。
 * 通过反射注入 {@code allowedOrigins} 字段（模拟 @Value 注入），
 * 通过 mock {@link CorsRegistry} / {@link CorsRegistration} 验证注册调用。</p>
 *
 * <p>测试覆盖的源列表（与 application.yml 默认值保持一致）：
 * http://localhost:5173 / 5174 / 5177 / 127.0.0.1:5173 / 5174 / 5177</p>
 */
class WebConfigTest {

    /** 默认配置中允许的源（与 application.yml 默认值一致） */
    private static final String ALLOWED_ORIGIN = "http://localhost:5173";
    /** 默认配置中不允许的源（未在 allowed-origins 列表中） */
    private static final String DISALLOWED_ORIGIN = "https://evil.example.com";

    /** 测试用 allowed-origins 列表（模拟 @Value 注入后的 List<String>） */
    private static final List<String> ALLOWED_ORIGINS_LIST = List.of(
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5177",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5177");

    /**
     * 场景 1：getAllowedOrigins() 应正确返回配置的源列表。
     *
     * <p>验证：当 @Value 正确注入 allowedOrigins 字段后，
     * {@link WebConfig#getAllowedOrigins()} 返回与配置一致的源列表（去空白、去空项）。</p>
     */
    @Test
    void getAllowedOrigins_withConfiguredOrigins_shouldReturnCleanedList() {
        WebConfig webConfig = new WebConfig();
        setAllowedOriginsField(webConfig, ALLOWED_ORIGINS_LIST);

        List<String> result = webConfig.getAllowedOrigins();

        assertNotNull(result, "getAllowedOrigins 不应返回 null");
        assertEquals(ALLOWED_ORIGINS_LIST.size(), result.size(),
                "返回的源数量应与配置一致");
        assertTrue(result.contains(ALLOWED_ORIGIN),
                "应包含允许的源: " + ALLOWED_ORIGIN);
        assertFalse(result.contains(DISALLOWED_ORIGIN),
                "不应包含未配置的源: " + DISALLOWED_ORIGIN);
    }

    /**
     * 场景 2：getAllowedOrigins() 应去除空白字符与空项。
     *
     * <p>验证：当配置中包含前导/尾随空白与空字符串时，
     * {@link WebConfig#getAllowedOrigins()} 返回清理后的列表。</p>
     */
    @Test
    void getAllowedOrigins_withWhitespaceAndEmptyEntries_shouldTrimAndFilter() {
        WebConfig webConfig = new WebConfig();
        setAllowedOriginsField(webConfig, List.of(
                "  http://localhost:5173  ",
                "",
                "  ",
                "http://localhost:5174"
        ));

        List<String> result = webConfig.getAllowedOrigins();

        assertEquals(2, result.size(), "应去除空白与空项后返回 2 个源");
        assertTrue(result.contains("http://localhost:5173"),
                "应去除前后空白后包含 http://localhost:5173");
        assertTrue(result.contains("http://localhost:5174"),
                "应包含 http://localhost:5174");
        assertFalse(result.contains(""),
                "不应包含空字符串");
        assertFalse(result.contains("  "),
                "不应包含纯空白字符串");
    }

    /**
     * 场景 3：getAllowedOrigins() 在字段为 null 时返回空列表。
     *
     * <p>验证：当 @Value 注入失败导致 allowedOrigins 为 null 时，
     * {@link WebConfig#getAllowedOrigins()} 安全降级返回空列表，不抛 NPE。</p>
     */
    @Test
    void getAllowedOrigins_withNullField_shouldReturnEmptyList() {
        WebConfig webConfig = new WebConfig();
        // 不设置 allowedOrigins 字段，默认为 null

        List<String> result = webConfig.getAllowedOrigins();

        assertNotNull(result, "null 字段时应返回非 null 的空列表");
        assertTrue(result.isEmpty(), "null 字段时应返回空列表");
    }

    /**
     * 场景 4：addCorsMappings() 在配置了允许的源时，应注册 /api/** 路径的 CORS。
     *
     * <p>验证关键调用：
     * <ul>
     *   <li>调用 {@link CorsRegistry#addMapping(String)} 注册 {@code /api/**} 路径</li>
     *   <li>使用 {@link CorsRegistration#allowedOriginPatterns(String...)} 而非
     *       {@link CorsRegistration#allowedOrigins(String...)}（支持凭据跨域）</li>
     *   <li>allowedOriginPatterns 包含配置中所有允许的源</li>
     *   <li>调用 allowedMethods 包含 GET/POST/PUT/DELETE/OPTIONS/PATCH</li>
     *   <li>调用 allowedHeaders 包含 Authorization/Content-Type/X-Requested-With</li>
     *   <li>调用 allowCredentials(true)</li>
     *   <li>调用 maxAge(3600L)</li>
     * </ul>
     * </p>
     *
     * <p>关键断言：必须使用 {@code allowedOriginPatterns} 而非 {@code allowedOrigins}。
     * 因为 Spring 6 严格模式下当 {@code allowCredentials=true} 时禁止 {@code allowedOrigins} 使用 {@code "*"}，
     * 必须使用 {@code allowedOriginPatterns} 才能支持跨域凭据。</p>
     */
    @Test
    void addCorsMappings_withAllowedOrigins_shouldRegisterCorsWithAllowedOriginPatterns() {
        WebConfig webConfig = new WebConfig();
        setAllowedOriginsField(webConfig, ALLOWED_ORIGINS_LIST);

        CorsRegistry registry = mock(CorsRegistry.class);
        CorsRegistration registration = mock(CorsRegistration.class);
        when(registry.addMapping("/api/**")).thenReturn(registration);
        // 链式调用：所有方法都返回 registration 自身
        when(registration.allowedOriginPatterns(any(String[].class))).thenReturn(registration);
        when(registration.allowedMethods(any(String[].class))).thenReturn(registration);
        when(registration.allowedHeaders(any(String[].class))).thenReturn(registration);
        when(registration.exposedHeaders(any(String[].class))).thenReturn(registration);
        when(registration.allowCredentials(true)).thenReturn(registration);
        when(registration.maxAge(3600L)).thenReturn(registration);

        // 执行
        webConfig.addCorsMappings(registry);

        // 验证：注册了 /api/** 路径
        verify(registry, times(1)).addMapping("/api/**");

        // 验证：使用 allowedOriginPatterns（不是 allowedOrigins）
        verify(registration, times(1)).allowedOriginPatterns(any(String[].class));
        verify(registration, never()).allowedOrigins(any(String[].class));

        // 验证：allowedOriginPatterns 包含所有配置的源
        // 通过 ArgumentCaptor 捕获参数验证
        org.mockito.ArgumentCaptor<String[]> originCaptor =
                org.mockito.ArgumentCaptor.forClass(String[].class);
        verify(registration).allowedOriginPatterns(originCaptor.capture());
        List<String> capturedOrigins = List.of(originCaptor.getValue());
        for (String expected : ALLOWED_ORIGINS_LIST) {
            assertTrue(capturedOrigins.contains(expected),
                    "allowedOriginPatterns 应包含: " + expected);
        }
        assertFalse(capturedOrigins.contains(DISALLOWED_ORIGIN),
                "allowedOriginPatterns 不应包含未授权源: " + DISALLOWED_ORIGIN);

        // 验证：允许的方法包含 GET（关键方法之一）
        org.mockito.ArgumentCaptor<String[]> methodsCaptor =
                org.mockito.ArgumentCaptor.forClass(String[].class);
        verify(registration).allowedMethods(methodsCaptor.capture());
        List<String> capturedMethods = List.of(methodsCaptor.getValue());
        assertTrue(capturedMethods.contains("GET"), "应允许 GET 方法");
        assertTrue(capturedMethods.contains("POST"), "应允许 POST 方法");
        assertTrue(capturedMethods.contains("OPTIONS"), "应允许 OPTIONS 方法（preflight）");
        assertTrue(capturedMethods.contains("DELETE"), "应允许 DELETE 方法");

        // 验证：允许的头部包含 Authorization（鉴权头）
        org.mockito.ArgumentCaptor<String[]> headersCaptor =
                org.mockito.ArgumentCaptor.forClass(String[].class);
        verify(registration).allowedHeaders(headersCaptor.capture());
        List<String> capturedHeaders = List.of(headersCaptor.getValue());
        assertTrue(capturedHeaders.contains("Authorization"), "应允许 Authorization 头");
        assertTrue(capturedHeaders.contains("Content-Type"), "应允许 Content-Type 头");

        // 验证：允许凭据跨域
        verify(registration, times(1)).allowCredentials(true);

        // 验证：maxAge 为 3600 秒（1 小时）
        verify(registration, times(1)).maxAge(3600L);
    }

    /**
     * 场景 5：addCorsMappings() 在空配置时不注册 CORS（避免误开放跨域）。
     *
     * <p>验证：当 {@code app.cors.allowed-origins} 为空列表时，
     * {@link WebConfig#addCorsMappings} 直接 return，不调用
     * {@link CorsRegistry#addMapping(String)}。</p>
     *
     * <p>这是安全降级行为：宁可禁用 CORS 也不误开放跨域。</p>
     */
    @Test
    void addCorsMappings_withEmptyOrigins_shouldNotRegisterAnyMapping() {
        WebConfig webConfig = new WebConfig();
        setAllowedOriginsField(webConfig, List.of());

        CorsRegistry registry = mock(CorsRegistry.class);

        webConfig.addCorsMappings(registry);

        // 空 origins 时不调用 addMapping
        verify(registry, never()).addMapping(anyString());
    }

    /**
     * 场景 6：addCorsMappings() 在 null 字段时同样不注册 CORS。
     *
     * <p>验证：当 allowedOrigins 字段为 null 时（注入失败），
     * {@link WebConfig#addCorsMappings} 安全降级，不抛 NPE，不注册 CORS。</p>
     */
    @Test
    void addCorsMappings_withNullField_shouldNotRegisterAnyMapping() {
        WebConfig webConfig = new WebConfig();
        // 不设置 allowedOrigins 字段，默认为 null

        CorsRegistry registry = mock(CorsRegistry.class);

        webConfig.addCorsMappings(registry);

        verify(registry, never()).addMapping(anyString());
    }

    /**
     * 场景 7：parseOrigins() 静态方法正确解析逗号分隔的字符串。
     *
     * <p>验证 {@link WebConfig#parseOrigins(String)} 工具方法：
     * <ul>
     *   <li>去除前后空白</li>
     *   <li>过滤空项</li>
     *   <li>null / 空字符串返回空列表</li>
     * </ul>
     * </p>
     */
    @Test
    void parseOrigins_shouldSplitAndTrimAndFilter() {
        // 正常解析
        List<String> result1 = WebConfig.parseOrigins(
                "http://localhost:5173, http://localhost:5174 ,http://127.0.0.1:5177");
        assertEquals(3, result1.size(), "应解析出 3 个源");
        assertEquals("http://localhost:5173", result1.get(0));
        assertEquals("http://localhost:5174", result1.get(1));
        assertEquals("http://127.0.0.1:5177", result1.get(2));

        // 包含空项
        List<String> result2 = WebConfig.parseOrigins("http://a.com,, http://b.com, ");
        assertEquals(2, result2.size(), "应过滤空项后返回 2 个源");
        assertTrue(result2.contains("http://a.com"));
        assertTrue(result2.contains("http://b.com"));

        // null 输入
        List<String> result3 = WebConfig.parseOrigins(null);
        assertNotNull(result3, "null 输入应返回非 null 的空列表");
        assertTrue(result3.isEmpty(), "null 输入应返回空列表");

        // 空字符串输入
        List<String> result4 = WebConfig.parseOrigins("");
        assertNotNull(result4, "空字符串输入应返回非 null 的空列表");
        assertTrue(result4.isEmpty(), "空字符串输入应返回空列表");

        // 纯空白输入
        List<String> result5 = WebConfig.parseOrigins("   ");
        assertNotNull(result5, "纯空白输入应返回非 null 的空列表");
        assertTrue(result5.isEmpty(), "纯空白输入应返回空列表");
    }

    /**
     * 场景 8：WebConfig 应实现 {@link org.springframework.web.servlet.config.annotation.WebMvcConfigurer}
     * 接口（间接与 CORS 配置相关）。
     *
     * <p>验证：{@link WebConfig} 实现了 {@link org.springframework.web.servlet.config.annotation.WebMvcConfigurer}
     * 接口，使得 {@code addCorsMappings} 能被 Spring 容器自动调用。</p>
     */
    @Test
    void webConfig_shouldImplementWebMvcConfigurer() {
        WebConfig webConfig = new WebConfig();
        assertTrue(webConfig instanceof org.springframework.web.servlet.config.annotation.WebMvcConfigurer,
                "WebConfig 必须实现 WebMvcConfigurer 接口，才能被 Spring 自动调用 addCorsMappings");
    }

    /**
     * 场景 9：getMediaStorageRoot() 应返回配置的存储根目录。
     *
     * <p>验证：{@link WebConfig#getMediaStorageRoot()} 返回通过 @Value 注入的
     * {@code app.media.storage-root} 配置值。</p>
     */
    @Test
    void getMediaStorageRoot_shouldReturnConfiguredValue() {
        WebConfig webConfig = new WebConfig();
        String expectedRoot = "./test-uploads";
        setMediaStorageRootField(webConfig, expectedRoot);

        String result = webConfig.getMediaStorageRoot();

        assertEquals(expectedRoot, result, "应返回配置的存储根目录");
    }

    /**
     * 通过反射设置 WebConfig.allowedOrigins 字段（模拟 @Value 注入）。
     *
     * @param webConfig    WebConfig 实例
     * @param originsValue 要注入的源列表
     */
    private static void setAllowedOriginsField(WebConfig webConfig, List<String> originsValue) {
        try {
            Field field = WebConfig.class.getDeclaredField("allowedOrigins");
            field.setAccessible(true);
            field.set(webConfig, originsValue);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            throw new IllegalStateException("Failed to set allowedOrigins field via reflection", e);
        }
    }

    /**
     * 通过反射设置 WebConfig.mediaStorageRoot 字段（模拟 @Value 注入）。
     *
     * @param webConfig WebConfig 实例
     * @param value     要注入的存储根目录
     */
    private static void setMediaStorageRootField(WebConfig webConfig, String value) {
        try {
            Field field = WebConfig.class.getDeclaredField("mediaStorageRoot");
            field.setAccessible(true);
            field.set(webConfig, value);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            throw new IllegalStateException("Failed to set mediaStorageRoot field via reflection", e);
        }
    }
}
