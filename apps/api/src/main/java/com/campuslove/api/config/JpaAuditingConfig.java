package com.campuslove.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA 审计配置（Task 37 / P2.14）。
 *
 * <p>启用 {@link EnableJpaAuditing} 后，所有标注
 * {@link org.springframework.data.jpa.domain.support.AuditingEntityListener} 的实体，
 * 其 {@code @CreatedDate} 与 {@code @LastModifiedDate} 字段会被自动填充：</p>
 * <ul>
 *   <li>{@code createdAt} 在实体首次持久化时自动设置为当前时间</li>
 *   <li>{@code updatedAt} 在每次实体更新时自动刷新为当前时间</li>
 * </ul>
 *
 * <p>对应的实体字段已在 V2026.07.28.0004__audit_fields.sql 中补齐缺失列，
 * 由 Flyway 在数据库层面保证所有表都含有 {@code created_at}/{@code updated_at} 列。</p>
 *
 * <p>Profile 条件说明：使用 {@code @Profile("!mock")} 确保仅在非 mock profile 下启用审计。
 * mock profile（{@code application-mock.yml}）排除了 {@code HibernateJpaAutoConfiguration}
 * 与 {@code DataSourceAutoConfiguration}，{@code @EnableJpaAuditing} 需要的
 * {@code jpaMappingContext} Bean 无法创建，会导致 {@code AdminPermissionTest} 等
 * 纯 MockMvc 测试 ApplicationContext 加载失败（{@code JPA metamodel must not be empty}）。
 * 真实运行环境（real profile）与其他启用 JPA 的 profile 仍会加载本配置启用审计。</p>
 */
@Configuration
@Profile("!mock")
@EnableJpaAuditing
public class JpaAuditingConfig {
}
