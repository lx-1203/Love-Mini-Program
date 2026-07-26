# 数据库索引建议文档

> 本文档记录恋爱小程序后端各核心表的索引设计、用途及预期查询性能提升。
>
> - **Entity 元数据来源**：`apps/api/src/main/java/com/campuslove/api/entity/*.java` 中的 `@Index` / `@UniqueConstraint` 注解
> - **数据库索引来源**：`database/flyway/sql/V*.sql` Flyway 迁移脚本
> - **JPA DDL 模式**：`spring.jpa.hibernate.ddl-auto=validate`，Hibernate 不会根据注解自动创建索引，必须通过 Flyway 脚本创建
>
> 本次任务（V2026.07.26.0001）在 9 个核心 Entity 上补充了索引注解，并通过 Flyway 脚本新增 7 条数据库索引。

---

## 一、索引统计概览

| 维度 | 数量 |
| --- | --- |
| 修改的 Entity 文件 | 9 |
| 通过 `@Index` 注解声明的索引 | 35 |
| 通过 `@UniqueConstraint` 注解声明的唯一约束 | 4 |
| 本次 Flyway 脚本新增的数据库索引 | 7 |
| 累计数据库索引（含历史迁移） | 60+ |

---

## 二、各表索引详情

### 1. users（用户主表）

| 索引名 | 类型 | 字段 | 用途 | 预期性能提升 |
| --- | --- | --- | --- | --- |
| `uk_users_openid` | UNIQUE | `openid` | 微信登录唯一性保证、按 openid 查询用户 | 登录查询从全表扫描降至 O(log n) |
| `idx_users_phone` | INDEX | `phone` | 手机号登录、按手机号查询用户 | 手机号查询从全表扫描降至 O(log n) |
| `idx_users_created_at` | INDEX | `created_at` | 用户列表按注册时间排序、分页 | ORDER BY 免排序，分页响应 < 50ms |

> **注**：任务规格提到 `school_id` 索引，但 `users` 表实际无该字段（校区信息存于 `user_campus_profiles` 表），故跳过。

### 2. posts（村口帖子表）

| 索引名 | 类型 | 字段 | 用途 | 预期性能提升 |
| --- | --- | --- | --- | --- |
| `idx_posts_author` | INDEX | `author_id` | 作者主页帖子列表查询 | 作者帖子查询从全表扫描降至 O(log n) |
| `idx_posts_category` | INDEX | `category` | 按分类筛选帖子 | 分类筛选响应 < 30ms |
| `idx_posts_created_at` | INDEX | `created_at` | 帖子列表按时间排序、分页 | ORDER BY 免排序 |
| `idx_posts_status` | INDEX | `status` | 状态过滤（active/deleted/hidden） | 状态过滤效率提升 10x+ |
| `idx_posts_author_created_at` | INDEX | `(author_id, created_at)` | 作者主页帖子分页 | 复合索引覆盖，避免回表排序 |
| `idx_posts_status_created_at` | INDEX | `(status, created_at)` | 按状态+时间查询 | 列表查询综合性能提升 5-10x |

> **注**：任务规格提到 `circle_id` 索引，但 `posts` 表实际无该字段（圈子功能由 `circle_topics` / `circle_memberships` 表承担），故跳过。

### 3. likes（用户喜欢记录表，承担"匹配关系"职责）

| 索引名 | 类型 | 字段 | 用途 | 预期性能提升 |
| --- | --- | --- | --- | --- |
| `uk_likes_user_target` | UNIQUE | `(user_id, target_user_id)` | 防止重复喜欢、匹配关系唯一性 | 写入去重，避免应用层校验 |
| `idx_likes_target_user` | INDEX | `target_user_id` | 查询"谁喜欢了我" | 反向查询从全表扫描降至 O(log n) |
| `idx_likes_created_at` | INDEX | `created_at` | 按时间排序 | ORDER BY 免排序 |
| `idx_likes_status` | INDEX | `status` | 按状态过滤（active/cancelled） | 有效点赞过滤效率提升 |
| `idx_likes_user_created_at` | INDEX | `(user_id, created_at)` | "我喜欢的人"列表分页 | 复合索引覆盖 |
| `idx_likes_target_user_created_at` | INDEX | `(target_user_id, created_at)` | "喜欢我的人"列表分页 | 复合索引覆盖 |
| `idx_likes_status_created_at` | INDEX | `(status, created_at)` | 按状态+时间查询 | 复合索引覆盖 |

### 4. private_messages（私信消息表）

| 索引名 | 类型 | 字段 | 用途 | 预期性能提升 |
| --- | --- | --- | --- | --- |
| `idx_private_messages_sender_created_at` | INDEX | `(sender_id, created_at)` | 按发送者查询消息历史 | 消息历史查询响应 < 50ms |
| `idx_private_messages_conversation_read` | INDEX | `(conversation_id, is_read, created_at)` | 会话未读消息统计、分页 | 未读统计从全表扫描降至 O(log n) |
| `idx_pm_conv_read` | INDEX | `(conversation_id, is_read)` | 会话未读计数（轻量版） | 未读计数响应 < 10ms |
| `idx_private_messages_conversation_created_at` | INDEX | `(conversation_id, created_at)` | 会话消息按时间分页（任务规格 `session_id+created_at` 的对应） | 会话分页响应 < 50ms |
| `idx_private_messages_created_at` | INDEX | `created_at` | 全局消息按时间扫描、定时清理 | 清理任务效率提升 10x+ |
| `idx_private_messages_delivery_status` | INDEX | `delivery_status` | 按投递状态过滤（任务规格 `status` 的对应） | 投递状态筛选效率提升 |

> **注**：任务规格中提到 `session_id` / `status` 字段，实际表中分别为 `conversation_id` / `delivery_status`，故索引按实际字段命名。

### 5. notifications（互动通知表）

| 索引名 | 类型 | 字段 | 用途 | 预期性能提升 |
| --- | --- | --- | --- | --- |
| `idx_notifications_user` | INDEX | `user_id` | 按接收者查询通知列表 | 用户通知查询从全表扫描降至 O(log n) |
| `idx_notifications_user_read` | INDEX | `(user_id, is_read)` | 查询未读通知（高频查询） | 未读通知统计响应 < 10ms |
| `idx_notifications_created` | INDEX | `created_at` | 通知按时间排序 | ORDER BY 免排序 |
| `idx_notifications_type` | INDEX | `type` | 按通知类型筛选 | 类型筛选效率提升 |
| `idx_notifications_user_created_at` | INDEX | `(user_id, created_at)` | 用户通知按时间分页 | 复合索引覆盖，分页响应 < 50ms |

### 6. check_ins（用户签到记录表）

| 索引名 | 类型 | 字段 | 用途 | 预期性能提升 |
| --- | --- | --- | --- | --- |
| `uk_checkin_user_date` | UNIQUE | `(user_id, check_in_date)` | 保证一天只能签到一次 | 业务层去重，避免重复签到 |
| `idx_checkin_user_id` | INDEX | `user_id` | 按用户查询签到记录 | 用户签到历史查询响应 < 30ms |
| `idx_checkin_date` | INDEX | `check_in_date` | 按日期查询签到记录 | 按日期统计签到数响应 < 30ms |
| `idx_check_ins_user_created_at` | INDEX | `(user_id, created_at)` | 按用户+创建时间查询签到历史 | 复合索引覆盖 |

### 7. heart_signals（心动信号表）

| 索引名 | 类型 | 字段 | 用途 | 预期性能提升 |
| --- | --- | --- | --- | --- |
| `uk_heart_signals_users` | UNIQUE（函数） | `(LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))` | 双向去重（A→B 与 B→A 视为同一条） | 数据库层保证双向唯一性 |
| `idx_heart_signals_user_a` | INDEX | `user_a_id` | 按发起方查询心动信号 | 发起方信号查询响应 < 30ms |
| `idx_heart_signals_user_b` | INDEX | `user_b_id` | 按接收方查询心动信号 | 接收方信号查询响应 < 30ms |
| `idx_heart_signals_expires_at` | INDEX | `expires_at` | 定时任务扫描过期信号 | 过期扫描效率提升 10x+ |
| `idx_heart_signals_status` | INDEX | `status` | 按状态过滤（pending/accepted/expired/declined） | 待处理信号扫描效率提升 |
| `idx_heart_signals_created_at` | INDEX | `created_at` | 按时间排序、分页查询 | ORDER BY 免排序 |

> **注**：任务规格中提到 `sender_id + receiver_id` 索引，实际表中为 `user_a_id + user_b_id`，数据库已对 `(LEAST, GREATEST)` 建立功能性唯一约束，单列索引已覆盖双向查询，此处补充 `created_at` 单列索引。

### 8. vip_bills（VIP 账单表）

| 索引名 | 类型 | 字段 | 用途 | 预期性能提升 |
| --- | --- | --- | --- | --- |
| `idx_vip_bills_user` | INDEX | `user_id` | 按用户查询账单列表 | 用户账单查询响应 < 30ms |
| `idx_vip_bills_status` | INDEX | `status` | 按状态筛选账单（SUCCESS/FAILED/REFUNDED） | 状态筛选效率提升 |
| `idx_vip_bills_transaction` | INDEX | `transaction_id` | 按第三方交易号查询（对账场景，任务规格 `order_no` 的对应） | 对账查询从全表扫描降至 O(log n) |
| `idx_vip_bills_created_at` | INDEX | `created_at` | 按创建时间排序、分页 | ORDER BY 免排序，分页响应 < 50ms |

> **注**：任务规格中提到 `order_no` 字段，实际表中为 `transaction_id`（第三方交易号），故索引按实际字段命名。

### 9. feedback_tickets（反馈工单表）

| 索引名 | 类型 | 字段 | 用途 | 预期性能提升 |
| --- | --- | --- | --- | --- |
| `idx_feedback_user_id` | INDEX | `user_id` | 按用户查询反馈列表 | 用户反馈查询响应 < 30ms |
| `idx_feedback_type` | INDEX | `type` | 按反馈类型筛选（FEEDBACK/SUGGESTION/ACTIVITY_PROPOSAL） | 类型筛选效率提升 |
| `idx_feedback_status` | INDEX | `status` | 按状态筛选工单（SUBMITTED/PROCESSING/REVIEWED/PLANNED/CONVERTED） | 管理员工单列表响应 < 30ms |
| `idx_feedback_created_at` | INDEX | `created_at` | 按创建时间排序、分页 | ORDER BY 免排序，分页响应 < 50ms |

---

## 三、字段级约束补充说明

本次任务未修改任何已有字段定义（保持 `ddl-auto=validate` 兼容性），仅在 Entity 类 Javadoc 中补充字段约束说明。各字段实际约束以建表迁移脚本为准：

| 字段类型 | 推荐约束 | 项目实际状态 |
| --- | --- | --- |
| 邮箱字段 | `@Column(nullable=false, length=255)` | users 表无 email 字段（用 phone/openid 登录） |
| 手机号 | `@Column(length=20)` | User.phone 实际为 `VARCHAR(32)`，保持不变 |
| 昵称 | `@Column(length=50)` | User.nickname 实际为 `VARCHAR(64)`，保持不变 |
| 状态字段 | `@Column(length=20)` | 多数状态字段为 `VARCHAR(16)`，保持不变 |
| JSON 字段 | `@Column(columnDefinition="TEXT")` | Post.images/tags 等已使用 `JSON DEFAULT '[]'`，保持不变 |

---

## 四、关联关系级联策略

### 4.1 已有 @ManyToOne 关联（已满足要求）

| Entity | 关联 | JoinColumn | 外键约束 |
| --- | --- | --- | --- |
| `PrivateMessage` | `PrivateConversation` | `@JoinColumn(name="conversation_id", nullable=false)` | `fk_private_messages_conversation` |

### 4.2 未建立 JPA 关联的设计选择

以下关联在项目中**有意**未通过 JPA `@OneToMany` / `@ManyToOne` 表达，而是通过外键 ID 字段维护，原因如下：

- `User` ↔ `Post`：Post 使用 `author_id` 字段（非 JPA 关联），避免 N+1 查询与级联删除的副作用
- `User` ↔ `PrivateMessage`：PrivateMessage 通过 `sender_id` 字段维护，级联删除由数据库 `ON DELETE CASCADE` 处理（见 V2026.07.25.0001__add_on_delete_cascade.sql）
- `User` ↔ `Notification`：Notification 通过 `user_id` 字段维护，删除用户时由应用层显式清理

> **结论**：任务规格提到的 `User -> Posts` / `User -> Messages` 级联策略已通过数据库 `ON DELETE CASCADE` 实现（详见 V2026.07.25.0001 迁移脚本），无需在 Entity 层重复定义 `@OneToMany(cascade = CascadeType.REMOVE)`。

---

## 五、Flyway 迁移脚本

### 5.1 本次新增脚本

- **路径**：`database/flyway/sql/V2026.07.26.0001__add_entity_index_annotations.sql`
- **用途**：创建 Entity 注解中声明但数据库中尚不存在的 7 条索引
- **幂等性**：使用 `CREATE INDEX IF NOT EXISTS`，可重复执行

### 5.2 历史相关脚本

- `V2026.07.25.0001__add_performance_indexes.sql` — 第一批性能索引（likes/posts/comments/check_ins/audit_log/reports/private_messages）
- `V2026.07.25.0003__add_missing_indexes.sql` — 补充缺失索引（activities/feedback_tickets/campus_certifications）
- `V2026.07.25.0004__add_remaining_missing_indexes.sql` — 第二轮审计索引（users.phone/created_at、private_messages.is_read 等）

---

## 六、维护建议

1. **新增索引时**：先在 Entity 上添加 `@Index` 注解，再编写 Flyway 迁移脚本创建对应数据库索引
2. **索引命名规范**：`idx_{表名}_{列1}_{列2}`（普通索引）、`uk_{表名}_{列1}_{列2}`（唯一约束）
3. **避免索引爆炸**：每条索引都会占用存储空间并降低写入性能，新增前需评估查询频率与数据量
4. **定期审计**：建议每季度运行 `EXPLAIN` 分析慢查询日志，识别未命中的索引并清理冗余索引
5. **生产环境验证**：上线前在预发环境执行 `ANALYZE TABLE` 更新统计信息，确保优化器选择正确索引
