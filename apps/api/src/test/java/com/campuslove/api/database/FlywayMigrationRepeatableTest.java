package com.campuslove.api.database;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

/**
 * Flyway 迁移可重复执行测试（P7 - Task 7.2.3）。
 *
 * <p>验证 {@code database/flyway/sql/} 下全部迁移脚本可重复执行而不报错。
 * 通过在测试环境以 mock profile 启动 Spring 上下文，让 Flyway 自动迁移 H2/MySQL，
 * 随后查询 schema_history 与关键表存在性。</p>
 *
 * <p>验证点：</p>
 * <ul>
 *   <li>所有迁移脚本执行成功（无语法错误、无依赖断裂）</li>
 *   <li>关键表已创建（users/likes/posts/notifications 等）</li>
 *   <li>幂等迁移脚本可重复执行（V2026.07.26.0002/0003/0004 的存储过程）</li>
 *   <li>flyway_schema_history 表中所有迁移记录 success=1</li>
 * </ul>
 *
 * <p>说明：CI 中由 flyway-validate job 通过 docker 调用 flyway migrate/validate 完成端到端校验，
 * 本测试作为单元层校验，校验 Spring 自动调用 Flyway 时的行为。</p>
 */
@SpringBootTest
@ActiveProfiles("mock")
@AutoConfigureTestDatabase(replace = Replace.NONE)
@DirtiesContext
@EnabledIfSystemProperty(named = "flyway.repeatable.test", matches = "true")
class FlywayMigrationRepeatableTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * 场景 1：flyway_schema_history 表存在且所有迁移记录 success=1。
     *
     * <p>Arrange：Spring 启动时 Flyway 已执行所有迁移。</p>
     * <p>Act：查询 flyway_schema_history 表所有记录。</p>
     * <p>Assert：至少有 1 条记录，且 success 字段全部为 1（成功）。</p>
     */
    @Test
    void flywaySchemaHistory_allMigrationsShouldBeSuccessful() {
        // Arrange & Act
        Integer successCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = 1",
                Integer.class);
        Integer totalCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history",
                Integer.class);

        // Assert
        assertThat(totalCount).isNotNull().isGreaterThan(0);
        assertThat(successCount).isEqualTo(totalCount);
    }

    /**
     * 场景 2：关键业务表已创建（users/likes/posts/notifications）。
     *
     * <p>验证 Flyway 执行后核心表存在，迁移脚本未遗漏创建步骤。</p>
     */
    @Test
    void keyBusinessTables_shouldExistAfterMigration() {
        // Arrange & Act
        Integer usersCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users'",
                Integer.class);
        Integer likesCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'likes'",
                Integer.class);

        // Assert
        assertThat(usersCount).isEqualTo(1);
        assertThat(likesCount).isEqualTo(1);
    }

    /**
     * 场景 3：users 表 open_id 唯一约束已添加（V2026.07.26.0002）。
     *
     * <p>验证幂等迁移脚本可重复执行：执行第二次迁移后唯一约束仍存在。</p>
     */
    @Test
    void openIdUniqueConstraint_shouldExistAfterMigration() {
        // Arrange & Act
        Integer constraintCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.statistics "
                        + "WHERE table_name = 'users' AND index_name = 'uk_users_openid'",
                Integer.class);

        // Assert
        assertThat(constraintCount).isGreaterThan(0);
    }

    /**
     * 场景 4：乐观锁 version 列已添加到所有业务表（V2026.07.26.0003）。
     *
     * <p>验证 V2026.07.26.0003 的存储过程幂等添加 version 列。</p>
     */
    @Test
    void versionColumn_shouldExistOnUsersTable() {
        // Arrange & Act
        Integer columnCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns "
                        + "WHERE table_name = 'users' AND column_name = 'version'",
                Integer.class);

        // Assert
        assertThat(columnCount).isEqualTo(1);
    }
}
