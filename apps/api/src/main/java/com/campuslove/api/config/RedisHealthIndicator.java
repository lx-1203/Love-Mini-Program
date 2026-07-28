package com.campuslove.api.config;

import java.util.Properties;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.stereotype.Component;

/**
 * Redis 健康检查指示器。
 *
 * <p>继承 Spring Boot Actuator 的 {@link HealthIndicator}，重写 {@link #health()} 方法，
 * 通过向 Redis 发送 PING 命令探测连通性，返回 UP/DOWN 状态。</p>
 *
 * <p>仅在 real profile 下激活，并要求 classpath 中存在 {@link RedisOperations} 类
 * （即 spring-boot-starter-data-redis 已引入）。当 Redis 不可达时返回 DOWN，
 * 并附带异常信息供运维排查；不会抛出异常以避免拖垮 Actuator 健康检查端点。</p>
 *
 * <p>暴露路径：{@code /actuator/health}，组件名称为 {@code redis}。</p>
 */
@Component
@Profile("real")
@ConditionalOnClass(RedisOperations.class)
public class RedisHealthIndicator implements HealthIndicator {

    /** Redis 连接工厂，由 Spring 容器注入 */
    private final RedisConnectionFactory connectionFactory;

    /**
     * 构造方法，注入 RedisConnectionFactory。
     *
     * <p>优先使用 RedisConnectionFactory 而非 RedisTemplate，避免因 RedisTemplate
     * 序列化器配置问题影响健康检查的连通性探测。</p>
     *
     * @param connectionFactory Redis 连接工厂
     */
    public RedisHealthIndicator(RedisConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    /**
     * 执行 Redis 健康检查。
     *
     * <p>检查流程：</p>
     * <ol>
     *   <li>获取 RedisConnection，发送 PING 命令</li>
     *   <li>PING 返回 "PONG" 视为 UP，附带连接信息（dbSize、版本等）</li>
     *   <li>任何异常视为 DOWN，附带异常类名与消息</li>
     * </ol>
     *
     * @return 健康状态对象（UP 或 DOWN）
     */
    @Override
    public Health health() {
        // connectionFactory 为空时直接返回 DOWN，避免 NPE
        if (connectionFactory == null) {
            return Health.down()
                    .withDetail("error", "RedisConnectionFactory is null")
                    .build();
        }

        try (RedisConnection connection = connectionFactory.getConnection()) {
            // 1. 发送 PING 命令探测连通性
            String pingResponse = connection.ping();
            boolean isUp = "PONG".equalsIgnoreCase(pingResponse);

            if (!isUp) {
                // PING 返回非 PONG，视为不可用
                return Health.down()
                        .withDetail("error", "Unexpected PING response: " + pingResponse)
                        .build();
            }

            // 2. 收集 Redis 基本信息（失败不阻断 UP 状态）
            Health.Builder builder = Health.up();
            try {
                Properties info = connection.info("server");
                if (info != null) {
                    String version = info.getProperty("redis_version");
                    if (version != null) {
                        builder.withDetail("version", version);
                    }
                }
            } catch (org.springframework.data.redis.RedisSystemException ignored) {
                // info 命令失败不影响主连通性判定
            }

            try {
                Long dbSize = connection.dbSize();
                if (dbSize != null) {
                    builder.withDetail("dbSize", dbSize);
                }
            } catch (org.springframework.data.redis.RedisSystemException ignored) {
                // dbSize 命令失败不影响主连通性判定
            }

            return builder.build();
        } catch (org.springframework.data.redis.RedisSystemException e) {
            // 任何异常视为 DOWN，附带异常信息便于运维排查
            return Health.down()
                    .withDetail("error", e.getClass().getName() + ": " + e.getMessage())
                    .build();
        }
    }
}
