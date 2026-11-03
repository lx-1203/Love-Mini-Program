-- ============================================================
-- 迁移：私信消息客户端幂等键（P2-3 消息去重兜底，2026-11-03）
--
-- 背景：
--   REST 发消息已有 @Idempotent（Idempotency-Key 头）请求级防重，但：
--   ① WebSocket /app/chat/send 链路不走 HTTP 拦截器，无防重；
--   ② 重试若换了幂等键（客户端重装/重登后缓存丢失），同一内容会重复落库。
--   本迁移为 private_messages 增加 client_msg_id（客户端生成的稳定消息 ID）
--   与 (conversation_id, client_msg_id) 唯一约束，DB 层兜底：同一会话内
--   同一 client_msg_id 只允许一行，服务层捕获冲突后回读已有行幂等返回。
--
-- 注意：
--   * 列可空——存量行与不带键的调用方不受影响（MySQL 唯一索引对多个 NULL 不去重）；
--   * 排序策略不变（仍按服务端 id/sentAt 排序），client_msg_id 仅做去重，
--     不作为排序键（客户端时钟不可信）。
-- ============================================================

ALTER TABLE private_messages
    ADD COLUMN client_msg_id VARCHAR(64) DEFAULT NULL
        COMMENT '客户端幂等键（P2-3）：同一会话内重复提交去重；NULL=不带键' AFTER quote_context;

ALTER TABLE private_messages
    ADD UNIQUE KEY uk_private_messages_conv_client_msg (conversation_id, client_msg_id);
