-- 话题点赞通知 + 通知引用类型扩展（2026-10-28）
-- 1) notifications.type 增加 topic_like
SET @drop_topic_like_type_check = (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'notifications'
              AND CONSTRAINT_NAME = 'chk_notifications_type'
              AND CONSTRAINT_TYPE = 'CHECK'
        ),
        'ALTER TABLE notifications DROP CHECK chk_notifications_type',
        'SELECT 1'
    )
);
PREPARE stmt_drop_topic_like_type_check FROM @drop_topic_like_type_check;
EXECUTE stmt_drop_topic_like_type_check;
DEALLOCATE PREPARE stmt_drop_topic_like_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_type
    CHECK (type IN ('follow','like','comment','visitor','match','system','unmatch','mention','topic_like'));

-- 2) notifications.reference_type 增加 topic（话题）
SET @drop_topic_reference_check = (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'notifications'
              AND CONSTRAINT_NAME = 'chk_notifications_reference_type'
              AND CONSTRAINT_TYPE = 'CHECK'
        ),
        'ALTER TABLE notifications DROP CHECK chk_notifications_reference_type',
        'SELECT 1'
    )
);
PREPARE stmt_drop_topic_reference_check FROM @drop_topic_reference_check;
EXECUTE stmt_drop_topic_reference_check;
DEALLOCATE PREPARE stmt_drop_topic_reference_check;

ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_reference_type
    CHECK (reference_type IS NULL OR reference_type IN ('post','comment','user','topic'));

-- 3) 话题点赞通知去重：取消再赞不重复打扰（与点赞关系解耦，取消点赞不删本表）
CREATE TABLE IF NOT EXISTS circle_topic_like_notices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    topic_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_circle_topic_like_notices_topic_user (topic_id, user_id),
    KEY idx_circle_topic_like_notices_user (user_id, created_at),
    CONSTRAINT fk_circle_topic_like_notices_topic FOREIGN KEY (topic_id)
        REFERENCES circle_topics (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='话题点赞通知去重';
