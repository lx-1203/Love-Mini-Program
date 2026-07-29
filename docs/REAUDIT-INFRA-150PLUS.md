# 恋爱小程序基础设施/配置/文档深度审计报告

> 审计范围：`database/`、`docker/`、`.github/workflows/`、`docs/`、根目录配置文件  
> 审计日期：2026-07-27  
> 问题总数：168 条（按 9 个维度分类）  
> 说明：本报告仅列出当前真实存在的问题，未修改任何代码；重点关注 Flyway 迁移、Docker 安全、CI/CD 门禁、配置安全、文档一致性、监控告警、备份恢复、安全扫描。

---

## 统计概览

| 维度 | 数量 | CRITICAL | HIGH | MEDIUM | LOW |
|------|------|----------|------|--------|-----|
| 1. 数据库 | 36 | 6 | 14 | 12 | 4 |
| 2. Docker / Dockerfile | 18 | 2 | 8 | 6 | 2 |
| 3. docker-compose | 34 | 8 | 14 | 10 | 2 |
| 4. CI/CD | 20 | 2 | 10 | 6 | 2 |
| 5. 配置安全 | 16 | 6 | 6 | 3 | 1 |
| 6. 文档一致性 | 18 | 0 | 6 | 8 | 4 |
| 7. 监控告警 | 12 | 1 | 4 | 5 | 2 |
| 8. 备份恢复 | 8 | 2 | 4 | 2 | 0 |
| 9. 安全扫描 | 6 | 1 | 3 | 2 | 0 |
| **合计** | **168** | **28** | **69** | **54** | **17** |

---

## 1. 数据库（Flyway 迁移 / Schema 设计）

### ISSUE-DB-001
- **文件路径**：`database/flyway/sql/V2026.07.25.0001__add_on_delete_cascade.sql`、`database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql`
- **严重程度**：CRITICAL
- **问题描述**：存在重复的 Flyway 版本号 `V2026.07.25.0001`，两个不同语义的迁移文件共享同一版本，会导致 Flyway 校验冲突或顺序不可预期。
- **商业化影响**：首次部署或新环境迁移时直接报错，阻碍上线；已部署环境后续新增迁移可能因 checksum 不一致失败。
- **修复方向**：将其中一个文件版本号递增（如改为 `V2026.07.25.0014`），并确保历史已执行环境中通过 repair/手动修正 schema_history。

### ISSUE-DB-002
- **文件路径**：`database/flyway/sql/V2026.07.25.0002__create_vip_red_packets.sql`、`database/flyway/sql/V2026.07.25.0002__fix_collation.sql`
- **严重程度**：CRITICAL
- **问题描述**：存在重复的 Flyway 版本号 `V2026.07.25.0002`。
- **商业化影响**：同 DB-001，会导致迁移失败或不可预期的执行顺序。
- **修复方向**：调整版本号，保留语义顺序；collation 修复应发生在相关表创建之后。

### ISSUE-DB-003
- **文件路径**：`database/flyway/sql/V2026.07.25.0003__add_missing_indexes.sql`、`database/flyway/sql/V2026.07.25.0003__create_promo_codes.sql`
- **严重程度**：CRITICAL
- **问题描述**：存在重复的 Flyway 版本号 `V2026.07.25.0003`。
- **商业化影响**：同 DB-001。
- **修复方向**：调整版本号，优先保证 `create_promo_codes` 在索引/约束之前。

### ISSUE-DB-004
- **文件路径**：`database/flyway/sql/V2026.07.25.0004__add_auto_renew_to_users.sql`、`database/flyway/sql/V2026.07.25.0004__add_remaining_missing_indexes.sql`
- **严重程度**：CRITICAL
- **问题描述**：存在重复的 Flyway 版本号 `V2026.07.25.0004`。
- **商业化影响**：同 DB-001。
- **修复方向**：调整版本号，明确执行顺序。

### ISSUE-DB-005
- **文件路径**：`database/flyway/sql/V2026.05.21.0001__create_likes_table.sql:5`
- **严重程度**：HIGH
- **问题描述**：`likes.status` 使用 `ENUM('active', 'cancelled')`，新增状态值需要 `ALTER TABLE MODIFY COLUMN`，属于阻塞性 DDL（MySQL 会锁表重写）。
- **商业化影响**：后续业务扩展（如新增 `expired`、`revoked` 状态）会导致服务短暂不可用；与 JPA/Hibernate 的枚举映射也容易出现漂移。
- **修复方向**：改用 `VARCHAR(16)` + CHECK 约束或应用层枚举校验，并补充状态码表/常量约束文档。

### ISSUE-DB-006
- **文件路径**：`database/flyway/sql/V2026.05.21.0003__create_posts_table.sql:7`
- **严重程度**：HIGH
- **问题描述**：`posts.category` 使用 `ENUM('all', 'interest', 'sincere', 'hometown', 'anonymous', 'latest')`。
- **商业化影响**：新增帖子分类需要改表结构，影响发布频率和运营灵活性；`V2026.05.31.0001` 已通过 `MODIFY COLUMN` 新增 `campus`，说明已触发该风险。
- **修复方向**：改为 `VARCHAR(32)` + 外键关联分类表 `post_categories`，移除 ENUM。

### ISSUE-DB-007
- **文件路径**：`database/flyway/sql/V2026.05.21.0003__create_posts_table.sql:10`
- **严重程度**：HIGH
- **问题描述**：`posts.status` 使用 `ENUM('active', 'deleted', 'hidden')`。
- **商业化影响**：内容审核状态扩展受限；误用 `deleted` 作为软删除状态与真正的删除语义冲突。
- **修复方向**：拆分为 `status`（active/hidden）与独立的 `is_deleted`/`deleted_at` 软删除字段，或改用 VARCHAR + CHECK。

### ISSUE-DB-008
- **文件路径**：`database/flyway/sql/V2026.05.21.0005__create_heart_signals_table.sql:5`
- **严重程度**：HIGH
- **问题描述**：`heart_signals.status` 使用 `ENUM('pending', 'accepted', 'expired', 'declined')`。
- **商业化影响**：匹配状态扩展困难，无法支持撤回、屏蔽、举报中等中间态。
- **修复方向**：改为 `VARCHAR(16)` 并在应用层维护状态机。

### ISSUE-DB-009
- **文件路径**：`database/flyway/sql/V2026.05.23.0004__create_notifications.sql:5`
- **严重程度**：HIGH
- **问题描述**：`notifications.type` 使用 `ENUM('follow', 'like', 'comment', 'visitor', 'match')`。
- **商业化影响**：新增通知类型（如系统公告、VIP 到期提醒）需要改表，影响消息中心迭代。
- **修复方向**：改为 `VARCHAR(32)` 并建立通知类型常量表。

### ISSUE-DB-010
- **文件路径**：`database/flyway/sql/V2026.05.23.0004__create_notifications.sql:8`
- **严重程度**：HIGH
- **问题描述**：`notifications.reference_type` 使用 `ENUM('post', 'comment', 'user')`。
- **商业化影响**：无法支持活动、账单、VIP 等新引用实体类型。
- **修复方向**：改为 `VARCHAR(32)`。

### ISSUE-DB-011
- **文件路径**：`database/flyway/sql/V2026.05.24.0004__create_activities.sql:11`
- **严重程度**：HIGH
- **问题描述**：`activities.status` 使用 `ENUM('upcoming', 'ongoing', 'ended')`。
- **商业化影响**：活动状态扩展受限（如 `cancelled`、`postponed`）。
- **修复方向**：改为 `VARCHAR(16)`。

### ISSUE-DB-012
- **文件路径**：`database/flyway/sql/V2026.05.27.0001__create_temp_chat_tables.sql:14`
- **严重程度**：HIGH
- **问题描述**：`temp_chat_session.phase` 使用 `ENUM('matching', 'active', 'closed', 'expired')`。
- **商业化影响**：临时聊天状态扩展受限。
- **修复方向**：改为 `VARCHAR(16)`。

### ISSUE-DB-013
- **文件路径**：`database/flyway/sql/V2026.05.30.0002__create_user_online_status.sql:6`
- **严重程度**：MEDIUM
- **问题描述**：`user_online_status.status` 使用 `ENUM('online', 'away', 'offline')`。
- **商业化影响**：状态扩展（如 `busy`、`invisible`）需要改表。
- **修复方向**：改为 `VARCHAR(16)`。

### ISSUE-DB-014
- **文件路径**：`database/flyway/sql/V2026.05.31.0001__fix_entity_ddl_mismatches.sql:11`
- **严重程度**：HIGH
- **问题描述**：通过 `ALTER TABLE posts MODIFY COLUMN category ENUM(...)` 在线修改 ENUM 列表，MySQL 会重建表并持有元数据锁。
- **商业化影响**：大表操作时会造成长时间锁表，影响帖子读写。
- **修复方向**：改为 VARCHAR 后无需此类 DDL；若必须保留 ENUM，使用 pt-online-schema-change。

### ISSUE-DB-015
- **文件路径**：`database/flyway/sql/V2026.05.28.0002__create_social_progress.sql:20`
- **严重程度**：MEDIUM
- **问题描述**：`social_progress` 建表使用 `COLLATE=utf8mb4_unicode_ci`，与项目标准 `utf8mb4_0900_ai_ci` 不一致。
- **商业化影响**：即使后续迁移修复，历史脚本仍存在；新旧环境若未执行修复迁移会出现排序/比较不一致。
- **修复方向**：在创建脚本中直接修正为 `utf8mb4_0900_ai_ci`（需重新 baseline 或确保修复迁移已执行）。

### ISSUE-DB-016
- **文件路径**：`database/flyway/sql/V2026.05.28.0008__create_daily_benefits.sql:14`
- **严重程度**：MEDIUM
- **问题描述**：`daily_benefits` 建表使用 `COLLATE=utf8mb4_unicode_ci`。
- **商业化影响**：同 DB-015。
- **修复方向**：同 DB-015。

### ISSUE-DB-017
- **文件路径**：`docker-compose.yml:73`
- **严重程度**：HIGH
- **问题描述**：MySQL 服务启动参数 `--collation-server=utf8mb4_unicode_ci` 与项目标准 `utf8mb4_0900_ai_ci` 不一致。
- **商业化影响**：新建表/新字段默认使用错误排序规则，导致与现有表连接时隐式转换、索引失效、排序结果不一致。
- **修复方向**：改为 `--collation-server=utf8mb4_0900_ai_ci`。

### ISSUE-DB-018
- **文件路径**：`database/flyway/sql/V2026.05.28.0002__create_social_progress.sql:8`、`database/flyway/sql/V2026.05.30.0003__create_icebreaker_topics.sql:5`、`database/flyway/sql/V2026.06.25.0005__create_admin_configs.sql:23`
- **严重程度**：MEDIUM
- **问题描述**：部分表主键使用 `BIGINT AUTO_INCREMENT PRIMARY KEY`（无 UNSIGNED），而大多数表使用 `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT`。
- **商业化影响**：主键类型不统一，JPA 实体映射和跨表比较时可能出现类型不匹配；无符号范围更大但混合使用降低一致性。
- **修复方向**：统一为 `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT`。

### ISSUE-DB-019
- **文件路径**：`database/flyway/sql/V2026.05.18.0001__create_users.sql` 等多处
- **严重程度**：LOW
- **问题描述**：AUTO_INCREMENT 起始值和步长未显式配置，默认从 1 开始，未考虑多主或分片场景。
- **商业化影响**：未来水平拆分或主从切换时 ID 冲突风险。
- **修复方向**：在全局设计文档中明确 ID 生成策略（如雪花算法、UUID、或统一 auto_increment_increment）。

### ISSUE-DB-020
- **文件路径**：`database/flyway/sql/V2026.05.18.2200__phase0_phase1_client_foundation.sql`、`database/flyway/sql/V2026.05.18.0001__create_users.sql` 等
- **严重程度**：MEDIUM
- **问题描述**：早期迁移脚本 `CREATE TABLE` 未使用 `IF NOT EXISTS`。
- **商业化影响**：手动修复或重复执行时容易报错；虽然 Flyway 本身保证只执行一次，但本地测试脚本 `test-migrations.sh` 会重新建库并直接执行，可能因其他原因失败。
- **修复方向**：新增迁移统一使用 `CREATE TABLE IF NOT EXISTS`；历史脚本不建议修改 checksum，但可作为规范约束。

### ISSUE-DB-021
- **文件路径**：`database/flyway/sql/V2026.05.18.2200__phase0_phase1_client_foundation.sql`
- **严重程度**：HIGH
- **问题描述**：该脚本创建 `user_basic_profile`、`user_campus_profile`、`user_schedule_profile`、`user_match_ticket`、`temp_chat_session`、`temp_chat_message`、`temp_chat_contact_exchange` 等 7 张表，均未定义任何外键约束。
- **商业化影响**：数据完整性依赖应用层，容易出现孤儿记录；删除用户/会话时不会级联清理。
- **修复方向**：评估并补充外键约束，或在应用层实现强一致性清理并文档化。

### ISSUE-DB-022
- **文件路径**：`database/flyway/sql/V2026.05.18.2200__phase0_phase1_client_foundation.sql:45`
- **严重程度**：MEDIUM
- **问题描述**：`user_match_ticket.topic_ids_json JSON NOT NULL` 无 JSON Schema 校验。
- **商业化影响**：应用层可能写入任意结构，导致后续解析失败或数据污染。
- **修复方向**：添加 CHECK 约束或应用层 DTO 校验，并维护 JSON Schema。

### ISSUE-DB-023
- **文件路径**：`database/flyway/sql` 中多处 JSON 列
- **严重程度**：MEDIUM
- **问题描述**：所有 JSON 列（如 `posts.images`、`users.interest_tags`、`activities.participant_avatars`）均未使用 `JSON_SCHEMA_VALID` 校验。
- **商业化影响**：数据结构漂移，查询和索引无法稳定依赖。
- **修复方向**：为核心 JSON 列定义 CHECK 约束，或在应用层强校验。

### ISSUE-DB-024
- **文件路径**：`database/flyway/sql/V2026.05.21.0003__create_posts_table.sql:4`、`database/flyway/sql/V2026.05.21.0004__create_comments_table.sql:5`、`database/flyway/sql/V2026.05.24.0002__create_private_conversations.sql:21` 等
- **严重程度**：MEDIUM
- **问题描述**：大量 `TEXT` 类型字段（帖子内容、评论内容、消息内容）未设置最大长度限制。
- **商业化影响**：可能存入超大文本导致存储膨胀、查询性能下降；缺乏数据库层最后一道防线。
- **修复方向**：根据业务设置合理上限（如帖子 2000 字）并添加 CHECK 约束或应用层校验。

### ISSUE-DB-025
- **文件路径**：`database/flyway/sql/V2026.05.18.0001__create_users.sql:8`
- **严重程度**：LOW
- **问题描述**：`users.bio TEXT DEFAULT NULL` 无长度限制。
- **商业化影响**：用户可能提交超长简介，影响前端渲染和存储。
- **修复方向**：限制为 VARCHAR(500) 或添加 CHECK(LENGTH(bio) <= N)。

### ISSUE-DB-026
- **文件路径**：`database/flyway/sql` 中多处
- **严重程度**：MEDIUM
- **问题描述**：时间戳字段类型不统一：部分表使用 `DATETIME`（如 users、posts），部分使用 `TIMESTAMP`（如 vip_bills、reports、payment_callback_log）。
- **商业化影响**：时区处理不一致，跨表比较和排序可能出现偏差；TIMESTAMP 有 2038 年限制。
- **修复方向**：统一时间戳类型为 `DATETIME(6)` 或 `TIMESTAMP`，并在 ADR 中明确。

### ISSUE-DB-027
- **文件路径**：`database/flyway/sql/V2026.05.23.0003__create_daily_questions.sql`
- **严重程度**：LOW
- **问题描述**：`daily_questions` 表未包含 `updated_at` 字段。
- **商业化影响**：无法追踪题目修改时间，运营审计困难。
- **修复方向**：补充 `updated_at` 列。

### ISSUE-DB-028
- **文件路径**：`database/flyway/sql/V2026.07.25.0001__add_on_delete_cascade.sql`
- **严重程度**：HIGH
- **问题描述**：大量用户相关外键统一添加 `ON DELETE CASCADE`，包括 posts、comments、likes 等核心内容表。
- **商业化影响**：用户注销/误删账号会导致其发布的内容、评论、点赞被物理删除，无法审计和恢复；也可能违反数据保留合规要求。
- **修复方向**：核心内容表应使用软删除（`is_deleted`/`deleted_at`）或 `ON DELETE SET NULL` + 归档策略。

### ISSUE-DB-029
- **文件路径**：`database/flyway/sql/V2026.05.21.0001__create_likes_table.sql:9`
- **严重程度**：MEDIUM
- **问题描述**：`likes` 表唯一约束 `uk_likes_user_target (user_id, target_user_id)` 不区分状态。
- **商业化影响**：用户取消喜欢后再次喜欢会触发唯一冲突，需要应用层先物理删除记录；历史状态追踪丢失。
- **修复方向**：将约束改为 `(user_id, target_user_id, status)` 或引入独立的状态字段与有效期。

### ISSUE-DB-030
- **文件路径**：`database/flyway/sql/V2026.05.21.0002__create_visitors_table.sql:7`
- **严重程度**：MEDIUM
- **问题描述**：`visitors` 唯一键 `uk_visitors_visitor_visited_date (visitor_id, visited_user_id, (DATE(created_at)))` 使用函数表达式。
- **商业化影响**：功能性索引在 MySQL 中支持，但迁移可读性差；日期函数导致索引在部分查询中无法使用；分区策略难以实施。
- **修复方向**：改为按天分区或新增 `visit_date DATE` 列并建普通复合索引。

### ISSUE-DB-031
- **文件路径**：`database/flyway/sql/V2026.07.25.0011__create_profile_visitors.sql:23`
- **严重程度**：MEDIUM
- **问题描述**：`profile_visitors` 唯一键 `uk_profile_visitors_visitor_host_date (visitor_id, host_id, (DATE(visited_at)))` 使用函数表达式。
- **商业化影响**：同 DB-030。
- **修复方向**：同 DB-030。

### ISSUE-DB-032
- **文件路径**：`database/flyway/sql/V2026.07.25.0001__add_performance_indexes.sql`、`database/flyway/sql/V2026.07.25.0004__add_remaining_missing_indexes.sql`、`database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql`
- **严重程度**：MEDIUM
- **问题描述**：索引存在冗余/重叠：`likes` 表同时有 `idx_likes_status`、`idx_likes_status_created_at`、`idx_likes_status_user_created`。
- **商业化影响**：冗余索引增加写入开销和存储占用，优化器可能选择错误索引。
- **修复方向**：梳理查询场景，删除低频使用的单列索引，保留最左匹配的组合索引。

### ISSUE-DB-033
- **文件路径**：`database/flyway/sql` 中 private_messages、posts、likes 等表
- **严重程度**：MEDIUM
- **问题描述**：`private_messages`、`posts`、`likes` 等高频写入表索引数量过多（6-7 个），且缺少分区/归档策略。
- **商业化影响**：随着数据量增长，写入性能下降，B+树索引维护成本上升；历史数据查询变慢。
- **修复方向**：按时间范围分区，建立冷热数据归档策略，定期清理或迁移历史数据。

### ISSUE-DB-034
- **文件路径**：`database/flyway/sql/V2026.06.25.0007__create_audit_log.sql`
- **严重程度**：HIGH
- **问题描述**：`audit_log` 表无生命周期/归档策略，长期积累会导致单表膨胀。
- **商业化影响**：查询变慢、备份变大、存储成本上升；合规审计查询响应差。
- **修复方向**：增加按月分区或独立归档表，并配置自动清理策略。

### ISSUE-DB-035
- **文件路径**：`database/flyway/sql/V2026.07.26.0004__p8_database_standardization.sql`
- **严重程度**：HIGH
- **问题描述**：迁移脚本使用存储过程查询 `information_schema.COLUMNS/STATISTICS` 并动态执行 DDL，且会 `DROP TABLE user_feedback_ticket`。
- **商业化影响**：动态 DDL 在事务中执行存在风险；删除表不可回滚，若误判可能导致数据丢失；MySQL 元数据锁可能影响并发。
- **修复方向**：将幂等逻辑拆分为独立的验证脚本；删除表前增加数据导出和人工确认步骤。

### ISSUE-DB-036
- **文件路径**：`database/flyway/flyway.toml:11`
- **严重程度**：HIGH
- **问题描述**：`admin_password_hash = "change_me"` 占位符为明文弱值，且与 `application-db.yml` 中的真实 BCrypt 默认值不一致。
- **商业化影响**：若 Flyway 单独运行且未注入环境变量，会使用弱占位符创建管理员账号，存在被暴力破解风险。
- **修复方向**：移除默认值，强制通过环境变量注入；或在 CI/本地脚本中统一使用强随机哈希。

---

## 2. Docker / Dockerfile

### ISSUE-DK-001
- **文件路径**：`apps/api/Dockerfile:21`、`apps/api/Dockerfile:42`
- **严重程度**：HIGH
- **问题描述**：基础镜像 `eclipse-temurin:17-jdk`、`eclipse-temurin:17-jre` 未使用 digest 锁定。
- **商业化影响**：不同时间构建可能拉取不同镜像层，导致构建不可复现，引入未验证的补丁或漏洞。
- **修复方向**：使用 `@sha256:` 锁定镜像 digest，并建立镜像升级流程。

### ISSUE-DK-002
- **文件路径**：`apps/api/Dockerfile:52-57`
- **严重程度**：MEDIUM
- **问题描述**：`apt-get install dumb-init curl ca-certificates` 未指定版本号。
- **商业化影响**：依赖最新包可能导致构建漂移或引入不兼容版本。
- **修复方向**：固定版本号，如 `dumb-init=1.2.5-1`。

### ISSUE-DK-003
- **文件路径**：`apps/api/Dockerfile:66-70`
- **严重程度**：MEDIUM
- **问题描述**：`COPY --from=builder /build/target/*.jar /tmp/app.jar` 使用通配符，若 target 目录存在多个 jar 会失败或引入意外文件。
- **商业化影响**：构建不稳定，CI 产物可能不一致。
- **修复方向**：指定明确的 jar 名称（如 `target/campus-love-api-*.jar`）或验证唯一性。

### ISSUE-DK-004
- **文件路径**：`apps/api/Dockerfile:39`
- **严重程度**：LOW
- **问题描述**：`java -Djarmode=layertools -jar target/*.jar list --verbose` 仅列出分层，不做校验。
- **商业化影响**：无法提前发现 jar 损坏或分层异常。
- **修复方向**：增加构建校验步骤，如对 jar 做 SHA256 校验。

### ISSUE-DK-005
- **文件路径**：`apps/admin/Dockerfile:21`、`apps/admin/Dockerfile:48`
- **严重程度**：HIGH
- **问题描述**：基础镜像 `node:20-alpine`、`nginx:1.27-alpine` 未使用 digest 锁定。
- **商业化影响**：同 DK-001。
- **修复方向**：使用 digest 锁定。

### ISSUE-DK-006
- **文件路径**：`apps/admin/Dockerfile:32`
- **严重程度**：HIGH
- **问题描述**：`pnpm install --frozen-lockfile || pnpm install` 在 lockfile 不一致时会回退到非锁定安装。
- **商业化影响**：破坏可复现构建，可能引入未经验证的依赖版本，增加供应链风险。
- **修复方向**：移除回退逻辑，严格使用 `--frozen-lockfile`。

### ISSUE-DK-007
- **文件路径**：`apps/admin/Dockerfile:65-67`
- **严重程度**：MEDIUM
- **问题描述**：将 nginx 监听端口从 80 改为 8080 的 sed 操作依赖配置文件格式，若模板变化会失效。
- **商业化影响**：构建成功但运行时监听错误端口，健康检查失败。
- **修复方向**：在 nginx 配置模板中直接使用 8080 端口，避免运行时 sed 修改。

### ISSUE-DK-008
- **文件路径**：`apps/admin/Dockerfile:45`
- **严重程度**：MEDIUM
- **问题描述**：构建阶段未分离开发依赖，所有依赖均进入 builder 层。
- **商业化影响**：builder 镜像体积增大，构建时间变长。
- **修复方向**：确认是否可使用 `pnpm install --prod` 或分阶段安装。

### ISSUE-DK-009
- **文件路径**：`apps/admin/Dockerfile:69`
- **严重程度**：LOW
- **问题描述**：`USER nginx` 后运行 nginx，但 nginx master 仍可能需要某些 root 权限才能绑定低于 1024 的端口；已改为 8080 端口，但仍需验证镜像内 nginx 进程权限。
- **商业化影响**：若权限配置不完整，nginx 可能无法启动或产生权限错误日志。
- **修复方向**：验证容器内 `nginx -t` 和启动权限，必要时调整 `/var/run/nginx.pid` 等目录属主。

### ISSUE-DK-010
- **文件路径**：`apps/client/Dockerfile`（缺失）
- **严重程度**：MEDIUM
- **问题描述**：client 没有独立 Dockerfile，docker-compose 中直接使用 `nginx:1.27-alpine` 挂载构建产物。
- **商业化影响**：构建逻辑分散，无法版本化 client 镜像；依赖本地预构建 dist，CI 流程不完整。
- **修复方向**：为 client 创建 Dockerfile 并在 CI 中构建镜像。

### ISSUE-DK-011
- **文件路径**：`.dockerignore`
- **严重程度**：MEDIUM
- **问题描述**：未验证 `.dockerignore` 是否排除了敏感文件（如 `.env`、`.env.real`、本地证书、日志）。
- **商业化影响**：构建镜像时可能意外将开发环境 secrets 打包进镜像层。
- **修复方向**：审计并加固 `.dockerignore`，确保排除所有环境文件、凭证和构建产物。

### ISSUE-DK-012
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：HIGH
- **问题描述**：CI 中没有 Docker 镜像构建步骤，也没有镜像扫描（Trivy/Snyk）或 SBOM 生成。
- **商业化影响**：无法发现镜像中的 CVE、恶意依赖或配置错误；供应链安全不可控。
- **修复方向**：新增 `docker build` job 并集成 Trivy 镜像扫描。

### ISSUE-DK-013
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：MEDIUM
- **问题描述**：CI 没有使用 `docker compose config` 验证 compose 文件语法，也没有启动服务做烟雾测试。
- **商业化影响**：compose 配置错误可能到部署时才暴露。
- **修复方向**：增加 `docker compose config` 校验和本地/CI 烟雾测试。

### ISSUE-DK-014
- **文件路径**：`apps/api/Dockerfile:21` vs `.github/workflows/ci.yml:203`
- **严重程度**：MEDIUM
- **问题描述**：API Dockerfile 使用 JDK/JRE 17，但 CI 单元测试使用 Java 21。
- **商业化影响**：运行时与测试时 JDK 版本不一致，可能出现仅在生产复现的兼容性问题。
- **修复方向**：统一 CI 与生产镜像的 JDK 大版本，建议都使用 21 LTS。

### ISSUE-DK-015
- **文件路径**：`apps/api/Dockerfile:52`
- **严重程度**：LOW
- **问题描述**：`apt-get update` 在每次构建时访问网络，未使用本地缓存或私有镜像仓库。
- **商业化影响**：构建速度慢且依赖外部网络稳定性；安全审查无法管控包来源。
- **修复方向**：使用私有 APT 缓存或预装基础镜像。

### ISSUE-DK-016
- **文件路径**：`apps/admin/Dockerfile:24`
- **严重程度**：MEDIUM
- **问题描述**：`corepack prepare pnpm@9.12.0 --activate` 固定了 pnpm 版本，但与根目录 `package.json` 的 `packageManager` 字段可能不同步。
- **商业化影响**：版本漂移导致构建行为不一致。
- **修复方向**：从 `package.json` 读取 packageManager 版本或统一维护。

### ISSUE-DK-017
- **文件路径**：`apps/admin/Dockerfile:58`
- **严重程度**：LOW
- **问题描述**：`COPY docker/nginx.conf` 路径相对于构建上下文 `apps/admin`，但实际文件在 `apps/admin/docker/nginx.conf`。
- **商业化影响**：若上下文设置错误，构建会失败。
- **修复方向**：确认构建上下文路径并验证 CI 中的 docker build 命令。

### ISSUE-DK-018
- **文件路径**：`apps/api/Dockerfile`
- **严重程度**：MEDIUM
- **问题描述**：未设置容器 read-only root filesystem，运行时文件系统可写。
- **商业化影响**：容器被入侵后可篡改二进制或配置文件。
- **修复方向**：在 docker-compose 中为 api 服务添加 `read_only: true`，并将 `/tmp`、`/app/logs`、`/app/uploads` 挂载为独立可写卷。

---

## 3. docker-compose

### ISSUE-DC-001
- **文件路径**：`docker-compose.yml:66-69`
- **严重程度**：CRITICAL
- **问题描述**：MySQL root 密码和应用密码使用弱默认值 `change-me-root-pwd`、`change-me-app-pwd`，通过 `${VAR:-default}` 回退。
- **商业化影响**：若部署时未覆盖环境变量，数据库使用公开默认密码，可被直接入侵。
- **修复方向**：移除默认值，强制启动前注入；或使用 Docker secrets。

### ISSUE-DC-002
- **文件路径**：`docker-compose.yml:66-69`
- **严重程度**：HIGH
- **问题描述**：数据库密码通过环境变量 `environment` 注入，未使用 Docker secrets 或外部密钥管理。
- **商业化影响**：密码以明文形式存储在容器配置中，可通过 `docker inspect` 读取。
- **修复方向**：使用 Docker secrets 或运行时挂载只读 secret 文件。

### ISSUE-DC-003
- **文件路径**：`docker-compose.yml:87`
- **严重程度**：HIGH
- **问题描述**：MySQL healthcheck 命令行嵌入密码 `-p${MYSQL_ROOT_PASSWORD:-change-me-root-pwd}`。
- **商业化影响**：healthcheck 命令会出现在 `docker inspect` 和进程列表中，泄露 root 密码。
- **修复方向**：使用环境变量文件、secret 文件或自定义 healthcheck 脚本从文件读取密码。

### ISSUE-DC-004
- **文件路径**：`docker-compose.yml:80-81`
- **严重程度**：HIGH
- **问题描述**：MySQL 端口 `3306` 默认映射到宿主机。
- **商业化影响**：扩大攻击面，外部可直接尝试连接数据库。
- **修复方向**：默认不暴露端口；仅在调试时通过环境变量开启，并绑定 127.0.0.1。

### ISSUE-DC-005
- **文件路径**：`docker-compose.yml:74`
- **严重程度**：MEDIUM
- **问题描述**：`--default-authentication-plugin=mysql_native_password` 在 MySQL 8.4+ 中已移除，当前 `mysql:8.0` 可用但属于弃用插件。
- **商业化影响**：未来升级 MySQL 版本会导致启动失败；安全性低于 caching_sha2_password。
- **修复方向**：迁移到 caching_sha2_password 并更新客户端连接配置。

### ISSUE-DC-006
- **文件路径**：`docker-compose.yml:75-79`
- **严重程度**：MEDIUM
- **问题描述**：MySQL `max_connections`、`innodb_buffer_pool_size`、慢查询日志等参数硬编码。
- **商业化影响**：无法根据宿主机配置弹性调整，生产环境可能配置不足或浪费。
- **修复方向**：通过环境变量外部化，并随资源配置联动。

### ISSUE-DC-007
- **文件路径**：`docker-compose.yml:71-79`
- **严重程度**：HIGH
- **问题描述**：未显式启用 binlog 及持久化配置，虽然 MySQL 8.0 默认开启 binlog，但 docker 默认配置可能被覆盖。
- **商业化影响**：无法做 PITR（时间点恢复），DRP 中 RPO 1h 的目标无法保证。
- **修复方向**：显式配置 `--log-bin`、`--binlog-format=ROW`、`--binlog-expire-logs-seconds`。

### ISSUE-DC-008
- **文件路径**：`docker-compose.yml:84-85`
- **严重程度**：MEDIUM
- **问题描述**：将 `database/flyway/sql` 挂载到 `/docker-entrypoint-initdb.d`，该目录仅在 MySQL 首次初始化时执行，不替代 Flyway。
- **商业化影响**：后续 schema 变更仍需 Flyway；开发者可能误以为该挂载会执行所有迁移。
- **修复方向**：移除该挂载或添加注释说明；确保 Flyway 由 api 服务启动时执行。

### ISSUE-DC-009
- **文件路径**：`docker-compose.yml:102`、`docker-compose.yml:112`
- **严重程度**：HIGH
- **问题描述**：Redis 密码使用弱默认值 `change-me-redis-pwd`，并通过 healthcheck 命令行暴露。
- **商业化影响**：同 DC-001/DC-003，存在默认凭证泄露风险。
- **修复方向**：移除默认值，使用 secrets；healthcheck 使用 `redis-cli -a $(cat /run/secrets/redis_password) ping` 或挂载 acl 文件。

### ISSUE-DC-010
- **文件路径**：`docker-compose.yml:107-108`
- **严重程度**：HIGH
- **问题描述**：Redis 端口 `6379` 默认映射到宿主机。
- **商业化影响**：扩大攻击面。
- **修复方向**：默认不暴露；需要时绑定 127.0.0.1。

### ISSUE-DC-011
- **文件路径**：`docker-compose.yml:103-104`
- **严重程度**：HIGH
- **问题描述**：Redis `maxmemory 256mb` 配合 `allkeys-lru`，可能驱逐 JWT 黑名单、限流桶、会话等重要 key。
- **商业化影响**：用户被异常登出、限流失效、会话丢失。
- **修复方向**：分离缓存用途（会话/限流使用独立 Redis 实例或数据库索引），或配置 `volatile-lru` 并为关键 key 设置过期时间。

### ISSUE-DC-012
- **文件路径**：`docker-compose.yml`
- **严重程度**：HIGH
- **问题描述**：docker-compose 中未定义 Redis 备份服务，也没有 RDB/AOF 自动备份策略。
- **商业化影响**：Redis 故障或误删时无法恢复缓存数据（会话、黑名单、限流状态），DRP 中 Redis RPO 5min 无法落地。
- **修复方向**：增加 Redis 备份 sidecar 或宿主机定时任务，复制 RDB/AOF 到持久化存储。

### ISSUE-DC-013
- **文件路径**：`docker-compose.yml:145`
- **严重程度**：CRITICAL
- **问题描述**：API 服务 JWT_SECRET 使用弱默认值 `change-me-jwt-secret-32chars-min`。
- **商业化影响**：未配置时所有 JWT 令牌可被伪造，导致任意用户身份冒用。
- **修复方向**：移除默认值，启动时校验长度 >=32 字节，否则拒绝启动。

### ISSUE-DC-014
- **文件路径**：`docker-compose.yml:137`
- **严重程度**：HIGH
- **问题描述**：API 数据库连接 URL 使用 `useSSL=false&allowPublicKeyRetrieval=true`。
- **商业化影响**：网络流量未加密，存在中间人窃听和数据库凭据泄露风险；allowPublicKeyRetrieval 可被利用。
- **修复方向**：生产环境启用 SSL/TLS，禁用 allowPublicKeyRetrieval。

### ISSUE-DC-015
- **文件路径**：`docker-compose.yml:157-159`
- **严重程度**：HIGH
- **问题描述**：管理员 OpenID 和密码哈希存在默认值/空值回退。
- **商业化影响**：未配置时可能创建已知或不可用的管理员账号。
- **修复方向**：首次启动时通过 init 容器或命令行交互式创建管理员，并写入安全存储。

### ISSUE-DC-016
- **文件路径**：`docker-compose.yml:165-168`
- **严重程度**：MEDIUM
- **问题描述**：RabbitMQ 默认使用 `guest/guest`。
- **商业化影响**：同默认凭证风险；虽然 RabbitMQ 可选，但启用后即为漏洞。
- **修复方向**：移除默认值，强制配置或使用随机生成。

### ISSUE-DC-017
- **文件路径**：`docker-compose.yml`
- **严重程度**：MEDIUM
- **问题描述**：所有服务均未配置 `deploy.resources.limits`（CPU/内存）。
- **商业化影响**：单个服务可能耗尽宿主机资源，引发级联故障；无法做容量规划。
- **修复方向**：为 api、mysql、redis、admin 等服务设置 memory/CPU limit 与 reservation。

### ISSUE-DC-018
- **文件路径**：`docker-compose.yml`
- **严重程度**：MEDIUM
- **问题描述**：所有服务均未配置日志驱动和日志轮转策略。
- **商业化影响**：默认 json-file 日志无限增长，可能占满磁盘；无集中日志收集。
- **修复方向**：配置 `logging.driver` 为 `json-file` 并设置 `max-size`、`max-file`；或接入 Loki/Fluentd。

### ISSUE-DC-019
- **文件路径**：`docker-compose.yml`
- **严重程度**：HIGH
- **问题描述**：未定义任何 Docker secrets，敏感信息全部通过 environment 注入。
- **商业化影响**：凭据在 compose 文件、容器元数据和宿主机环境变量中多处暴露。
- **修复方向**：使用 Docker secrets 管理密码、JWT secret、WeChat secret 等。

### ISSUE-DC-020
- **文件路径**：`docker-compose.yml`
- **严重程度**：MEDIUM
- **问题描述**：仅使用单个 bridge 网络 `campus-net`，未按安全域隔离（数据库、缓存、应用、监控）。
- **商业化影响**：监控、备份、应用服务处于同一网络，横向移动风险增加。
- **修复方向**：划分 `db-net`、`app-net`、`monitor-net`，并仅暴露必要端口。

### ISSUE-DC-021
- **文件路径**：`docker-compose.yml:232-246`
- **严重程度**：MEDIUM
- **问题描述**：client H5 服务直接挂载 `apps/client/dist/build/h5`，依赖本地预构建，且使用 root 运行 nginx。
- **商业化影响**：构建产物可能过期；root 运行容器增加逃逸风险。
- **修复方向**：构建 client Docker 镜像；使用非 root 用户运行 nginx。

### ISSUE-DC-022
- **文件路径**：`docker-compose.yml:213-219`
- **严重程度**：MEDIUM
- **问题描述**：admin 服务 healthcheck 路径 `/healthz` 依赖 nginx 配置中自定义定义，但 `apps/admin/docker/nginx.conf` 未在审计范围内确认。
- **商业化影响**：若 nginx 配置未提供 `/healthz`，admin 会被判定为不健康。
- **修复方向**：确认并统一 healthcheck 路径；或直接检查根路径 200。

### ISSUE-DC-023
- **文件路径**：`docker-compose.yml:286`
- **严重程度**：CRITICAL
- **问题描述**：Grafana 管理员密码使用弱默认值 `change-me-grafana-pwd`。
- **商业化影响**：监控面板可被未授权访问，泄露业务指标和配置。
- **修复方向**：移除默认值，首次启动强制重置密码；使用 secrets。

### ISSUE-DC-024
- **文件路径**：`docker-compose.yml:288`
- **严重程度**：LOW
- **问题描述**：Grafana 自动安装插件 `grafana-piechart-panel`，依赖外部网络且未锁定版本。
- **商业化影响**：插件版本漂移或来源不可信可能导致安全/兼容问题。
- **修复方向**：预下载插件并校验签名，或固定版本并启用内部插件仓库。

### ISSUE-DC-025
- **文件路径**：`docker-compose.yml:258`
- **严重程度**：MEDIUM
- **问题描述**：Prometheus 存储保留时间仅 15 天。
- **商业化影响**：无法满足长期趋势分析、月报和审计需求。
- **修复方向**：延长至 90-180 天，或配置 remote_write 到长期存储。

### ISSUE-DC-026
- **文件路径**：`docker-compose.yml:258`
- **严重程度**：MEDIUM
- **问题描述**：Prometheus 未配置 `--storage.tsdb.retention.size`。
- **商业化影响**：磁盘可能被 TSDB 无限占满。
- **修复方向**：增加大小保留限制。

### ISSUE-DC-027
- **文件路径**：`docker-compose.yml:340-342`
- **严重程度**：HIGH
- **问题描述**：node-exporter 挂载整个宿主机根目录 `/` 为只读。
- **商业化影响**：容器可读取宿主机所有文件（如 `/etc/shadow`、应用配置），违反最小权限原则。
- **修复方向**：仅挂载必要的 `/proc`、`/sys`、`/var/lib/docker` 等路径；或只在监控 profile 启用。

### ISSUE-DC-028
- **文件路径**：`docker-compose.yml:345-346`、`docker-compose.yml:379-380`
- **严重程度**：HIGH
- **问题描述**：node-exporter 和 mysql-backup 使用 `profiles`，默认 `docker compose up -d` 不会启动它们。
- **商业化影响**：监控和备份在默认部署中缺失，DRP 中的监控告警和每日备份目标无法自动达成。
- **修复方向**：将核心监控和备份服务设为默认启动，或提供明确的启动命令文档。

### ISSUE-DC-029
- **文件路径**：`docker-compose.yml:349-380`
- **严重程度**：MEDIUM
- **问题描述**：mysql-backup 服务使用 alpine 镜像并在 entrypoint 中安装 `mysql-client gzip tini`。
- **商业化影响**：运行时安装包不可复现，可能因网络或 Alpine 仓库变化失败。
- **修复方向**：构建专用备份镜像，预装所有依赖。

### ISSUE-DC-030
- **文件路径**：`docker-compose.yml:359-360`
- **严重程度**：HIGH
- **问题描述**：mysql-backup 服务使用 root 用户连接数据库并备份。
- **商业化影响**：备份账号权限过大，若备份脚本被篡改可导致全库删除。
- **修复方向**：创建仅具有 SELECT、LOCK TABLES、SHOW VIEW、REPLICATION CLIENT 权限的专用备份用户。

### ISSUE-DC-031
- **文件路径**：`docker-compose.yml`
- **严重程度**：MEDIUM
- **问题描述**：`depends_on` 仅保证容器启动顺序，不保证服务（如 MySQL 已完成初始化）真正就绪。
- **商业化影响**：api 可能在 MySQL 还没准备好时启动并崩溃，restart 后才恢复。
- **修复方向**：已配置 `condition: service_healthy`，但需确保所有依赖服务都有可靠 healthcheck。

### ISSUE-DC-032
- **文件路径**：`docker-compose.yml`
- **严重程度**：LOW
- **问题描述**：未配置容器 `restart` 的 `max_attempts` 和 backoff 策略。
- **商业化影响**：服务持续崩溃时会无限快速重启，产生日志风暴。
- **修复方向**：配置 deploy.restart_policy 的 `max_attempts` 和 `delay`。

### ISSUE-DC-033
- **文件路径**：`docker-compose.yml`
- **严重程度**：MEDIUM
- **问题描述**：api 服务的 `JAVA_OPTS` 完全硬编码在 compose 文件中。
- **商业化影响**：无法在不修改 compose 的情况下调整 JVM 参数。
- **修复方向**：通过环境变量注入，compose 仅做合并。

### ISSUE-DC-034
- **文件路径**：`docker-compose.yml`
- **严重程度**：MEDIUM
- **问题描述**：blackbox-exporter、mysql-exporter、redis-exporter 在 `docker/prometheus/prometheus.yml` 中被引用，但 compose 中未定义对应服务。
- **商业化影响**：Prometheus 会持续记录 target down，产生误告警；数据库/Redis 缺少专用指标。
- **修复方向**：在 compose 中增加对应 exporter 服务，或从 prometheus.yml 中移除 target。

---

## 4. CI/CD

### ISSUE-CI-001
- **文件路径**：`.github/workflows/ci.yml:80-84`
- **严重程度**：CRITICAL
- **问题描述**：CI 中 MySQL 服务容器使用硬编码凭证 `campus_love/campus_love/root`。
- **商业化影响**：CI 凭证泄露或被复用后可直接连接测试数据库；不符合安全最佳实践。
- **修复方向**：使用 GitHub secrets 或动态生成测试数据库密码。

### ISSUE-CI-002
- **文件路径**：`.github/workflows/ci.yml:102-131`
- **严重程度**：HIGH
- **问题描述**：CI Flyway 测试连接使用 `serverTimezone=UTC`，而生产 docker-compose 和 `.env.example` 使用 `Asia/Shanghai`。
- **商业化影响**：时区不一致可能导致时间相关测试通过但生产行为不同；时间戳比较出现偏差。
- **修复方向**：CI 测试时区与生产一致，均使用 `Asia/Shanghai`。

### ISSUE-CI-003
- **文件路径**：`.github/workflows/ci.yml:99`、`docker-compose.yml`
- **严重程度**：MEDIUM
- **问题描述**：CI 使用 `redgate/flyway:12.6.1-alpine` 未锁定 digest；docker-compose 使用 `mysql:8.0`、`redis:7-alpine` 等也未锁定 digest。
- **商业化影响**：构建不可复现，可能拉取带漏洞或行为变化的镜像。
- **修复方向**：所有 CI 和 compose 镜像使用 digest 锁定。

### ISSUE-CI-004
- **文件路径**：`.github/workflows/ci.yml:94-105`
- **严重程度**：MEDIUM
- **问题描述**：`Flyway info` 步骤末尾使用 `|| true`，该步骤失败不会阻塞 CI。
- **商业化影响**：info 输出中的异常被忽略，可能掩盖迁移问题。
- **修复方向**：移除 `|| true`，让 info 失败也能显式告警。

### ISSUE-CI-005
- **文件路径**：`.github/workflows/ci.yml:62-66`
- **严重程度**：HIGH
- **问题描述**：`verify-phase01` 仅运行 client 的 typecheck 和 builds，未对 admin 工作区执行 typecheck/build。
- **商业化影响**：admin 后台代码错误无法被 CI 捕获。
- **修复方向**：增加 `pnpm --filter @campus-love/admin run typecheck` 和 admin build 步骤。

### ISSUE-CI-006
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：HIGH
- **问题描述**：CI 没有构建 api/admin Docker 镜像的步骤，也没有将镜像推送到仓库。
- **商业化影响**：无法保证 Dockerfile 和 compose 配置在每次提交时都可用；部署依赖手动构建。
- **修复方向**：新增 build-and-push 镜像 job。

### ISSUE-CI-007
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：MEDIUM
- **问题描述**：CI 未对 docker-compose.yml 进行语法校验和配置检查。
- **商业化影响**：compose 错误可能到部署时才暴露。
- **修复方向**：增加 `docker compose config` 校验。

### ISSUE-CI-008
- **文件路径**：`.github/workflows/ci.yml:278`
- **严重程度**：MEDIUM
- **问题描述**：SonarCloud action 使用 `SonarSource/sonarcloud-github-action@master`。
- **商业化影响**：`@master` 分支可能引入破坏性变更，导致 CI 不稳定。
- **修复方向**：锁定到具体 release tag 或 digest。

### ISSUE-CI-009
- **文件路径**：`.github/workflows/ci.yml:309`
- **严重程度**：MEDIUM
- **问题描述**：OWASP Dependency-Check action 使用 `dependency-check/Dependency-Check_Action@main`。
- **商业化影响**：同 CI-008，存在不稳定性。
- **修复方向**：锁定版本。

### ISSUE-CI-010
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：MEDIUM
- **问题描述**：CI workflow 未设置 `concurrency` 控制，多个 push 会并行运行，浪费资源且可能互相干扰。
- **商业化影响**：资源浪费；Artifact 命名冲突风险。
- **修复方向**：添加 concurrency 配置，对同一 PR/分支取消旧运行。

### ISSUE-CI-011
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：MEDIUM
- **问题描述**：所有 job 未设置 `timeout-minutes`。
- **商业化影响**：挂起的 job 可能运行 6 小时（GitHub 默认），浪费 CI 额度。
- **修复方向**：为每个 job 设置合理的 timeout。

### ISSUE-CI-012
- **文件路径**：`.github/workflows/ci.yml:11-12`
- **严重程度**：MEDIUM
- **问题描述**：`permissions: contents: read` 可能不足以让 upload-artifact、SonarCloud 等步骤正常工作。
- **商业化影响**：部分 job 可能因权限不足失败。
- **修复方向**：按 job 设置最小权限，如 artifact 写权限、`id-token: write`（若使用 OIDC）。

### ISSUE-CI-013
- **文件路径**：`.github/workflows/ci.yml:413-416`
- **严重程度**：LOW
- **问题描述**：E2E 测试仅在 `pull_request` 时触发，main/release/hotfix 分支 push 不运行。
- **商业化影响**：合并后的回归问题无法及时发现。
- **修复方向**：E2E 也在 push 到 main/release 时触发（可配置为定时或手动）。

### ISSUE-CI-014
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：HIGH
- **问题描述**：CI 没有 SAST（CodeQL/Semgrep）和 DAST（OWASP ZAP）扫描。
- **商业化影响**：无法自动发现代码注入、XSS、不安全反序列化等安全漏洞。
- **修复方向**：新增 CodeQL 和 OWASP ZAP baseline scan。

### ISSUE-CI-015
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：MEDIUM
- **问题描述**：CI 没有容器镜像扫描（Trivy/Grype）。
- **商业化影响**：镜像层漏洞无法被发现。
- **修复方向**：在镜像构建后运行 Trivy 扫描。

### ISSUE-CI-016
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：MEDIUM
- **问题描述**：CI 没有 Prometheus/Alertmanager 配置文件语法校验。
- **商业化影响**：错误的告警配置会导致监控失效或误报。
- **修复方向**：使用 `promtool check config`、`promtool check rules`、`amtool check-config`。

### ISSUE-CI-017
- **文件路径**：`.github/workflows/ci.yml:458-485`
- **严重程度**：LOW
- **问题描述**：`quality-gate` job 仅汇总，未将结果发布到 PR comment 或设置 commit status。
- **商业化影响**：开发者需要进入 Actions 页面查看结果，降低效率。
- **修复方向**：使用 GitHub Script 或第三方 action 发布检查结果。

### ISSUE-CI-018
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：MEDIUM
- **问题描述**：CI 未验证 openapi schema 与 Controller 实现的一致性（仅有 lint）。
- **商业化影响**：文档与实际接口可能不一致。
- **修复方向**：引入 Spring Cloud Contract 或生成客户端并做兼容性测试。

### ISSUE-CI-019
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：HIGH
- **问题描述**：CI 没有部署门禁，main 分支 push 成功后不会自动/手动触发部署到 staging。
- **商业化影响**：代码变更无法快速验证在类生产环境的表现。
- **修复方向**：增加 staging 部署 job，并配置 environment protection rules。

### ISSUE-CI-020
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：MEDIUM
- **问题描述**：CI 使用 `actions/setup-java@v4` 但未显式校验 Maven wrapper 与缓存一致性。
- **商业化影响**：wrapper 被篡改时可能执行恶意 Maven 分发包。
- **修复方向**：校验 `mvnw` 和 `.mvn/wrapper/maven-wrapper.properties` 的签名或 checksum。

---

## 5. 配置安全

### ISSUE-SEC-001
- **文件路径**：`.env.example:33`
- **严重程度**：HIGH
- **问题描述**：示例数据库 URL 包含 `useSSL=false&allowPublicKeyRetrieval=true`。
- **商业化影响**：生产环境若直接复制示例，数据库连接不加密且允许公钥检索，存在中间人攻击风险。
- **修复方向**：示例中删除这两个参数或明确注释为仅本地开发使用。

### ISSUE-SEC-002
- **文件路径**：`.env.example:81-83`
- **严重程度**：MEDIUM
- **问题描述**：`WECHAT_APPID=` 为空，示例未给出占位格式，容易遗漏配置。
- **商业化影响**：未配置时微信登录功能不可用，影响用户注册。
- **修复方向**：使用 `<PLACEHOLDER>` 并给出格式示例。

### ISSUE-SEC-003
- **文件路径**：`.env.example:94`、`apps/api/.env.example:87`
- **严重程度**：LOW
- **问题描述**：`CORS_ALLOWED_ORIGINS` 默认值包含多个 localhost 端口。
- **商业化影响**：生产环境未覆盖时可能保持 localhost，导致跨域问题或被利用。
- **修复方向**：生产示例置空或使用 `<PLACEHOLDER>`，强制配置。

### ISSUE-SEC-004
- **文件路径**：`.env.example:147`
- **严重程度**：HIGH
- **问题描述**：`SWAGGER_UI_ENABLED=true` 作为默认示例。
- **商业化影响**：生产环境若未修改会暴露 Swagger UI 和 OpenAPI 端点，泄露接口细节。
- **修复方向**：默认示例改为 `false`，开发环境通过 `.env.development` 启用。

### ISSUE-SEC-005
- **文件路径**：`apps/api/.env.example:34`
- **严重程度**：MEDIUM
- **问题描述**：API 示例数据库用户名为 `root`。
- **商业化影响**：诱导开发者使用 root 账号连接数据库。
- **修复方向**：改为普通应用账号如 `campus`。

### ISSUE-SEC-006
- **文件路径**：`apps/api/src/main/resources/application-db.yml:81`
- **严重程度**：CRITICAL
- **问题描述**：`admin_password_hash` 默认值为真实 BCrypt 哈希 `$2a$10$SFn8RZb8.sj5yVnP9S27a3W9MEkCL2no9sceF0/e7lp7wqGEGsjWQ`。
- **商业化影响**：虽然注释说明无已知明文，但硬编码哈希仍存在被彩虹表/针对性破解的风险；且不同环境默认值相同。
- **修复方向**：移除默认值，启动时若未配置则拒绝初始化管理员。

### ISSUE-SEC-007
- **文件路径**：`apps/api/src/main/resources/application.yml:31-33`
- **严重程度**：MEDIUM
- **问题描述**：RabbitMQ 默认用户名密码为 `guest/guest`。
- **商业化影响**：启用 RabbitMQ 后存在默认凭证风险。
- **修复方向**：移除默认值，强制通过环境变量注入。

### ISSUE-SEC-008
- **文件路径**：`apps/api/src/main/resources/application.yml:82-87`
- **严重程度**：MEDIUM
- **问题描述**：Actuator 暴露 `health,info,prometheus,metrics`，其中 `metrics` 和 `prometheus` 可被未授权访问。
- **商业化影响**：攻击者可获取系统内部指标，辅助信息收集。
- **修复方向**：将 `metrics` 从 include 中移除，仅暴露 health/info/prometheus；并通过防火墙/IP 白名单限制。

### ISSUE-SEC-009
- **文件路径**：`apps/api/src/main/resources/application.yml:115-139`
- **严重程度**：MEDIUM
- **问题描述**：springdoc 启用 `try-it-out-enabled=true` 和 `persist-authorization=true`。
- **商业化影响**：Swagger UI 默认展开 try-it-out 并持久化 token，增加误操作和 token 泄露风险。
- **修复方向**：生产环境关闭 Swagger UI；或至少禁用 try-it-out 和授权持久化。

### ISSUE-SEC-010
- **文件路径**：`apps/api/src/main/resources/application.yml:18`
- **严重程度**：MEDIUM
- **问题描述**：Redis 默认密码为空 `${REDIS_PASSWORD:}`。
- **商业化影响**：未配置密码时 Redis 无认证，可被内网任意访问。
- **修复方向**：移除空默认值，启动时校验 Redis 密码非空。

### ISSUE-SEC-011
- **文件路径**：`database/flyway/flyway.user.toml:2-4`
- **严重程度**：CRITICAL
- **问题描述**：`flyway.user.toml` 包含硬编码密码 `Hyp5022940`。
- **商业化影响**：真实密码提交到仓库，可直接连接数据库。
- **修复方向**：立即轮换密码，从仓库中删除该文件并加入 `.gitignore`；改用环境变量或 secrets。

### ISSUE-SEC-012
- **文件路径**：`database/flyway/flyway.user.toml:2`
- **严重程度**：HIGH
- **问题描述**：`flyway.user.toml` 中数据库名称为 `qihang_platform`，与项目名 `campus_love` 不一致。
- **商业化影响**：开发者运行 Flyway 时可能误操作其他数据库；配置管理混乱。
- **修复方向**：修正为 `campus_love` 并移除硬编码文件。

### ISSUE-SEC-013
- **文件路径**：`test-migrations.sh:15`
- **严重程度**：CRITICAL
- **问题描述**：`test-migrations.sh` 包含硬编码 BCrypt 哈希片段 `.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG`。
- **商业化影响**：真实管理员密码哈希泄露，存在被破解风险。
- **修复方向**：从脚本中移除硬编码哈希，改为从环境变量读取。

### ISSUE-SEC-014
- **文件路径**：`test-migrations.sh:7-8`
- **严重程度**：HIGH
- **问题描述**：`test-migrations.sh` 使用硬编码 root/root 测试数据库凭证。
- **商业化影响**：测试脚本被复用到生产环境或 CI 时会导致凭证泄露/默认账户风险。
- **修复方向**：通过环境变量注入测试数据库密码。

### ISSUE-SEC-015
- **文件路径**：`.gitignore`
- **严重程度**：HIGH
- **问题描述**：`.gitignore` 未排除 `.env`、`.env.real`、`.env.development` 等环境文件（仅排除 `*.env.local`）。
- **商业化影响**：开发者容易将包含真实凭据的 `.env` 文件提交到仓库。
- **修复方向**：添加 `.env`、`.env.*`（除示例文件外）到 `.gitignore`。

### ISSUE-SEC-016
- **文件路径**：`docker-compose.yml`、`apps/api/src/main/resources/application-db.yml`
- **严重程度**：MEDIUM
- **问题描述**：未配置上传文件存储加密（`api-uploads` 卷）。
- **商业化影响**：用户上传的媒体文件以明文形式存储，磁盘被盗或备份泄露时造成隐私泄露。
- **修复方向**：对存储卷启用文件系统加密或对象存储服务端加密。

---

## 6. 文档一致性

### ISSUE-DOC-001
- **文件路径**：`README.md`
- **严重程度**：HIGH
- **问题描述**：README 内容严重过时，仍描述为 "temporary anonymous chat app"、"Phase 0 and 1"，未反映商业化版本功能。
- **商业化影响**：新成员和投资人无法从 README 了解项目真实状态， onboarding 效率低。
- **修复方向**：重写 README，包含项目简介、架构图、部署方式、贡献指南、安全说明。

### ISSUE-DOC-002
- **文件路径**：`README.md`
- **严重程度**：MEDIUM
- **问题描述**：README 未提及 Docker Compose 部署、环境变量配置、监控告警等关键运维信息。
- **商业化影响**：运维人员需要翻阅多个文档才能部署。
- **修复方向**：在 README 中增加 Quick Start 和部署概览链接。

### ISSUE-DOC-003
- **文件路径**：`docs/API-CONTRACT.md:80`、`apps/api/src/main/resources/application.yml`（JWT_EXPIRATION_MS 默认 86400000）
- **严重程度**：MEDIUM
- **问题描述**：API-CONTRACT 声称 Access Token 有效期 2 小时，但 application 默认配置为 24 小时。
- **商业化影响**：文档与实际配置不一致，安全审计无法通过。
- **修复方向**：统一配置并更新文档；生产环境建议缩短 token 有效期。

### ISSUE-DOC-004
- **文件路径**：`docs/API-CONTRACT.md:98-99`
- **严重程度**：LOW
- **问题描述**：API-CONTRACT 描述限流桶参数但未与 `RateLimitConfig` 实际配置核对（本次审计未读取实现）。
- **商业化影响**：若实现与文档不符，可能导致误限流或漏限流。
- **修复方向**：核对实现代码与文档，建立自动同步机制。

### ISSUE-DOC-005
- **文件路径**：`docs/CI-CD.md:102-119`
- **严重程度**：HIGH
- **问题描述**：`docs/CI-CD.md` 描述的 CI 仅 3 个 job，而实际 `.github/workflows/ci.yml` 有 10 个 job（含 SonarCloud、OWASP、E2E 等）。
- **商业化影响**：文档与 CI 实际流程严重脱节，新员工会按错误文档操作。
- **修复方向**：重写 CI-CD.md 中 CI 部分，与实际 workflow 保持一致。

### ISSUE-DOC-006
- **文件路径**：`docs/CI-CD.md:111`、`.github/workflows/ci.yml:203`
- **严重程度**：MEDIUM
- **问题描述**：文档称 CI 使用 Java 17，但 api-test-coverage job 使用 Java 21。
- **商业化影响**：JDK 版本不一致，可能隐藏兼容性问题。
- **修复方向**：统一 JDK 版本并更新文档。

### ISSUE-DOC-007
- **文件路径**：`docs/CI-CD.md`
- **严重程度**：MEDIUM
- **问题描述**：`docs/CI-CD.md` 未提及 P7 新增的 SonarCloud、OWASP Dependency-Check、jscpd、PMD、E2E 等门禁。
- **商业化影响**：开发者不了解质量门禁要求。
- **修复方向**：补充 P7/P8/P9 阶段新增门禁说明。

### ISSUE-DOC-008
- **文件路径**：`docs/adr/0003-database-mysql-utf8mb4.md`
- **严重程度**：MEDIUM
- **问题描述**：ADR-0003 选定 utf8mb4，但 docker-compose 中 MySQL 实际使用 `utf8mb4_unicode_ci`，与 ADR 精神可能不一致。
- **商业化影响**：架构决策与实际运行配置不一致。
- **修复方向**：在 ADR 中明确排序规则，并统一所有环境为 `utf8mb4_0900_ai_ci`。

### ISSUE-DOC-009
- **文件路径**：`docs/DR/DRP.md:27`、`docker-compose.yml`
- **严重程度**：HIGH
- **问题描述**：DRP 适用范围包含 Elasticsearch，但 docker-compose 和代码中未部署 Elasticsearch。
- **商业化影响**：灾难恢复计划包含不存在的组件，恢复流程不可执行。
- **修复方向**：移除 Elasticsearch 或补充实际部署方案。

### ISSUE-DOC-010
- **文件路径**：`docs/DR/DRP.md:78`、`docker-compose.yml`
- **严重程度**：MEDIUM
- **问题描述**：DRP 称 RabbitMQ 恢复时间 5 分钟，但 docker-compose 中 RabbitMQ 只是可选环境变量，无实际服务定义。
- **商业化影响**：DRP 目标无法落地。
- **修复方向**：在 compose 中增加 RabbitMQ 服务，或调整 DRP 范围。

### ISSUE-DOC-011
- **文件路径**：`docs/DR/DRP.md:124-134`
- **严重程度**：HIGH
- **问题描述**：DRP 声称备份存储到异地服务器和 OSS/COS，但无实际脚本或配置实现。
- **商业化影响**：灾难恢复能力仅为纸面，真实灾难时无法恢复。
- **修复方向**：实现并测试异地备份同步脚本，配置 cron 或对象存储生命周期。

### ISSUE-DOC-012
- **文件路径**：`docs/DR/DRP.md:152-155`
- **严重程度**：MEDIUM
- **问题描述**：DRP 引用 `/usr/local/bin/test-restore.sh` 进行每月恢复演练，但仓库中不存在该脚本。
- **商业化影响**：恢复演练无法执行，备份有效性无法验证。
- **修复方向**：创建 `test-restore.sh` 脚本并纳入 CI。

### ISSUE-DOC-013
- **文件路径**：`docs/DR/restore-procedure.md:103`
- **严重程度**：MEDIUM
- **问题描述**：恢复流程中创建数据库使用 `COLLATE=utf8mb4_unicode_ci`，与项目标准排序规则不一致。
- **商业化影响**：恢复后的数据库排序规则与生产不一致，可能引发隐式转换和查询异常。
- **修复方向**：改为 `utf8mb4_0900_ai_ci`。

### ISSUE-DOC-014
- **文件路径**：`docs/DR/restore-procedure.md`
- **严重程度**：MEDIUM
- **问题描述**：恢复流程未说明如何重新建立 Flyway baseline 或校验 schema_history。
- **商业化影响**：恢复后 Flyway 状态可能与应用预期不一致。
- **修复方向**：补充 Flyway baseline 校验和修复步骤。

### ISSUE-DOC-015
- **文件路径**：`docs/database-indexes.md:139`
- **严重程度**：LOW
- **问题描述**：文档称 JSON 字段使用 `JSON DEFAULT '[]'`，但迁移脚本中多为 `JSON DEFAULT NULL`。
- **商业化影响**：文档与实际 schema 不一致，可能导致应用层空值处理错误。
- **修复方向**：核对并修正文档或迁移脚本。

### ISSUE-DOC-016
- **文件路径**：`docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md:173-177`
- **严重程度**：HIGH
- **问题描述**：文档中记录测试账号密码为明文（`Test@12345`）。
- **商业化影响**：测试账号若与真实环境复用会导致密码泄露；文档本身成为攻击面。
- **修复方向**：从仓库中删除明文密码，改为通过安全渠道分发。

### ISSUE-DOC-017
- **文件路径**：`CHANGELOG.md:21-35`
- **严重程度**：LOW
- **问题描述**：`[Unreleased]` 条目无日期，且与 `[1.0.0]` 边界不清晰。
- **商业化影响**：版本发布记录混乱，难以追溯。
- **修复方向**：明确 Unreleased 范围，发布时转换为带日期版本。

### ISSUE-DOC-018
- **文件路径**：`docs/adr/README.md`
- **严重程度**：MEDIUM
- **问题描述**：缺少关于安全、隐私合规、数据保留策略的 ADR。
- **商业化影响**：关键安全决策无记录，审计时无法解释设计依据。
- **修复方向**：补充 ADR-0011 安全与隐私、ADR-0012 数据保留等。

---

## 7. 监控告警

### ISSUE-MON-001
- **文件路径**：`docker/prometheus/prometheus.yml:14`
- **严重程度**：LOW
- **问题描述**：`external_labels.environment: production` 硬编码。
- **商业化影响**：同一配置用于 staging/test 时标签误导。
- **修复方向**：通过环境变量注入 environment。

### ISSUE-MON-002
- **文件路径**：`docker/prometheus/prometheus.yml:9-10`
- **严重程度**：MEDIUM
- **问题描述**：API scrape interval 15s 在高流量下可能产生大量指标数据。
- **商业化影响**：Prometheus 存储和查询压力增大。
- **修复方向**：根据实际规模调整，生产可设为 30s 或启用 recording rules。

### ISSUE-MON-003
- **文件路径**：`docker/prometheus/prometheus.yml:75-91`
- **严重程度**：HIGH
- **问题描述**：blackbox-exporter target 配置在 prometheus.yml 中，但 docker-compose 未部署 blackbox-exporter 服务。
- **商业化影响**：第三方可用性监控失效，且 Prometheus 会持续报错。
- **修复方向**：部署 blackbox-exporter 或移除相关 scrape config。

### ISSUE-MON-004
- **文件路径**：`docker/prometheus/prometheus.yml:59-73`
- **严重程度**：MEDIUM
- **问题描述**：mysql-exporter、redis-exporter target 配置在 prometheus.yml 中，但 docker-compose 未部署对应服务。
- **商业化影响**：数据库/缓存专用指标缺失，无法有效排查性能问题。
- **修复方向**：部署对应 exporter 或移除 target。

### ISSUE-MON-005
- **文件路径**：`docker/prometheus/prometheus.yml`
- **严重程度**：MEDIUM
- **问题描述**：未配置 `remote_write`，指标仅保留本地 15 天。
- **商业化影响**：无法做长期趋势分析和历史告警回溯。
- **修复方向**：接入 Thanos/Cortex/Mimir 或云监控 remote_write。

### ISSUE-MON-006
- **文件路径**：`docker/alertmanager/alertmanager.yml:26-27`
- **严重程度**：MEDIUM
- **问题描述**：`templates` 配置引用 `/etc/alertmanager/templates/*.tmpl`，但仓库未提供任何模板文件。
- **商业化影响**：邮件/钉钉通知格式异常或缺失。
- **修复方向**：添加模板文件并挂载到容器。

### ISSUE-MON-007
- **文件路径**：`docker/alertmanager/alertmanager.yml:82`
- **严重程度**：HIGH
- **问题描述**：默认 webhook 接收者指向 `http://localhost:9999/webhook`，在容器网络中不可达。
- **商业化影响**：默认告警无法送达，critical 告警可能丢失。
- **修复方向**：配置真实可接收告警的 webhook 地址，并设为必填环境变量。

### ISSUE-MON-008
- **文件路径**：`docker/alertmanager/alertmanager.yml:17-20`
- **严重程度**：MEDIUM
- **问题描述**：SMTP 默认使用 `smtp.example.com` 和空用户名密码。
- **商业化影响**：邮件告警无法发送，且未配置时无明确失败提示。
- **修复方向**：移除默认值，启动时校验必填 SMTP 配置。

### ISSUE-MON-009
- **文件路径**：`docker/prometheus/rules/alert-rules.yml`
- **严重程度**：MEDIUM
- **问题描述**：缺少业务指标告警，如 VIP 转化率、日活、注册成功率、支付成功率等。
- **商业化影响**：无法及时发现业务异常（如支付通道故障）。
- **修复方向**：在应用中暴露业务指标并补充告警规则。

### ISSUE-MON-010
- **文件路径**：`docker/prometheus/rules/alert-rules.yml:98-108`
- **严重程度**：LOW
- **问题描述**：5xx 错误率阈值 1% 可能对社交类业务偏低，易产生告警疲劳。
- **商业化影响**：过多 warning 告警导致值班人员麻木，遗漏真正问题。
- **修复方向**：基于历史基线调整阈值，并分层设置 P0/P1/P2。

### ISSUE-MON-011
- **文件路径**：`docker/alertmanager/alertmanager.yml`
- **严重程度**：MEDIUM
- **问题描述**：未配置告警静默（silences）持久化。
- **商业化影响**：Alertmanager 重启后静默规则丢失。
- **修复方向**：挂载持久化卷到 `/alertmanager` 已配置，但需确认 silences 文件写入权限。

### ISSUE-MON-012
- **文件路径**：`docker-compose.yml`、`docker/prometheus/prometheus.yml`
- **严重程度**：HIGH
- **问题描述**：node-exporter 默认不启动，导致 host-resources 告警规则（磁盘、CPU、内存）无法触发。
- **商业化影响**：宿主机资源耗尽无法及时告警。
- **修复方向**：将 node-exporter 设为默认启动服务。

---

## 8. 备份恢复

### ISSUE-BAK-001
- **文件路径**：`scripts/backup-mysql.sh`
- **严重程度**：HIGH
- **问题描述**：备份仅使用 `mysqldump` 逻辑备份，未配置物理备份（如 Percona XtraBackup）。
- **商业化影响**：数据量大时备份和恢复耗时过长，无法满足 RTO 2h 目标。
- **修复方向**：评估并引入物理备份方案，或至少对核心大表做增量备份。

### ISSUE-BAK-002
- **文件路径**：`scripts/backup-mysql.sh:44`
- **严重程度**：MEDIUM
- **问题描述**：备份保留期仅 7 天，DRP 声称 4 周异地保留但未实现。
- **商业化影响**：超过 7 天的历史数据无法恢复，合规要求可能不满足。
- **修复方向**：实现异地/对象存储同步，并保留 4 周以上。

### ISSUE-BAK-003
- **文件路径**：`scripts/backup-mysql.sh`
- **严重程度**：CRITICAL
- **问题描述**：备份文件未加密。
- **商业化影响**：备份文件泄露即可还原全部用户数据，违反隐私合规。
- **修复方向**：备份完成后使用 GPG/AES 加密，密钥通过 KMS 管理。

### ISSUE-BAK-004
- **文件路径**：`scripts/backup-mysql.sh`
- **严重程度**：HIGH
- **问题描述**：备份脚本未验证备份可恢复性（如未执行 `mysql` 恢复测试）。
- **商业化影响**：损坏的备份在灾难时无法使用。
- **修复方向**：增加恢复验证步骤，或定期执行 DRP 中提到的 `test-restore.sh`。

### ISSUE-BAK-005
- **文件路径**：`docker-compose.yml`
- **严重程度**：CRITICAL
- **问题描述**：未配置 Redis 备份服务或策略。
- **商业化影响**：Redis 故障时无法恢复会话、黑名单、限流状态，DRP 中 Redis RPO 5min 无法落地。
- **修复方向**：配置 Redis 持久化备份 sidecar，定期复制 RDB/AOF 到对象存储。

### ISSUE-BAK-006
- **文件路径**：`docker-compose.yml:105-106`
- **严重程度**：MEDIUM
- **问题描述**：Redis AOF 已启用，但未配置 `auto-aof-rewrite-percentage` 和 `auto-aof-rewrite-min-size`。
- **商业化影响**：AOF 文件无限增长，恢复时间变长。
- **修复方向**：配置 AOF 重写策略。

### ISSUE-BAK-007
- **文件路径**：`docs/DR/DRP.md:74-75`
- **严重程度**：HIGH
- **问题描述**：DRP 中 MySQL RPO 1h 依赖 binlog，但无自动化 binlog 备份/归档脚本。
- **商业化影响**：PITR 无法执行，RPO 目标不可达。
- **修复方向**：实现 binlog 自动备份到对象存储，并保留足够周期。

### ISSUE-BAK-008
- **文件路径**：`docs/DR/DRP.md:74-75`
- **严重程度**：MEDIUM
- **问题描述**：DRP 恢复时间基于 12MB 测试数据库，未按生产规模评估。
- **商业化影响**：真实灾难时 RTO 估计严重不足。
- **修复方向**：基于生产数据量进行恢复演练并更新 RTO/RPO。

---

## 9. 安全扫描

### ISSUE-SCAN-001
- **文件路径**：`.gitleaks.toml:20-21`
- **严重程度**：HIGH
- **问题描述**：`.gitleaks.toml` 全局允许列表包含字符串 `campus_love`，该字符串同时是 CI 数据库密码。
- **商业化影响**：该凭证可能被 Gitleaks 忽略，无法被扫描发现。
- **修复方向**：移除过于宽泛的字符串白名单，改为路径/正则精确匹配。

### ISSUE-SCAN-002
- **文件路径**：`.gitleaks.toml:22-31`
- **严重程度**：HIGH
- **问题描述**：`.gitleaks.toml` 对整个 `application-db.yml`、`.github/workflows/ci.yml`、`flyway.toml` 文件做路径白名单。
- **商业化影响**：这些文件中若未来新增真实 secret，扫描器会全部放行。
- **修复方向**：仅对文件中的特定占位符/已知示例值做白名单，而非整个文件。

### ISSUE-SCAN-003
- **文件路径**：`.spectral.yaml`
- **严重程度**：MEDIUM
- **问题描述**：`.spectral.yaml` 关闭了 `info-contact`、`info-description`、`info-license`、`operation-description`、`operation-success-response` 等规则。
- **商业化影响**：OpenAPI 文档质量下降，接口描述缺失，客户集成困难。
- **修复方向**：逐步开启规则并修复违规项。

### ISSUE-SCAN-004
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：HIGH
- **问题描述**：CI 未集成 SAST 工具（如 CodeQL、Semgrep）。
- **商业化影响**：无法自动发现 SQL 注入、XSS、不安全反序列化等代码级漏洞。
- **修复方向**：新增 CodeQL 或 Semgrep 扫描 job。

### ISSUE-SCAN-005
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：HIGH
- **问题描述**：CI 未集成 DAST 工具（如 OWASP ZAP）。
- **商业化影响**：无法发现运行时的安全漏洞（如开放重定向、越权访问）。
- **修复方向**：新增 OWASP ZAP baseline scan 或针对 staging 的 DAST。

### ISSUE-SCAN-006
- **文件路径**：`.github/workflows/ci.yml`
- **严重程度**：MEDIUM
- **问题描述**：CI 未对 Docker 镜像进行漏洞扫描（Trivy/Grype/Snyk）。
- **商业化影响**：镜像中的 CVE 无法被发现，部署到生产即带漏洞。
- **修复方向**：在镜像构建后增加 Trivy 扫描 job。

---

## 附录：优先修复建议

### P0（阻塞上线）
1. 解决 Flyway 版本冲突（DB-001 ~ DB-004）。
2. 移除 `flyway.user.toml` 中的硬编码密码并轮换（SEC-011）。
3. 移除 `test-migrations.sh` 中的硬编码哈希（SEC-013）。
4. 为 docker-compose 中所有服务移除弱默认密码（DC-001、DC-009、DC-013、DC-023）。
5. 为 MySQL/Redis 启用认证并关闭默认端口暴露（DC-004、DC-010）。
6. 生产环境禁用 Swagger UI 和允许公钥检索（SEC-004、SEC-001、DC-014）。
7. 修复 `.gitignore` 防止 `.env` 提交（SEC-015）。

### P1（高风险）
1. 使用 Docker secrets 管理凭证（DC-002、DC-019）。
2. 为所有服务配置资源限制和日志轮转（DC-017、DC-018）。
3. 统一时区为 Asia/Shanghai 并在 CI 中验证（CI-002）。
4. 部署缺失的 exporter 服务（DC-034）。
5. 实现 Redis 备份（BAK-005）。
6. 加密 MySQL 备份（BAK-003）。
7. 增加 SAST/DAST/镜像扫描（SCAN-004 ~ SCAN-006）。

### P2（中风险）
1. 逐步替换 ENUM 为 VARCHAR + CHECK（DB-005 ~ DB-013）。
2. 清理冗余索引并制定大表分区策略（DB-032 ~ DB-034）。
3. 更新 README、CI-CD.md、DRP 等文档与实际代码一致（DOC-001 ~ DOC-018）。
4. 锁定所有镜像 digest（DK-001、DK-005、CI-003）。
5. 为 CI 增加 admin 构建、compose 校验、timeout、concurrency（CI-005 ~ CI-011）。
