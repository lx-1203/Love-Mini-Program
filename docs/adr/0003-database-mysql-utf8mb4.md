# ADR-0003: 数据库选型 - MySQL 8 + utf8mb4 + Flyway 迁移

- **Status**: Accepted
- **Date**: 2026-05-22
- **Deciders**: DBA、后端 Lead、架构组
- **Tags**: database, mysql, migration, charset

---

## Context and Problem Statement

校园恋爱小程序需要存储用户资料、匹配记录、聊天消息、帖子内容、活动报名、签到记录、支付订单等多种数据。预估首年数据量：

- 用户表：50 万行
- 聊天消息：5,000 万行（每日 50 万条）
- 帖子与评论：100 万行
- 操作日志：2,000 万行

需在数据库选型上考虑：

1. **数据量级**：单表千万行级查询性能
2. **事务一致性**：用户支付、匹配等场景需 ACID
3. **字符集**：支持 emoji 与多语言（utf8mb4）
4. **运维成本**：备份恢复、监控告警、扩缩容
5. **团队熟悉度**：DBA 与后端的运维经验
6. **生态兼容**：ORM、迁移工具、BI 工具支持

---

## Decision Drivers

- **ACID 事务**：支付、匹配等核心场景需强一致性
- **utf8mb4 字符集**：支持 emoji（用户昵称、聊天消息）
- **团队经验**：DBA 有 MySQL 8 运维经验
- **运维成熟度**：备份恢复工具链完善
- **成本可控**：开源免费，无 License 费用
- **扩展能力**：未来可分库分表或迁移到 TiDB

---

## Considered Options

### 方案 A：MySQL 8 + utf8mb4 + Flyway（**选定**）

- 单实例 + 主从复制（1 主 2 从）
- InnoDB 引擎 + utf8mb4_unicode_ci 排序
- Flyway 管理迁移脚本

### 方案 B：PostgreSQL 15

- 优势：JSON 字段支持更好、并发模型更先进
- 劣势：团队经验不足、生态工具较少

### 方案 C：MongoDB 7

- 优势：文档模型灵活、水平扩展易
- 劣势：ACID 弱、事务复杂场景不友好

### 方案 D：TiDB

- 优势：兼容 MySQL 协议、分布式扩展
- 劣势：运维复杂度高、资源占用大

---

## Pros and Cons of the Options

### 方案 A（MySQL 8 + utf8mb4）

| 优点 | 缺点 |
|------|------|
| ✅ 团队熟悉，运维成熟 | ❌ 单机扩展受限（需分库分表） |
| ✅ ACID 完整支持 | ❌ JSON 字段性能不如 PG |
| ✅ utf8mb4 支持 emoji | ❌ 全文搜索需 ES 配合 |
| ✅ Flyway 迁移可追溯 | |
| ✅ 工具链完善（mysqldump/Percona Toolkit） | |
| ✅ 主从复制成熟 | |

### 方案 B（PostgreSQL）

| 优点 | 缺点 |
|------|------|
| ✅ JSON 字段性能优 | ❌ 团队无运维经验 |
| ✅ MVCC 并发优秀 | ❌ 备份恢复工具链不如 MySQL |
| ✅ 扩展性强（插件多） | ❌ 国内案例较少 |

### 方案 C（MongoDB）

| 优点 | 缺点 |
|------|------|
| ✅ 文档模型灵活 | ❌ ACID 弱（虽 4.0+ 支持事务） |
| ✅ 水平扩展易 | ❌ 复杂查询不如 RDBMS |
| ✅ Schema 演进友好 | ❌ 团队经验不足 |

### 方案 D（TiDB）

| 优点 | 缺点 |
|------|------|
| ✅ 分布式扩展 | ❌ 运维复杂度高 |
| ✅ 兼容 MySQL 协议 | ❌ 资源占用大（最低 3 节点） |
| ✅ HTAP 支持 | ❌ 当前数据量未达 TiDB 适用规模 |

---

## Decision

**选定方案 A：MySQL 8.0 + utf8mb4 + Flyway**

### 详细配置

#### 版本与引擎

| 项 | 配置 |
|----|------|
| MySQL 版本 | 8.0.36+ |
| 存储引擎 | InnoDB |
| 字符集 | utf8mb4 |
| 排序规则 | utf8mb4_unicode_ci |
| 时区 | Asia/Shanghai（+08:00） |

#### 关键参数

```ini
[mysqld]
# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# InnoDB
innodb_buffer_pool_size = 4G                # 服务器内存 60-70%
innodb_log_file_size = 1G
innodb_flush_log_at_trx_commit = 1
innodb_flush_method = O_DIRECT

# 连接
max_connections = 500
wait_timeout = 28800

# binlog（用于备份与主从）
log-bin = mysql-bin
binlog_format = ROW
expire_logs_days = 3
server-id = 1

# 慢查询
slow_query_log = ON
long_query_time = 1
```

#### 命名规范

- **表名**：snake_case，复数形式（如 `users`、`posts`）
- **列名**：snake_case（如 `created_at`、`open_id`）
- **索引**：`idx_<table>_<columns>`（如 `idx_users_open_id`）
- **唯一约束**：`uk_<table>_<columns>`（如 `uk_users_openid`）
- **外键**：`fk_<table>_<ref_table>`（如 `fk_messages_users`）

#### 迁移管理（Flyway）

- 脚本位置：`apps/api/src/main/resources/db/migration/`
- 命名规范：`V{yyyy.MM.dd.HHmm}__<description>.sql`
- 版本示例：`V2026.07.26.0002__add_open_id_unique_constraint.sql`
- 回滚策略：每个迁移脚本配套回滚脚本（`U2026.07.26.0002__...sql`）
- 幂等性：所有 DDL 使用 `IF NOT EXISTS` 或存储过程幂等添加

#### 主从复制

- 1 主 2 从（异步复制）
- 主负责写，从负责读（读写分离由应用层 ShardingSphere 控制）
- 主从延迟监控（`Seconds_Behind_Master` ≤ 1s）

---

## Consequences

### 正面后果

- **运维成熟**：DBA 经验丰富，问题排查快
- **生态完善**：mysqldump、Percona Toolkit、pt-query-digest 等工具齐全
- **ACID 强一致**：支付、匹配等核心场景可靠
- **utf8mb4 支持**：emoji 与多语言无障碍
- **Flyway 可追溯**：每次迁移有版本记录

### 负面后果

- **单机扩展限制**：单表 > 5,000 万行需考虑分库分表
- **JSON 性能一般**：复杂 JSON 查询性能不如 PostgreSQL
- **全文搜索弱**：需配合 Elasticsearch
- **主从延迟**：异步复制存在延迟，读从库可能读到旧数据

### 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 单表数据爆炸 | 提前规划分表策略（按 user_id hash） |
| 主从延迟导致读旧数据 | 关键场景强制读主库（@Master 注解） |
| 慢查询拖垮实例 | 慢查询日志 + pt-query-digest 周分析 |
| 数据丢失 | 每日全量备份 + binlog 实时同步 |

---

## Compliance Note

- utf8mb4 字符集支持完整中文与 emoji，满足业务需求
- InnoDB 引擎支持 ACID，满足金融级一致性
- 主从复制 + 异地备份满足等保三级数据保护要求
- Flyway 迁移脚本提供完整审计轨迹

---

## Related Documents

- [ADR-0001: 技术栈选型](./0001-technology-stack-selection.md)
- [ADR-0004: 缓存方案](./0004-cache-redis-cluster.md)
- 数据库恢复详细操作：`docs/DR/restore-procedure.md`
- 灾难恢复计划：`docs/DR/DRP.md`
- 迁移脚本：`apps/api/src/main/resources/db/migration/`
- 备份脚本：`scripts/backup-mysql.sh`

---

## Change Log

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-05-22 | 首次提议 | DBA |
| 2026-05-25 | 评审通过 | 架构组 |
| 2026-07-26 | 补充分表策略与幂等迁移 | DBA |
