-- 互动通知表
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '通知接收者用户ID',
    type ENUM('follow', 'like', 'comment', 'visitor', 'match') NOT NULL COMMENT '通知类型',
    source_user_id BIGINT UNSIGNED NOT NULL COMMENT '触发通知的源用户ID',
    reference_id BIGINT UNSIGNED DEFAULT NULL COMMENT '关联实体ID(帖子/评论/用户等)',
    reference_type ENUM('post', 'comment', 'user') DEFAULT NULL COMMENT '关联实体类型',
    is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已读(0=未读,1=已读)',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notifications_user (user_id),
    KEY idx_notifications_user_read (user_id, is_read),
    KEY idx_notifications_created (created_at),
    KEY idx_notifications_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='互动通知表';