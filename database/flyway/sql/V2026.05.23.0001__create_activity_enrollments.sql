CREATE TABLE IF NOT EXISTS activity_enrollments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    activity_id BIGINT UNSIGNED NOT NULL COMMENT '活动ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '报名用户ID',
    enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_enrollment_activity_user (activity_id, user_id),
    KEY idx_enrollment_user_id (user_id),
    KEY idx_enrollment_activity_id (activity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='活动报名记录表';