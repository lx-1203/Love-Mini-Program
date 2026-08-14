-- ============================================================
-- 迁移：搜索词记录表（热搜聚合）
-- ============================================================
-- 背景：
--   C 端帖子搜索上线后记录搜索词，供热搜榜聚合（贴吧式热搜）。
--   防刷设计：uk_search_query_day 按 (user_id, keyword, search_date) 去重，
--   同一用户同一天反复搜同一词只计一次；is_removed 供运营下架热搜词
--   （软删防复现，后台可恢复）。
-- ============================================================

CREATE TABLE search_queries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(50) NOT NULL COMMENT '搜索关键词（trim 后，≤50 字符）',
    search_date DATE NOT NULL COMMENT '搜索日期（本地业务日）',
    user_id BIGINT NOT NULL COMMENT '搜索用户 ID',
    search_count INT NOT NULL DEFAULT 1 COMMENT '当日搜索次数（防刷：同人同词同日仅 1）',
    is_removed TINYINT(1) NOT NULL DEFAULT 0 COMMENT '热搜下架（1=不进入热搜榜，后台可恢复）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_search_query_day (user_id, keyword, search_date),
    KEY idx_search_queries_keyword_date (keyword, search_date),
    KEY idx_search_queries_date (search_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='搜索词记录（热搜聚合，按人/词/天去重防刷）';
