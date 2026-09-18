-- R11 Phase4 数据合规扫描（只读 SELECT，不修改）
-- 1) 审计残留
SELECT 'audit_posts' AS item, COUNT(*) AS hits FROM posts
 WHERE content LIKE '%Round-%' OR content LIKE '%audit%' OR title LIKE '%Round-%' OR title LIKE '%验收%';
SELECT 'audit_pms' AS item, COUNT(*) AS hits FROM private_messages
 WHERE content LIKE '%Round-%' OR content LIKE '%audit%';
SELECT 'audit_tempchat' AS item, COUNT(*) AS hits FROM temp_chat_message
 WHERE body LIKE '%Round-%' OR body LIKE '%audit%';
SELECT 'audit_whisper' AS item, COUNT(*) AS hits FROM whisper_message
 WHERE content LIKE '%Round-%' OR content LIKE '%audit%';
SELECT 'audit_official' AS item, COUNT(*) AS hits FROM official_messages
 WHERE content LIKE '%Round-%' OR content LIKE '%audit%' OR content LIKE '%验收%';
SELECT 'audit_discussion_dup' AS item, COUNT(*) AS dup_groups FROM (
  SELECT LEFT(content, 20) c, COUNT(*) n FROM posts GROUP BY LEFT(content, 20) HAVING n > 3) t;

-- 2) 封存核验辅助：带价格/币文案的活动与商品
SELECT 'shop_items' AS item, COUNT(*) AS hits FROM shop_items WHERE status = 'active';
SELECT 'consulting_courses' AS item, COUNT(*) AS hits FROM consulting_course;
