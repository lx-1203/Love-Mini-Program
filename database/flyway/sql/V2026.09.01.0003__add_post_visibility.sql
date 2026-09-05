-- ============================================================
-- V2026.09.01.0003: 帖子可见范围（visibility / circle_id）
-- ============================================================
-- 为 posts 表新增可见范围列，支撑后续圈子/兴趣维度帖子可见性控制。
--   visibility: public（默认，全校可见）/ school（仅同校）/ interest（仅同兴趣圈）
--   circle_id:  关联兴趣圈 ID（visibility=interest 时必填，其余为 NULL）
-- 新增复合索引 idx_posts_visibility(visibility, status, created_at)。
--
-- 兼容性说明：
--   1. MySQL 8 不支持 ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
--      （MariaDB 语法），用 information_schema 兜底判断；
--   2. 列类型必须为 VARCHAR(20) DEFAULT 'public'（与 Post 实体 @Column
--      columnDefinition 一致，Hibernate schema 校验强制）——不能用 ENUM。
--      VisibilityConverter 负责 Java 枚举 ↔ 字符串映射。
-- ============================================================

-- 1. 新增 visibility 列（若不存在，VARCHAR 与实体一致）
SET @has_col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'visibility'
);
SET @sql = IF(@has_col = 0,
  'ALTER TABLE posts ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT ''public'' COMMENT ''帖子可见范围：public=全校, school=同校, interest=同兴趣圈''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1b. 若列已存在但是 ENUM 类型（早期草稿误用）→ 转回 VARCHAR(20)
SET @col_type = (
  SELECT DATA_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'visibility'
);
SET @sql = IF(@col_type = 'enum',
  'ALTER TABLE posts MODIFY COLUMN visibility VARCHAR(20) NOT NULL DEFAULT ''public'' COMMENT ''帖子可见范围：public=全校, school=同校, interest=同兴趣圈''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 新增 circle_id 列（若不存在）
SET @has_col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'circle_id'
);
SET @sql = IF(@has_col = 0,
  'ALTER TABLE posts ADD COLUMN circle_id BIGINT NULL COMMENT ''关联兴趣圈 ID（visibility=interest 时必填）''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. 新增复合索引（若不存在）
SET @has_idx = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
    AND INDEX_NAME = 'idx_posts_visibility'
);
SET @sql = IF(@has_idx = 0,
  'CREATE INDEX idx_posts_visibility ON posts (visibility, status, created_at)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. 存量数据回填（防御性：确保无 NULL 残留）
UPDATE posts SET visibility = 'public' WHERE visibility IS NULL;
