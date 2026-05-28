-- Flyway migration: Create push system tables
-- 推送偏好表 + 推送摘要表，支持社交动态摘要推送和推荐刷新通知

CREATE TABLE IF NOT EXISTS push_preferences (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_frequency INT NOT NULL DEFAULT 1 COMMENT '每日最大推送次数',
    active_hours VARCHAR(50) COMMENT '活跃时段,如 10-12,14-16,20-22',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='推送偏好设置表';

CREATE TABLE IF NOT EXISTS push_summaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    summary_type VARCHAR(50) NOT NULL COMMENT 'social_digest/recommend_refresh',
    title VARCHAR(200) NOT NULL,
    content TEXT,
    action_url VARCHAR(500) COMMENT '点击跳转路径',
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    INDEX idx_user_sent (user_id, is_sent),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='推送摘要记录表';