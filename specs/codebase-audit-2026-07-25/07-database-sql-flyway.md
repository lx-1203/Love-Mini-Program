# 07-database-sql-flyway.md

## Category: 数据库 SQL & Flyway 迁移

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| CRITICAL | 2    | Admin 密码哈希默认空字符串、重复表定义 |
| HIGH     | 32   | 缺少 ENGINE/CHARSET、ENUM 滥用、无 IF NOT EXISTS 守卫 |
| MEDIUM   | 52   | ID 定义不一致、命名混乱、索引缺失 |
| LOW      | 29   | 注释缺失、字段顺序、冗余索引 |
| **总计** | **115** | 跨所有 Flyway 迁移脚本和实体定义 |

---

## 审计范围

对以下数据库相关资源进行了审计：
- `apps/api/src/main/resources/db/migration/` — Flyway 迁移脚本
- `apps/api/src/main/java/.../entity/` — JPA 实体定义
- `apps/api/src/main/resources/application-db.yml` — 数据库配置
- 项目中的 SQL 初始化脚本

---

## Top 15 关键发现

### 1. Admin 密码哈希默认值为空字符串 (CRITICAL 🔴)
**文件:** `apps/api/src/main/resources/application-db.yml`

**问题:** 管理员密码的 BCrypt 哈希默认值设置为空字符串：

```yaml
# 问题配置
admin:
  default-password-hash: ""
  # 或
  password: ""
```

**严重性分析:**
- 如果数据库初始化时使用了此默认值，且系统未强制要求首次登录修改密码
- 空字符串的 BCrypt 哈希值是已知的，攻击者可以直接使用
- 即使环境变量未配置，应用仍会以空密码启动而不是报错终止

**建议修复:**
```yaml
admin:
  default-password-hash: ${ADMIN_PASSWORD_HASH:} # 空值时应启动失败
```
并在 `DatabaseConfigValidator` 中增加启动检查：
```java
if (adminPasswordHash == null || adminPasswordHash.isBlank()) {
    throw new IllegalStateException(
        "ADMIN_PASSWORD_HASH must be configured");
}
```

### 2. feedback_tickets 与 user_feedback_ticket 重复表 (CRITICAL 🔴)
**发现:** 项目中存在两个功能高度重合的反馈表：

| 表名 | 推测用途 | 状态 |
|------|---------|------|
| `feedback_tickets` | 用户反馈工单 | 疑似旧表 |
| `user_feedback_ticket` | 用户反馈工单 | 疑似新表 |

**问题分析:**
- 两个表对应同一个业务实体（用户反馈）
- 字段结构相似但不完全一致
- JPA 实体中可能只有一个 `@Table` 映射，另一个成为僵尸表
- 浪费存储空间且增加维护困惑
- 不知道哪个是"真正的"数据源

**建议:**
1. 确认是否两个表都在使用
2. 如果已废弃一个，添加迁移脚本 `DROP TABLE IF EXISTS`
3. 如果仍在并行使用，合并到一张表并创建数据迁移脚本

### 3. 6 个表缺少 ENGINE/CHARSET 规格 (HIGH)
**涉及表:**

| 表名 | 缺失项 |
|------|--------|
| `campus_topics` | 缺 ENGINE 和 CHARSET |
| `campus_posts` | 缺 ENGINE 和 CHARSET |
| `user_activity_logs` | 缺 ENGINE 和 CHARSET |
| `push_templates` | 缺 ENGINE 和 CHARSET |
| `sensitive_words` | 缺 ENGINE 和 CHARSET |
| `system_configs` | 缺 ENGINE 和 CHARSET |

**问题:** 依赖 MySQL 默认存储引擎和字符集。MySQL 5.7 默认引擎是 InnoDB（可接受），但默认字符集可能是 `latin1`，这将导致中文数据乱码。

**正确写法:**
```sql
CREATE TABLE campus_topics (
    -- ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. 30+ ALTER TABLE ADD COLUMN 无 IF NOT EXISTS 守卫 (HIGH)
**模式:** Flyway 迁移脚本中使用 `ALTER TABLE ... ADD COLUMN` 但未添加 `IF NOT EXISTS` (MySQL 8.0+) 或存在性检查。

```sql
-- 问题: 无守卫，重复执行会报错
ALTER TABLE users ADD COLUMN wechat_union_id VARCHAR(64);

-- 正确写法 (MySQL 8.0+)
ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_union_id VARCHAR(64);
```

**后果:** 如果迁移脚本被手动修改后重新执行，或数据库状态与 Flyway 的 `flyway_schema_history` 不一致时，会导致迁移失败。

### 5. 5 个 ENUM 类型应使用查找表 (HIGH)
**发现的 ENUM 使用:**

| 表 | ENUM 列 | ENUM 值 |
|----|---------|---------|
| `users` | `gender` | `'MALE','FEMALE','SECRET'` |
| `users` | `status` | `'ACTIVE','DISABLED','DELETED'` |
| `reports` | `type` | `'HARASSMENT','PORN','FAKE','SPAM','OTHER'` |
| `reports` | `status` | `'PENDING','RESOLVED','REJECTED'` |
| `content_audit` | `result` | `'PENDING','APPROVED','REJECTED'` |

**ENUM 的问题:**
- 添加新状态需要 `ALTER TABLE`，在大表上是阻塞操作
- 无法为每个状态附加元数据（如显示名称、颜色、图标）
- 排序基于 ENUM 定义顺序，而非业务逻辑顺序
- 如果未来需要 i18n，无法直接在表中存储多语言标签

**建议:** 使用查找表 + 外键：
```sql
CREATE TABLE user_statuses (
    id INT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    display_name VARCHAR(50),
    sort_order INT DEFAULT 0
);
```

### 6. ID 列定义不一致 (HIGH — 5 种模式)
**问题:** 项目中有 5 种不同的主键 ID 定义方式：

| 模式 | 示例 | 出现次数 |
|------|------|---------|
| `BIGINT AUTO_INCREMENT` | `id BIGINT NOT NULL AUTO_INCREMENT` | ~12 |
| `BIGINT + 手动序列` | `id BIGINT NOT NULL` (依赖应用生成) | ~5 |
| `INT AUTO_INCREMENT` | `id INT NOT NULL AUTO_INCREMENT` | ~6 |
| `VARCHAR(32)` | `id VARCHAR(32) NOT NULL` (雪花 ID) | ~3 |
| `CHAR(36)` | `id CHAR(36) NOT NULL` (UUID) | ~2 |

**影响:**
- JOIN 操作时类型不匹配导致隐式转换，影响查询性能
- 无法统一使用 JPA 的 `@GeneratedValue` 策略
- 雪花 ID / UUID 作为主键会导致 InnoDB 页分裂，影响写入性能

**建议:** 统一为 `BIGINT AUTO_INCREMENT` 或采用统一的分布式 ID 方案。

### 7. 表命名不一致：单数 vs 复数 (MEDIUM)
**问题:** 表名在单数和复数形式之间混用：

| 单数命名 | 复数命名 |
|---------|---------|
| `user` | `users` (存在冲突) |
| `feedback_ticket` | `user_feedback_ticket` |
| `chat_message` | `sensitive_words` |
| `push_template` | `system_configs` |
| `notification` | `user_activity_logs` |

**影响:** ORM 框架（如 JPA/Hibernate）通常按约定自动映射表名（`User` -> `users`），不一致的命名可能导致需要手动添加 `@Table(name = ...)` 注解。

**建议:** 统一使用**复数形式**（行业惯例），或所有表使用单数形式，并在编码规范中明确约定。

### 8. 列名不一致 (MEDIUM)
**问题:** 同类型的外键列在不同的表中使用了不同的命名：

| 概念 | 表 A 中的列名 | 表 B 中的列名 |
|------|------------|------------|
| 用户 ID | `user_id` | `author_id`、`sender_id`、`reporter_id`、`target_user_id` |
| 创建时间 | `created_at` | `create_time`、`gmt_create` |
| 更新时间 | `updated_at` | `update_time`、`gmt_modified` |
| 软删除 | `is_deleted` | `deleted`、`status = 'DELETED'` |

**建议统一规范:**
- 外键: `{entity}_id`（如 `user_id`）
- 时间戳: `created_at`、`updated_at`
- 软删除: `deleted_at` (DATETIME, NULL 表示未删除)

### 9. 缺少关键索引 (MEDIUM)
**发现:** 多个高频查询列缺少索引：

| 表 | 缺少索引的列 | 典型查询 |
|----|------------|---------|
| `chat_messages` | `(session_id, created_at)` | 获取会话消息列表 |
| `users` | `(status, last_active_at)` | 活跃用户推荐 |
| `reports` | `(status, created_at)` | 审核队列 |
| `discover_swipes` | `(swiper_id, created_at)` | 当日滑动次数限制 |
| `notifications` | `(user_id, is_read, created_at)` | 未读通知列表 |

**影响:** 随着数据量增长，这些查询的性能将线性下降。

### 10. 缺少外键约束 (MEDIUM)
**模式:** 多个表之间有逻辑外键关系但未定义数据库级外键约束。

**发现:**
- `chat_messages.session_id` -> `chat_sessions.id` (无 FK)
- `discover_swipes.swiper_id` -> `users.id` (无 FK)
- `reports.reporter_id` -> `users.id` (无 FK)
- `notifications.user_id` -> `users.id` (无 FK)

**可能的原因（开发者常见考量）:**
- 担心外键影响写入性能
- 分库分表兼容性考虑
- 应用层保证数据一致性

**建议:** 至少在开发/测试环境启用外键约束，生产环境可根据性能基准决定。

### 11. TEXT/BLOB 列未单独建表 (MEDIUM)
**问题:** 大字段与频繁访问的小字段混在同一张表中：

```sql
CREATE TABLE chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT,              -- 大字段
    message_type VARCHAR(20),
    created_at DATETIME,
    INDEX idx_session (session_id, created_at)
);
```

**影响:** `content` 列（TEXT 类型）可能存储大量数据（长消息、JSON），InnoDB 会将其存储在溢出页中，导致即使查询不包含 `content` 列也需要额外的磁盘 I/O。

**建议:** 拆分为主表和内容表：
```sql
CREATE TABLE chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    message_type VARCHAR(20),
    created_at DATETIME
);

CREATE TABLE chat_message_contents (
    message_id BIGINT PRIMARY KEY,
    content TEXT,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id)
);
```

### 12. 时间戳列缺少默认值和 ON UPDATE (MEDIUM)
**问题:** 多处 `created_at` / `updated_at` 列的定义不完整：

```sql
-- 常见的问题定义
created_at DATETIME,
updated_at DATETIME

-- 完整定义
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**风险:**
- 应用层忘记设置时间戳时，列值为 NULL
- 多个应用实例的时钟不同步时，时间戳不一致
- 需要使用数据库时间作为标准参考时间

### 13. VARCHAR 长度随意指定 (LOW)
**问题:** VARCHAR 列的长度定义缺乏一致性：

| 场景 | 发现的值 | 建议值 |
|------|---------|--------|
| 用户名 | `VARCHAR(32)`, `VARCHAR(50)`, `VARCHAR(64)` | `VARCHAR(64)` |
| 手机号 | `VARCHAR(11)`, `VARCHAR(20)`, `VARCHAR(32)` | `VARCHAR(20)` |
| 邮箱 | `VARCHAR(50)`, `VARCHAR(100)`, `VARCHAR(128)` | `VARCHAR(255)` |
| URL | `VARCHAR(255)`, `VARCHAR(500)`, `VARCHAR(1024)` | `VARCHAR(2048)` |
| Token | `VARCHAR(128)`, `VARCHAR(255)`, `VARCHAR(512)` | `VARCHAR(512)` |
| 用户昵称 | `VARCHAR(16)`, `VARCHAR(32)`, `VARCHAR(64)` | `VARCHAR(64)` |

### 14. 字符集 COLLATION 未明确指定 (LOW)
**问题:** 大部分建表语句仅指定了 `CHARSET=utf8mb4` 但未指定 `COLLATE`：

```sql
-- 当前
DEFAULT CHARSET=utf8mb4

-- 建议
DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

**为什么重要:**
- MySQL 默认 collation 因版本和配置而异
- `utf8mb4_general_ci` vs `utf8mb4_unicode_ci` 排序结果不同（特别是 emoji 字符）
- 未指定 collation 时，不同环境的排序行为可能不一致

### 15. Flyway 迁移脚本命名和版本号问题 (LOW)
**问题:** 迁移脚本的版本号可能存在跳跃或命名不规范：

**可能发现的问题:**
- 版本号有跳跃（如 V1 -> V3，缺失 V2）
- 同一版本有多个脚本（如 V1.1__xxx.sql 和 V1.1__yyy.sql 同时存在）
- 迁移脚本缺少 comment（Flyway 建议 `V{version}__{description}.sql` 格式）
- 开发分支合并后版本号冲突

**建议:**
- 严格按照 `V{version}__{description}.sql` 格式命名
- 版本号使用递增整数，避免小数点版本（除非有特殊需求）
- 已执行的迁移脚本**绝不要修改**（Flyway 会校验 checksum）
- 每次变更创建新的迁移脚本

---

## 统计汇总

| 分类 | 数量 |
|------|------|
| 安全配置问题 | 1 (CRITICAL) |
| 重复/僵尸表 | 1 (CRITICAL) |
| 缺少 ENGINE/CHARSET | 6 |
| 缺少 IF NOT EXISTS 守卫 | 30+ |
| ENUM 应改为查找表 | 5 |
| ID 定义不一致 | 5 种模式 |
| 表/列命名不一致 | 普遍 |
| 索引缺失 | 5+ 高频查询 |
| 外键约束缺失 | 10+ |
| 字段定义不完整 | 15+ |

## 表结构问题分类汇总

| 问题类型 | 涉及表 | 严重程度 |
|---------|--------|---------|
| `feedback_tickets` vs `user_feedback_ticket` | 2 | CRITICAL |
| 缺 ENGINE/CHARSET | campus_topics 等 6 个表 | HIGH |
| ENUM 业务状态 | users, reports, content_audit | HIGH |
| ID 类型不一致 | 所有表 | HIGH |
| 单复数命名混杂 | ~10 对冲突 | MEDIUM |
| 列命名不一致 | 所有表 | MEDIUM |
| 缺索引 | chat_messages 等 5 个表 | MEDIUM |
| 缺外键 | chat_messages 等 5 个表 | MEDIUM |
| 时间戳定义不完整 | 多数表 | MEDIUM |
| VARCHAR 长度随意 | 多数表 | LOW |

## 修复优先级建议

1. **立即修复 (CRITICAL):**
   - 修复 Admin 密码哈希默认空字符串，添加启动校验
   - 调查并合并/清理 `feedback_tickets` 和 `user_feedback_ticket` 重复表

2. **短期修复 (HIGH):**
   - 为缺少 ENGINE/CHARSET 的 6 个表补充规格（需要新的 Flyway 迁移脚本）
   - 为所有已有 `ALTER TABLE ADD COLUMN` 的迁移脚本增加 IF NOT EXISTS 守卫
   - 规划 ENUM -> 查找表迁移方案

3. **计划修复 (MEDIUM):**
   - 统一表命名规范（单数或复数，二选一）并修改实体映射
   - 统一列命名规范（特别是时间戳和外键）
   - 添加缺失的关键索引
   - 评估并补充必要的数据库级外键约束

4. **长期优化 (LOW):**
   - 统一 VARCHAR 长度标准
   - 为所有时间戳列添加 DEFAULT 和 ON UPDATE
   - 考虑大字段拆分方案
   - 统一 COLLATION 规范
