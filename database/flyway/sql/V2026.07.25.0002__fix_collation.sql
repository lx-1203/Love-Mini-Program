-- ============================================================
-- 迁移：统一 social_progress 和 daily_benefits 表的 collation
-- ============================================================
-- 背景：
--   social_progress 和 daily_benefits 建表时使用了 utf8mb4_unicode_ci，
--   而项目中其余业务表统一使用 utf8mb4_0900_ai_ci。
--   utf8mb4_0900_ai_ci 是 MySQL 8.0 的默认排序规则，性能更好且排序更准确。
--
-- 变更内容：
--   social_progress → utf8mb4_0900_ai_ci
--   daily_benefits  → utf8mb4_0900_ai_ci
-- ============================================================

-- 1. social_progress 表
ALTER TABLE social_progress
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 2. daily_benefits 表
ALTER TABLE daily_benefits
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
