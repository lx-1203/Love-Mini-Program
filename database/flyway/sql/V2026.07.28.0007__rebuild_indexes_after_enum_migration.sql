-- ============================================================
-- 迁移：重建被 ENUM→VARCHAR 迁移(DROP COLUMN)连带删除的索引
-- ============================================================
-- 背景：
--   V2026.07.27.0005__enum_to_varchar_check.sql 通过
--   ADD COLUMN x_new → DROP COLUMN x → RENAME 方式把 9 个 ENUM 列转为 VARCHAR。
--   MySQL 的 DROP COLUMN 会**连带删除仅包含该列的索引**（含复合索引），
--   导致以下在 ENUM 迁移之前创建的索引丢失：
--     * likes.status                → idx_likes_status / idx_likes_status_created_at / idx_likes_status_user_created
--     * posts.category              → idx_posts_category（建表时 KEY）
--     * posts.status                → idx_posts_status / idx_posts_status_created_at
--     * heart_signals.status        → idx_heart_signals_status
--     * notifications.type          → idx_notifications_type（建表时 KEY）/ idx_notifications_type_created
--     * activities.status           → idx_activities_status_activity_date
--     * temp_chat_session.phase     → idx_temp_chat_session_phase（建表时 KEY）
--     * user_online_status.status   → idx_user_online_status_updated
--   本迁移通过 information_schema 检查幂等重建上述索引，作为 ENUM 迁移的配套修复。
--
-- 兼容性：
--   * 全新环境：ENUM 迁移先执行（V2026.07.27.0005），本迁移随后执行，索引按需创建
--   * 已修复环境：information_schema 检查保证不重复创建
-- ============================================================

-- 辅助存储过程：为指定表添加索引（幂等，与 V2026.07.28.0005 同模式）
DROP PROCEDURE IF EXISTS add_index_if_missing_enum_fix;
DELIMITER $$
CREATE PROCEDURE add_index_if_missing_enum_fix(
    IN tbl_name VARCHAR(64),
    IN idx_name VARCHAR(64),
    IN col_list VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = tbl_name
          AND index_name = idx_name
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', tbl_name, '` ADD INDEX `', idx_name, '` (', col_list, ')'
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- 1. likes.status 相关索引
CALL add_index_if_missing_enum_fix('likes', 'idx_likes_status', 'status');
CALL add_index_if_missing_enum_fix('likes', 'idx_likes_status_created_at', 'status, created_at');
CALL add_index_if_missing_enum_fix('likes', 'idx_likes_status_user_created', 'status, user_id, created_at');

-- 2. posts.category / posts.status 相关索引
CALL add_index_if_missing_enum_fix('posts', 'idx_posts_category', 'category');
CALL add_index_if_missing_enum_fix('posts', 'idx_posts_status', 'status');
CALL add_index_if_missing_enum_fix('posts', 'idx_posts_status_created_at', 'status, created_at');

-- 3. heart_signals.status 相关索引
CALL add_index_if_missing_enum_fix('heart_signals', 'idx_heart_signals_status', 'status');

-- 4. notifications.type 相关索引
CALL add_index_if_missing_enum_fix('notifications', 'idx_notifications_type', 'type');
CALL add_index_if_missing_enum_fix('notifications', 'idx_notifications_type_created', 'type, created_at');

-- 5. activities.status 相关索引
CALL add_index_if_missing_enum_fix('activities', 'idx_activities_status_activity_date', 'status, activity_date');

-- 6. temp_chat_session.phase 相关索引
CALL add_index_if_missing_enum_fix('temp_chat_session', 'idx_temp_chat_session_phase', 'phase');

-- 7. user_online_status.status 相关索引
CALL add_index_if_missing_enum_fix('user_online_status', 'idx_user_online_status_updated', 'status, updated_at');

-- 清理辅助存储过程（避免污染后续迁移命名空间）
DROP PROCEDURE IF EXISTS add_index_if_missing_enum_fix;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP INDEX idx_likes_status ON likes;
-- DROP INDEX idx_likes_status_created_at ON likes;
-- DROP INDEX idx_likes_status_user_created ON likes;
-- DROP INDEX idx_posts_category ON posts;
-- DROP INDEX idx_posts_status ON posts;
-- DROP INDEX idx_posts_status_created_at ON posts;
-- DROP INDEX idx_heart_signals_status ON heart_signals;
-- DROP INDEX idx_notifications_type ON notifications;
-- DROP INDEX idx_notifications_type_created ON notifications;
-- DROP INDEX idx_activities_status_activity_date ON activities;
-- DROP INDEX idx_temp_chat_session_phase ON temp_chat_session;
-- DROP INDEX idx_user_online_status_updated ON user_online_status;
