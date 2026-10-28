-- 内容 @提及统一表（2026-10-28）
-- target_type: post / topic / reply；与 post_mentions 同语义（notified=0 待审核通过后发）。
-- 旧表 post_mentions 保留一个发布周期，回填后不再写入。
CREATE TABLE IF NOT EXISTS content_mentions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    target_type VARCHAR(16) NOT NULL COMMENT 'post/topic/reply',
    target_id BIGINT UNSIGNED NOT NULL,
    mentioned_user_id BIGINT UNSIGNED NOT NULL,
    notified TINYINT(1) NOT NULL DEFAULT 0 COMMENT '目标审核通过后是否已发通知',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_content_mentions_target_user (target_type, target_id, mentioned_user_id),
    KEY idx_content_mentions_user (mentioned_user_id, created_at),
    KEY idx_content_mentions_target (target_type, target_id),
    CONSTRAINT chk_content_mentions_target_type
        CHECK (target_type IN ('post','topic','reply'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容@提及关系';

-- 回填帖子提及（旧表存在时）
INSERT IGNORE INTO content_mentions (target_type, target_id, mentioned_user_id, notified, created_at)
SELECT 'post', post_id, mentioned_user_id, notified, created_at
FROM post_mentions;
