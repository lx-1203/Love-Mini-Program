-- ============================================================
-- 迁移：数据一致性基础设施（Task 2.1）
-- ============================================================
-- 背景：
--   Task 2.1 要求为所有 JPA Entity 添加 @Version 乐观锁字段，
--   对应数据库层需要为所有业务表新增 version 列（BIGINT DEFAULT 0）。
--   同时补齐关键表的唯一约束与外键约束，保证数据完整性。
--
-- 子任务对应：
--   * Task 2.1.2：所有业务表添加 version 列（65 张表，幂等）
--   * Task 2.1.3：likes(user_id, target_user_id) 唯一约束（已存在则跳过）
--   * Task 2.1.4：users.openid 唯一约束（V0002 已完成，本脚本不重复）
--   * Task 2.1.5：关键表外键约束
--     - private_messages.sender_id → users(id)
--     - likes.user_id / target_user_id → users(id)
--     - pass_records.user_id / passed_user_id → users(id)
--     - reports.reporter_id / handler_id → users(id)
--     - notifications.user_id / source_user_id → users(id)
--
-- 实现说明：
--   * MySQL 不支持 ALTER TABLE ADD COLUMN IF NOT EXISTS（仅 8.0.29+ 支持），
--     通过 information_schema.COLUMNS 查询判断列是否存在，保证幂等
--   * MySQL 不支持 ALTER TABLE ADD UNIQUE INDEX IF NOT EXISTS，
--     通过 information_schema.STATISTICS 查询判断约束是否存在
--   * 外键约束通过 information_schema.KEY_COLUMN_USAGE 查询判断是否存在
--   * 约束命名与 Entity @UniqueConstraint / @ForeignKey 保持一致
--   * 所有 ALTER 操作在事务外执行（DDL 隐式提交），单条失败不影响后续
-- ============================================================

-- ============================================================
-- 辅助存储过程：为指定表添加 version 列（幂等）
-- ============================================================
DROP PROCEDURE IF EXISTS add_version_column_if_missing;
DELIMITER $$
CREATE PROCEDURE add_version_column_if_missing(
    IN tbl_name VARCHAR(64)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = tbl_name
          AND column_name = 'version'
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', tbl_name, '` ',
            'ADD COLUMN version BIGINT NOT NULL DEFAULT 0 COMMENT ''乐观锁版本号（Task 2.1.1）'''
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- Task 2.1.2：为所有业务表添加 version 列
-- ============================================================
-- 列表来源：apps/api/src/main/java/com/campuslove/api/entity/*.java 的 @Table 注解
-- 共 65 张表，与 65 个 JPA Entity 一一对应

-- 用户与资料相关（5）
CALL add_version_column_if_missing('users');
CALL add_version_column_if_missing('user_basic_profile');
CALL add_version_column_if_missing('user_campus_profile');
CALL add_version_column_if_missing('user_schedule_profile');
CALL add_version_column_if_missing('user_online_status');

-- 会话与登录（2）
CALL add_version_column_if_missing('user_sessions');
CALL add_version_column_if_missing('third_party_account');

-- 推荐与匹配（4）
CALL add_version_column_if_missing('recommendation_preferences');
CALL add_version_column_if_missing('recommend_strategy');
CALL add_version_column_if_missing('match_config');
CALL add_version_column_if_missing('pass_records');

-- 喜欢与心动（2）
CALL add_version_column_if_missing('likes');
CALL add_version_column_if_missing('heart_signals');

-- 社交关系（3）
CALL add_version_column_if_missing('user_follows');
CALL add_version_column_if_missing('visitors');
CALL add_version_column_if_missing('profile_visitors');

-- 帖子与圈子（10）
CALL add_version_column_if_missing('posts');
CALL add_version_column_if_missing('post_categories');
CALL add_version_column_if_missing('post_tags');
CALL add_version_column_if_missing('post_likes');
CALL add_version_column_if_missing('post_shares');
CALL add_version_column_if_missing('comments');
CALL add_version_column_if_missing('interest_circles');
CALL add_version_column_if_missing('circle_topics');
CALL add_version_column_if_missing('circle_replies');
CALL add_version_column_if_missing('circle_memberships');

-- 校园话题与认证（3）
CALL add_version_column_if_missing('campus_topics');
CALL add_version_column_if_missing('campus_topic_replies');
CALL add_version_column_if_missing('campus_certifications');

-- 私信与会话（3）
CALL add_version_column_if_missing('private_conversations');
CALL add_version_column_if_missing('private_messages');
CALL add_version_column_if_missing('temp_chat_session');
CALL add_version_column_if_missing('temp_chat_message');
CALL add_version_column_if_missing('temp_chat_contact_exchange');

-- 通知与推送（4）
CALL add_version_column_if_missing('notifications');
CALL add_version_column_if_missing('notify_config');
CALL add_version_column_if_missing('push_preferences');
CALL add_version_column_if_missing('push_summaries');

-- 互动事件与访客（2）
CALL add_version_column_if_missing('interaction_events');
CALL add_version_column_if_missing('social_progress');

-- 举报与反馈（2）
CALL add_version_column_if_missing('reports');
CALL add_version_column_if_missing('feedback_tickets');

-- 每日福利与签到（4）
CALL add_version_column_if_missing('check_ins');
CALL add_version_column_if_missing('make_up_quota');
CALL add_version_column_if_missing('daily_questions');
CALL add_version_column_if_missing('daily_answers');
CALL add_version_column_if_missing('daily_benefits');

-- 活动相关（2）
CALL add_version_column_if_missing('activities');
CALL add_version_column_if_missing('activity_enrollments');

-- 破冰话题（1）
CALL add_version_column_if_missing('icebreaker_topics');

-- VIP 与营销（6）
CALL add_version_column_if_missing('vip_bills');
CALL add_version_column_if_missing('vip_red_packets');
CALL add_version_column_if_missing('vip_red_packet_claims');
CALL add_version_column_if_missing('promo_codes');
CALL add_version_column_if_missing('promo_code_usages');

-- 视频通话（2）
CALL add_version_column_if_missing('video_calls');
CALL add_version_column_if_missing('video_call_records');

-- 媒体资源（1）
CALL add_version_column_if_missing('media_asset');

-- 管理后台配置（5）
CALL add_version_column_if_missing('app_config');
CALL add_version_column_if_missing('app_switch');
CALL add_version_column_if_missing('app_rule');
CALL add_version_column_if_missing('app_login_hero_config');
CALL add_version_column_if_missing('audit_log');

-- 敏感词与勿扰（2）
CALL add_version_column_if_missing('sensitive_word');
CALL add_version_column_if_missing('dnd_settings');

-- 清理辅助存储过程
DROP PROCEDURE IF EXISTS add_version_column_if_missing;

-- ============================================================
-- Task 2.1.3：likes(user_id, target_user_id) 唯一约束
-- ============================================================
-- 背景：
--   V2026.05.21.0001__create_likes_table.sql 建表时已声明
--   UNIQUE KEY uk_likes_user_target (user_id, target_user_id)，
--   但历史环境可能因手工运维或表结构迁移导致约束缺失。
--   本脚本作为 Task 2.1.3 的幂等保护，缺失时补齐。
--
-- 注意：
--   * 唯一约束保证同一用户对同一目标只能有一条有效记录，
--     防止并发插入产生重复 likes 数据
--   * 若已存在同名约束但列不同，本脚本不处理（应由 DBA 人工介入）
DROP PROCEDURE IF EXISTS add_likes_unique_constraint;
DELIMITER $$
CREATE PROCEDURE add_likes_unique_constraint()
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = 'likes'
          AND index_name = 'uk_likes_user_target'
    ) THEN
        ALTER TABLE likes ADD UNIQUE INDEX uk_likes_user_target (user_id, target_user_id);
    END IF;
END$$
DELIMITER ;

CALL add_likes_unique_constraint();
DROP PROCEDURE IF EXISTS add_likes_unique_constraint;

-- ============================================================
-- Task 2.1.5：关键表外键约束
-- ============================================================
-- 辅助存储过程：动态删除指定列上的外键约束（用于幂等替换）
DROP PROCEDURE IF EXISTS drop_fk_by_column;
DELIMITER $$
CREATE PROCEDURE drop_fk_by_column(
    IN tbl_name VARCHAR(64),
    IN col_name VARCHAR(64),
    IN ref_table VARCHAR(64)
)
BEGIN
    DECLARE fk_name VARCHAR(64);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tbl_name
          AND COLUMN_NAME = col_name
          AND REFERENCED_TABLE_NAME = ref_table
          AND REFERENCED_TABLE_SCHEMA = DATABASE();
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;
    FETCH cur INTO fk_name;
    IF NOT done AND fk_name IS NOT NULL THEN
        SET @drop_sql = CONCAT('ALTER TABLE `', tbl_name, '` DROP FOREIGN KEY `', fk_name, '`');
        PREPARE stmt FROM @drop_sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
    CLOSE cur;
END$$
DELIMITER ;

-- 辅助存储过程：为指定表/列添加外键（若不存在则添加）
DROP PROCEDURE IF EXISTS add_fk_if_missing;
DELIMITER $$
CREATE PROCEDURE add_fk_if_missing(
    IN tbl_name VARCHAR(64),
    IN col_name VARCHAR(64),
    IN ref_table VARCHAR(64),
    IN fk_name VARCHAR(64),
    IN on_delete_action VARCHAR(16)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tbl_name
          AND COLUMN_NAME = col_name
          AND REFERENCED_TABLE_NAME = ref_table
          AND CONSTRAINT_NAME = fk_name
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', tbl_name, '` ADD CONSTRAINT `', fk_name, '` ',
            'FOREIGN KEY (`', col_name, '`) REFERENCES `', ref_table, '`(id) ',
            'ON DELETE ', on_delete_action
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- 1. private_messages.sender_id → users(id)
-- ============================================================
-- 已有 fk_private_messages_conversation 指向 private_conversations(id)
-- 这里补 sender_id 指向 users(id)，ON DELETE CASCADE 保证发送人删除时消息级联清理
CALL add_fk_if_missing('private_messages', 'sender_id', 'users', 'fk_private_messages_sender', 'CASCADE');

-- ============================================================
-- 2. likes.user_id → users(id)（Task 2.1.5 discover_swipes 对应表）
-- ============================================================
CALL add_fk_if_missing('likes', 'user_id', 'users', 'fk_likes_user', 'CASCADE');

-- ============================================================
-- 3. likes.target_user_id → users(id)
-- ============================================================
CALL add_fk_if_missing('likes', 'target_user_id', 'users', 'fk_likes_target_user', 'CASCADE');

-- ============================================================
-- 4. pass_records.user_id → users(id)（Task 2.1.5 discover_swipes 对应表）
-- ============================================================
CALL add_fk_if_missing('pass_records', 'user_id', 'users', 'fk_pass_records_user', 'CASCADE');

-- ============================================================
-- 5. pass_records.passed_user_id → users(id)
-- ============================================================
CALL add_fk_if_missing('pass_records', 'passed_user_id', 'users', 'fk_pass_records_passed_user', 'CASCADE');

-- ============================================================
-- 6. reports.reporter_id → users(id)
-- ============================================================
-- 举报人删除时，举报记录级联清理（避免孤儿数据影响统计）
CALL add_fk_if_missing('reports', 'reporter_id', 'users', 'fk_reports_reporter', 'CASCADE');

-- ============================================================
-- 7. reports.handler_id → users(id)
-- ============================================================
-- 处理人（管理员）可能为 null，未处理时不约束；管理员删除时 SET NULL 保留举报历史
-- 注意：handler_id 列必须允许 NULL，否则 SET NULL 报错
CALL add_fk_if_missing('reports', 'handler_id', 'users', 'fk_reports_handler', 'SET NULL');

-- ============================================================
-- 8. notifications.user_id → users(id)
-- ============================================================
-- 通知接收者删除时，通知记录级联清理
CALL add_fk_if_missing('notifications', 'user_id', 'users', 'fk_notifications_user', 'CASCADE');

-- ============================================================
-- 9. notifications.source_user_id → users(id)
-- ============================================================
-- 触发通知的源用户删除时，通知保留但源用户置 NULL（历史通知仍可查询）
CALL add_fk_if_missing('notifications', 'source_user_id', 'users', 'fk_notifications_source_user', 'SET NULL');

-- 清理辅助存储过程
DROP PROCEDURE IF EXISTS drop_fk_by_column;
DROP PROCEDURE IF EXISTS add_fk_if_missing;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- 回滚 version 列（按表反向删除）：
--   ALTER TABLE users DROP COLUMN version;
--   ALTER TABLE user_basic_profile DROP COLUMN version;
--   ... (其余 63 张表同上)
--
-- 回滚唯一约束：
--   ALTER TABLE likes DROP INDEX uk_likes_user_target;
--
-- 回滚外键约束：
--   ALTER TABLE private_messages DROP FOREIGN KEY fk_private_messages_sender;
--   ALTER TABLE likes DROP FOREIGN KEY fk_likes_user;
--   ALTER TABLE likes DROP FOREIGN KEY fk_likes_target_user;
--   ALTER TABLE pass_records DROP FOREIGN KEY fk_pass_records_user;
--   ALTER TABLE pass_records DROP FOREIGN KEY fk_pass_records_passed_user;
--   ALTER TABLE reports DROP FOREIGN KEY fk_reports_reporter;
--   ALTER TABLE reports DROP FOREIGN KEY fk_reports_handler;
--   ALTER TABLE notifications DROP FOREIGN KEY fk_notifications_user;
--   ALTER TABLE notifications DROP FOREIGN KEY fk_notifications_source_user;
