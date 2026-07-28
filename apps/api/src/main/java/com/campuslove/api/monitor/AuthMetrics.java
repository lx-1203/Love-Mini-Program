package com.campuslove.api.monitor;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 认证业务监控指标。
 *
 * <p>指标说明：</p>
 * <ul>
 *   <li>{@code auth.login.success}：登录成功次数（标签 userId 标识用户）</li>
 *   <li>{@code auth.login.failure}：登录失败次数（标签 reason 标识失败原因）</li>
 *   <li>{@code auth.token.refresh}：Token 刷新次数</li>
 * </ul>
 *
 * <p>容错策略：所有指标记录方法均使用 try-catch 包裹，失败时只记录日志不抛出异常。</p>
 *
 * <p>注意：userId 作为标签可能产生高基数指标，生产环境如担心指标膨胀，
 * 可考虑去掉 userId 标签或仅记录聚合指标。当前实现保留 userId 以便于排查登录异常。</p>
 */
@Component
public class AuthMetrics {

    private static final Logger log = LoggerFactory.getLogger(AuthMetrics.class);

    /** 登录成功计数器指标名 */
    private static final String METRIC_LOGIN_SUCCESS = "auth.login.success";
    /** 登录失败计数器指标名 */
    private static final String METRIC_LOGIN_FAILURE = "auth.login.failure";
    /** Token 刷新计数器指标名 */
    private static final String METRIC_TOKEN_REFRESH = "auth.token.refresh";

    private static final String TAG_USER_ID = "userId";
    private static final String TAG_REASON = "reason";

    private final MeterRegistry meterRegistry;

    /** Token 刷新计数器（无标签，单例） */
    private final Counter tokenRefreshCounter;

    public AuthMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        // tokenRefresh 不带标签，可预先注册单例 Counter
        this.tokenRefreshCounter = Counter.builder(METRIC_TOKEN_REFRESH)
                .description("JWT Token 刷新次数")
                .register(meterRegistry);
    }

    /**
     * 记录一次登录成功。
     *
     * @param userId 用户 ID（作为标签，便于按用户聚合）
     */
    public void recordLoginSuccess(Long userId) {
        try {
            Counter.builder(METRIC_LOGIN_SUCCESS)
                    .tag(TAG_USER_ID, userId == null ? "unknown" : String.valueOf(userId))
                    .description("登录成功次数（按用户区分）")
                    .register(meterRegistry)
                    .increment();
        } catch (RuntimeException e) {
            log.warn("记录 auth.login.success 指标失败, userId={}: {}", userId, e.getMessage());
        }
    }

    /**
     * 记录一次登录失败。
     *
     * @param reason 失败原因（如 invalid_credentials、user_not_found、wechat_auth_failed 等）
     */
    public void recordLoginFailure(String reason) {
        try {
            Counter.builder(METRIC_LOGIN_FAILURE)
                    .tag(TAG_REASON, reason == null || reason.isBlank() ? "unknown" : reason)
                    .description("登录失败次数（按原因区分）")
                    .register(meterRegistry)
                    .increment();
        } catch (RuntimeException e) {
            log.warn("记录 auth.login.failure 指标失败, reason={}: {}", reason, e.getMessage());
        }
    }

    /**
     * 记录一次 Token 刷新。
     */
    public void recordTokenRefresh() {
        try {
            tokenRefreshCounter.increment();
        } catch (RuntimeException e) {
            log.warn("记录 auth.token.refresh 指标失败: {}", e.getMessage());
        }
    }
}
