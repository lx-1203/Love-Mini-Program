-- ============================================================
-- 迁移：为 user 相关外键添加 ON DELETE CASCADE
-- ============================================================
-- 背景：
--   users 表的外键关联较多，但原有的 FOREIGN KEY 未设置 ON DELETE 行为，
--   导致删除用户时需要手动处理关联数据或在应用层做级联处理。
--   本次迁移为所有 users 相关外键统一添加 ON DELETE CASCADE，
--   确保用户删除时关联数据同步清理，避免孤儿数据。
--
-- 影响范围（10 个外键）：
--   1. social_progress.user_id → users(id)
--   2. campus_topics.author_id → users(id)
--   3. campus_topic_replies.author_id → users(id)
--   4. campus_certifications.user_id → users(id)
--   5. campus_certifications.reviewer_id → users(id)
--   6. push_preferences.user_id → users(id)
--   7. push_summaries.user_id → users(id)
--   8. user_online_status.user_id → users(id)
--   9. interaction_events.user_id → users(id)
--  10. interaction_events.trigger_user_id → users(id)
-- ============================================================

-- 辅助存储过程：动态删除指定列上的外键约束
-- 原因：原始建表语句未显式命名外键，需通过 information_schema 查询实际约束名
DROP PROCEDURE IF EXISTS drop_fk_by_column;
DELIMITER //

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
END //

DELIMITER ;

-- ============================================================
-- 1. social_progress.user_id → users(id)
-- ============================================================
CALL drop_fk_by_column('social_progress', 'user_id', 'users');
ALTER TABLE social_progress
    ADD CONSTRAINT fk_social_progress_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 2. campus_topics.author_id → users(id)
-- ============================================================
CALL drop_fk_by_column('campus_topics', 'author_id', 'users');
ALTER TABLE campus_topics
    ADD CONSTRAINT fk_campus_topics_author
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 3. campus_topic_replies.author_id → users(id)
-- ============================================================
CALL drop_fk_by_column('campus_topic_replies', 'author_id', 'users');
ALTER TABLE campus_topic_replies
    ADD CONSTRAINT fk_campus_topic_replies_author
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 4. campus_certifications.user_id → users(id)
-- ============================================================
CALL drop_fk_by_column('campus_certifications', 'user_id', 'users');
ALTER TABLE campus_certifications
    ADD CONSTRAINT fk_campus_certifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 5. campus_certifications.reviewer_id → users(id)
-- ============================================================
CALL drop_fk_by_column('campus_certifications', 'reviewer_id', 'users');
ALTER TABLE campus_certifications
    ADD CONSTRAINT fk_campus_certifications_reviewer
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 6. push_preferences.user_id → users(id)
-- ============================================================
CALL drop_fk_by_column('push_preferences', 'user_id', 'users');
ALTER TABLE push_preferences
    ADD CONSTRAINT fk_push_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 7. push_summaries.user_id → users(id)
-- ============================================================
CALL drop_fk_by_column('push_summaries', 'user_id', 'users');
ALTER TABLE push_summaries
    ADD CONSTRAINT fk_push_summaries_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 8. user_online_status.user_id → users(id)
-- ============================================================
CALL drop_fk_by_column('user_online_status', 'user_id', 'users');
ALTER TABLE user_online_status
    ADD CONSTRAINT fk_user_online_status_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 9. interaction_events.user_id → users(id)
-- ============================================================
CALL drop_fk_by_column('interaction_events', 'user_id', 'users');
ALTER TABLE interaction_events
    ADD CONSTRAINT fk_interaction_events_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 10. interaction_events.trigger_user_id → users(id)
-- ============================================================
CALL drop_fk_by_column('interaction_events', 'trigger_user_id', 'users');
ALTER TABLE interaction_events
    ADD CONSTRAINT fk_interaction_events_trigger_user
        FOREIGN KEY (trigger_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 清理辅助存储过程
-- ============================================================
DROP PROCEDURE IF EXISTS drop_fk_by_column;
