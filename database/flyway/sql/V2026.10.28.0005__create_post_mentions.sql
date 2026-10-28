-- 发帖 @提及（2026-10-28）
-- notified：帖子审核通过后由 PostMentionService 逐条发通知并置 1，保证待审帖不提前打扰被提及人。
CREATE TABLE IF NOT EXISTS post_mentions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT UNSIGNED NOT NULL,
    mentioned_user_id BIGINT UNSIGNED NOT NULL,
    notified TINYINT(1) NOT NULL DEFAULT 0 COMMENT '审核通过后是否已发通知',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_post_mentions_post_user (post_id, mentioned_user_id),
    KEY idx_post_mentions_user (mentioned_user_id, created_at),
    CONSTRAINT fk_post_mentions_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子@提及关系';
