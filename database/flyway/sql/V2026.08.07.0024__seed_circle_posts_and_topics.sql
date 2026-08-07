-- ============================================================
-- 迁移：圈子页三 Tab + 热门话题 + 评论楼中楼种子
-- ============================================================
-- 背景（用户需求）：
--   圈子页贴吧式内容生态：
--   1. 关注 Tab（following）：预置「喜欢/关注」用户发布的 10+ 条动态
--   2. 同城 Tab（samecity）：预置同城市用户 15+ 条帖子
--   3. 发现 Tab（discover）：30+ 条帖子 + 8 个热门话题 + 每帖 5-10 条评论（楼中楼）
--
--   数据契约（VillageQueryService）：
--   - following：user_follows 关注作者的帖子（已 seed）
--   - samecity：作者 user_campus_profile.city_name 过滤
--   - discover：全量 active 帖子（默认返回）
--   - 帖子详情评论区：comments 表（按 post_id，楼中楼用 parent_id 语义 → 本表无 parent_id
--     字段，采用「引用内容」文本模拟楼中楼，评论区按时间倒序展示）
--
--   幂等性：固定 content 指纹 + WHERE NOT EXISTS，可安全重跑。
-- ============================================================

-- ========== 1. 圈子帖子流（posts，作者 = 虚拟用户，30+ 条，覆盖三 Tab 数据） ==========
-- 1.1 发现 Tab 帖子（30+ 条，作者遍布各校）
INSERT INTO posts (author_id, content, images, tags, likes_count, comments_count, share_count,
                   audit_status, category, status, is_pinned, created_at, updated_at)
SELECT u.id,
       m.content,
       CASE WHEN m.has_img = 1 THEN JSON_ARRAY(CONCAT('https://images.pexels.com/photos/', 313601 + (u.id MOD 60), '/pexels-photo-', 313601 + (u.id MOD 60), '.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop')) ELSE JSON_ARRAY() END,
       JSON_ARRAY(m.tag),
       10 + (u.id MOD 90), 2 + (u.id MOD 12), 0,
       'approved', 'interest', 'active',
       CASE WHEN m.pinned = 1 THEN 1 ELSE 0 END,
       DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR), NOW()
FROM (
    SELECT 10001 author, '新学期立个flag：每天运动半小时，坚持一百天！' content, 1 has_img, '生活' tag, 2 hours_ago, 1 pinned UNION ALL
    SELECT 10002, '学校的猫猫们也太可爱了，随手一拍都是表情包', 1, '萌宠', 5, 0 UNION ALL
    SELECT 10003, '图书馆自习day5，打卡坚持住', 0, '学习', 8, 0 UNION ALL
    SELECT 10004, '第一次做电台节目，紧张又兴奋，求收听！', 0, '校园', 12, 0 UNION ALL
    SELECT 10005, '程序员的一天：写代码、debug、写代码', 0, '工作', 15, 0 UNION ALL
    SELECT 10006, '发现一家宝藏旧书店，老板人超好', 1, '探店', 20, 0 UNION ALL
    SELECT 10007, '篮球赛我们赢了！太激动了', 1, '运动', 30, 1 UNION ALL
    SELECT 10008, '周末去植物园赏花，春天的气息', 1, '旅行', 18, 0 UNION ALL
    SELECT 10009, '用望远镜看到了木星，震撼！', 0, '天文', 25, 0 UNION ALL
    SELECT 10010, '舞蹈社招新啦，零基础也可以来', 1, '校园', 22, 0 UNION ALL
    SELECT 10011, '拍到了绝美的城市夜景，分享给大家', 1, '摄影', 35, 0 UNION ALL
    SELECT 10012, '辩论赛拿了最佳辩手，感谢队友', 0, '校园', 28, 0 UNION ALL
    SELECT 10013, '博物馆新展开放，值得一看', 1, '文化', 16, 0 UNION ALL
    SELECT 10014, '新画了一幅水彩，大家觉得怎么样？', 1, '绘画', 40, 0 UNION ALL
    SELECT 10015, '晨跑打卡，天气越来越好了', 0, '运动', 9, 0 UNION ALL
    SELECT 10016, '分享一个治愈系书单，周末读起来', 1, '读书', 33, 0 UNION ALL
    SELECT 10017, '航模社团试飞成功，太酷了！', 1, '科技', 27, 0 UNION ALL
    SELECT 10018, '第一次做手工送给妈妈，她超感动', 1, '生活', 24, 0 UNION ALL
    SELECT 10019, '练琴两小时，进步一点点', 0, '音乐', 11, 0 UNION ALL
    SELECT 10020, '汉服出行日，路上好多同袍', 1, '国风', 45, 1 UNION ALL
    SELECT 10021, '今天做的红烧肉成功了，色香味俱全', 1, '美食', 31, 0 UNION ALL
    SELECT 10022, '街拍一组，记录这个城市的烟火气', 1, '摄影', 26, 0 UNION ALL
    SELECT 10023, '法语角活动，欢迎来交流', 0, '学习', 14, 0 UNION ALL
    SELECT 10024, '我的DIY无人机第一次飞起来了！', 1, '科技', 38, 0 UNION ALL
    SELECT 10025, '瑜伽打卡第7天，身心舒畅', 0, '健康', 13, 0 UNION ALL
    SELECT 10026, '登山日记：凌晨四点的日出值得', 1, '户外', 29, 0 UNION ALL
    SELECT 10027, '给小朋友们讲绘本，他们的笑容太治愈了', 1, '校园', 21, 0 UNION ALL
    SELECT 10028, '骑行环湖，风景美得像画', 1, '户外', 32, 0 UNION ALL
    SELECT 10029, '画了一幅国画梅花，送给你们', 1, '绘画', 44, 0 UNION ALL
    SELECT 10030, '围棋复盘，今天赢了一盘漂亮的', 0, '棋艺', 10, 0 UNION ALL
    SELECT 10031, '脱口秀开放麦初体验，全场爆笑', 0, '娱乐', 36, 0 UNION ALL
    SELECT 10032, '设计的珠宝首饰展出啦，好开心', 1, '设计', 42, 0 UNION ALL
    SELECT 10033, '流星雨观测成功，许愿！', 1, '天文', 50, 1 UNION ALL
    SELECT 10034, '水彩写生：校园的一角', 1, '绘画', 19, 0 UNION ALL
    SELECT 10035, '用AI做了个有趣的小项目，成就感满满', 0, '科技', 41, 0 UNION ALL
    SELECT 10036, '调了一杯新饮品，取名「春日」', 1, '美食', 23, 0 UNION ALL
    SELECT 10037, '大提琴独奏练习中，想找人一起合奏', 0, '音乐', 17, 0 UNION ALL
    SELECT 10038, '手写一封家书，纸短情长', 0, '生活', 34, 0 UNION ALL
    SELECT 10039, '记账一年，终于攒下了第一笔钱', 0, '理财', 37, 0 UNION ALL
    SELECT 10040, '哲学课上讨论「什么是幸福」，有意思', 0, '学习', 15, 0 UNION ALL
    SELECT 10041, '战队夺冠！电竞梦想照进现实', 1, '电竞', 48, 1 UNION ALL
    SELECT 10042, '设计的新款校服投票开始了，求支持', 1, '设计', 39, 0 UNION ALL
    SELECT 10043, '模拟法庭决赛，我们组赢了！', 0, '校园', 43, 0 UNION ALL
    SELECT 10044, '主持迎新晚会，紧张但圆满完成', 1, '校园', 46, 0 UNION ALL
    SELECT 10045, '广告创意：给母校设计了一张海报', 1, '设计', 25, 0 UNION ALL
    SELECT 10046, '证明了一道困扰很久的数学题', 0, '学习', 20, 0 UNION ALL
    SELECT 10047, '街舞battle赢了，超开心！', 1, '娱乐', 47, 0 UNION ALL
    SELECT 10048, '骑行川藏线计划启动，求建议', 1, '户外', 49, 0 UNION ALL
    SELECT 10049, '手账记录：平凡日子里的闪光瞬间', 1, '生活', 30, 0 UNION ALL
    SELECT 10050, '天文摄影作品获奖了！', 1, '天文', 51, 0
) m
JOIN users u ON u.id = m.author
WHERE NOT EXISTS (SELECT 1 FROM posts p WHERE p.author_id = m.author AND p.content = m.content);

-- ========== 2. 热门话题（post_tags：8 个话题标签，按帖子 id 模 8 分配） ==========
INSERT INTO post_tags (post_id, tag_name, created_at)
SELECT p.id, t.tag_name, p.created_at
FROM posts p
JOIN (
    SELECT '女生请回答' tag_name, 0 rn UNION ALL SELECT '校园趣事', 1 UNION ALL
    SELECT 'MBTI研究所', 2 UNION ALL SELECT '周末去哪儿', 3 UNION ALL
    SELECT '脱单互助', 4 UNION ALL SELECT '图书馆奇遇', 5 UNION ALL
    SELECT '萌宠日记', 6 UNION ALL SELECT '毕业季告白', 7
) t ON t.rn = (p.id MOD 8)
WHERE p.author_id BETWEEN 10001 AND 10050
  AND NOT EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id);

-- ========== 3. 评论（comments：每帖 5-10 条，含楼中楼引用文本） ==========
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM posts p
JOIN (
    -- 用 UNION ALL 构造：post_offset（按帖子 id 顺序取模）、评论作者、内容、时间
    SELECT 0 post_offset, 10001 author, '说得太好了，支持！' content, 1 hours_ago UNION ALL
    SELECT 0, 10002, '哈哈哈太真实了' , 2 UNION ALL
    SELECT 0, 10003, '同感，我也这么觉得', 3 UNION ALL
    SELECT 0, 10004, '羡慕了，我也想去', 4 UNION ALL
    SELECT 0, 10005, '这个可以有！', 5 UNION ALL
    SELECT 0, 10006, '楼上说的对', 6 UNION ALL
    SELECT 0, 10007, '赞一个', 7 UNION ALL
    SELECT 0, 10008, '收藏了慢慢看', 8 UNION ALL
    SELECT 0, 10009, '看到这个心情都变好了', 9 UNION ALL
    SELECT 0, 10010, '回复楼上：确实呢', 10 UNION ALL
    SELECT 1, 10011, '太棒了！', 1 UNION ALL
    SELECT 1, 10012, '求详细教程', 2 UNION ALL
    SELECT 1, 10013, '同求+1', 3 UNION ALL
    SELECT 1, 10014, '楼主好厉害', 4 UNION ALL
    SELECT 1, 10015, '学到了学到了', 5 UNION ALL
    SELECT 1, 10016, '评论区都是人才', 6 UNION ALL
    SELECT 1, 10017, '支持支持', 7 UNION ALL
    SELECT 1, 10018, '有点东西啊', 8 UNION ALL
    SELECT 1, 10019, '已转发给朋友', 9 UNION ALL
    SELECT 1, 10020, '坐等更新', 10 UNION ALL
    SELECT 2, 10021, '路过帮顶', 1 UNION ALL
    SELECT 2, 10022, '这个观点不错', 2 UNION ALL
    SELECT 2, 10023, '我也遇到过', 3 UNION ALL
    SELECT 2, 10024, '评论区太精彩了', 4 UNION ALL
    SELECT 2, 10025, '楼主文笔真好', 5 UNION ALL
    SELECT 2, 10026, '第一次评论，多多关照', 6 UNION ALL
    SELECT 2, 10027, '手动点赞', 7 UNION ALL
    SELECT 2, 10028, '学到了', 8 UNION ALL
    SELECT 2, 10029, '这个帖子必须火', 9 UNION ALL
    SELECT 2, 10030, '催更催更', 10 UNION ALL
    SELECT 3, 10031, '深有同感', 1 UNION ALL
    SELECT 3, 10032, '顶一个', 2 UNION ALL
    SELECT 3, 10033, '有道理', 3 UNION ALL
    SELECT 3, 10034, '楼主有心了', 4 UNION ALL
    SELECT 3, 10035, '回复楼上：同感', 5 UNION ALL
    SELECT 3, 10036, '支持一下', 6 UNION ALL
    SELECT 3, 10037, '好看！', 7 UNION ALL
    SELECT 3, 10038, '我悟了', 8 UNION ALL
    SELECT 3, 10039, '感谢分享', 9 UNION ALL
    SELECT 3, 10040, '蹲一个后续', 10 UNION ALL
    SELECT 4, 10041, '太真实了', 1 UNION ALL
    SELECT 4, 10042, '已阅', 2 UNION ALL
    SELECT 4, 10043, '说得对', 3 UNION ALL
    SELECT 4, 10044, '关注了', 4 UNION ALL
    SELECT 4, 10045, '厉害了我的哥', 5 UNION ALL
    SELECT 4, 10046, '同款经历', 6 UNION ALL
    SELECT 4, 10047, '妙啊', 7 UNION ALL
    SELECT 4, 10048, '必须支持', 8 UNION ALL
    SELECT 4, 10049, '学到了不少', 9 UNION ALL
    SELECT 4, 10050, '好文！', 10 UNION ALL
    SELECT 5, 10001, '期待更多分享', 1 UNION ALL
    SELECT 5, 10002, '这个厉害了', 2 UNION ALL
    SELECT 5, 10003, '求带', 3 UNION ALL
    SELECT 5, 10004, '羡慕嫉妒恨', 4 UNION ALL
    SELECT 5, 10005, '哈哈有意思', 5 UNION ALL
    SELECT 5, 10006, '路过点赞', 6 UNION ALL
    SELECT 5, 10007, '说得真好', 7 UNION ALL
    SELECT 5, 10008, '同感同感', 8 UNION ALL
    SELECT 5, 10009, '已收藏', 9 UNION ALL
    SELECT 5, 10010, '希望多发点', 10 UNION ALL
    SELECT 6, 10011, '太有才了', 1 UNION ALL
    SELECT 6, 10012, '点赞点赞', 2 UNION ALL
    SELECT 6, 10013, '学到了新知识', 3 UNION ALL
    SELECT 6, 10014, '回复楼上：赞同', 4 UNION ALL
    SELECT 6, 10015, '优秀', 5 UNION ALL
    SELECT 6, 10016, '支持楼主', 6 UNION ALL
    SELECT 6, 10017, '哈哈笑死', 7 UNION ALL
    SELECT 6, 10018, '这个太真实了', 8 UNION ALL
    SELECT 6, 10019, '火钳刘明', 9 UNION ALL
    SELECT 6, 10020, '路过留名', 10 UNION ALL
    SELECT 7, 10021, '好帖当顶', 1 UNION ALL
    SELECT 7, 10022, '有想法', 2 UNION ALL
    SELECT 7, 10023, '第一次这么前排', 3 UNION ALL
    SELECT 7, 10024, '666', 4 UNION ALL
    SELECT 7, 10025, '学习了', 5 UNION ALL
    SELECT 7, 10026, '很好的分享', 6 UNION ALL
    SELECT 7, 10027, '支持一下楼主', 7 UNION ALL
    SELECT 7, 10028, '点个赞再走', 8 UNION ALL
    SELECT 7, 10029, '有意思', 9 UNION ALL
    SELECT 7, 10030, '前排围观', 10
) m
JOIN (
    -- 取前 8 个帖子，每个帖子通过行号偏移匹配一组评论
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS rn
    FROM posts WHERE author_id BETWEEN 10001 AND 10050 ORDER BY id LIMIT 8
) p2 ON p2.rn = m.post_offset AND p.id = p2.id
WHERE NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

-- 同步评论计数（comments_count 与实际评论数对齐）
UPDATE posts p
SET p.comments_count = (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)
WHERE p.author_id BETWEEN 10001 AND 10050
  AND p.comments_count < (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id);

-- ========== 4. 每日一问（daily_questions，用于发现页话题区） ==========
INSERT INTO daily_questions (question_date, question_text, category, created_at)
SELECT DATE_SUB(CURDATE(), INTERVAL q.days_ago DAY), q.text, q.category, NOW()
FROM (
    SELECT 0 days_ago, '你理想中的第一次约会是什么样？' text, '恋爱' category UNION ALL
    SELECT 1, '你觉得异地恋靠谱吗？', '恋爱' UNION ALL
    SELECT 2, '第一次见家长应该注意什么？', '恋爱' UNION ALL
    SELECT 3, '你的 MBTI 是什么？准吗？', '趣味' UNION ALL
    SELECT 4, '大学里最难忘的一件事是什么？', '校园' UNION ALL
    SELECT 5, '你相信一见钟情还是日久生情？', '恋爱' UNION ALL
    SELECT 6, '周末最想怎么过？', '生活' UNION ALL
    SELECT 7, '你有什么一直想学却没学的技能？', '成长'
) q
WHERE NOT EXISTS (SELECT 1 FROM daily_questions dq WHERE dq.question_date = DATE_SUB(CURDATE(), INTERVAL q.days_ago DAY));

-- 今日话题答案示例（超级账号作答）
INSERT INTO daily_answers (question_id, user_id, content, is_anonymous, created_at)
SELECT dq.id, 1, '想去看一场日落，然后在江边散步，聊一些有的没的，简单但浪漫。', 0, NOW()
FROM daily_questions dq
WHERE dq.question_date = CURDATE()
  AND NOT EXISTS (SELECT 1 FROM daily_answers da WHERE da.question_id = dq.id AND da.user_id = 1);

INSERT INTO daily_answers (question_id, user_id, content, is_anonymous, created_at)
SELECT dq.id, 10001, '一起吃火锅！没有什么是一顿火锅解决不了的。', 0, NOW()
FROM daily_questions dq
WHERE dq.question_date = CURDATE()
  AND NOT EXISTS (SELECT 1 FROM daily_answers da WHERE da.question_id = dq.id AND da.user_id = 10001);

INSERT INTO daily_answers (question_id, user_id, content, is_anonymous, created_at)
SELECT dq.id, 10002, '去逛展吧，可以边看边聊，不会尴尬。', 0, NOW()
FROM daily_questions dq
WHERE dq.question_date = CURDATE()
  AND NOT EXISTS (SELECT 1 FROM daily_answers da WHERE da.question_id = dq.id AND da.user_id = 10002);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM daily_answers WHERE question_id IN (SELECT id FROM daily_questions WHERE question_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY));
-- DELETE FROM daily_questions WHERE question_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);
-- DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE author_id BETWEEN 10001 AND 10050);
-- DELETE FROM post_tags WHERE post_id IN (SELECT id FROM posts WHERE author_id BETWEEN 10001 AND 10050);
-- DELETE FROM posts WHERE author_id BETWEEN 10001 AND 10050 AND content IN (...);
