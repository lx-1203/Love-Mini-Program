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
     * 注册客户端 IP 解析器（可信代理判定唯一入口）。
     *
     * <p>R4-00378 + 本轮 P0 缺陷 2：{@code app.security.trusted-proxies}
     * （环境变量 {@code APP_TRUSTED_PROXIES}）为空时不信任任何代理，
     * {@code X-Forwarded-For} 一律忽略——伪造 header 换不到限流桶；
     * 配置后按"从右往左第一个不可信条目"取真实客户端。规则与部署要求见
     * {@link ClientIpResolver} 类注释。</p>
     *
     * @param trustedProxies 可信代理 IP/CIDR 列表（逗号分隔，空表示不信任任何代理）
     * @return 客户端 IP 解析器单例
     */
    @Bean
    public ClientIpResolver clientIpResolver(
            @org.springframework.beans.factory.annotation.Value(
                    "${app.security.trusted-proxies:}") String trustedProxies) {
        return new ClientIpResolver(trustedProxies);
    }

    /**
     * 注册速率限制切面 Bean。
     *
     * <p>Spring 会自动注入 {@link RateLimitBucketRegistry}（基于 @Component 自动注册的单例）。
     * 切面在 {@code @Around} 通知中拦截所有标注 {@link RateLimit} 的方法。</p>
     *
     * <p>R4-00378：注入可信代理配置（{@code app.security.trusted-proxies}）——
     * 限流键取客户端 IP 前需校验直连来源为可信代理，防止客户端伪造 XFF 头
     * 更换限流桶绕过 IP 限流。解析逻辑收敛到 {@link ClientIpResolver} 单例，
     * 与控制器侧手工加的第二 IP 维度共用同一判定。</p>
     *
     * @param registry 令牌桶注册表 Bean
     * @param resolver 客户端 IP 解析器 Bean
     * @return 速率限制切面实例
     */
    @Bean
    public RateLimitAspect rateLimitAspect(RateLimitBucketRegistry registry,
                                           ClientIpResolver resolver) {
        return new RateLimitAspect(registry, resolver);
    }
}
