package com.campuslove.api.ratelimit;

/**
 * 速率限制超出异常。
 *
 * <p>当客户端请求触发 {@link RateLimit} 注解配置的限流策略，
 * 令牌桶中没有可用令牌时由 {@link RateLimitAspect} 抛出。</p>
 *
 * <p>由 {@link com.campuslove.api.config.GlobalExceptionHandler} 捕获并转换为
 * HTTP 429 Too Many Requests 响应，返回友好提示信息。</p>
 *
 * <p>继承 {@link RuntimeException} 以避免在业务方法签名中显式声明，
 * 同时保持 unchecked 语义，符合 Spring AOP 异常传播机制。</p>
 */
public class RateLimitExceededException extends RuntimeException {

    /** 序列化版本号（保持默认，未实现 Serializable 接口，仅作为预留）。 */
    private static final long serialVersionUID = 1L;

    /**
     * 构造速率限制超出异常。
     *
     * @param message 异常详细信息（包含限流键、方法名等上下文，便于排查）
     */
    public RateLimitExceededException(String message) {
        super(message);
    }

    /**
     * 构造速率限制超出异常（带原因）。
     *
     * @param message 异常详细信息
     * @param cause   原始异常（如 SpEL 解析失败等）
     */
    public RateLimitExceededException(String message, Throwable cause) {
        super(message, cause);
    }
}
