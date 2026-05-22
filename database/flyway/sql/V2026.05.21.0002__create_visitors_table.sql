CREATE TABLE IF NOT EXISTS visitors (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    visitor_id BIGINT UNSIGNED NOT NULL COMMENT '访客用户ID',
    visited_user_id BIGINT UNSIGNED NOT NULL COMMENT '被访用户ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_visitors_visitor_visited_date (visitor_id, visited_user_id, DATE(created_at)),
    KEY idx_visitors_visited_user (visited_user_id),
    KEY idx_visitors_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='访客记录表';
