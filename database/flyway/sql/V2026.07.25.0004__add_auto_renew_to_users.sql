-- ============================================================
-- 迁移：为 users 表添加 auto_renew_enabled 字段（VIP 自动续费开关）
-- ============================================================
-- 背景：
--   VIP 自动续费功能要求用户可在 VIP 页面开启/关闭自动续费。
--   字段存储在 users 表，默认关闭（0）。
--
-- 字段说明：
--   * auto_renew_enabled：TINYINT(1)，0 表示关闭，1 表示开启
--   * 默认值 0（关闭），保证存量用户不受影响
--
-- 注意：
--   * 使用 IF NOT EXISTS 语义（MySQL 8.0+ 支持）避免重复执行报错
--   * 实际通过 information_schema 检查列是否存在，不存在才 ADD
-- ============================================================

-- 检查列是否存在，不存在才添加（兼容 MySQL 不支持 ADD COLUMN IF NOT EXISTS 的版本）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'auto_renew_enabled');

SET @ddl = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN auto_renew_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''VIP 自动续费开关 0关闭 1开启''',
    'SELECT ''auto_renew_enabled column already exists'' AS msg');

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- ALTER TABLE users DROP COLUMN auto_renew_enabled;
