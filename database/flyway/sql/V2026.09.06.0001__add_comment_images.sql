-- 2026-09-06 评论图片上传：comments 表新增 images JSON 列（与 posts.images 同口径）
-- 幂等写法：列已存在（如本地库手工补过）时跳过，避免 Flyway 因重复加列失败
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'comments'
      AND COLUMN_NAME = 'images'
);
SET @ddl = IF(
    @col_exists = 0,
    'ALTER TABLE comments ADD COLUMN images JSON NULL COMMENT ''评论图片URL JSON数组'' AFTER content',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
