/**
 * 登录失败计数与账号锁定服务（账号级防爆破）。
 *
 * <p>背景：登录端点此前仅有 IP 维度限流（@RateLimit 按 remoteAddr），
 * 攻击者换个出口 IP 即可对同一账号持续撞库。本服务按<b>账号（手机号/管理员用户名）</b>
 * 维度在 Redis 记录登录失败次数：</p>
 * <ul>
 *   <li>连续失败 {@code app.security.login-attempt.max-failures} 次（默认 5）→
 *       锁定 {@code app.security.login-attempt.lock-minutes} 分钟（默认 15）</li>
 *   <li>登录成功即清零失败计数并解除锁定</li>
 *   <li>失败计数窗口 = 锁定时长（首次失败起算 TTL，窗口内未凑满次数自动衰减清零）</li>
 * </ul>
 *
 * <p>降级策略：Redis 不可用（未注入或运行时故障）时 <b>fail-open</b> 放行并记录 warn——
 * 账号锁定是纵深防御（IP 限流仍生效），Redis 故障时不应阻断全部登录；
 * 与资金类风控（幂等拦截器 strict 模式 fail-closed）不同，此处为可用性优先。</p>
 */
package com.campuslove.api.auth;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {

    private static final Logger log = LoggerFactory.getLogger(LoginAttemptService.class);

    /** 失败计数 Redis key 前缀（login:fail:{account}） */
    private static final String FAIL_KEY_PREFIX = "login:fail:";

    /** 锁定标记 Redis key 前缀（login:lock:{account}） */
    private static final String LOCK_KEY_PREFIX = "login:lock:";

    /** 连续失败次数上限（配置 app.security.login-attempt.max-failures，默认 5） */
    @Value("${app.security.login-attempt.max-failures:${APP_LOGIN_ATTEMPT_MAX_FAILURES:5}}")
    private int maxFailures;

    /** 锁定时长（分钟，配置 app.security.login-attempt.lock-minutes，默认 15） */
    @Value("${app.security.login-attempt.lock-minutes:${APP_LOGIN_ATTEMPT_LOCK_MINUTES:15}}")
    private int lockMinutes;

    /** Redis 模板（real profile 注入；mock/单测为 null 时 fail-open） */
    private final StringRedisTemplate redisTemplate;

    public LoginAttemptService(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
    }

    /**
     * 账号是否处于锁定态。
     *
     * @param account 账号标识（手机号或管理员用户名）
     * @return true 表示锁定中（应拒绝登录）
     */
    public boolean isLocked(String account) {
        if (account == null || account.isBlank() || redisTemplate == null) {
            return false;
        }
        try {
            Boolean hasLock = redisTemplate.hasKey(LOCK_KEY_PREFIX + account);
            return Boolean.TRUE.equals(hasLock);
        } catch (RuntimeException e) {
            // fail-open：Redis 故障不阻断登录（IP 限流仍生效）
            log.warn("查询账号锁定态失败，fail-open 放行: account=***, error={}", e.getMessage());
            return false;
        }
    }

    /**
     * 记录一次登录失败；连续失败达到上限时锁定账号。
     *
     * @param account 账号标识（手机号或管理员用户名）
     */
    public void recordFailure(String account) {
        if (account == null || account.isBlank() || redisTemplate == null) {
            return;
        }
        try {
            String failKey = FAIL_KEY_PREFIX + account;
            Long failures = redisTemplate.opsForValue().increment(failKey);
            if (failures != null && failures == 1L) {
                // 首次失败起算计数窗口（TTL = 锁定时长），窗口内未凑满次数自动清零
                redisTemplate.expire(failKey, Duration.ofMinutes(lockMinutes));
            }
            if (failures != null && failures >= maxFailures) {
                redisTemplate.opsForValue().set(LOCK_KEY_PREFIX + account, "1",
                        Duration.ofMinutes(lockMinutes));
                redisTemplate.delete(failKey);
                log.warn("账号连续登录失败达上限，临时锁定: account=***, failures={}, lockMinutes={}",
                        failures, lockMinutes);
            }
        } catch (RuntimeException e) {
            log.warn("记录登录失败计数失败（不影响登录主流程）: account=***, error={}", e.getMessage());
        }
    }

    /**
     * 登录成功后清零失败计数并解除锁定。
     *
     * @param account 账号标识（手机号或管理员用户名）
     */
    public void reset(String account) {
        if (account == null || account.isBlank() || redisTemplate == null) {
            return;
        }
        try {
            redisTemplate.delete(FAIL_KEY_PREFIX + account);
            redisTemplate.delete(LOCK_KEY_PREFIX + account);
        } catch (RuntimeException e) {
            log.warn("清零登录失败计数失败: account=***, error={}", e.getMessage());
        }
    }
}
