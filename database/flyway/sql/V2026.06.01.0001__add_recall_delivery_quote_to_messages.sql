-- Phase 2 Milestone C: 引用回复 + 撤回 + 已读态
-- 新增 recalled, delivery_status, quote_snapshot 列

ALTER TABLE temp_chat_message
  ADD COLUMN recalled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已撤回',
  ADD COLUMN delivery_status VARCHAR(16) NOT NULL DEFAULT 'sent' COMMENT '投递状态: sent/delivered/read',
  ADD COLUMN quote_snapshot TEXT DEFAULT NULL COMMENT '引用消息JSON快照';

ALTER TABLE private_messages
  ADD COLUMN recalled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已撤回',
  ADD COLUMN delivery_status VARCHAR(16) NOT NULL DEFAULT 'sent' COMMENT '投递状态: sent/delivered/read';
