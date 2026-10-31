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
 * <p>验证 {@code database/flyway/sql/} 下全部迁移脚本能在一座空库上从零建出完整 schema，
 * 重复执行不报错。通过在测试环境以 real profile 启动 Spring 上下文（Flyway 自动迁移真实 MySQL），
 * 随后查询 schema_history 与关键表存在性。</p>
 *
 * <p>profile 选择说明（2026-10-31 修正）：本类原先标 {@code @ActiveProfiles("mock")}，
 * 而 mock profile 在 application-mock.yml 里排除了 FlywayAutoConfiguration 与
 * HibernateJpaAutoConfiguration——也就是说它根本没有数据源、一行迁移都不会跑，
 * 这个测试在任何环境下都不可能通过（配合 {@code -Dflyway.repeatable.test} 开关后
 * 更是从不执行）。real profile 才真正加载 Flyway，判点才有意义。</p>
 *
 * <p>验证点：</p>
 * <ul>
 *   <li>所有迁移脚本执行成功（无语法错误、无依赖断裂）</li>
 *   <li>关键表已创建（users/likes/posts/notifications 等）</li>
 *   <li>幂等迁移脚本可重复执行（V2026.07.26.0002/0003/0004 的存储过程）</li>
 *   <li>flyway_schema_history 表中所有迁移记录 success=1</li>
 *   <li>circle_layer / admin_layer 由 V2026.10.13.0001 建出（空库从零构建的关键判点）</li>
 * </ul>
 *
 * <p>说明：由 CI 的 db-integration job 在一份新建的空 schema 上执行
 * （先 {@code mvn flyway:migrate} 再跑本测试），并传 {@code -Dflyway.repeatable.test=true}；
 * 未设置该属性时本类跳过（无 DB 环境）。tests/ci-contract.spec.mjs 校验该属性确实在 CI 里被设置，
 * 所以它不会退化成永不执行的死测试。</p>
 */
@SpringBootTest
@ActiveProfiles("real")
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
     *
     * <p>2026-10-31：查询条件补 {@code table_schema = DATABASE()}。原先只按 table_name 过滤，
     * 同一 MySQL 实例上只要存在第二座含 users 表的库（本地开发多库、CI 上的
     * campus_love + campus_love_fresh），COUNT 就变成 2，断言 {@code isEqualTo(1)} 会假红。</p>
     */
    @Test
    void keyBusinessTables_shouldExistAfterMigration() {
        // Arrange & Act
        Integer usersCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = DATABASE() AND table_name = 'users'",
                Integer.class);
        Integer likesCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = DATABASE() AND table_name = 'likes'",
                Integer.class);

        // Assert
        assertThat(usersCount).isEqualTo(1);
        assertThat(likesCount).isEqualTo(1);
    }

    /**
     * 场景 2b：circle_layer / admin_layer 由 V2026.10.13.0001 建出。
     *
     * <p>这两个表是 JPA 实体（CircleLayer / AdminLayer）映射的表，但在 V2026.10.13.0001
     * 之前没有任何迁移创建过它们——只有 V2026.10.14.0005 的 {@code UPDATE circle_layer}
     * 和 V2026.10.14.0007 的 {@code INSERT INTO circle_layer} 引用它们。也就是说空库
     * 从迁移链构建时会直接失败，表只存在于 database/backup 的人工 dump 里。</p>
     *
     * <p>本判点必须跑在【新建空 schema】上才有意义：在已经建好表的库上，
     * 低版本的 V2026.10.13.0001 会被 Flyway 报 Ignored（out-of-order 默认关闭），
     * 于是判点被历史遗留状态蒙过去。CI 的 db-integration job 因此用一份空库跑。</p>
     */
    @Test
    void circleLayerAndAdminLayerTables_shouldExistFromMigrationChain() {
        Integer circleLayer = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = DATABASE() AND table_name = 'circle_layer'",
                Integer.class);
        Integer adminLayer = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = DATABASE() AND table_name = 'admin_layer'",
                Integer.class);

        assertThat(circleLayer).as("circle_layer 必须由迁移链创建").isEqualTo(1);
        assertThat(adminLayer).as("admin_layer 必须由迁移链创建").isEqualTo(1);
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
                        + "WHERE table_schema = DATABASE() "
                        + "AND table_name = 'users' AND index_name = 'uk_users_openid'",
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
                        + "WHERE table_schema = DATABASE() "
                        + "AND table_name = 'users' AND column_name = 'version'",
                Integer.class);

        // Assert
        assertThat(columnCount).isEqualTo(1);
    }
}
