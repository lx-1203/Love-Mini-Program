CREATE TABLE IF NOT EXISTS likes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '发起喜欢的用户ID',
    target_user_id BIGINT UNSIGNED NOT NULL COMMENT '被喜欢的用户ID',
    status ENUM('active', 'cancelled') NOT NULL DEFAULT 'active' COMMENT '状态',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_likes_user_target (user_id, target_user_id),
    KEY idx_likes_target_user (target_user_id),
    KEY idx_likes_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户喜欢记录表';
