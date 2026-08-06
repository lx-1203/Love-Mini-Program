package com.campuslove.api.common;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 幂等性注解（Task 2.4.3）。
 *
 * <p>标注在 Controller 方法上，由 {@link IdempotentInterceptor} 拦截，
 * 基于 {@code Idempotency-Key} 请求头 + Redis 去重，保证同一幂等键的
 * 重复请求只执行一次业务逻辑。</p>
 *
 * <p>设计要点：</p>
 * <ul>
 *   <li>幂等键来源：客户端在请求头中携带 {@code Idempotency-Key}（UUID 或业务唯一标识）</li>
 *   <li>Redis Key 格式：{@code idempotent:{key}:{userId}}，按用户隔离避免冲突</li>
 *   <li>TTL：默认 24 小时（{@link #ttlSeconds()}），可通过注解参数覆盖</li>
 *   <li>重复请求处理：返回 HTTP 409 Conflict + 错误码 {@code IDEMPOTENT_CONFLICT}，
 *       提示客户端"重复请求已被拦截"</li>
 *   <li>仅作用于写操作（POST/PUT/DELETE），GET 请求不应使用本注解</li>
 * </ul>
 *
 * <p>使用示例：</p>
 * <pre>
 * &#64;PostMapping("/orders")
 * &#64;Idempotent
 * public ApiResponse&lt;OrderView&gt; createOrder(&#64;RequestBody OrderRequest req) { ... }
 *
 * // 自定义 TTL（7 天）
 * &#64;PostMapping("/payments")
 * &#64;Idempotent(ttlSeconds = 7 * 24 * 3600)
 * public ApiResponse&lt;PaymentView&gt; pay(&#64;RequestBody PaymentRequest req) { ... }
 * </pre>
 *
 * @since P2 / Task 2.4.3
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {

    /** 默认 TTL：4 小时（秒）（infra R2-00249: 原 24h 过长，写失败后用户需等 24h 才能重试；缩短至 4h 平衡防重与可用性） */
    long DEFAULT_TTL_SECONDS = 4L * 3600;

    /**
     * 幂等键 TTL（秒）。
     *
     * <p>默认 4 小时，覆盖典型业务场景（用户重复提交、网络重试）。
     * 长流程业务（如订单支付）可适当延长至 7 天。</p>
     *
     * @return TTL 秒数
     */
    long ttlSeconds() default DEFAULT_TTL_SECONDS;

    /**
     * 是否强制要求 Idempotency-Key 头。
     *
     * <p>true（默认）：缺失时返回 400 Bad Request，提示客户端补全；
     * false：缺失时跳过幂等校验，按非幂等方式处理（仅适用于可重写的接口）。</p>
     *
     * @return 是否强制
     */
    boolean required() default true;
}
