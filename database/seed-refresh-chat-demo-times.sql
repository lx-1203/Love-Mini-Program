-- ============================================================
-- 手工脚本：刷新体验账号 47 的演示聊天时间为「今天」（可重复执行）
-- ============================================================
-- 用途：
--   V2026.08.09.0005__seed_chat_demo_user_47.sql 以「迁移执行时刻」为时间基准，
--   隔天演示时消息会显示为「昨天」。本脚本把 3 个演示会话的消息时间
--   滚动到今天：保持会话内相对间隔不变（早/午/晚节奏保留），
--   最早一条 = 10 小时前，最新一条 = 5 分钟前。
--
-- 用法：
--   mysql -h127.0.0.1 -P3307 -ucampus -phyp5022940 campus_love < seed-refresh-chat-demo-times.sql
--   （幂等：按会话过滤整体重写，可反复执行；仅影响 conv-demo-47-* 会话）
-- ============================================================

-- 1. 消息时间滚动到今天（保持相对间隔，最早 600 分钟前、最新 5 分钟前）
UPDATE private_messages pm
JOIN (
    SELECT id,
           TIMESTAMPDIFF(MINUTE, MIN(created_at) OVER (PARTITION BY conversation_id), created_at) AS off_min
    FROM private_messages
    WHERE conversation_id IN (
        SELECT id FROM private_conversations WHERE conversation_uid LIKE 'conv-demo-47%'
    )
) x ON pm.id = x.id
SET pm.created_at = DATE_SUB(NOW(), INTERVAL (600 - x.off_min) MINUTE);

-- 2. 会话最后消息时间同步为各自最新消息
UPDATE private_conversations c
JOIN (
    SELECT conversation_id, MAX(created_at) AS latest
    FROM private_messages
    WHERE conversation_id IN (SELECT id FROM private_conversations WHERE conversation_uid LIKE 'conv-demo-47%')
    GROUP BY conversation_id
) m ON c.id = m.conversation_id
SET c.last_message_at = m.latest, c.updated_at = NOW()
WHERE c.conversation_uid LIKE 'conv-demo-47%';

-- 3. 验证（应显示为今天）
SELECT conversation_uid,
       DATE_FORMAT(last_message_at, '%m-%d %H:%i') AS last_at,
       DATE_FORMAT(NOW(), '%m-%d %H:%i') AS now
FROM private_conversations
WHERE conversation_uid LIKE 'conv-demo-47%';
