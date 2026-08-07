-- ============================================================
-- 迁移：活动上下架支持（activities.published）
-- ============================================================
-- 背景：
--   Activity.status 仅表示活动进行阶段（upcoming/ongoing/ended），
--   无上下架语义。本次新增 published 字段（BOOLEAN DEFAULT TRUE）：
--     - TRUE  已上架：小程序端活动列表可见
--     - FALSE 已下架：小程序端活动列表不可见，已报名用户仍可查看详情
--   默认 TRUE 保证现有活动向后兼容（全部保持可见）。
--
-- 幂等性：information_schema 检查列存在性后 ADD COLUMN，可安全重跑。
-- ============================================================

SET @has_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'activities'
      AND COLUMN_NAME = 'published'
);

SET @sql := IF(
    @has_col = 0,
    'ALTER TABLE activities ADD COLUMN published TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''是否上架（1=上架，0=下架，默认上架保持向后兼容）'' AFTER status',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 补充索引：按上架状态过滤活动（下架活动不可见）
SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'activities'
      AND INDEX_NAME = 'idx_activities_published'
);
SET @sql_idx := IF(
    @has_idx = 0,
    'ALTER TABLE activities ADD INDEX idx_activities_published (published)',
    'SELECT 1'
);
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- ALTER TABLE activities DROP INDEX idx_activities_published;
-- ALTER TABLE activities DROP COLUMN published;
