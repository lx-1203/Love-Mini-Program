CREATE TABLE IF NOT EXISTS comments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id BIGINT UNSIGNED NOT NULL COMMENT '帖子ID',
    author_id BIGINT UNSIGNED NOT NULL COMMENT '评论作者ID',
    content TEXT NOT NULL COMMENT '评论内容',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_comments_post_id (post_id),
    KEY idx_comments_author_id (author_id),
    KEY idx_comments_created_at (created_at),
    CONSTRAINT fk_comments_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='评论表';
