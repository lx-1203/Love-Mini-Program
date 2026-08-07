-- 楼中楼评论 + 评论点赞（P1-02 后端部分 / A-12 / M-14）
--
-- 1. comments 表新增 parent_id：父评论 ID（楼中楼回复，NULL 表示根评论）
-- 2. 新建 comment_likes 表：评论点赞记录（幂等：同一用户对同一评论仅一条）

-- 1. 评论表增加父评论 ID 字段与索引
ALTER TABLE comments
    ADD COLUMN parent_id BIGINT UNSIGNED NULL COMMENT '父评论ID（楼中楼回复）' AFTER post_id,
    ADD INDEX idx_comments_parent_id (parent_id);

-- 2. 评论点赞记录表
--    唯一键 uk_comment_likes_user_comment：同一用户对同一评论仅一条点赞记录（幂等）
CREATE TABLE IF NOT EXISTS comment_likes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    comment_id BIGINT UNSIGNED NOT NULL COMMENT '被点赞评论 ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '点赞用户 ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_comment_likes_user_comment (user_id, comment_id),
    KEY idx_comment_likes_comment (comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='评论点赞记录表';
