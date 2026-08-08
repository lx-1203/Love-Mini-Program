package com.campuslove.api.common;

import com.campuslove.api.config.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 幂等性拦截器（Task 2.4.3）。
 *
 * <p>拦截标注 {@link Idempotent} 的 Controller 方法，基于 {@code Idempotency-Key}
 * 请求头 + Redis SETNX 原子操作实现写操作幂等去重。</p>
 *
 * <p>处理流程：</p>
 * <ol>
 *   <li>从请求头获取 {@code Idempotency-Key}；缺失且 {@link Idempotent#required()}=true
 *       时返回 400 + 错误码 {@code IDEMPOTENT_KEY_MISSING}</li>
 *   <li>从 SecurityContext 获取当前 userId（未认证时使用 "anonymous" 兜底）</li>
 *   <li>构造 Redis Key：{@code idempotent:{key}:{userId}}</li>
 *   <li>使用 {@code SET key 1 NX EX ttl} 原子写入：
 *     <ul>
 *       <li>成功（返回 true）→ 放行，业务方法执行</li>
 *       <li>失败（key 已存在）→ 抛出 {@link IdempotencyException}（409 Conflict）</li>
 *     </ul>
 *   </li>
 *   <li>业务方法执行完毕后不删除 key（保证 TTL 内重复请求均被拦截）</li>
 * </ol>
 *
 * <p>降级策略：Redis 不可用时记录 warn 日志并放行，避免阻断主流程
 * （幂等性是优化项，非安全关键项；Redis 故障时降级为非幂等模式）。</p>
 *
 * <p>注册：通过 {@link com.campuslove.api.config.WebConfig} 或
 * {@link org.springframework.web.servlet.config.annotation.InterceptorRegistry}
 * 注册到 {@code /api/**} 路径。</p>
 *
 * @since P2 / Task 2.4.3
 */
@Component
@Profile("real")
public class IdempotentInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(IdempotentInterceptor.class);

    /** 请求头名称：Idempotency-Key */
    public static final String HEADER_IDEMPOTENCY_KEY = "Idempotency-Key";

    /** Redis Key 前缀：idempotent: */
    public static final String REDIS_KEY_PREFIX = "idempotent:";

    /** Redis 中存储的占位值（仅用于 SETNX 占位，不读取） */
    private static final String PLACEHOLDER_VALUE = "1";

    /** 未认证场景下的用户兜底标识 */
    private static final String ANONYMOUS_USER = "anonymous";

    /** 幂等键最大长度（infra R2-00248，防止超长头生成超长 Redis key） */
    private static final int MAX_KEY_LENGTH = 128;

    /**
     * R4-00287：请求属性 key——记录本次请求成功 SETNX 的幂等键，
     * 供 {@link #afterCompletion} 在业务失败（HTTP >= 400）时释放。
     */
    private static final String ATTR_ACQUIRED_IDEMPOTENT_KEY =
            IdempotentInterceptor.class.getName() + ".acquiredKey";

    /** Redis 操作接口（可能为 null，当 Redis 不可用时降级） */
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 构造函数注入 RedisTemplate。
     *
     * <p>当 Redis 不可用（如 mock profile）时，{@code redisTemplate} 可能为 null，
     * 此时拦截器降级为放行模式（仅记录 warn 日志）。</p>
     *
     * @param redisTemplate Redis 操作模板
     */
    public IdempotentInterceptor(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                              Object handler) {
        // 仅拦截 Controller 方法
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        Idempotent annotation = handlerMethod.getMethodAnnotation(Idempotent.class);
        // 也支持类级注解（兼容未来扩展）
        if (annotation == null) {
            annotation = handlerMethod.getBeanType().getAnnotation(Idempotent.class);
        }
        if (annotation == null) {
            return true;
        }

        String idempotencyKey = request.getHeader(HEADER_IDEMPOTENCY_KEY);
        if (idempotencyKey != null) {
            idempotencyKey = idempotencyKey.trim();
        }

        // infra R2-00248: 限制幂等键长度，防止超长头生成超长 Redis key（资源滥用）
        if (idempotencyKey != null && idempotencyKey.length() > MAX_KEY_LENGTH) {
            throw new InvalidOperationException(
                    "Idempotency-Key 长度不能超过 " + MAX_KEY_LENGTH + " 字符");
        }

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            if (annotation.required()) {
                log.warn("幂等性校验失败：缺少 Idempotency-Key 头，method={}",
                        handlerMethod.getMethod().getName());
                throw new InvalidOperationException(ErrorMessages.IDEMPOTENCY_KEY_MISSING);
            }
            // 非强制场景下，缺失 key 时跳过幂等校验
            return true;
        }

        // 获取当前用户 ID（未认证时使用 anonymous 兜底）
        String userIdStr;
        try {
            Long userId = SecurityUtils.getCurrentUserId();
            userIdStr = userId != null ? String.valueOf(userId) : ANONYMOUS_USER;
        } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized e) {
            // 未认证场景下使用 anonymous 兜底，避免拦截器抛出 401 影响放行端点
            userIdStr = ANONYMOUS_USER;
        }

        String redisKey = buildRedisKey(idempotencyKey, userIdStr);

        // Redis 降级：redisTemplate 为 null 时放行
        if (redisTemplate == null) {
            log.warn("RedisTemplate 不可用，跳过幂等校验：method={}, key={}",
                    handlerMethod.getMethod().getName(), redisKey);
            return true;
        }

        try {
            ValueOperations<String, Object> ops = redisTemplate.opsForValue();
            // SET key value NX EX ttl —— 仅当 key 不存在时写入，并设置 TTL
            Boolean acquired = ops.setIfAbsent(
                    redisKey,
                    PLACEHOLDER_VALUE,
                    Duration.ofSeconds(annotation.ttlSeconds()));
            if (Boolean.FALSE.equals(acquired)) {
                // key 已存在 → 重复请求
                log.warn("幂等性冲突：重复请求被拦截，method={}, key={}",
                        handlerMethod.getMethod().getName(), redisKey);
                throw new IdempotencyException(
                        "重复请求已被拦截，请勿使用相同的 Idempotency-Key");
            }
            // acquired=true → 首次请求，放行
            // R4-00287：记录已获取的幂等键，业务失败时（afterCompletion 判定 HTTP >= 400）
            // 释放该键，避免「密码输错一次 → 同 key 重试 4 小时被 409 拦截」等锁死场景
            request.setAttribute(ATTR_ACQUIRED_IDEMPOTENT_KEY, redisKey);
            log.debug("幂等性校验通过：method={}, key={}, ttl={}s",
                    handlerMethod.getMethod().getName(), redisKey, annotation.ttlSeconds());
            return true;
        } catch (IdempotencyException e) {
            // 幂等冲突异常向上抛出，由 GlobalExceptionHandler 处理
            throw e;
        } catch (InvalidOperationException e) {
            // 参数校验异常向上抛出
            throw e;
        } catch (RuntimeException e) {
            // Redis 异常（DataAccessException 或 RedisTemplate 连接异常等）时降级放行，避免阻断主流程
            // 捕获 RuntimeException 而非 DataAccessException：覆盖 RedisTemplate 在连接异常时
            // 可能抛出的非 DataAccessException 子类异常（如 Mockito 测试场景）
            log.warn("幂等性校验异常，降级放行：method={}, key={}, error={}",
                    handlerMethod.getMethod().getName(), redisKey, e.getMessage());
            return true;
        }
    }

    /**
     * R4-00287：业务执行完成后按结果释放幂等键。
     *
     * <p>幂等键在业务执行前 SETNX，若业务失败（HTTP 状态 >= 400，如密码错误 401、
     * 业务异常 400/409/500）仍保留该键，客户端同 key 重试在 TTL（默认 4 小时）内
     * 会被 409 拦截。此处对失败请求删除幂等键，使客户端可在失败后立即重试；
     * 成功请求（HTTP &lt; 400）保留键，保证 TTL 内重复请求仍被幂等拦截。</p>
     *
     * <p>注意：GlobalExceptionHandler 处理业务异常后响应状态已写入，此处读取
     * response.getStatus() 即可准确反映业务结果（成功 200/201，失败 4xx/5xx）。</p>
     */
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        if (redisTemplate == null) {
            return;
        }
        Object acquiredKey = request.getAttribute(ATTR_ACQUIRED_IDEMPOTENT_KEY);
        if (!(acquiredKey instanceof String redisKey)) {
            return;
        }
        request.removeAttribute(ATTR_ACQUIRED_IDEMPOTENT_KEY);
        if (response.getStatus() < 400) {
            return;
        }
        try {
            Boolean deleted = redisTemplate.delete(redisKey);
            log.warn("业务失败（HTTP {}），释放幂等键: key={}, deleted={}",
                    response.getStatus(), redisKey, deleted);
        } catch (RuntimeException e) {
            // 释放失败不影响主流程：幂等键将按 TTL 自然过期
            log.warn("释放幂等键失败，等待 TTL 自然过期: key={}, error={}",
                    redisKey, e.getMessage());
        }
    }

    /**
     * 构造 Redis Key。
     *
     * <p>格式：{@code idempotent:{idempotencyKey}:{userId}}，
     * 按用户隔离，避免不同用户使用相同 UUID 时误判为重复。</p>
     *
     * @param idempotencyKey 客户端传入的幂等键
     * @param userIdStr      当前用户 ID 字符串
     * @return Redis Key
     */
    private String buildRedisKey(String idempotencyKey, String userIdStr) {
        return REDIS_KEY_PREFIX + idempotencyKey + ":" + userIdStr;
    }
}
