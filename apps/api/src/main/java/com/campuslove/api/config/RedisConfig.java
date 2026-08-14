package com.campuslove.api.config;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.redisson.config.Protocol;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis 配置类。
 *
 * <p>本配置提供以下核心能力：</p>
 * <ul>
 *   <li>基于 Lettuce 客户端的 Redis 连接工厂，启用 commons-pool2 连接池</li>
 *   <li>{@link RedisTemplate} 使用 StringRedisSerializer + Jackson2JsonRedisSerializer
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

    // ---- R4-01813~01815：Redisson 手动配置连接超时参数（命名常量） ----

    /** Redisson 操作超时（毫秒）：3s */
    private static final int REDIS_TIMEOUT_MS = 3000;

    /** Redisson 连接超时（毫秒）：5s */
    private static final int REDIS_CONNECT_TIMEOUT_MS = 5000;

    /** Redisson 重试间隔（毫秒）：1s */
    private static final int REDIS_RETRY_INTERVAL_MS = 1000;

    /** 默认缓存 TTL：30 分钟，与文档要求保持一致 */
    private static final Duration DEFAULT_CACHE_TTL = Duration.ofMinutes(30);

    /** 用户资料缓存 TTL：10 分钟 */
    private static final Duration USER_PROFILE_TTL = Duration.ofMinutes(10);

    /** 推荐人物列表缓存 TTL：5 分钟（实时性要求高，TTL 较短） */
    private static final Duration MATCH_RECOMMEND_TTL = Duration.ofMinutes(5);

    /** 游客推荐列表缓存 TTL：60 秒（2026-08-12 卡顿修复；新用户可见性窗口 1 分钟可接受） */
    private static final Duration GUEST_RECOMMEND_TTL = Duration.ofSeconds(60);

    /** 村口热门帖子缓存 TTL：15 分钟 */
    private static final Duration VILLAGE_HOT_POSTS_TTL = Duration.ofMinutes(15);

    /** 校园（学校）列表缓存 TTL：1 小时（变更频率低，TTL 较长） */
    private static final Duration CAMPUS_SCHOOLS_TTL = Duration.ofHours(1);

    /** 每日一问缓存 TTL：1 小时（每日只更新一次，TTL 较长） */
    private static final Duration DAILY_QUESTION_TTL = Duration.ofHours(1);

    /** 敏感词列表缓存 TTL：1 小时（变更频率低，TTL 较长；Admin 增删时主动失效） */
    private static final Duration SENSITIVE_WORDS_TTL = Duration.ofHours(1);

    /** 系统配置缓存 TTL：30 分钟（与默认 TTL 一致；Admin 更新时主动失效） */
    private static final Duration SYSTEM_CONFIG_TTL = Duration.ofMinutes(30);

    /** 用户标签 / 帖子标签缓存 TTL：10 分钟（预置静态列表，TTL 较短） */
    private static final Duration USER_TAGS_TTL = Duration.ofMinutes(10);

    /** 客户端动态配置缓存 TTL：5 分钟（Task 3.6，所有登录用户共享，TTL 短以保证及时性） */
    private static final Duration CLIENT_CONFIG_TTL = Duration.ofMinutes(5);

    /** 管理后台统计缓存 TTL：5 分钟（SubTask 5.3.4，作为 Redis 计数器方案，避免全表 COUNT 频繁触发） */
    private static final Duration ADMIN_STATS_TTL = Duration.ofMinutes(5);

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
     * 手动构建 RedissonClient（仅本地开发 profile 激活，通过
     * {@code app.redisson.manual-config=true} 开启，并配合启动参数排除
     * RedissonAutoConfiguration / RedissonAutoConfigurationV2 两个自动配置）。
     *
     * <p>背景（本地联调修复）：Spring Boot 3 将 {@code spring.redis.*} 迁移为
     * {@code spring.data.redis.*}，而 Redisson 3.27 的两个自动配置类行为不一致：
     * 当 {@code spring.data.redis.password} 为空字符串时仍会发送 AUTH，导致
     * 连接「无密码的本地 Redis」直接失败（ERR Client sent AUTH, but no password is set）。
     * 本 Bean 显式只在密码非空白时设置密码，并强制 RESP2 协议以兼容
     * Windows 旧版 Redis（3.0.504 不支持 RESP3/HELLO，见 redisson-dev.yaml）。</p>
     *
     * <p>生产环境不启用本 Bean（未设置 {@code app.redisson.manual-config}），
     * 仍走 Redisson 自动配置 + 真实密码，行为不变。</p>
     *
     * @return RedissonClient 实例
     */
    @Bean(destroyMethod = "shutdown")
    @ConditionalOnProperty(name = "app.redisson.manual-config", havingValue = "true")
    public RedissonClient redissonClient() {
        Config config = new Config();
        // 兼容 Windows 旧版 Redis：仅支持 RESP2 协议
        config.setProtocol(Protocol.RESP2);
        config.useSingleServer()
                .setAddress("redis://" + redisHost + ":" + redisPort)
                .setDatabase(redisDatabase)
                .setConnectionMinimumIdleSize(1)
                .setConnectionPoolSize(4)
                // R4-01813~01815：连接超时参数收敛为命名常量
                .setTimeout(REDIS_TIMEOUT_MS)
                .setConnectTimeout(REDIS_CONNECT_TIMEOUT_MS)
                .setRetryAttempts(1)
                .setRetryInterval(REDIS_RETRY_INTERVAL_MS);
        // 关键修复：密码为空白时不设置密码，避免发送 AUTH 导致无密码 Redis 连接失败
        if (redisPassword != null && !redisPassword.isBlank()) {
            config.useSingleServer().setPassword(redisPassword);
        }
        return Redisson.create(config);
    }

    /**
     * 自定义 RedisTemplate。
     *
     * <p>序列化策略：</p>
     * <ul>
     *   <li>key: {@link StringRedisSerializer} —— 保证 key 在 Redis CLI 中可读</li>
     *   <li>value: {@link Jackson2JsonRedisSerializer} —— JSON 序列化，
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
        // infra 修复(联调)：缓存序列化需同时满足：
        // 1) 注册 JSR310 模块——含 LocalDateTime 的 DTO(如 AdminConfigView.updatedAt)
        //    序列化否则抛 SerializationException(接口 500);
        // 2) 启用 default typing——Jackson2JsonRedisSerializer 配合 activateDefaultTyping
        //    对具体 DTO 也写入类型信息,反序列化还原具体类型。
        //    (GenericJackson2JsonRedisSerializer 仅对 Object/抽象顶层类型写 @class,
        //    具体 DTO 直接序列化不写类型,缓存命中后反序列化回 LinkedHashMap,
        //    与方法返回类型转换时抛 ClassCastException——实测 500)
        Jackson2JsonRedisSerializer<Object> jsonSerializer = redisJsonSerializer();
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
     *   <li>{@link CacheNames#SENSITIVE_WORDS}：1 小时</li>
     *   <li>{@link CacheNames#SYSTEM_CONFIG}：30 分钟</li>
     *   <li>{@link CacheNames#USER_TAGS}：10 分钟</li>
     *   <li>{@link CacheNames#CLIENT_CONFIG}：5 分钟（Task 3.6 客户端动态配置）</li>
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
                        .fromSerializer(redisJsonSerializer()));

        // 按 CacheName 维度配置独立 TTL
        Map<String, RedisCacheConfiguration> cacheNameTtl = new HashMap<>();
        cacheNameTtl.put(CacheNames.USER_PROFILE, defaultConfig.entryTtl(USER_PROFILE_TTL));
        cacheNameTtl.put(CacheNames.MATCH_RECOMMEND, defaultConfig.entryTtl(MATCH_RECOMMEND_TTL));
        cacheNameTtl.put(CacheNames.GUEST_RECOMMEND, defaultConfig.entryTtl(GUEST_RECOMMEND_TTL));
        cacheNameTtl.put(CacheNames.VILLAGE_HOT_POSTS, defaultConfig.entryTtl(VILLAGE_HOT_POSTS_TTL));
        cacheNameTtl.put(CacheNames.CAMPUS_SCHOOLS, defaultConfig.entryTtl(CAMPUS_SCHOOLS_TTL));
        cacheNameTtl.put(CacheNames.DAILY_QUESTION, defaultConfig.entryTtl(DAILY_QUESTION_TTL));
        cacheNameTtl.put(CacheNames.SENSITIVE_WORDS, defaultConfig.entryTtl(SENSITIVE_WORDS_TTL));
        cacheNameTtl.put(CacheNames.SYSTEM_CONFIG, defaultConfig.entryTtl(SYSTEM_CONFIG_TTL));
        cacheNameTtl.put(CacheNames.USER_TAGS, defaultConfig.entryTtl(USER_TAGS_TTL));
        cacheNameTtl.put(CacheNames.CLIENT_CONFIG, defaultConfig.entryTtl(CLIENT_CONFIG_TTL));
        cacheNameTtl.put(CacheNames.ADMIN_STATS, defaultConfig.entryTtl(ADMIN_STATS_TTL));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheNameTtl)
                .transactionAware()
                .build();
    }

    /**
     * Redis JSON 序列化器单例（P0-20 统一序列化配置）。
     *
     * <p>RedisTemplate 与 CacheManager 两条读写链路共用同一实例，保证序列化
     * 配置（含类型信息）完全一致，避免「写入侧与读取侧 Jackson 配置不一致」
     * 导致的反序列化失败（Unexpected token / missing type id）。</p>
     */
    private volatile Jackson2JsonRedisSerializer<Object> sharedJsonSerializer;

    /**
     * 构建 Redis JSON 序列化器(infra 联调修复，P0-20 改为懒加载单例)。
     *
     * <p>要点：</p>
     * <ul>
     *   <li>注册 {@code JavaTimeModule}：支持 LocalDateTime 等 JSR310 类型</li>
     *   <li>启用 default typing(NON_FINAL)：Jackson2JsonRedisSerializer 默认
     *       关闭类型信息,反序列化返回 LinkedHashMap,与缓存方法具体返回类型
     *       (如 MatchStatsView) 转换时抛 ClassCastException(实测 500)</li>
     *   <li>单例复用：RedisTemplate 与 CacheManager 共用同一实例，读写两侧
     *       Jackson 配置（含类型信息）严格一致</li>
     * </ul>
     */
    @SuppressWarnings("unchecked")
    private Jackson2JsonRedisSerializer<Object> redisJsonSerializer() {
        if (sharedJsonSerializer == null) {
            synchronized (this) {
                if (sharedJsonSerializer == null) {
                    com.fasterxml.jackson.databind.ObjectMapper jsonMapper =
                            new com.fasterxml.jackson.databind.ObjectMapper()
                                    .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
                    // R4-00285：启用 default typing 时不再使用空校验器（可反序列化任意
                    // @class 类型，Redis 可写场景存在多态 gadget 风险），改为白名单校验器：
                    // 仅允许本项目 DTO/实体包（com.campuslove.api.）与 JDK 集合/基础/时间类型，
                    // 其余类型在反序列化时直接拒绝。
                    com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator ptv =
                            com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator.builder()
                                    .allowIfSubType("com.campuslove.api.")
                                    .allowIfSubType("java.util.")
                                    .allowIfSubType("java.lang.")
                                    .allowIfSubType("java.time.")
                                    .allowIfBaseType("com.campuslove.api.")
                                    .allowIfBaseType("java.util.")
                                    .allowIfBaseType("java.lang.")
                                    .allowIfBaseType("java.time.")
                                    .build();
                    // 对具体 DTO 类型也启用类型信息(NON_FINAL + PROPERTY),写入 @class 属性,
                    // 反序列化时还原具体类型(如 MatchStatsView),避免 LinkedHashMap 转换异常
                    jsonMapper.activateDefaultTyping(
                            ptv,
                            com.fasterxml.jackson.databind.ObjectMapper.DefaultTyping.NON_FINAL,
                            com.fasterxml.jackson.annotation.JsonTypeInfo.As.PROPERTY);
                    sharedJsonSerializer = new Jackson2JsonRedisSerializer<Object>(jsonMapper, Object.class);
                }
            }
        }
        return sharedJsonSerializer;
    }
}
