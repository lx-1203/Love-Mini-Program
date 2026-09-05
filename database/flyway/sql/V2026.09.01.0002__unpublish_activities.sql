-- ============================================================
-- V2026.09.01.0002: 活动下架——仅保留 1 条测试活动
-- ============================================================
-- 下架除最小 ID 外的所有活动（保留 1 条测试活动用于开发验证）。
-- 幂等：重复执行影响行数为 0（已下架的行 published 不变）。
-- 兼容性：MySQL 8 不允许 UPDATE 目标表出现在 FROM 子查询中（1093），
-- 使用派生表（derived table）包装子查询规避。
-- ============================================================

UPDATE activities
   SET published = false, updated_at = NOW()
 WHERE id NOT IN (
       SELECT min_id FROM (
           SELECT MIN(id) AS min_id FROM activities
       ) AS t
 );
