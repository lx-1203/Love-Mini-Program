-- ============================================================
-- 迁移：校园话题种子（每所已存在学校 8-10 条，P0-19）
-- ============================================================
-- 背景：
--   校园话题页此前零种子数据，已绑定学校用户访问校园话题只能看到空列表。
--   本迁移为 schools 表已存在的每所学校插入 9 条 campus_topics，
--   分类与客户端 filter-options 一致（course_exchange/club_recruitment/
--   campus_activity/study_help/life_service/alumni_news）。
--
--   关联方式：campus_topics.school_id = schools.id（按 name 关联）；
--   作者固定为该校已有的虚拟用户（author_id 用 CASE 按校名映射，
--   兜底 id=1 超级测试账号），与 V2026.08.07.0021/0022 种子数据对齐。
--
--   幂等性：WHERE NOT EXISTS（school_id + title），可安全重跑。
-- ============================================================

INSERT INTO campus_topics (school_id, category, title, content, author_id,
                           reply_count, view_count, is_anonymous, created_at, updated_at)
SELECT s.id, m.category, m.title, REPLACE(m.content, '{school}', s.name),
       COALESCE(CASE s.name
           WHEN '南京大学' THEN 10007
           WHEN '浙江大学' THEN 10009
           WHEN '复旦大学' THEN 10005
           WHEN '武汉大学' THEN 10011
           ELSE 10013 END, 1),
       m.reply_count, m.view_count, 0,
       DATE_SUB(NOW(), INTERVAL m.days_ago DAY), NOW()
FROM schools s
JOIN (
    SELECT 'study_help' AS category, '考研自习室占座攻略' AS title, '{school}图书馆考研专区座位一直很紧张，分享几个实测有效的小技巧：早起十分钟、错峰去负一层、提前一天在预约系统锁座。祝大家一战成硕！' AS content, 3 AS reply_count, 156 AS view_count, 2 AS days_ago UNION ALL
    SELECT 'club_recruitment' AS category, '摄影社春季招新' AS title, '摄影社春季招新开始啦！零基础也可以加入，有学长学姐手把手带拍，定期组织校园外拍和棚拍活动。报名地点：{school}学生活动中心二楼。' AS content, 5 AS reply_count, 98 AS view_count, 1 AS days_ago UNION ALL
    SELECT 'campus_activity' AS category, '校园文化节周末开幕' AS title, '本周末{school}校园文化节开幕，现场有社团路演、美食集市和灯光秀，听说还有神秘嘉宾。欢迎大家来玩，记得穿得美美的拍照打卡！' AS content, 8 AS reply_count, 210 AS view_count, 3 AS days_ago UNION ALL
    SELECT 'course_exchange' AS category, '高数期中复习资料分享' AS title, '整理了{school}高数期中考试的复习要点和历年真题，需要的同学评论区留言，也可以私信我，免费分享给大家，祝考试顺利！' AS content, 12 AS reply_count, 320 AS view_count, 4 AS days_ago UNION ALL
    SELECT 'life_service' AS category, '食堂新窗口测评' AS title, '{school}二食堂新开的窗口去试过了，麻辣香锅分量很足，价格也比外面实惠。二楼的面包房现烤的可颂也不错，推荐！' AS content, 6 AS reply_count, 176 AS view_count, 5 AS days_ago UNION ALL
    SELECT 'alumni_news' AS category, '校友企业宣讲会预告' AS title, '下周三{school}校友企业专场宣讲会将在报告厅举行，多家知名企业HR到场，还有内推名额。建议大三大四同学提前准备好简历。' AS content, 4 AS reply_count, 142 AS view_count, 6 AS days_ago UNION ALL
    SELECT 'study_help' AS category, '英语四六级备考互助' AS title, '四六级考试临近，建了一个{school}备考互助群，每天打卡背单词、互改作文。想一起上岸的同学滴滴我！' AS content, 7 AS reply_count, 88 AS view_count, 2 AS days_ago UNION ALL
    SELECT 'campus_activity' AS category, '春季运动会志愿者招募' AS title, '{school}春季运动会需要三十名志愿者，主要负责检录和后勤，有志愿时长和纪念品。报名截止本周五，名额有限先到先得！' AS content, 9 AS reply_count, 205 AS view_count, 7 AS days_ago UNION ALL
    SELECT 'life_service' AS category, '校园快递代收点地图' AS title, '整理了一份{school}各快递代收点分布图，菜鸟驿站、顺丰点、京东点都标注了位置和营业时间，新生同学建议收藏！' AS content, 3 AS reply_count, 264 AS view_count, 1 AS days_ago
) m ON 1 = 1
WHERE NOT EXISTS (SELECT 1 FROM campus_topics t WHERE t.school_id = s.id AND t.title = m.title);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE t FROM campus_topics t JOIN schools s ON t.school_id = s.id WHERE s.name IN ('南京大学','浙江大学','复旦大学','武汉大学','东南大学');
