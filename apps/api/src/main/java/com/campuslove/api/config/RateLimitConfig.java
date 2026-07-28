package com.campuslove.api.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import java.lang.reflect.Method;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.expression.MethodBasedEvaluationContext;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.core.ParameterNameDiscoverer;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * 速率限制配置类。
 *
 * <p>本配置整合三部分能力：</p>
 * <ol>
 *   <li>{@link RateLimiter} Bean：基于本地 {@link ConcurrentHashMap} 的令牌桶实现，
 *       提供 {@code tryConsume(key, capacity, refillTokens, refillPeriodSeconds)} 方法</li>
 *   <li>{@link RateLimiterAspect} AOP 切面：拦截所有标注 {@link RateLimited} 的方法，
 *       根据 SpEL 表达式生成限流键并自动限流</li>
 *   <li>Bucket4j 8.10.1 提供的令牌桶算法支持</li>
 * </ol>
 *
 * <p>限流命中时抛出 {@link ResponseStatusException}（HTTP 429），
 * 由 {@link GlobalExceptionHandler} 统一处理为客户端友好响应。</p>
 *
 * <p>注意：当前实现基于本地内存，适用于单实例部署。
 * 多实例场景下应替换为 Redis 分布式令牌桶（Bucket4j 与 Redis 集成）。</p>
 */
@Configuration
public class RateLimitConfig {

    /**
     * 速率限制器 Bean。
     *
     * <p>使用 {@link ConcurrentHashMap} 缓存每个 key 对应的 {@link Bucket} 实例，
     * 避免每次调用都创建新桶。桶的过期清理可后续通过定时任务扩展。</p>
     *
     * @return 速率限制器实例
     */
    @Bean
    public RateLimiter rateLimiter() {
        return new RateLimiter();
    }

    /**
     * 速率限制器实现：基于 Bucket4j 的本地令牌桶。
     */
    @Component
    public static class RateLimiter {

        private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

        /** key -> Bucket 映射，线程安全 */
        private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

        /**
         * 尝试消费一个令牌。
         *
         * <p>桶策略：{@code capacity} 个令牌的桶，每个 {@code refillPeriodSeconds} 秒
         * 补充 {@code refillTokens} 个令牌（greedy 策略，尽可能快速恢复）。</p>
         *
         * @param key                  限流键（如 userId、IP、方法名等）
         * @param capacity             桶容量（突发上限）
         * @param refillTokens         每周期补充的令牌数
         * @param refillPeriodSeconds  补充周期（秒）
         * @return true 表示获取令牌成功（请求放行），false 表示被限流
         */
        public boolean tryConsume(String key, int capacity, int refillTokens, int refillPeriodSeconds) {
            if (key == null || key.isBlank()) {
                // 无 key 时直接放行，避免误伤
                return true;
            }
            Bucket bucket = buckets.computeIfAbsent(key, k -> {
                // 兜底：补充周期 ≤ 0 时按 1 秒处理，避免除零
                long periodSeconds = Math.max(1, refillPeriodSeconds);
                // 兜底：补充令牌数 ≤ 0 时按 1 处理
                int tokens = Math.max(1, refillTokens);
                // 兜底：桶容量 ≤ 0 时按 1 处理
                int cap = Math.max(1, capacity);
                Bandwidth limit = Bandwidth.classic(cap,
                        Refill.greedy(tokens, Duration.ofSeconds(periodSeconds)));
                return Bucket.builder().addLimit(limit).build();
            });
            boolean allowed = bucket.tryConsume(1);
            if (!allowed) {
                log.warn("限流命中：key={}, capacity={}, refill={}/{}s",
                        key, capacity, refillTokens, refillPeriodSeconds);
            }
            return allowed;
        }

        /**
         * 获取当前已注册的桶数量，便于监控与排查。
         *
         * @return 桶数量
         */
        public int bucketCount() {
            return buckets.size();
        }
    }

    /**
     * 限流切面：拦截所有标注 {@link RateLimited} 的方法。
     */
    @Aspect
    @Component
    public static class RateLimiterAspect {

        private static final Logger log = LoggerFactory.getLogger(RateLimiterAspect.class);

        private final RateLimiter rateLimiter;
        private final ExpressionParser parser = new SpelExpressionParser();
        private final ParameterNameDiscoverer paramNameDiscoverer =
                new DefaultParameterNameDiscoverer();

        public RateLimiterAspect(RateLimiter rateLimiter) {
            this.rateLimiter = rateLimiter;
        }

        /**
         * 环绕通知：在方法执行前尝试获取令牌，获取失败则抛 HTTP 429 异常。
         *
         * @param pjp         切点
         * @param rateLimited 限流注解
         * @return 原方法返回值
         * @throws Throwable 原方法抛出的异常或限流拒绝异常
         */
        @Around("@annotation(rateLimited)")
        public Object around(ProceedingJoinPoint pjp, RateLimited rateLimited) throws Throwable {
            MethodSignature signature = (MethodSignature) pjp.getSignature();
            Method method = signature.getMethod();
            String rateLimitKey = resolveKey(rateLimited, method, pjp.getArgs());

            boolean allowed = rateLimiter.tryConsume(
                    rateLimitKey,
                    rateLimited.capacity(),
                    rateLimited.refillTokens(),
                    rateLimited.refillPeriodSeconds());

            if (!allowed) {
                log.warn("API 限流拒绝：method={}, key={}", method.getName(), rateLimitKey);
                // 抛出 HTTP 429 Too Many Requests，由全局异常处理器统一响应
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "请求过于频繁，请稍后再试");
            }
            return pjp.proceed();
        }

        /**
         * 解析 SpEL 表达式生成限流键。
         *
         * <p>当 {@link RateLimited#key()} 为空时，使用 方法全限定名 作为默认键。
         * 否则使用 SpEL 解析表达式，可访问方法参数（参数名需可通过 -parameters 编译保留）。</p>
         *
         * @param rateLimited 限流注解
         * @param method      当前方法
         * @param args        方法参数值
         * @return 限流键字符串
         */
        private String resolveKey(RateLimited rateLimited, Method method, Object[] args) {
            String expressionStr = rateLimited.key();
            if (expressionStr == null || expressionStr.isBlank()) {
                // 默认键：方法全限定名
                return method.getDeclaringClass().getSimpleName() + "#" + method.getName();
            }
            try {
                Expression expression = parser.parseExpression(expressionStr);
                MethodBasedEvaluationContext context = new MethodBasedEvaluationContext(
                        null, method, args, paramNameDiscoverer);
                Object value = expression.getValue(context);
                if (value == null) {
                    return method.getName() + ":null";
                }
                return method.getName() + ":" + value;
            } catch (org.springframework.expression.ExpressionException e) {
                // SpEL 解析失败时降级为方法名，避免限流失效
                log.warn("SpEL 解析限流键失败，降级为方法名：expression={}, error={}",
                        expressionStr, e.getMessage());
                return method.getName();
            }
        }
    }
}
