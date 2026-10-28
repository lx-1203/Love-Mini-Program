-- 圈子标签/公告 + 话题点赞（2026-10-28）
-- 公告按当前 UI 的「一条置顶公告」建模为单列，不引入整套公告表。
ALTER TABLE interest_circles
    ADD COLUMN tags VARCHAR(255) NULL COMMENT '圈标签，逗号分隔',
    ADD COLUMN announcement VARCHAR(500) NULL COMMENT '置顶公告';

ALTER TABLE circle_topics
    ADD COLUMN like_count INT NOT NULL DEFAULT 0 COMMENT '话题点赞数';

CREATE TABLE IF NOT EXISTS circle_topic_likes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    topic_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_circle_topic_likes_topic_user (topic_id, user_id),
    KEY idx_circle_topic_likes_user (user_id, created_at),
    CONSTRAINT fk_circle_topic_likes_topic FOREIGN KEY (topic_id) REFERENCES circle_topics (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='圈子话题点赞';
