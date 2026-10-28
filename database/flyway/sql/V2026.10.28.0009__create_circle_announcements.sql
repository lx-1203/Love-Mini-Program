-- 圈子公告表化（2026-10-28）
-- 旧列 interest_circles.announcement 保留一个发布周期做兼容读；新表为唯一写源。
CREATE TABLE IF NOT EXISTS circle_announcements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    circle_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(80) DEFAULT NULL COMMENT '公告标题（可空）',
    content VARCHAR(1000) NOT NULL COMMENT '公告正文（纯文本）',
    is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶（同圈 published 至多一条）',
    status VARCHAR(16) NOT NULL DEFAULT 'draft' COMMENT 'draft/published/offline',
    author_id BIGINT UNSIGNED DEFAULT NULL COMMENT '发布人（后台管理员用户 ID）',
    published_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_circle_announcements_list (circle_id, status, is_pinned, published_at),
    CONSTRAINT fk_circle_announcements_circle FOREIGN KEY (circle_id)
        REFERENCES interest_circles (id) ON DELETE CASCADE,
    CONSTRAINT chk_circle_announcements_status
        CHECK (status IN ('draft','published','offline'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='圈子公告';

-- 回填：旧单列公告转为「已发布 + 置顶」的一条记录
INSERT INTO circle_announcements (circle_id, title, content, is_pinned, status, author_id, published_at, created_at, updated_at)
SELECT c.id, '公告', TRIM(c.announcement), 1, 'published', NULL, NOW(), NOW(), NOW()
FROM interest_circles c
WHERE c.announcement IS NOT NULL
  AND TRIM(c.announcement) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM circle_announcements a WHERE a.circle_id = c.id
  );
