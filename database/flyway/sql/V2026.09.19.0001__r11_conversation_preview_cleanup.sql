-- ============================================================
-- 迁移：R11-G5 补遗——会话 preview 残留清理（2026-09-19 理想图对照发现）
-- 背景：R10 P3-015 删除了 Round-8 audit 私聊消息行，但会话表
--       private_conversations.last_message_preview 仍指向已删消息文案，
--       消息页「最近聊天」仍渲染审计残留文案（cur-messages.png 实证）。
-- 幂等：仅当 preview 仍为审计文案时改写。
-- ============================================================

UPDATE private_conversations
   SET last_message_preview = '打个招呼吧~'
 WHERE last_message_preview LIKE '%Round-8 audit%';

-- 兜底：任何会话 preview 指向已不存在的消息时，改为中性引导文案
UPDATE private_conversations pc
   SET pc.last_message_preview = '打个招呼吧~'
 WHERE pc.last_message_preview <> ''
   AND NOT EXISTS (
     SELECT 1 FROM private_messages pm
      WHERE pm.conversation_id = pc.id
        AND pm.content = pc.last_message_preview
   );
