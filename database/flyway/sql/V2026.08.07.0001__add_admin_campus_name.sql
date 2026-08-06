-- ============================================================
-- 迁移：高校管理员支持（商业模式：每个高校一个管理员）
-- ============================================================
-- 背景：
--   管理员统一在 users 表中以 role = 'ADMIN' / 'SUPER_ADMIN' 标识，
--   无独立 admin 表。本次为校园（校区）管理员引入管辖范围字段：
--
--   campus_name VARCHAR(128) NULL
--     - NULL        = 全局管理员（默认，现有管理员不受影响）
--     - 非空校区名  = 该校区管理员，仅能管理该校区用户/内容
--
--   校区名与 user_campus_profile.campus_name（字符串）对齐，
--   不引入独立校区主表（当前产品模型校区为字符串维度）。
--
-- 幂等性：information_schema 检查列存在性后 ADD COLUMN，可安全重跑。
-- ============================================================

SET @has_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'campus_name'
);

SET @sql := IF(
    @has_col = 0,
    'ALTER TABLE users ADD COLUMN campus_name VARCHAR(128) NULL COMMENT ''管理员管辖校区名（NULL=全局管理员，非空=校区管理员）'' AFTER role',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- ALTER TABLE users DROP COLUMN campus_name;
