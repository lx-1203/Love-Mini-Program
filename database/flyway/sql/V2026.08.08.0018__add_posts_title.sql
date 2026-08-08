-- 帖子标题落库（2026-08-08 走查 P1：发帖必填标题 5-30 字）
--
-- 1. posts 表新增 title 列
-- 2. 存量帖子回填：取 content 前 30 个有效字符（压缩空白）作为标题

-- 1. 帖子表增加标题字段（AFTER author_id，与实体 Post.title 映射一致）
ALTER TABLE posts
    ADD COLUMN title VARCHAR(200) NULL COMMENT '帖子标题' AFTER author_id;

-- 2. 存量回填：content 前 30 字（空白压缩为单空格，去换行）
UPDATE posts
SET title = LEFT(
    REPLACE(REGEXP_REPLACE(content, '[[:space:]]+', ' '), CHAR(10), ' '),
    30
)
WHERE title IS NULL OR title = '';
