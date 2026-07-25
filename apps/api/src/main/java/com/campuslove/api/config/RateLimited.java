package com.campuslove.api.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * API 速率限制注解。
 *
 * <p>使用方式：标注在 Controller 方法或 Service 方法上，配合 {@link RateLimitConfig}
 * 中注册的 AOP 切面自动实施限流。</p>
 *
 * <p>限流策略（令牌桶算法）：</p>
 * <ul>
 *   <li>{@link #capacity}：桶容量（突发流量上限）</li>
 *   <li>{@link #refillTokens}：每次补充的令牌数</li>
 *   <li>{@link #refillPeriodSeconds}：补充周期（秒），与 refillTokens 共同决定恢复速率</li>
 *   <li>{@link #key}：SpEL 表达式，用于从方法参数中动态生成限流键
 *       （如 {@code "#userId"} 或 {@code "#request.ip"}）</li>
 * </ul>
 *
 * <p>示例：</p>
 * <pre>
 * &#64;RateLimited(key = "#userId", capacity = 10, refillTokens = 10, refillPeriodSeconds = 60)
 * public void sendLike(Long userId, Long targetUserId) { ... }
 * </pre>
 *
 * <p>当未指定 key 时，使用方法签名作为默认键，等同于全局限流。</p>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimited {

    /**
     * 限流键的 SpEL 表达式。
     *
     * <p>支持从方法参数中提取值（如 {@code "#userId"}、{@code "#request.ip"}），
     * 留空时使用方法全限定名作为默认键，等同全局共享桶。</p>
     *
     * @return SpEL 表达式
     */
    String key() default "";

    /**
     * 令牌桶容量，默认 10。
     *
     * <p>表示允许的瞬时突发请求数，超过此值会被限流拒绝。</p>
     *
     * @return 桶容量
     */
    int capacity() default 10;

    /**
     * 每个 {@link #refillPeriodSeconds()} 周期补充的令牌数，默认 10。
     *
     * @return 补充令牌数
     */
    int refillTokens() default 10;

    /**
     * 令牌补充周期（秒），默认 60 秒。
     *
     * @return 补充周期秒数
     */
    int refillPeriodSeconds() default 60;
}
