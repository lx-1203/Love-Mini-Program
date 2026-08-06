package com.campuslove.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * 缓存读失败降级配置（缺陷修复：Redis 缓存序列化不兼容）。
 *
 * <p>背景：历史实例曾用旧序列化器向 Redis 写入缓存值（缺少 Jackson default-typing），
 * 当前实例使用携带类型信息的 {@code Jackson2JsonRedisSerializer} 反序列化时，
 * 缓存命中直接抛 {@code SerializationException}，导致
 * {@code GET /api/v1/chat/overview}、{@code GET /api/v1/post-tags}、
 * {@code POST /api/v1/temp-chat/sessions} 等依赖 {@code @Cacheable} 的接口返回 500。</p>
 *
 * <p>修复策略（读失败降级）：</p>
 * <ul>
 *   <li>{@code handleCacheGetError}：记录告警日志并尝试清除该缓存键，
 *       随后不向外抛出异常——Spring {@code CacheInterceptor} 将视为缓存未命中，
 *       继续执行方法体回源查询（并用当前序列化器重新写缓存）</li>
 *   <li>{@code handleCachePutError} / {@code handleCacheEvictError} /
 *       {@code handleCacheClearError}：仅记录日志，不阻断主流程
 *       （与既有 RedisTemplate 使用处「连接异常降级放行」策略保持一致）</li>
 * </ul>
 *
 * <p>通过实现 {@link CachingConfigurer#errorHandler()} 注入全局缓存错误处理器，
 * 所有 {@code @Cacheable} / {@code @CacheEvict} 读取与写入均受保护。
 * 仅 real profile（Redis 缓存）激活，非 real profile 使用 Caffeine 无序列化问题。</p>
 */
@Configuration
@Profile("real")
public class CacheErrorHandlerConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(CacheErrorHandlerConfig.class);

    /**
     * 返回统一的缓存错误处理器。
     *
     * @return 读失败降级、写失败仅告警的 CacheErrorHandler
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {

            /**
             * 缓存读取失败：清除该键并降级为回源查询。
             * 不抛出异常，由 CacheInterceptor 继续执行方法体（缓存未命中路径）。
             */
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("缓存读取失败，清除缓存键并回源查询: cache={}, key={}, error={}",
                        cache != null ? cache.getName() : "unknown", key, exception.getMessage());
                try {
                    if (cache != null) {
                        cache.evict(key);
                    }
                } catch (RuntimeException evictEx) {
                    // 清除失败（如 Redis 不可达）仅记录日志，仍回源查询
                    log.warn("缓存键清除失败（不影响回源查询）: cache={}, key={}, error={}",
                            cache != null ? cache.getName() : "unknown", key, evictEx.getMessage());
                }
            }

            /**
             * 缓存写入失败：仅记录日志，不阻断主流程。
             */
            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("缓存写入失败（不影响业务响应）: cache={}, key={}, error={}",
                        cache != null ? cache.getName() : "unknown", key, exception.getMessage());
            }

            /**
             * 缓存失效失败：仅记录日志，不阻断主流程。
             */
            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("缓存失效失败（TTL 到期后自动恢复）: cache={}, key={}, error={}",
                        cache != null ? cache.getName() : "unknown", key, exception.getMessage());
            }

            /**
             * 缓存清空失败：仅记录日志，不阻断主流程。
             */
            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("缓存清空失败（TTL 到期后自动恢复）: cache={}, error={}",
                        cache != null ? cache.getName() : "unknown", exception.getMessage());
            }
        };
    }
}
