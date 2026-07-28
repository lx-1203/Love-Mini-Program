package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.campuslove.api.auth.WeChatClient;
import com.campuslove.api.growth.WeChatPushService;
import com.campuslove.api.media.LocalMediaStorageService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Configuration;

/**
 * Task 2.3 缓存与韧性 - Resilience4j 韧性层单元测试（Task 2.3.3）。
 *
 * <p>测试目标：验证 Resilience4j 已正确集成到 Spring Boot 项目中，
 * 关键外部依赖（微信 API / 对象存储）已添加 {@code @CircuitBreaker} /
 * {@code @Retry} / {@code @RateLimiter} 注解，并定义了对应的 fallback 方法。</p>
 *
 * <p>测试策略：纯单元测试，不加载 Spring 上下文，避免被
 * {@code @SpringBootTest} 全量加载应用上下文时触发其他控制器对
 * JPA Repository 的依赖（mock profile 下 JPA 已被排除）。
 * 通过反射检查注解元数据与方法签名，验证韧性配置就位。</p>
 *
 * <p>覆盖场景：</p>
 * <ul>
 *   <li>{@link Resilience4jConfig} 类配置正确（@Configuration、@ConditionalOnClass、3 个 backend 常量）</li>
 *   <li>{@link WeChatClient#code2Session(String)} 添加 @CircuitBreaker + @Retry + @RateLimiter 注解</li>
 *   <li>{@link WeChatPushService#getAccessToken()} 添加 @CircuitBreaker + @Retry + @RateLimiter 注解</li>
 *   <li>{@link WeChatPushService#sendSubscribeMessage} 添加 @CircuitBreaker + @Retry + @RateLimiter 注解</li>
 *   <li>{@link LocalMediaStorageService#store} 添加 @CircuitBreaker + @Retry 注解</li>
 *   <li>所有外部调用方法的 fallback 方法存在且签名正确</li>
 *   <li>{@code application.yml} 包含 resilience4j 配置块（wechatApi / objectStorage / sms 三个 backend）</li>
 * </ul>
 */
class ResilienceTest {

    // ==================================================================
    // 场景 1：Resilience4jConfig 类配置正确
    // ==================================================================

    /**
     * 场景 1：{@link Resilience4jConfig} 应标注 {@code @Configuration}。
     */
    @Test
    void resilience4jConfig_shouldBeAnnotatedWithConfiguration() {
        Configuration configAnnotation = Resilience4jConfig.class.getAnnotation(Configuration.class);
        assertNotNull(configAnnotation, "Resilience4jConfig 应标注 @Configuration");
    }

    /**
     * 场景 2：{@link Resilience4jConfig} 应标注 {@code @ConditionalOnClass(CircuitBreaker, CircuitBreakerRegistry)}。
     *
     * <p>当 Resilience4j 不在 classpath 时，配置类自动失效，保证 Spring 容器仍可启动。</p>
     */
    @Test
    void resilience4jConfig_shouldBeConditionalOnClass() {
        ConditionalOnClass conditional = Resilience4jConfig.class.getAnnotation(ConditionalOnClass.class);
        assertNotNull(conditional, "Resilience4jConfig 应标注 @ConditionalOnClass");
        assertEquals(2, conditional.value().length,
                "@ConditionalOnClass 应包含 CircuitBreaker 与 CircuitBreakerRegistry 两个类");
        assertTrue(Arrays.asList(conditional.value()).contains(CircuitBreaker.class),
                "@ConditionalOnClass 应包含 CircuitBreaker");
        assertTrue(Arrays.asList(conditional.value()).contains(io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry.class),
                "@ConditionalOnClass 应包含 CircuitBreakerRegistry");
    }

    /**
     * 场景 3：{@link Resilience4jConfig} 应定义 3 个 backend 常量。
     */
    @Test
    void resilience4jConfig_shouldDefineThreeBackendConstants() throws Exception {
        // WECHAT_API_BACKEND
        String wechatApiBackend = (String) Resilience4jConfig.class.getField("WECHAT_API_BACKEND").get(null);
        assertEquals("wechatApi", wechatApiBackend, "WECHAT_API_BACKEND 常量值应为 wechatApi");

        // OBJECT_STORAGE_BACKEND
        String objectStorageBackend = (String) Resilience4jConfig.class.getField("OBJECT_STORAGE_BACKEND").get(null);
        assertEquals("objectStorage", objectStorageBackend, "OBJECT_STORAGE_BACKEND 常量值应为 objectStorage");

        // SMS_BACKEND
        String smsBackend = (String) Resilience4jConfig.class.getField("SMS_BACKEND").get(null);
        assertEquals("sms", smsBackend, "SMS_BACKEND 常量值应为 sms");
    }

    // ==================================================================
    // 场景 2：WeChatClient.code2Session 注解与 fallback
    // ==================================================================

    /**
     * 场景 4：{@link WeChatClient#code2Session(String)} 应添加 @CircuitBreaker + @Retry + @RateLimiter 注解。
     *
     * <p>Task 2.3.3：微信 jscode2session 是登录主链路的关键外部依赖，
     * 必须通过熔断 / 重试 / 限流保护，避免持续打微信 API 触发限流或服务雪崩。</p>
     */
    @Test
    void weChatClient_code2Session_shouldHaveResilienceAnnotations() throws Exception {
        Method m = WeChatClient.class.getMethod("code2Session", String.class);

        // @CircuitBreaker
        CircuitBreaker cb = m.getAnnotation(CircuitBreaker.class);
        assertNotNull(cb, "code2Session 应添加 @CircuitBreaker 注解");
        assertEquals(Resilience4jConfig.WECHAT_API_BACKEND, cb.name(),
                "@CircuitBreaker name 应为 wechatApi");
        assertEquals("code2SessionFallback", cb.fallbackMethod(),
                "@CircuitBreaker fallbackMethod 应为 code2SessionFallback");

        // @Retry
        Retry retry = m.getAnnotation(Retry.class);
        assertNotNull(retry, "code2Session 应添加 @Retry 注解");
        assertEquals(Resilience4jConfig.WECHAT_API_BACKEND, retry.name());

        // @RateLimiter
        RateLimiter rl = m.getAnnotation(RateLimiter.class);
        assertNotNull(rl, "code2Session 应添加 @RateLimiter 注解");
        assertEquals(Resilience4jConfig.WECHAT_API_BACKEND, rl.name());
    }

    /**
     * 场景 5：{@link WeChatClient} 应定义 {@code code2SessionFallback(String, Throwable)} 私有方法。
     *
     * <p>fallback 方法签名为：第一个参数与原方法一致（String code），
     * 最后一个参数为 {@link Throwable}（Resilience4j 自动透传触发 fallback 的异常）。</p>
     */
    @Test
    void weChatClient_shouldDefineCode2SessionFallbackMethod() throws Exception {
        Method m = WeChatClient.class.getDeclaredMethod("code2SessionFallback", String.class, Throwable.class);
        assertNotNull(m, "WeChatClient 应定义 code2SessionFallback(String, Throwable) 方法");
        assertTrue(Modifier.isPrivate(m.getModifiers()),
                "code2SessionFallback 应为 private 方法（仅在 Resilience4j 代理触发时调用）");
    }

    // ==================================================================
    // 场景 3：WeChatPushService.getAccessToken 注解与 fallback
    // ==================================================================

    /**
     * 场景 6：{@link WeChatPushService#getAccessToken()} 应添加 @CircuitBreaker + @Retry + @RateLimiter 注解。
     */
    @Test
    void weChatPushService_getAccessToken_shouldHaveResilienceAnnotations() throws Exception {
        Method m = WeChatPushService.class.getMethod("getAccessToken");

        CircuitBreaker cb = m.getAnnotation(CircuitBreaker.class);
        assertNotNull(cb, "getAccessToken 应添加 @CircuitBreaker 注解");
        assertEquals(Resilience4jConfig.WECHAT_API_BACKEND, cb.name());
        assertEquals("getAccessTokenFallback", cb.fallbackMethod());

        Retry retry = m.getAnnotation(Retry.class);
        assertNotNull(retry, "getAccessToken 应添加 @Retry 注解");
        assertEquals(Resilience4jConfig.WECHAT_API_BACKEND, retry.name());

        RateLimiter rl = m.getAnnotation(RateLimiter.class);
        assertNotNull(rl, "getAccessToken 应添加 @RateLimiter 注解");
        assertEquals(Resilience4jConfig.WECHAT_API_BACKEND, rl.name());
    }

    /**
     * 场景 7：{@link WeChatPushService} 应定义 {@code getAccessTokenFallback(Throwable)} 私有方法。
     */
    @Test
    void weChatPushService_shouldDefineGetAccessTokenFallbackMethod() throws Exception {
        Method m = WeChatPushService.class.getDeclaredMethod("getAccessTokenFallback", Throwable.class);
        assertNotNull(m, "WeChatPushService 应定义 getAccessTokenFallback(Throwable) 方法");
        assertTrue(Modifier.isPrivate(m.getModifiers()),
                "getAccessTokenFallback 应为 private 方法");
    }

    // ==================================================================
    // 场景 4：WeChatPushService.sendSubscribeMessage 注解与 fallback
    // ==================================================================

    /**
     * 场景 8：{@link WeChatPushService#sendSubscribeMessage} 应添加 @CircuitBreaker + @Retry + @RateLimiter 注解。
     */
    @Test
    @SuppressWarnings("rawtypes")
    void weChatPushService_sendSubscribeMessage_shouldHaveResilienceAnnotations() throws Exception {
        // sendSubscribeMessage(String, String, String, Map) - 注意 Map 是 raw type
        Method m = WeChatPushService.class.getMethod("sendSubscribeMessage",
                String.class, String.class, String.class, java.util.Map.class);

        CircuitBreaker cb = m.getAnnotation(CircuitBreaker.class);
        assertNotNull(cb, "sendSubscribeMessage 应添加 @CircuitBreaker 注解");
        assertEquals(Resilience4jConfig.WECHAT_API_BACKEND, cb.name());
        assertEquals("sendSubscribeMessageFallback", cb.fallbackMethod());

        Retry retry = m.getAnnotation(Retry.class);
        assertNotNull(retry, "sendSubscribeMessage 应添加 @Retry 注解");
        assertEquals(Resilience4jConfig.WECHAT_API_BACKEND, retry.name());

        RateLimiter rl = m.getAnnotation(RateLimiter.class);
        assertNotNull(rl, "sendSubscribeMessage 应添加 @RateLimiter 注解");
        assertEquals(Resilience4jConfig.WECHAT_API_BACKEND, rl.name());
    }

    /**
     * 场景 9：{@link WeChatPushService} 应定义 {@code sendSubscribeMessageFallback(String, String, String, Map, Throwable)} 私有方法。
     */
    @Test
    @SuppressWarnings("rawtypes")
    void weChatPushService_shouldDefineSendSubscribeMessageFallbackMethod() throws Exception {
        Method m = WeChatPushService.class.getDeclaredMethod(
                "sendSubscribeMessageFallback",
                String.class, String.class, String.class, java.util.Map.class, Throwable.class);
        assertNotNull(m, "WeChatPushService 应定义 sendSubscribeMessageFallback 方法");
        assertTrue(Modifier.isPrivate(m.getModifiers()),
                "sendSubscribeMessageFallback 应为 private 方法");
    }

    // ==================================================================
    // 场景 5：LocalMediaStorageService.store 注解与 fallback
    // ==================================================================

    /**
     * 场景 10：{@link LocalMediaStorageService#store} 应添加 @CircuitBreaker + @Retry 注解。
     *
     * <p>Task 2.3.3：本地媒体存储是媒体上传的核心依赖，
     * 磁盘 IO 失败（如磁盘满 / 权限错误）应通过熔断 + 重试保护。</p>
     */
    @Test
    void localMediaStorageService_store_shouldHaveResilienceAnnotations() throws Exception {
        Method m = LocalMediaStorageService.class.getMethod("store",
                Long.class, org.springframework.web.multipart.MultipartFile.class, String.class);

        CircuitBreaker cb = m.getAnnotation(CircuitBreaker.class);
        assertNotNull(cb, "store 应添加 @CircuitBreaker 注解");
        assertEquals(Resilience4jConfig.OBJECT_STORAGE_BACKEND, cb.name(),
                "@CircuitBreaker name 应为 objectStorage");
        assertEquals("storeFallback", cb.fallbackMethod());

        Retry retry = m.getAnnotation(Retry.class);
        assertNotNull(retry, "store 应添加 @Retry 注解");
        assertEquals(Resilience4jConfig.OBJECT_STORAGE_BACKEND, retry.name());
    }

    /**
     * 场景 11：{@link LocalMediaStorageService} 应定义 {@code storeFallback(Long, MultipartFile, String, Throwable)} 私有方法。
     */
    @Test
    void localMediaStorageService_shouldDefineStoreFallbackMethod() throws Exception {
        Method m = LocalMediaStorageService.class.getDeclaredMethod(
                "storeFallback",
                Long.class, org.springframework.web.multipart.MultipartFile.class,
                String.class, Throwable.class);
        assertNotNull(m, "LocalMediaStorageService 应定义 storeFallback 方法");
        assertTrue(Modifier.isPrivate(m.getModifiers()),
                "storeFallback 应为 private 方法");
    }

    // ==================================================================
    // 场景 6：application.yml 包含 resilience4j 配置
    // ==================================================================

    /**
     * 场景 12：{@code application.yml} 应包含 resilience4j 配置块。
     *
     * <p>验证 yml 文件中存在 resilience4j 配置节，且 wechatApi / objectStorage / sms
     * 三个 backend 在 circuitbreaker / retry / ratelimiter 三个机制下都有定义。</p>
     */
    @Test
    void applicationYml_shouldContainResilience4jConfig() throws Exception {
        String ymlContent = loadApplicationYml();

        // 顶层 resilience4j 配置节
        assertTrue(ymlContent.contains("resilience4j:"),
                "application.yml 应包含 resilience4j 配置节");

        // 三个机制
        assertTrue(ymlContent.contains("circuitbreaker:"),
                "application.yml 应包含 circuitbreaker 配置");
        assertTrue(ymlContent.contains("retry:"),
                "application.yml 应包含 retry 配置");
        assertTrue(ymlContent.contains("ratelimiter:"),
                "application.yml 应包含 ratelimiter 配置");

        // 三个 backend 实例（在 circuitbreaker 与 retry 下均应定义）
        assertTrue(ymlContent.contains("wechatApi:"),
                "application.yml 应包含 wechatApi backend 实例");
        assertTrue(ymlContent.contains("objectStorage:"),
                "application.yml 应包含 objectStorage backend 实例");
        assertTrue(ymlContent.contains("sms:"),
                "application.yml 应包含 sms backend 实例");

        // 健康指标暴露
        assertTrue(ymlContent.contains("register-health-indicator: true"),
                "application.yml 应启用 resilience4j 健康指标");
    }

    /**
     * 场景 13：application.yml 应配置 wechatApi 熔断器参数（failure-rate-threshold / wait-duration-in-open-state）。
     */
    @Test
    void applicationYml_shouldConfigureWechatApiCircuitBreakerParams() throws Exception {
        String ymlContent = loadApplicationYml();

        // 熔断阈值 50%
        assertTrue(ymlContent.contains("failure-rate-threshold: 50"),
                "wechatApi 熔断失败率阈值应为 50%");
        // 熔断打开后等待 30s
        assertTrue(ymlContent.contains("wait-duration-in-open-state: 30s"),
                "wechatApi 熔断打开后应等待 30s");
        // 重试 3 次
        assertTrue(ymlContent.contains("max-attempts: 3"),
                "wechatApi 重试次数应为 3 次");
        // 限流 10 QPS
        assertTrue(ymlContent.contains("limit-for-period: 10"),
                "wechatApi 限流应为每秒 10 次");
    }

    /**
     * 场景 14：application.yml 应忽略业务异常（WeChatAuthException 不触发熔断 / 重试）。
     *
     * <p>设计原则：业务异常（4xx，如 errcode != 0）不应触发熔断或重试，
     * 否则会将用户输入错误（如非法 code）误判为下游故障，导致熔断器错误打开。</p>
     */
    @Test
    void applicationYml_shouldIgnoreWeChatAuthException() throws Exception {
        String ymlContent = loadApplicationYml();

        // WeChatAuthException 应在 ignore-exceptions 中
        assertTrue(ymlContent.contains("com.campuslove.api.auth.WeChatClient.WeChatAuthException"),
                "application.yml 应在 ignore-exceptions 中排除 WeChatAuthException，避免业务异常触发熔断");
    }

    // ==================================================================
    // 场景 7：pom.xml 应包含 resilience4j 依赖
    // ==================================================================

    /**
     * 场景 15：pom.xml 应声明 resilience4j-spring-boot3 依赖。
     *
     * <p>Task 2.3.3：Spring Boot 3.x 适配 Resilience4j 2.x，
     * 通过 {@code resilience4j-spring-boot3} 自动装配为 Spring Bean。</p>
     */
    @Test
    void pomXml_shouldDeclareResilience4jDependencies() throws Exception {
        String pomContent = loadPomXml();

        assertTrue(pomContent.contains("resilience4j-spring-boot3"),
                "pom.xml 应声明 resilience4j-spring-boot3 依赖");
        assertTrue(pomContent.contains("io.github.resilience4j"),
                "pom.xml 应包含 io.github.resilience4j groupId");
        assertTrue(pomContent.contains("<version>2.2.0</version>"),
                "Resilience4j 版本应为 2.2.0（适配 Spring Boot 3.x）");
    }

    // ==================================================================
    // 工具方法
    // ==================================================================

    /**
     * 加载 application.yml 内容。
     *
     * @return yml 文件全文
     * @throws Exception 读取失败
     */
    private String loadApplicationYml() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/application.yml")) {
            assertNotNull(in, "application.yml 应存在于 classpath");
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /**
     * 加载 pom.xml 内容。
     *
     * @return pom.xml 文件全文
     * @throws Exception 读取失败
     */
    private String loadPomXml() throws Exception {
        java.nio.file.Path pomPath = java.nio.file.Paths.get("pom.xml");
        if (!java.nio.file.Files.exists(pomPath)) {
            // 测试可能从其他目录执行，尝试相对路径 apps/api/pom.xml
            pomPath = java.nio.file.Paths.get("apps/api/pom.xml");
        }
        assertTrue(java.nio.file.Files.exists(pomPath),
                "pom.xml 应存在于工作目录或 apps/api/ 下");
        return java.nio.file.Files.readString(pomPath, StandardCharsets.UTF_8);
    }
}
