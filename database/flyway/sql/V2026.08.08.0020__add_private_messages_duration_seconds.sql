-- 录音修复：私信语音消息时长持久化。
-- voice 类型私信消息记录录音时长（秒），非语音消息为 NULL，
-- 保证前端刷新/重进会话后语音气泡仍能显示正确时长与宽度。
ALTER TABLE private_messages
    ADD COLUMN duration_seconds INT NULL COMMENT '语音消息时长（秒），非语音消息为 NULL';
