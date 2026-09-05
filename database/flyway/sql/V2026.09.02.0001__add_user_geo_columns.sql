-- ============================================================
-- V2026.09.02.0001: LBS Phase 2 — 用户地理坐标
-- ============================================================
-- 为 users 表新增经纬度字段，支撑附近的人精确距离计算。
--   latitude / longitude: gcj02 坐标系（微信原生），精度 6 位小数
--   geo_updated_at: 最近一次坐标上报时间（前端节流 ≥5 分钟）
-- 新增复合索引 idx_users_geo(latitude, longitude) 用于 bounding box 预筛。
--
-- 兼容性说明：MySQL 8 不支持 ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
-- （MariaDB 语法）。用 information_schema 兜底判断，避免重复执行时报错。
-- ============================================================

-- 1. latitude
SET @has_col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'latitude'
);
SET @sql = IF(@has_col = 0,
  'ALTER TABLE users ADD COLUMN latitude DECIMAL(10,6) NULL COMMENT ''纬度（gcj02 坐标系，精度 6 位小数）''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. longitude
SET @has_col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'longitude'
);
SET @sql = IF(@has_col = 0,
  'ALTER TABLE users ADD COLUMN longitude DECIMAL(10,6) NULL COMMENT ''经度（gcj02 坐标系，精度 6 位小数）''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. geo_updated_at
SET @has_col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'geo_updated_at'
);
SET @sql = IF(@has_col = 0,
  'ALTER TABLE users ADD COLUMN geo_updated_at TIMESTAMP NULL COMMENT ''最近一次坐标上报时间''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. 复合索引
SET @has_idx = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'idx_users_geo'
);
SET @sql = IF(@has_idx = 0,
  'CREATE INDEX idx_users_geo ON users (latitude, longitude)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
