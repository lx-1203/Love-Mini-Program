CREATE TABLE IF NOT EXISTS interest_circles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(64) NOT NULL COMMENT '圈名',
    icon VARCHAR(16) NOT NULL DEFAULT '📋' COMMENT 'emoji图标',
    description VARCHAR(256) DEFAULT NULL COMMENT '圈子描述',
    member_count INT NOT NULL DEFAULT 0 COMMENT '成员数',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序权重',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_interest_circles_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='兴趣圈表';

CREATE TABLE IF NOT EXISTS circle_memberships (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    circle_id BIGINT UNSIGNED NOT NULL COMMENT '圈子ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_circle_member (circle_id, user_id),
    KEY idx_circle_memberships_user (user_id),
    CONSTRAINT fk_circle_memberships_circle FOREIGN KEY (circle_id) REFERENCES interest_circles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='圈子成员表';

CREATE TABLE IF NOT EXISTS circle_topics (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    circle_id BIGINT UNSIGNED NOT NULL COMMENT '所属圈子ID',
    author_id BIGINT UNSIGNED NOT NULL COMMENT '作者用户ID',
    title VARCHAR(200) NOT NULL COMMENT '话题标题',
    content TEXT NOT NULL COMMENT '话题内容',
    images JSON DEFAULT NULL COMMENT '图片URL数组',
    reply_count INT NOT NULL DEFAULT 0 COMMENT '回复数',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否置顶',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_circle_topics_circle (circle_id),
    KEY idx_circle_topics_author (author_id),
    KEY idx_circle_topics_created (created_at),
    CONSTRAINT fk_circle_topics_circle FOREIGN KEY (circle_id) REFERENCES interest_circles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='圈子话题表';

CREATE TABLE IF NOT EXISTS circle_replies (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    topic_id BIGINT UNSIGNED NOT NULL COMMENT '所属话题ID',
    author_id BIGINT UNSIGNED NOT NULL COMMENT '作者用户ID',
    content TEXT NOT NULL COMMENT '回复内容',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_circle_replies_topic (topic_id),
    KEY idx_circle_replies_author (author_id),
    KEY idx_circle_replies_created (created_at),
    CONSTRAINT fk_circle_replies_topic FOREIGN KEY (topic_id) REFERENCES circle_topics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='圈子回复表';