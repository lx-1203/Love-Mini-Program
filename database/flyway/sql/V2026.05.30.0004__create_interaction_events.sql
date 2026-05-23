-- 互动事件表
-- 记录用户间的各类互动事件，用于互动提醒增强功能
CREATE TABLE IF NOT EXISTS interaction_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    trigger_user_id BIGINT NOT NULL,
    event_type VARCHAR(30) NOT NULL COMMENT 'NEW_LIKE,NEW_VISITOR,NEW_FOLLOW,POST_LIKED,POST_COMMENTED,TOPIC_REPLIED',
    reference_id BIGINT,
    reference_type VARCHAR(30) COMMENT 'POST,COMMENT,TOPIC,USER',
    summary VARCHAR(200),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id_created (user_id, created_at DESC),
    INDEX idx_user_id_unread (user_id, is_read),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (trigger_user_id) REFERENCES users(id)
);
