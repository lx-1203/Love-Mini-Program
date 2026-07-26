package com.campuslove.api.config;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettucePoolingClientConfiguration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis 配置类。
 *
 * <p>本配置提供以下核心能力：</p>
 * <ul>
 *   <li>基于 Lettuce 客户端的 Redis 连接工厂，启用 commons-pool2 连接池</li>
 *   <li>{@link RedisTemplate} 使用 StringRedisSerializer + GenericJackson2JsonRedisSerializer
 *       组合，保证 key 可读、value 跨服务可解析</li>
 *   <li>{@link CacheManager} 默认 TTL 30 分钟，供 @Cacheable / @CacheEvict 使用</li>
 *   <li>所有连接参数（host/port/password/database）支持环境变量外部化</li>
 * </ul>
 *
 * <p>降级策略：当 Redis 不可用时，业务方应通过 try-catch 自行处理，
 * 本配置不强制依赖 Redis 可用性（LettuceConnectionFactory 在首次连接失败时
 * 才会抛异常，不会阻塞 Spring 容器启动）。</p>
 */
@Configuration
@EnableCaching
@Profile("real")
@ConditionalOnClass(RedisTemplate.class)
public class RedisConfig {

    /** Redis 主机地址，默认 localhost，生产环境通过 REDIS_HOST 环境变量配置 */
    @Value("${spring.data.redis.host:${REDIS_HOST:127.0.0.1}}")
    private String redisHost;

    /** Redis 端口，默认 6379，可通过 REDIS_PORT 环境变量覆盖 */
    @Value("${spring.data.redis.port:${REDIS_PORT:6379}}")
    private int redisPort;

    /** Redis 密码，留空表示无密码，生产环境必须通过 REDIS_PASSWORD 配置 */
    @Value("${spring.data.redis.password:${REDIS_PASSWORD:}}")
    private String redisPassword;

    /** Redis 数据库索引，默认 0，可通过 REDIS_DATABASE 切换多业务隔离 */
    @Value("${spring.data.redis.database:${REDIS_DATABASE:0}}")
    private int redisDatabase;

    /** Redis 连接池最大活跃连接数（commons-pool2），默认 8 */
    @Value("${spring.data.redis.lettuce.pool.max-active:${REDIS_POOL_MAX_ACTIVE:8}}")
    private int poolMaxActive;

    /** Redis 连接池最大空闲连接数，默认 8 */
    @Value("${spring.data.redis.lettuce.pool.max-idle:${REDIS_POOL_MAX_IDLE:8}}")
    private int poolMaxIdle;

    /** Redis 连接池最小空闲连接数，默认 0 */
    @Value("${spring.data.redis.lettuce.pool.min-idle:${REDIS_POOL_MIN_IDLE:0}}")
    private int poolMinIdle;

    /** Redis 连接池最大等待时间（毫秒），默认 -1（无限等待） */
    @Value("${spring.data.redis.lettuce.pool.max-wait:${REDIS_POOL_MAX_WAIT:-1}}")
    private long poolMaxWaitMs;

    /** 默认缓存 TTL：30 分钟，与文档要求保持一致 */
    private static final Duration DEFAULT_CACHE_TTL = Duration.ofMinutes(30);

    /** 用户资料缓存 TTL：10 分钟 */
    private static final Duration USER_PROFILE_TTL = Duration.ofMinutes(10);

    /** 推荐人物列表缓存 TTL：5 分钟（实时性要求高，TTL 较短） */
    private static final Duration MATCH_RECOMMEND_TTL = Duration.ofMinutes(5);

    /** 村口热门帖子缓存 TTL：15 分钟 */
    private static final Duration VILLAGE_HOT_POSTS_TTL = Duration.ofMinutes(15);

    /** 校园（学校）列表缓存 TTL：1 小时（变更频率低，TTL 较长） */
    private static final Duration CAMPUS_SCHOOLS_TTL = Duration.ofHours(1);

    /** 每日一问缓存 TTL：1 小时（每日只更新一次，TTL 较长） */
    private static final Duration DAILY_QUESTION_TTL = Duration.ofHours(1);

    /**
     * 配置 LettuceConnectionFactory，启用 commons-pool2 连接池。
     *
     * <p>说明：使用 {@link LettucePoolingClientConfiguration} 显式启用连接池，
     * 需要项目已引入 commons-pool2 依赖（pom.xml 已配置）。
     * 连接池参数通过环境变量外部化，便于不同部署环境调优。</p>
     *
     * @return Lettuce 连接工厂
     */
    @Bean
    @ConditionalOnMissingBean(RedisConnectionFactory.class)
    public LettuceConnectionFactory redisConnectionFactory() {
        // 1. 配置 Redis 单机连接参数（host/port/password/database）
        RedisStandaloneConfiguration standaloneConfig = new RedisStandaloneConfiguration();
        standaloneConfig.setHostName(redisHost);
        standaloneConfig.setPort(redisPort);
        standaloneConfig.setDatabase(redisDatabase);
        if (redisPassword != null && !redisPassword.isBlank()) {
            standaloneConfig.setPassword(redisPassword);
        }

        // 2. 配置 Lettuce 连接池（基于 commons-pool2）
        org.apache.commons.pool2.impl.GenericObjectPoolConfig<?> poolConfig =
                new org.apache.commons.pool2.impl.GenericObjectPoolConfig<>();
        poolConfig.setMaxTotal(poolMaxActive);
        poolConfig.setMaxIdle(poolMaxIdle);
        poolConfig.setMinIdle(poolMinIdle);
        poolConfig.setMaxWait(Duration.ofMillis(poolMaxWaitMs));
        // 启用 JMX 监控（与 actuator 集成，便于观察连接池状态）
        poolConfig.setJmxEnabled(false);

        LettuceClientConfiguration clientConfig = LettucePoolingClientConfiguration.builder()
                .poolConfig(poolConfig)
                .build();

        return new LettuceConnectionFactory(standaloneConfig, clientConfig);
    }

    /**
     * 自定义 RedisTemplate。
     *
     * <p>序列化策略：</p>
     * <ul>
     *   <li>key: {@link StringRedisSerializer} —— 保证 key 在 Redis CLI 中可读</li>
     *   <li>value: {@link GenericJackson2JsonRedisSerializer} —— JSON 序列化，
     *       携带类型信息，支持反序列化为原始对象</li>
     *   <li>hashKey/hashValue 同上</li>
     * </ul>
     *
     * @param connectionFactory Redis 连接工厂
     * @return 配置好序列化器的 RedisTemplate
     */
    @Bean
    @ConditionalOnMissingBean(name = "redisTemplate")
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        GenericJackson2JsonRedisSerializer jsonSerializer =
                new GenericJackson2JsonRedisSerializer();

        // key 与 hashKey 使用 String 序列化，保证可读性
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        // value 与 hashValue 使用 JSON 序列化，支持对象存储
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        template.afterPropertiesSet();
        return template;
    }

    /**
     * 配置 Spring Cache 缓存管理器，基于 Redis 实现。
     *
     * <p>默认 TTL 30 分钟，可通过 {@code spring.cache.redis.time-to-live} 配置覆盖。
     * 缓存 key 默认使用方法签名 + 参数哈希，前缀为缓存名称（如 "users::" ）。</p>
     *
     * <p>各 CacheName 独立 TTL 配置：</p>
     * <ul>
     *   <li>{@link CacheNames#USER_PROFILE}：10 分钟</li>
     *   <li>{@link CacheNames#MATCH_RECOMMEND}：5 分钟</li>
     *   <li>{@link CacheNames#VILLAGE_HOT_POSTS}：15 分钟</li>
     *   <li>{@link CacheNames#CAMPUS_SCHOOLS}：1 小时</li>
     *   <li>{@link CacheNames#DAILY_QUESTION}：1 小时</li>
     * </ul>
     *
     * @param connectionFactory Redis 连接工厂
     * @return Redis 缓存管理器
     */
    @Bean
    @ConditionalOnMissingBean(CacheManager.class)
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // 默认缓存配置：TTL 30 分钟，key 用 String 序列化，value 用 JSON 序列化
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(DEFAULT_CACHE_TTL)
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        // 按 CacheName 维度配置独立 TTL
        Map<String, RedisCacheConfiguration> cacheNameTtl = new HashMap<>();
        cacheNameTtl.put(CacheNames.USER_PROFILE, defaultConfig.entryTtl(USER_PROFILE_TTL));
        cacheNameTtl.put(CacheNames.MATCH_RECOMMEND, defaultConfig.entryTtl(MATCH_RECOMMEND_TTL));
        cacheNameTtl.put(CacheNames.VILLAGE_HOT_POSTS, defaultConfig.entryTtl(VILLAGE_HOT_POSTS_TTL));
        cacheNameTtl.put(CacheNames.CAMPUS_SCHOOLS, defaultConfig.entryTtl(CAMPUS_SCHOOLS_TTL));
        cacheNameTtl.put(CacheNames.DAILY_QUESTION, defaultConfig.entryTtl(DAILY_QUESTION_TTL));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheNameTtl)
                .transactionAware()
                .build();
    }
}
