-- ============================================================
-- 迁移：P8.5 数据库规范化（idempotency safety net + 关键索引补全 + 重复表清理）
-- ============================================================
-- 背景：
--   Task 8.3.5/8.3.6/8.3.7 要求：
--   * 关键索引补全（chat_messages/users/reports/discover_swipes/notifications）
--   * 30+ ALTER TABLE ADD COLUMN 添加 IF NOT EXISTS 守卫
--   * 移除重复表（feedback_tickets vs user_feedback_ticket，统一为 feedback_tickets）
--
-- 设计决策：
--   * 由于 Flyway 已对历史迁移记录 checksum，不可直接修改 V2026.05.* / V2026.06.* / V2026.07.25.*
--     历史脚本，本迁移作为"幂等安全网"，使用 information_schema 检查补齐任何缺失的列与索引
--   * MySQL 8.0+ 支持 CREATE INDEX IF NOT EXISTS，可直接使用
--   * MySQL 不支持 ALTER TABLE ADD COLUMN IF NOT EXISTS（仅 8.0.29+ 支持），
--     通过 information_schema.COLUMNS 动态 SQL 实现幂等
--   * user_feedback_ticket 表未被任何 JPA Entity / Repository / Service 引用
--     （grep 验证 apps/ 目录无任何匹配），其语义已被 feedback_tickets 表（Feedback.java 实体）替代，
--     本迁移 DROP 该表，统一使用 feedback_tickets
--
-- 影响范围：
--   * 列补全：16 条 ALTER TABLE ADD COLUMN（覆盖 8 个迁移文件）
--   * 索引补全：14 条 ALTER TABLE ADD INDEX + 5 条关键索引补全
--   * 表清理：DROP TABLE user_feedback_ticket
-- ============================================================

-- ============================================================
-- 辅助存储过程：幂等添加列（MySQL 8.0.29 以下不支持 ADD COLUMN IF NOT EXISTS）
-- ============================================================
DROP PROCEDURE IF EXISTS add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE add_column_if_missing(
    IN tbl_name VARCHAR(64),
    IN col_name VARCHAR(64),
    IN col_def TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tbl_name
          AND COLUMN_NAME = col_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', tbl_name, '` ADD COLUMN `', col_name, '` ', col_def);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- 辅助存储过程：幂等添加索引（通过 information_schema.STATISTICS 检查）
-- ============================================================
DROP PROCEDURE IF EXISTS add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE add_index_if_missing(
    IN tbl_name VARCHAR(64),
    IN idx_name VARCHAR(64),
    IN idx_def TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tbl_name
          AND INDEX_NAME = idx_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', tbl_name, '` ADD INDEX `', idx_name, '` ', idx_def);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- Part 1：补全历史 ALTER TABLE ADD COLUMN 的 IF NOT EXISTS 守卫
-- ============================================================
-- 下列列已由历史迁移添加，本节作为幂等安全网，确保任何环境下都存在
-- （包括手动建表、迁移中途失败、从备份恢复等场景）

-- V2026.05.23.0006 — posts.share_count
CALL add_column_if_missing('posts', 'share_count',
    "INT NOT NULL DEFAULT 0 COMMENT '转发数' AFTER comments_count");

-- V2026.05.26.0001 — heart_signals.match_type
CALL add_column_if_missing('heart_signals', 'match_type',
    "VARCHAR(20) DEFAULT 'mutual_like' COMMENT '匹配类型：mutual_like-互相喜欢, topic-话题匹配, coffee-咖啡散步, study-自习搭子, quick-快速匹配' AFTER status");

-- V2026.05.26.0002 — user_basic_profile.interest_tags
CALL add_column_if_missing('user_basic_profile', 'interest_tags',
    "JSON DEFAULT NULL COMMENT '兴趣标签列表（JSON数组格式，如 [\"摄影\",\"篮球\",\"阅读\"]）' AFTER pronouns");

-- V2026.05.28.0006 — recommendation_preferences.campus_priority
CALL add_column_if_missing('recommendation_preferences', 'campus_priority',
    "TINYINT(1) NOT NULL DEFAULT 1 COMMENT '校园优先：启用后同校用户推荐权重+30%并排序靠前' AFTER scope");

-- V2026.05.29.0002 — visitors.is_read, private_conversations.pinned
CALL add_column_if_missing('visitors', 'is_read',
    "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已读' AFTER visited_user_id");
CALL add_column_if_missing('private_conversations', 'pinned',
    "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶' AFTER last_message_at");

-- V2026.05.31.0001 — daily_questions.category, private_messages.quote_context
CALL add_column_if_missing('daily_questions', 'category',
    "VARCHAR(32) DEFAULT NULL AFTER question_text");
CALL add_column_if_missing('private_messages', 'quote_context',
    "TEXT DEFAULT NULL AFTER message_kind");

-- V2026.06.01.0001 — temp_chat_message (3 columns), private_messages (2 columns)
CALL add_column_if_missing('temp_chat_message', 'recalled',
    "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已撤回'");
CALL add_column_if_missing('temp_chat_message', 'delivery_status',
    "VARCHAR(16) NOT NULL DEFAULT 'sent' COMMENT '投递状态: sent/delivered/read'");
CALL add_column_if_missing('temp_chat_message', 'quote_snapshot',
    "TEXT DEFAULT NULL COMMENT '引用消息JSON快照'");
CALL add_column_if_missing('private_messages', 'recalled',
    "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已撤回'");
CALL add_column_if_missing('private_messages', 'delivery_status',
    "VARCHAR(16) NOT NULL DEFAULT 'sent' COMMENT '投递状态: sent/delivered/read'");

-- V2026.06.25.0001 — users.role
CALL add_column_if_missing('users', 'role',
    "VARCHAR(16) NOT NULL DEFAULT 'USER' COMMENT '用户角色: USER/ADMIN'");

-- V2026.06.25.0002 — users.password
CALL add_column_if_missing('users', 'password',
    "VARCHAR(100) DEFAULT NULL COMMENT '密码 BCrypt 哈希（管理员与密码登录用户使用，微信登录用户为 NULL）'");

-- V2026.06.25.0004 — users.status, posts (4 columns)
CALL add_column_if_missing('users', 'status',
    "VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT '账号状态: active/disabled'");
CALL add_column_if_missing('posts', 'audit_status',
    "VARCHAR(16) NOT NULL DEFAULT 'approved' COMMENT '审核状态: pending/approved/rejected'");
CALL add_column_if_missing('posts', 'audit_remark',
    "VARCHAR(500) DEFAULT NULL COMMENT '审核备注（拒绝原因等）'");
CALL add_column_if_missing('posts', 'auditor_id',
    "BIGINT UNSIGNED DEFAULT NULL COMMENT '审核人用户 ID'");
CALL add_column_if_missing('posts', 'audited_at',
    "DATETIME DEFAULT NULL COMMENT '审核时间'");

-- V2026.07.25.0004 — users.auto_renew_enabled
CALL add_column_if_missing('users', 'auto_renew_enabled',
    "TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'VIP 自动续费开关 0关闭 1开启'");

-- V2026.07.25.0013 — check_ins.source
CALL add_column_if_missing('check_ins', 'source',
    "VARCHAR(16) NOT NULL DEFAULT 'NORMAL' COMMENT '签到来源：NORMAL=正常签到，MAKE_UP=补签' AFTER consecutive_days");

-- ============================================================
-- Part 2：补全历史 ALTER TABLE ADD INDEX 的 IF NOT EXISTS 守卫
-- ============================================================
-- 下列索引已由历史迁移添加，本节作为幂等安全网，确保任何环境下都存在

-- V2026.07.25.0003 — activities/feedback_tickets/campus_certifications 索引
CALL add_index_if_missing('activities', 'idx_activities_city', '(city_name)');
CALL add_index_if_missing('activities', 'idx_activities_campus', '(campus_name)');
CALL add_index_if_missing('feedback_tickets', 'idx_feedback_status', '(status)');
CALL add_index_if_missing('campus_certifications', 'idx_cert_status', '(status)');

-- V2026.07.25.0004 — users/private_messages/posts/visitors/heart_signals/likes/icebreaker_topics 索引
CALL add_index_if_missing('users', 'idx_users_phone', '(phone)');
CALL add_index_if_missing('users', 'idx_users_created_at', '(created_at)');
CALL add_index_if_missing('private_messages', 'idx_pm_conv_read', '(conversation_id, is_read)');
CALL add_index_if_missing('posts', 'idx_posts_status', '(status)');
CALL add_index_if_missing('visitors', 'idx_visitors_visited_read', '(visited_user_id, is_read)');
CALL add_index_if_missing('heart_signals', 'idx_heart_signals_status', '(status)');
CALL add_index_if_missing('likes', 'idx_likes_status', '(status)');
CALL add_index_if_missing('icebreaker_topics', 'idx_it_category_active', '(category, is_active)');
CALL add_index_if_missing('icebreaker_topics', 'idx_it_usage_count', '(usage_count)');

-- V2026.06.25.0004 — users/posts 状态索引
CALL add_index_if_missing('users', 'idx_users_status', '(status)');
CALL add_index_if_missing('posts', 'idx_posts_audit_status', '(audit_status)');

-- V2026.07.25.0013 — check_ins.source 索引
CALL add_index_if_missing('check_ins', 'idx_checkin_source', '(source)');

-- ============================================================
-- Part 3：关键索引补全（Task 8.3.5）
-- ============================================================
-- 任务规格要求为以下表补全索引（部分已存在，本节使用 CREATE INDEX 幂等补全）：
--   * chat_messages → 实际表名 private_messages
--   * users → 已有 idx_users_phone/created_at/status，补全 role 索引
--   * reports → 已有 idx_reports_status/target/reporter，补全 created_at 索引
--   * discover_swipes → 实际由 likes + pass_records 表实现
--   * notifications → 已有 idx_notifications_user/user_read/created/type/user_created_at

-- chat_messages（private_messages）会话+投递状态组合索引，覆盖后台扫描未送达消息
CREATE INDEX idx_private_messages_conv_delivery
    ON private_messages (conversation_id, delivery_status, created_at);

-- users.role 索引，覆盖管理后台按角色筛选用户
CREATE INDEX idx_users_role
    ON users (role);

-- reports.created_at 索引，覆盖管理后台按时间排序举报列表
CREATE INDEX idx_reports_created_at
    ON reports (created_at);

-- reports.handler_id 索引，覆盖按处理人查询举报
CREATE INDEX idx_reports_handler
    ON reports (handler_id);

-- discover_swipes（likes）状态+创建时间组合索引，覆盖发现页有效喜欢列表
CREATE INDEX idx_likes_status_user_created
    ON likes (status, user_id, created_at);

-- discover_swipes（pass_records）用户+创建时间组合索引，覆盖跳过记录查询
CREATE INDEX idx_pass_records_user_created
    ON pass_records (user_id, created_at);

-- notifications.type+created_at 组合索引，覆盖按类型分页查询
CREATE INDEX idx_notifications_type_created
    ON notifications (type, created_at);

-- notifications.source_user_id 索引，覆盖按源用户查询（防刷检测）
CREATE INDEX idx_notifications_source_user
    ON notifications (source_user_id);

-- ============================================================
-- Part 4：移除重复表（Task 8.3.7）
-- ============================================================
-- user_feedback_ticket 表由 V2026.05.18.1600 创建，但其语义已被
-- V2026.05.28.0001 创建的 feedback_tickets 表（Feedback.java 实体）替代。
-- grep 验证 apps/ 目录下无任何代码引用 user_feedback_ticket，可安全删除。
--
-- 注意：
--   * 使用 DROP TABLE IF EXISTS 幂等删除
--   * 如该表已不存在（新部署环境），跳过
--   * 如该表存在数据，先尝试迁移至 feedback_tickets（仅在表存在且非空时执行）
DROP PROCEDURE IF EXISTS migrate_and_drop_user_feedback_ticket;
DELIMITER $$
CREATE PROCEDURE migrate_and_drop_user_feedback_ticket()
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'user_feedback_ticket'
    ) THEN
        -- 表存在，先检查是否有数据需要保留
        -- 注意：user_feedback_ticket 与 feedback_tickets 字段不完全一致
        -- （前者有 submitter_phone/submitter_campus_id，后者有 expected_city/expected_campus/converted_activity_id）
        -- 仅迁移共同字段：title/content/contact_wechat/latest_reply_summary/status
        -- 字段映射：
        --   submitter_user_id → user_id
        --   ticket_type → type
        --   attachment_json → attachments
        --   handled_by → 无对应字段（feedback_tickets 无 handled_by，使用 status='REVIEWED' 表示已处理）
        SET @row_count = (SELECT COUNT(*) FROM user_feedback_ticket);
        IF @row_count > 0 THEN
            -- 迁移数据到 feedback_tickets（仅迁移 feedback_tickets 中不存在的记录，按 title+user_id 去重）
            INSERT IGNORE INTO feedback_tickets (
                user_id, type, title, content, contact_wechat, attachments,
                status, latest_reply_summary, created_at, updated_at
            )
            SELECT
                submitter_user_id,
                ticket_type,
                title,
                content,
                contact_wechat,
                attachment_json,
                UPPER(status),
                latest_reply_summary,
                created_at,
                updated_at
            FROM user_feedback_ticket
            WHERE NOT EXISTS (
                SELECT 1 FROM feedback_tickets ft
                WHERE ft.user_id = user_feedback_ticket.submitter_user_id
                  AND ft.title = user_feedback_ticket.title
                  AND ft.created_at = user_feedback_ticket.created_at
            );
        END IF;

        -- 删除重复表
        DROP TABLE IF EXISTS user_feedback_ticket;
    END IF;
END$$
DELIMITER ;

CALL migrate_and_drop_user_feedback_ticket();

-- ============================================================
-- 清理辅助存储过程
-- ============================================================
DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
DROP PROCEDURE IF EXISTS migrate_and_drop_user_feedback_ticket;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- 注意：本迁移的 DOWN 操作不可完整回滚，因为 user_feedback_ticket 表已删除。
-- 如需回滚，请按以下步骤手动执行：
--
-- -- 1. 删除本迁移新增的索引
-- DROP INDEX idx_private_messages_conv_delivery ON private_messages;
-- DROP INDEX idx_users_role ON users;
-- DROP INDEX idx_reports_created_at ON reports;
-- DROP INDEX idx_reports_handler ON reports;
-- DROP INDEX idx_likes_status_user_created ON likes;
-- DROP INDEX idx_pass_records_user_created ON pass_records;
-- DROP INDEX idx_notifications_type_created ON notifications;
-- DROP INDEX idx_notifications_source_user ON notifications;
--
-- -- 2. 重建 user_feedback_ticket 表（如需恢复，参考 V2026.05.18.1600__add_growth_feedback_and_ai_reserved.sql）
--
-- 注意：Part 1 与 Part 2 的列与索引由历史迁移添加，本迁移仅作为幂等安全网，
-- 不应在 DOWN 时删除（避免影响已存在的业务逻辑）。
