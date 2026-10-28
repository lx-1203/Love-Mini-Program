-- 消息已读/未读服务端同步（2026-10-28）
-- 现有未读数由 private_messages.is_read 派生；「标为未读」需要一个持久的会话级标记。
-- 按用户侧独立存储，A 标未读不影响 B；进入会话 / 标为已读时清零。
ALTER TABLE private_conversations
    ADD COLUMN user_a_marked_unread TINYINT(1) NOT NULL DEFAULT 0 AFTER user_b_muted,
    ADD COLUMN user_b_marked_unread TINYINT(1) NOT NULL DEFAULT 0 AFTER user_a_marked_unread;
