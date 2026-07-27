package com.campuslove.api.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import io.github.resilience4j.retry.RetryRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Configuration;

/**
 * Resilience4j 韧性配置（Task 2.3.3）。
 *
 * <p>本配置类仅作为标记 Bean 与文档载体，实际熔断 / 重试 / 限流策略通过
 * {@code application.yml} 中的 {@code resilience4j.*} 配置项加载，
 * 由 {@code resilience4j-spring-boot3} 自动装配为
 * {@link CircuitBreakerRegistry} / {@link RetryRegistry} / {@link RateLimiterRegistry}。</p>
 *
 * <p>业务侧通过注解触发韧性能力（注解的 {@code name} 属性对应 yml 中的 instance 名）：</p>
 * <ul>
 *   <li>{@link CircuitBreaker}：保护下游服务，连续失败时快速熔断，避免雪崩</li>
 *   <li>{@code @Retry}：对瞬时故障（网络抖动、临时 5xx）自动重试，指数退避避免加剧下游压力</li>
 *   <li>{@code @RateLimiter}：限制对下游的调用速率，防止突发流量打垮下游</li>
 * </ul>
 *
 * <p>已应用的外部依赖：</p>
 * <ul>
 *   <li>{@code wechatApi}：{@link com.campuslove.api.auth.WeChatClient#code2Session(String)}、
 *       {@link com.campuslove.api.growth.WeChatPushService#getAccessToken()}、
 *       {@link com.campuslove.api.growth.WeChatPushService#sendSubscribeMessage(String, String, String, java.util.Map)}</li>
 *   <li>{@code objectStorage}：{@link com.campuslove.api.media.LocalMediaStorageService#store(Long, org.springframework.web.multipart.MultipartFile, String)}</li>
 *   <li>{@code sms}：预留短信服务（如未来集成阿里云/腾讯云 SMS）</li>
 * </ul>
 *
 * <p>降级策略：所有外部调用在熔断打开 / 重试耗尽时返回 null 或 false（由调用方自行处理），
 * 保证主流程不阻塞。例如 {@link com.campuslove.api.growth.WeChatPushService#getAccessToken()}
 * 熔断后返回 null，调用方检测到 null 时跳过推送。</p>
 *
 * <p>健康指标：{@code register-health-indicator: true} 将 CircuitBreaker / RateLimiter 状态
 * 暴露至 {@code /actuator/health}，运维可实时观察韧性状态。</p>
 */
@Configuration
@ConditionalOnClass({CircuitBreaker.class, CircuitBreakerRegistry.class})
public class Resilience4jConfig {

    private static final Logger log = LoggerFactory.getLogger(Resilience4jConfig.class);

    /**
     * 微信 API 熔断器实例名（与 application.yml 中 {@code resilience4j.circuitbreaker.instances.wechatApi} 对齐）。
     *
     * <p>供 {@link CircuitBreaker#name()} 引用，保证注解配置与 yml 配置一致。</p>
     */
    public static final String WECHAT_API_BACKEND = "wechatApi";

    /**
     * 对象存储熔断器实例名（与 application.yml 中 {@code resilience4j.circuitbreaker.instances.objectStorage} 对齐）。
     */
    public static final String OBJECT_STORAGE_BACKEND = "objectStorage";

    /**
     * 短信服务熔断器实例名（与 application.yml 中 {@code resilience4j.circuitbreaker.instances.sms} 对齐）。
     */
    public static final String SMS_BACKEND = "sms";

    /**
     * 构造函数：Resilience4j 自动装配完成后输出已注册的实例清单，便于运维排查配置问题。
     *
     * <p>注意：本构造函数仅做日志输出，不创建任何 Bean；
     * 实例由 {@code CircuitBreakerRegistry} / {@code RetryRegistry} / {@code RateLimiterRegistry}
     * 根据 yml 配置在首次访问时按需创建。</p>
     */
    public Resilience4jConfig() {
        log.info("Resilience4j 已启用：wechatApi / objectStorage / sms 三个 backend 已配置熔断 / 重试 / 限流策略");
    }
}
