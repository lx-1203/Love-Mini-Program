package com.campuslove.api.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * API 速率限制注解（基于 Bucket4j 令牌桶算法）。
 *
 * <p>使用方式：标注在 Controller 方法或类上，由 {@link RateLimitAspect} 切面拦截，
 * 通过 {@link RateLimitBucketRegistry} 维护每个限流键对应的令牌桶。</p>
 *
 * <p>限流策略说明（令牌桶算法）：</p>
 * <ul>
 *   <li>{@link #capacity}：桶容量，即允许的瞬时突发请求数上限。</li>
 *   <li>{@link #refillTokens}：每秒补充的令牌数（支持小数，如 0.1 表示每 10 秒补充 1 个）。
 *       桶满时不再补充；桶空时请求会被拒绝并抛出 {@link RateLimitExceededException}。</li>
 *   <li>{@link #key}：SpEL 表达式，用于从方法参数或运行时上下文中动态生成限流键。
 *       默认 {@code "#request.remoteAddr"} 表示按客户端 IP 限流；
 *       也可使用 {@code "#userId"} 按用户限流，或
 *       {@code "T(com.campuslove.api.config.SecurityUtils).getCurrentUserId()"} 调用静态方法。</li>
 * </ul>
 *
 * <p>示例：</p>
 * <pre>
 * // 按客户端 IP 限流：桶容量 10，每 10 秒补充 1 个令牌（防爆破）
 * &#64;RateLimit(capacity = 10, refillTokens = 0.1)
 * public UserSessionView loginWithWechat(WechatLoginRequest request) { ... }
 *
 * // 按用户 ID 限流：每秒 2 次，突发上限 60
 * &#64;RateLimit(capacity = 60, refillTokens = 2, key = "#userId")
 * public HeartSignalView likeUser(Long userId, Long targetUserId) { ... }
 * </pre>
 *
 * <p>说明：注解可作用于方法级和类级。类级注解会被该类下所有方法继承，
 * 方法级注解优先级高于类级注解。</p>
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {

    /**
     * 令牌桶容量（突发流量上限）。
     *
     * <p>表示桶内最多可容纳的令牌数，瞬时请求数超过此值会被限流拒绝。
     * 默认 60，适合大多数普通业务接口。</p>
     *
     * @return 桶容量
     */
    long capacity() default 60L;

    /**
     * 每秒补充的令牌数（支持小数）。
     *
     * <p>例如：</p>
     * <ul>
     *   <li>{@code 1.0}：每秒补充 1 个令牌</li>
     *   <li>{@code 0.1}：每 10 秒补充 1 个令牌（适合登录等防爆破场景）</li>
     *   <li>{@code 2.0}：每秒补充 2 个令牌</li>
     * </ul>
     *
     * <p>注意：使用 {@code double} 类型以支持小数速率。任务规范描述中
     * 将该字段标注为 {@code long}，但实例值（如 0.1、0.5）必须使用浮点类型，
     * 此处按业务实例要求实现为 {@code double}。</p>
     *
     * @return 每秒补充令牌数
     */
    double refillTokens() default 1.0;

    /**
     * 限流键的 SpEL 表达式。
     *
     * <p>支持以下形式：</p>
     * <ul>
     *   <li>{@code "#request.remoteAddr"}：从当前 HttpServletRequest 获取客户端 IP（默认）</li>
     *   <li>{@code "#userId"}：从方法参数 {@code userId} 中提取（要求方法有该参数）</li>
     *   <li>{@code "T(com.campuslove.api.config.SecurityUtils).getCurrentUserId()"}：
     *       调用静态方法获取当前登录用户 ID</li>
     *   <li>留空时使用"类名#方法名"作为默认键，等同全局限流</li>
     * </ul>
     *
     * <p>最终桶键会被组合为 {@code 类名#方法名:SpEL解析值}，避免不同接口共用桶。</p>
     *
     * @return SpEL 表达式
     */
    String key() default "#request.remoteAddr";
}
