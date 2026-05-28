-- 帖子话题标签关联表
-- 存储帖子与预置话题标签的关联关系，用于标签筛选和聚合展示
CREATE TABLE IF NOT EXISTS post_tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL COMMENT '帖子ID',
    tag_name VARCHAR(50) NOT NULL COMMENT '标签名称，如"校园日常"、"兴趣分享"等',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_tags_post (post_id),
    INDEX idx_post_tags_tag (tag_name),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);