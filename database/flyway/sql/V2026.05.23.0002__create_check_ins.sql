CREATE TABLE IF NOT EXISTS check_ins (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '签到用户ID',
    check_in_date DATE NOT NULL COMMENT '签到日期',
    consecutive_days INT NOT NULL DEFAULT 1 COMMENT '连续签到天数',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_checkin_user_date (user_id, check_in_date),
    KEY idx_checkin_user_id (user_id),
    KEY idx_checkin_date (check_in_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户签到记录表';