-- 2026-10-28 验收 QA 数据清理（只清本轮新增；种子数据保留）
START TRANSACTION;
UPDATE posts SET status='deleted', updated_at=NOW() WHERE id IN (429,430);
DELETE FROM likes WHERE id=3435;
DELETE FROM post_likes WHERE id=159;
DELETE FROM private_messages WHERE id=5826;
UPDATE private_conversations c
SET last_message_preview=(SELECT m.content FROM private_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1),
    last_message_at=(SELECT m.created_at FROM private_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1)
WHERE c.id=697;
COMMIT;
