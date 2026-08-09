-- =============================================================
-- 2026-08-09 表情包机制：真实 emoji 消息种子
--
-- 1. 修正 V2026.08.09.0005 的假 emoji（kind=emoji 但 body 是普通文本 '谢谢～'）
--    为真实 4 字节 emoji 字符（验证 utf8mb4 存储与 kind=emoji 查看链路）；
-- 2. 私信 / 临时会话各补一条真实 emoji 消息，供「后端同步更新和查看」验收。
--
-- 注意：flyway 已执行过的迁移不会重跑，故用独立迁移修正/补充种子。
-- 私信未读计数以 is_read 为准：本条全部 is_read=1，不影响列表红点演示。
-- =============================================================

-- 1. 修正假 emoji：会话 2（47↔10001）中 kind=emoji 但 body 为普通文本的消息 → 真 emoji
UPDATE private_messages pm
JOIN private_conversations c ON c.id = pm.conversation_id
SET pm.content = '😊'
WHERE pm.message_kind = 'emoji'
  AND pm.content = '谢谢～'
  AND ((c.user_a_id = 47 AND c.user_b_id = 10001) OR (c.user_a_id = 10001 AND c.user_b_id = 47));

-- 2. 私信：会话 1（47↔8）已读区补一条对方发送的真 emoji 消息（280 分钟前，未读区之前）
INSERT INTO private_messages (conversation_id, sender_id, content, message_kind, is_read,
                              created_at, delivery_status, duration_seconds)
SELECT c.id, c.user_b_id, '🎉', 'emoji', 1,
       DATE_SUB(NOW(), INTERVAL 280 MINUTE), 'sent', NULL
FROM private_conversations c
WHERE ((c.user_a_id = 47 AND c.user_b_id = 8) OR (c.user_a_id = 8 AND c.user_b_id = 47))
  AND NOT EXISTS (
    SELECT 1 FROM private_messages pm
    WHERE pm.conversation_id = c.id AND pm.message_kind = 'emoji' AND pm.content = '🎉'
  );

-- 3. 临时聊天：向最新创建的会话补一条 peer 真 emoji 消息。
--    不更新 user_a/b_unread_count（计数由服务端消息发送逻辑维护，seed 仅提供查看演示数据）
INSERT INTO temp_chat_message (session_id, sender, kind, body, created_at)
SELECT s.id, 'peer', 'emoji', '🤗', DATE_SUB(NOW(), INTERVAL 15 MINUTE)
FROM temp_chat_session s
WHERE NOT EXISTS (SELECT 1 FROM temp_chat_message m WHERE m.session_id = s.id AND m.kind = 'emoji')
ORDER BY s.id DESC
LIMIT 1;
