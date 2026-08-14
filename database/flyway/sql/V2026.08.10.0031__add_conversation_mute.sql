-- 给 private_conversations 表添加会话免打扰（mute）字段
-- 2026-08-10 B1③：会话级免打扰，按用户侧独立存储（A 静音不影响 B 的接收）
ALTER TABLE private_conversations ADD COLUMN user_a_muted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '用户A是否静音本会话' AFTER pinned;
ALTER TABLE private_conversations ADD COLUMN user_b_muted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '用户B是否静音本会话' AFTER user_a_muted;
