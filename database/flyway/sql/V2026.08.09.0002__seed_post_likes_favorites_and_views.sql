-- ============================================================
-- 迁移：论坛互动演示数据种子（点赞/收藏/浏览/评论/楼中楼/评论点赞）
-- ============================================================
-- 背景（用户需求 2026-08-08）：
--   论坛互动数据全部真实入库：post_likes / post_favorites / post_view_history
--   / comments（含楼中楼 parent_id）/ comment_likes，保证列表、详情、后台可见。
--
-- 定位规则（防硬编码自增 id）：
--   * 帖子：作者 id + content 内容指纹（V2026.08.07.0024 种子帖，内容固定可精确匹配）
--   * 管理员：openid = 'local-dev-admin-openid-123456' 动态解析（旧库 id=1 / 新库 100000）
--   * 评论：ROW_NUMBER() 取每帖根评论排行，或 JOIN 帖子关联定位
-- 幂等：全部 INSERT ... SELECT ... WHERE NOT EXISTS / ON DUPLICATE，可安全重跑。
-- 注意：绝不引用手工脚本号段（posts 9000-9029 / users 20000-20049，仅 seed-demo-data.sql 有）。
-- 重灌通道：database/seed-post-interactions.sql（先删后插，随时可重复录入）。
-- ============================================================

-- ========== 1. 帖子点赞种子（post_likes） ==========
-- 1.1 管理员点赞 5 条（内容指纹定位，幂等）
INSERT INTO post_likes (user_id, post_id, created_at)
SELECT u.id, p.id, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM users u
JOIN (
    SELECT 10003 author, '图书馆自习day5，打卡坚持住' content, 3 hours_ago UNION ALL
    SELECT 10002, '学校的猫猫们也太可爱了，随手一拍都是表情包', 6 UNION ALL
    SELECT 10001, '新学期立个flag：每天运动半小时，坚持一百天！', 10 UNION ALL
    SELECT 10007, '篮球赛我们赢了！太激动了', 26 UNION ALL
    SELECT 10011, '拍到了绝美的城市夜景，分享给大家', 40
) m ON 1 = 1
JOIN posts p ON p.author_id = m.author AND p.content = m.content AND p.status = 'active'
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND NOT EXISTS (SELECT 1 FROM post_likes pl WHERE pl.user_id = u.id AND pl.post_id = p.id);

-- 1.2 虚拟用户 10005-10008 各点 3 条（内容指纹定位，幂等）
INSERT INTO post_likes (user_id, post_id, created_at)
SELECT m.uid, p.id, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM (
    SELECT 10005 uid, 10001 author, '新学期立个flag：每天运动半小时，坚持一百天！' content, 2 hours_ago UNION ALL
    SELECT 10005, 10006, '发现一家宝藏旧书店，老板人超好', 9 UNION ALL
    SELECT 10005, 10010, '舞蹈社招新啦，零基础也可以来', 20 UNION ALL
    SELECT 10006, 10002, '学校的猫猫们也太可爱了，随手一拍都是表情包', 5 UNION ALL
    SELECT 10006, 10007, '篮球赛我们赢了！太激动了', 18 UNION ALL
    SELECT 10006, 10012, '辩论赛拿了最佳辩手，感谢队友', 33 UNION ALL
    SELECT 10007, 10003, '图书馆自习day5，打卡坚持住', 8 UNION ALL
    SELECT 10007, 10008, '周末去植物园赏花，春天的气息', 22 UNION ALL
    SELECT 10007, 10013, '博物馆新展开放，值得一看', 41 UNION ALL
    SELECT 10008, 10004, '第一次做电台节目，紧张又兴奋，求收听！', 12 UNION ALL
    SELECT 10008, 10009, '用望远镜看到了木星，震撼！', 27 UNION ALL
    SELECT 10008, 10014, '新画了一幅水彩，大家觉得怎么样？', 46
) m
JOIN posts p ON p.author_id = m.author AND p.content = m.content AND p.status = 'active'
WHERE NOT EXISTS (SELECT 1 FROM post_likes pl WHERE pl.user_id = m.uid AND pl.post_id = p.id);

-- ========== 2. 帖子收藏种子（post_favorites） ==========
-- 管理员收藏 4 条（内容指纹定位，幂等）
INSERT INTO post_favorites (user_id, post_id, created_at)
SELECT u.id, p.id, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM users u
JOIN (
    SELECT 10002 author, '学校的猫猫们也太可爱了，随手一拍都是表情包' content, 5 hours_ago UNION ALL
    SELECT 10014, '新画了一幅水彩，大家觉得怎么样？', 12 UNION ALL
    SELECT 10016, '分享一个治愈系书单，周末读起来', 24 UNION ALL
    SELECT 10028, '骑行环湖，风景美得像画', 36
) m ON 1 = 1
JOIN posts p ON p.author_id = m.author AND p.content = m.content AND p.status = 'active'
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND NOT EXISTS (SELECT 1 FROM post_favorites pf WHERE pf.user_id = u.id AND pf.post_id = p.id);

-- ========== 3. 浏览历史种子（post_view_history，管理员最近浏览 8 条，时间错开） ==========
INSERT INTO post_view_history (user_id, post_id, viewed_at)
SELECT u.id, p.id, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM users u
JOIN (
    SELECT 10003 author, '图书馆自习day5，打卡坚持住' content, 2 hours_ago UNION ALL
    SELECT 10002, '学校的猫猫们也太可爱了，随手一拍都是表情包', 5 UNION ALL
    SELECT 10007, '篮球赛我们赢了！太激动了', 8 UNION ALL
    SELECT 10001, '新学期立个flag：每天运动半小时，坚持一百天！', 13 UNION ALL
    SELECT 10011, '拍到了绝美的城市夜景，分享给大家', 20 UNION ALL
    SELECT 10020, '汉服出行日，路上好多同袍', 28 UNION ALL
    SELECT 10033, '流星雨观测成功，许愿！', 44 UNION ALL
    SELECT 10014, '新画了一幅水彩，大家觉得怎么样？', 60
) m ON 1 = 1
JOIN posts p ON p.author_id = m.author AND p.content = m.content AND p.status = 'active'
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND NOT EXISTS (SELECT 1 FROM post_view_history pvh WHERE pvh.user_id = u.id AND pvh.post_id = p.id);

-- ========== 4. 浏览量兜底填充（view_count，仅补零值行，幂等守卫） ==========
-- 说明：真实浏览 +1 优先，这里只给尚无浏览量的帖子铺底，重跑/用户浏览过后不覆盖。
UPDATE posts p
SET p.view_count = 80 + (p.id MOD 120)
WHERE p.view_count = 0 AND p.status = 'active';

-- ========== 5. 评论补齐（comments，0024 仅前 8 帖有评论，此处为全部种子帖补根评论） ==========
-- 每帖 4 条根评论（ROW_NUMBER 全量种子帖 MOD 6 组文案池），内容与 0024 文案池区分，幂等
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM posts p
JOIN (
    -- 0024 种子帖排行（作者 10001-10050），rn 0-49
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS rn
    FROM posts WHERE author_id BETWEEN 10001 AND 10050 AND status = 'active'
) p2 ON p2.id = p.id
JOIN (
    SELECT 0 grp, 10005 author, '这是真的，亲测有效' content, 2 hours_ago UNION ALL
    SELECT 0, 10006, '哈哈哈笑到了', 3 UNION ALL
    SELECT 0, 10007, '蹲一个后续更新', 5 UNION ALL
    SELECT 0, 10008, '学到了，感谢分享', 7 UNION ALL
    SELECT 1, 10009, '同款经历，握手', 4 UNION ALL
    SELECT 1, 10010, '支持一下楼主', 6 UNION ALL
    SELECT 1, 10011, '这个必须收藏', 9 UNION ALL
    SELECT 1, 10012, '说得在理', 11 UNION ALL
    SELECT 2, 10013, '太优秀了吧', 5 UNION ALL
    SELECT 2, 10014, '求教程，在线等', 8 UNION ALL
    SELECT 2, 10015, '拍得真好看', 10 UNION ALL
    SELECT 2, 10016, '今天也去了同款地方', 13 UNION ALL
    SELECT 3, 10017, '楼主加油，看好你', 6 UNION ALL
    SELECT 3, 10018, '这个有意思', 9 UNION ALL
    SELECT 3, 10019, '涨知识了', 12 UNION ALL
    SELECT 3, 10020, '路过帮顶', 15 UNION ALL
    SELECT 4, 10021, '氛围感拉满', 7 UNION ALL
    SELECT 4, 10022, '第一次听说，长见识', 11 UNION ALL
    SELECT 4, 10023, '已转发给同学', 14 UNION ALL
    SELECT 4, 10024, '希望多更新', 17 UNION ALL
    SELECT 5, 10025, '好心动啊', 8 UNION ALL
    SELECT 5, 10026, '文笔真好', 13 UNION ALL
    SELECT 5, 10027, '这也太棒了', 16 UNION ALL
    SELECT 5, 10028, '评论区和谐讨论', 19
) m ON m.grp = (p2.rn MOD 6)
WHERE NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

-- ========== 6. 楼中楼种子（comments.parent_id，贴吧式嵌套回复） ==========
-- 每帖前 4 条根评论各插 1 条子回复（作者取种子用户，时间在根评论之后，幂等）
INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, m.author, m.content, c.id, DATE_ADD(c.created_at, INTERVAL m.minutes_after MINUTE)
FROM comments c
JOIN (
    -- 每帖根评论排行（parent_id IS NULL）
    SELECT id, ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY id) AS rn
    FROM comments
) rc ON rc.id = c.id
JOIN (
    SELECT 1 rn, 10005 author, '同感，顶一下' content, 30 minutes_after UNION ALL
    SELECT 2, 10006, '附议楼上', 45 UNION ALL
    SELECT 3, 10007, '说得太对了', 60 UNION ALL
    SELECT 4, 10008, '我也这么想', 75
) m ON m.rn = rc.rn
WHERE c.parent_id IS NULL AND rc.rn <= 4
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = m.content);

-- ========== 7. 评论点赞种子（comment_likes） ==========
-- 全部根评论取前 40 条，虚拟用户 10005-10008 按 (rn + uid) MOD 3 过滤分布点赞（观感自然），幂等
INSERT INTO comment_likes (comment_id, user_id, created_at)
SELECT c.id, m.uid, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM comments c
JOIN (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM comments WHERE parent_id IS NULL
) rc ON rc.id = c.id
JOIN (
    SELECT 10005 uid, 3 hours_ago UNION ALL
    SELECT 10006, 5 UNION ALL
    SELECT 10007, 8 UNION ALL
    SELECT 10008, 12
) m ON 1 = 1
WHERE rc.rn <= 40 AND ((rc.rn + m.uid) MOD 3) = 0
  AND NOT EXISTS (SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = m.uid);

-- ========== 8. 评论计数同步（comments_count 与实际数对齐，只升不降） ==========
UPDATE posts p
SET p.comments_count = (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)
WHERE p.author_id BETWEEN 10001 AND 10050
  AND p.comments_count < (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE post_id IN (SELECT id FROM posts WHERE author_id BETWEEN 10001 AND 10050));
-- DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE author_id BETWEEN 10001 AND 10050) AND content IN ('这是真的，亲测有效', '哈哈哈笑到了', '蹲一个后续更新', '学到了，感谢分享', '同款经历，握手', '支持一下楼主', '这个必须收藏', '说得在理', '太优秀了吧', '求教程，在线等', '拍得真好看', '今天也去了同款地方', '楼主加油，看好你', '这个有意思', '涨知识了', '路过帮顶', '氛围感拉满', '第一次听说，长见识', '已转发给同学', '希望多更新', '好心动啊', '文笔真好', '这也太棒了', '评论区和谐讨论', '同感，顶一下', '附议楼上', '说得太对了', '我也这么想');
-- DELETE FROM post_view_history WHERE post_id IN (SELECT id FROM posts WHERE author_id BETWEEN 10001 AND 10050);
-- DELETE FROM post_favorites WHERE post_id IN (SELECT id FROM posts WHERE author_id BETWEEN 10001 AND 10050);
-- DELETE FROM post_likes WHERE post_id IN (SELECT id FROM posts WHERE author_id BETWEEN 10001 AND 10050);
