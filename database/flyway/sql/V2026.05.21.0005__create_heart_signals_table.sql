CREATE TABLE IF NOT EXISTS heart_signals (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_a_id BIGINT UNSIGNED NOT NULL COMMENT '用户A',
    user_b_id BIGINT UNSIGNED NOT NULL COMMENT '用户B',
    status ENUM('pending', 'accepted', 'expired', 'declined') NOT NULL DEFAULT 'pending' COMMENT '状态',
    expires_at DATETIME NOT NULL COMMENT '过期时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_heart_signals_users ((LEAST(user_a_id, user_b_id)), (GREATEST(user_a_id, user_b_id))),
    KEY idx_heart_signals_user_a (user_a_id),
    KEY idx_heart_signals_user_b (user_b_id),
    KEY idx_heart_signals_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='心动信号表';
