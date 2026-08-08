-- ============================================================
-- 迁移：评论点赞种子补充（演示帖评论区点赞可见）
-- ============================================================
-- 背景：V2026.08.09.0002 的 comment_likes 种子按「全局前 40 条根评论」点赞，
-- 长期演进的库中早期评论占位导致演示帖（作者 10001-10050）评论区点赞集中在
-- 早期评论、种子帖评论点赞数为 0（用户验收时评论点赞「看不出来」）。
--
-- 修复：改为**按帖子分区**点赞——每篇种子帖的前 4 条根评论各获得 1 个
-- 虚拟用户（10005-10008）的点赞，保证任意演示帖评论区都有真实点赞数。
-- 幂等：NOT EXISTS 防重，可安全重跑。
-- ============================================================

INSERT INTO comment_likes (comment_id, user_id, created_at)
SELECT c.id, m.uid, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM comments c
JOIN (
    -- 每帖根评论排行（parent_id IS NULL）
    SELECT id, ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY id) AS rn
    FROM comments
) rc ON rc.id = c.id
JOIN (
    SELECT 1 rn, 10005 uid, 3 hours_ago UNION ALL
    SELECT 2, 10006, 5 UNION ALL
    SELECT 3, 10007, 8 UNION ALL
    SELECT 4, 10008, 12
) m ON m.rn = rc.rn
WHERE c.parent_id IS NULL AND rc.rn <= 4
  AND c.post_id IN (SELECT id FROM posts WHERE author_id BETWEEN 10001 AND 10050 AND status = 'active')
  AND NOT EXISTS (SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = m.uid);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM comment_likes WHERE comment_id IN (
--   SELECT c.id FROM comments c
--   WHERE c.parent_id IS NULL
--     AND c.post_id IN (SELECT id FROM posts WHERE author_id BETWEEN 10001 AND 10050)
--     AND c.id IN (
--       SELECT id FROM (
--         SELECT id, ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY id) AS rn FROM comments WHERE parent_id IS NULL
--       ) t WHERE t.rn <= 4)
-- ) AND user_id BETWEEN 10005 AND 10008;
