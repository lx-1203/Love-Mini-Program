-- 给 visitors 表添加 is_read 字段
-- 用于标记访客记录是否已被用户查看
ALTER TABLE visitors ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已读' AFTER visited_user_id;

-- 给 private_conversations 表添加 pinned 字段
-- 用于支持会话置顶功能
ALTER TABLE private_conversations ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶' AFTER last_message_at;
