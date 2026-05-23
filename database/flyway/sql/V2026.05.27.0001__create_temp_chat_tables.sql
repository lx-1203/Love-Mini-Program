-- 临时聊天会话表
CREATE TABLE IF NOT EXISTS temp_chat_session (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_uid VARCHAR(64) NOT NULL COMMENT '会话唯一标识（前端路由用，如 session-1-2-abc12345）',
    user_a_id BIGINT UNSIGNED NOT NULL COMMENT '用户 A ID（发起方）',
    user_b_id BIGINT UNSIGNED NOT NULL COMMENT '用户 B ID（被推荐方）',
    recommended_person_id VARCHAR(64) DEFAULT NULL COMMENT '推荐人 ID（关联推荐服务）',
    match_id VARCHAR(64) DEFAULT NULL COMMENT '关联的匹配 ID（来自 HeartSignal）',
    phase ENUM('matching', 'active', 'closed', 'expired') NOT NULL DEFAULT 'matching' COMMENT '会话阶段',
    closes_at DATETIME NOT NULL COMMENT '会话关闭时间（24h 后自动过期）',
    closed_reason VARCHAR(32) DEFAULT NULL COMMENT '关闭原因: ended / expired',
    is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
    user_a_unread_count INT NOT NULL DEFAULT 0 COMMENT '用户 A 未读消息数',
    user_b_unread_count INT NOT NULL DEFAULT 0 COMMENT '用户 B 未读消息数',
    last_message_preview VARCHAR(255) DEFAULT NULL COMMENT '最后一条消息预览',
    last_message_at DATETIME DEFAULT NULL COMMENT '最后消息时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_temp_chat_session_uid (session_uid),
    KEY idx_temp_chat_session_user_a (user_a_id),
    KEY idx_temp_chat_session_user_b (user_b_id),
    KEY idx_temp_chat_session_match_id (match_id),
    KEY idx_temp_chat_session_phase (phase),
    KEY idx_temp_chat_session_closes_at (closes_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='临时聊天会话表';

-- 临时聊天消息表
CREATE TABLE IF NOT EXISTS temp_chat_message (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_id BIGINT UNSIGNED NOT NULL COMMENT '所属会话 ID',
    sender VARCHAR(16) NOT NULL COMMENT '发送者标识: self / peer / system',
    kind VARCHAR(16) NOT NULL DEFAULT 'text' COMMENT '消息类型: text / voice / emoji / system',
    body TEXT NOT NULL COMMENT '消息内容',
    duration_seconds INT DEFAULT NULL COMMENT '语音消息时长（秒）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_temp_chat_message_session (session_id, created_at),
    CONSTRAINT fk_temp_chat_message_session FOREIGN KEY (session_id) REFERENCES temp_chat_session(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='临时聊天消息表';

-- 临时聊天联系交换表
CREATE TABLE IF NOT EXISTS temp_chat_contact_exchange (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_id BIGINT UNSIGNED NOT NULL COMMENT '所属会话 ID',
    proposer VARCHAR(16) DEFAULT NULL COMMENT '发起交换请求的用户标识: self / peer',
    status VARCHAR(32) NOT NULL DEFAULT 'idle' COMMENT '交换状态: idle / accepted-by-self / accepted-by-peer / completed / rejected',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_temp_chat_contact_exchange_session (session_id),
    CONSTRAINT fk_temp_chat_contact_exchange_session FOREIGN KEY (session_id) REFERENCES temp_chat_session(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='临时聊天联系交换表';
