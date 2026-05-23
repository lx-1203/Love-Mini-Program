-- 帖子点赞记录表：用于追踪用户对帖子的点赞状态，实现点赞去重与切换
CREATE TABLE IF NOT EXISTS post_likes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '点赞用户ID',
    post_id BIGINT UNSIGNED NOT NULL COMMENT '被点赞帖子ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
    PRIMARY KEY (id),
    -- 联合唯一约束：同一用户对同一帖子只能有一条点赞记录
    UNIQUE KEY uk_post_likes_user_post (user_id, post_id),
    -- 外键约束：关联用户表和帖子表
    CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    -- 索引：加速按用户或帖子查询点赞记录
    KEY idx_post_likes_user (user_id),
    KEY idx_post_likes_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='帖子点赞记录表';
