CREATE TABLE IF NOT EXISTS private_conversations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    conversation_uid VARCHAR(64) NOT NULL,
    user_a_id BIGINT UNSIGNED NOT NULL,
    user_b_id BIGINT UNSIGNED NOT NULL,
    last_message_preview VARCHAR(255) DEFAULT NULL,
    last_message_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_private_conversations_uid (conversation_uid),
    UNIQUE KEY uk_private_conversations_users ((LEAST(user_a_id, user_b_id)), (GREATEST(user_a_id, user_b_id))),
    KEY idx_private_conversations_user_a (user_a_id),
    KEY idx_private_conversations_user_b (user_b_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='私信会话表';

CREATE TABLE IF NOT EXISTS private_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    conversation_id BIGINT UNSIGNED NOT NULL,
    sender_id BIGINT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    message_kind VARCHAR(16) NOT NULL DEFAULT 'text',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_private_messages_conversation (conversation_id, created_at),
    KEY idx_private_messages_sender (sender_id),
    CONSTRAINT fk_private_messages_conversation FOREIGN KEY (conversation_id) REFERENCES private_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='私信消息表';
