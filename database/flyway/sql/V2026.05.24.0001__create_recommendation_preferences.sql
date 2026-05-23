CREATE TABLE IF NOT EXISTS recommendation_preferences (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    preferred_time VARCHAR(8) NOT NULL DEFAULT '12:00' COMMENT '推荐时间偏好',
    scope VARCHAR(32) NOT NULL DEFAULT 'campus_first' COMMENT '推荐范围: campus_first/city/unlimited',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_recommendation_preferences_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='推荐偏好设置表';
