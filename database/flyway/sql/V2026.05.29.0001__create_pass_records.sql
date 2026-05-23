-- 创建左滑(pass)记录表
-- 记录用户执行左滑（跳过）操作的历史，用于推荐算法排除已跳过的用户
CREATE TABLE IF NOT EXISTS pass_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '执行pass的用户ID',
    passed_user_id BIGINT UNSIGNED NOT NULL COMMENT '被pass的用户ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_pass_records_user_passed (user_id, passed_user_id),
    KEY idx_pass_records_user_id (user_id),
    KEY idx_pass_records_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='左滑(pass)记录表';
