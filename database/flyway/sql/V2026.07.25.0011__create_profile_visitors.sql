-- ============================================================
-- 功能3：个人主页访客记录表
-- ============================================================
-- 用途：记录用户主页被访问的历史，供"谁看过我"页面展示。
-- 与既有 visitors 表（服务于匹配模块）解耦，避免业务边界混淆。
--
-- 字段说明：
--   id           - 主键，自增
--   visitor_id   - 访客用户 ID
--   host_id      - 被访主页用户 ID
--   visited_at   - 访问时间
--
-- 唯一约束：同一访客对同一主页每天只记录一次访问
--   UNIQUE KEY (visitor_id, host_id, DATE(visited_at))
-- ============================================================

CREATE TABLE IF NOT EXISTS profile_visitors (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    visitor_id BIGINT UNSIGNED NOT NULL COMMENT '访客用户ID',
    host_id BIGINT UNSIGNED NOT NULL COMMENT '被访主页用户ID',
    visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_profile_visitors_visitor_host_date (visitor_id, host_id, (DATE(visited_at))),
    KEY idx_profile_visitors_host (host_id),
    KEY idx_profile_visitors_visited_at (visited_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='个人主页访客记录表';
