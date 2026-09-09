-- 2026-09-07 R16：官方客服（寻觅助手）双向会话消息表
-- 背景：此前 official_messages 仅为广播流，客户端发送是本地 echo 桩，
-- 用户发送的内容不落库、刷新即消失。本表按 (user_id, account_id) 存双向消息。
CREATE TABLE IF NOT EXISTS official_chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    direction VARCHAR(16) NOT NULL,            -- user：用户发送；assistant：助手回复
    content TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    KEY idx_ocm_user_account_time (user_id, account_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT = '官方客服双向会话消息（R16）';
