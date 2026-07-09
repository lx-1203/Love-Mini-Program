# Phase 0 — 数据库 — 任务清单

## 模块概述
验证并完善数据库层：确认所有 Flyway 迁移有效、JPA Entity 完整、Repository 可用。

## 依赖关系
- **上游依赖**：phase-0-scaffold（构建链路就绪）
- **下游被依赖**：phase-0-auth, phase-1-village, phase-1-likes, phase-1-messages

## 任务列表

- [ ] **T001: 验证 Flyway 迁移完整性**
  - 输入：`database/flyway/sql/V*.sql`（全部 35 个迁移文件）
  - 输出：所有迁移可正常执行（db profile）
  - 验收：Flyway migrate 无错误，35 张表正确创建
  - 测试命令：`npm run flyway:migrate`（或手动 `mvnw flyway:migrate -Dflyway.configFiles=...`）

- [ ] **T002: 验证核心 Entity 完整性**
  - 输入：`apps/api/src/main/java/com/campuslove/api/entity/`（30+ Entity）
  - 输出：所有 Entity 与迁移表结构一致
  - 验收：JPA Entity 字段与数据库列一一对应，无遗漏
  - 测试命令：`npm run api:test`（包含 Entity 验证）

- [ ] **T003: 验证 Repository 层**
  - 输入：`apps/api/src/main/java/com/campuslove/api/repository/`（30+ Repository）
  - 输出：所有 Repository 可正常注入和调用
  - 验收：每个 Repository 至少有一个基础查询测试通过
  - 测试命令：`npm run api:test`

- [ ] **T004: 验证实体关系映射**
  - 输入：Entity 层的 `@ManyToOne` / `@OneToMany` / `@OneToOne` 注解
  - 输出：所有关系映射正确
  - 验收：级联查询不产生 N+1 问题（使用 `@EntityGraph` 或 JOIN FETCH）
  - 测试命令：`npm run api:test`

- [ ] **T005: 验证 JSON 列映射**
  - 输入：`V2026.05.30.0001__add_json_column_defaults.sql`
  - 输出：JSON 列在 Entity 中正确映射（通过 `@Column(columnDefinition = "JSON")`）
  - 验收：JSON 属性读写正常
  - 测试命令：`npm run api:test`

- [ ] **T006: 完善缺失的 Entity/Repository**
  - 输入：对比数据库表 vs Entity 目录
  - 输出：补全遗漏的 Entity 和 Repository（如有）
  - 验收：每张数据库表都有对应的 Entity + Repository
  - 测试命令：`npm run api:test`

## 验收汇总

| 检查项 | 状态 |
|--------|------|
| Flyway migrate 成功 | ⏳ |
| Entity 与表结构一致 | ⏳ |
| Repository 基础查询通过 | ⏳ |
| 实体关系映射正确 | ⏳ |
| JSON 列映射正确 | ⏳ |
| 表-Entity-Repository 一一对应 | ⏳ |
