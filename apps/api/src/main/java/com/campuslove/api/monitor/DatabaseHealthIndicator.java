package com.campuslove.api.monitor;

import java.sql.Connection;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;

/**
 * 数据库连通性健康指示器。
 *
 * <p>Spring Boot Actuator 会自动收集所有 {@link HealthIndicator} 实现，
 * 在 /actuator/health 端点中聚合展示。本类通过 {@link DataSource} 验证数据库连通性，
 * 当连接获取失败或查询失败时返回 DOWN 状态，便于运维通过健康检查端点快速发现问题。</p>
 *
 * <p>命名约定：bean 名称 {@code dbHealthIndicator} 会被 Actuator 自动用作健康检查子项 key，
 * 在 /actuator/health 响应中以 {@code "db": {"status": "UP", "details": {...}}} 形式展示。</p>
 *
 * <p>条件加载：通过 {@link ConditionalOnBean} 限定仅在 {@link DataSource} 存在时注册，
 * 避免在 mock profile（DataSourceAutoConfiguration 被排除）下导致应用启动失败。</p>
 */
@Component("dbHealthIndicator")
@ConditionalOnBean(DataSource.class)
public class DatabaseHealthIndicator implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(DatabaseHealthIndicator.class);

    /** 健康检查探测 SQL（与 HikariCP connection-test-query 保持一致） */
    private static final String VALIDATION_SQL = "SELECT 1";

    private final DataSource dataSource;

    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * 执行数据库连通性检查。
     * 通过获取连接并执行 {@code SELECT 1} 验证数据库是否可达。
     * 连接获取失败或查询失败时返回 DOWN 状态，附带异常详情。
     *
     * @return Health 对象，UP 表示数据库可达，DOWN 表示不可达
     */
    @Override
    public Health health() {
        // try-with-resources 保证 Connection 在检查完成后被关闭，避免连接泄漏
        try (Connection connection = dataSource.getConnection()) {
            // 使用 isValid 校验连接是否仍然有效（超时 1 秒，避免长时间阻塞健康检查）
            if (connection.isValid(1)) {
                return Health.up()
                        .withDetail("database", "reachable")
                        .withDetail("validationQuery", VALIDATION_SQL)
                        .build();
            }
            // 连接无效：返回 DOWN，附带详细原因
            return Health.down()
                    .withDetail("database", "unreachable")
                    .withDetail("reason", "Connection.isValid returned false")
                    .build();
        } catch (Exception e) {
            // 获取连接失败（数据库不可达 / 鉴权失败 / 网络问题等）
            log.warn("数据库健康检查失败: {}", e.getMessage());
            return Health.down(e)
                    .withDetail("database", "unreachable")
                    .withDetail("error", e.getClass().getSimpleName())
                    .build();
        }
    }
}
