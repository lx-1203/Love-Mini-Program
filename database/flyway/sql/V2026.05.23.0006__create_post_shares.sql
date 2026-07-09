CREATE TABLE IF NOT EXISTS post_shares (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    post_id BIGINT UNSIGNED NOT NULL COMMENT '被转发的帖子ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '转发者用户ID',
    comment VARCHAR(500) DEFAULT NULL COMMENT '可选附加评论',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_post_shares_post (post_id),
    KEY idx_post_shares_user (user_id),
    KEY idx_post_shares_created (created_at),
    CONSTRAINT fk_post_shares_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='帖子转发记录表';

ALTER TABLE posts
    ADD COLUMN share_count INT NOT NULL DEFAULT 0 COMMENT '转发数' AFTER comments_count;