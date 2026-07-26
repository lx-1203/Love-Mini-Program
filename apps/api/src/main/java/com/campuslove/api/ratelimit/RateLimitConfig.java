package com.campuslove.api.ratelimit;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

/**
 * 速率限制模块配置类。
 *
 * <p>核心职责：</p>
 * <ol>
 *   <li>通过 {@link EnableAspectJAutoProxy} 显式启用 AspectJ 自动代理
 *       （spring-boot-starter-aop 已通过 AopAutoConfiguration 启用，此处显式声明
 *       表达模块边界，便于后续维护与排查）。</li>
 *   <li>通过 {@link Bean} 显式注册 {@link RateLimitAspect} 切面 Bean，
 *       注入 {@link RateLimitBucketRegistry}（后者由 {@code @Component} 自动注册）。</li>
 * </ol>
 *
 * <p>Bean 命名说明：项目中已存在 {@code com.campuslove.api.config.RateLimitConfig}
 * （旧版未使用的限流桩实现）。为避免默认 Bean 名 {@code rateLimitConfig} 冲突，
 * 本配置类显式指定 Bean 名为 {@code ratelimitConfigV2}。</p>
 *
 * <p>注意：本配置类不修改 pom.xml，bucket4j-core 8.10.1 依赖已在 pom 中声明。</p>
 */
@Configuration("ratelimitConfigV2")
@EnableAspectJAutoProxy
public class RateLimitConfig {

    /**
     * 注册速率限制切面 Bean。
     *
     * <p>Spring 会自动注入 {@link RateLimitBucketRegistry}（基于 @Component 自动注册的单例）。
     * 切面在 {@code @Around} 通知中拦截所有标注 {@link RateLimit} 的方法。</p>
     *
     * @param registry 令牌桶注册表 Bean
     * @return 速率限制切面实例
     */
    @Bean
    public RateLimitAspect rateLimitAspect(RateLimitBucketRegistry registry) {
        return new RateLimitAspect(registry);
    }
}
