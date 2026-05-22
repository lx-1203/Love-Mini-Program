CREATE TABLE IF NOT EXISTS posts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    author_id BIGINT UNSIGNED NOT NULL COMMENT '作者用户ID',
    content TEXT NOT NULL COMMENT '帖子内容',
    images JSON DEFAULT NULL COMMENT '图片URL数组',
    tags JSON DEFAULT NULL COMMENT '话题标签数组',
    category ENUM('all', 'interest', 'sincere', 'hometown', 'anonymous', 'latest') NOT NULL DEFAULT 'all' COMMENT '分类',
    likes_count INT NOT NULL DEFAULT 0 COMMENT '点赞数',
    comments_count INT NOT NULL DEFAULT 0 COMMENT '评论数',
    status ENUM('active', 'deleted', 'hidden') NOT NULL DEFAULT 'active' COMMENT '状态',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_posts_author (author_id),
    KEY idx_posts_category (category),
    KEY idx_posts_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='村口帖子表';
