-- ============================================================
-- 迁移：为所有尚无话题的学校补充校园话题种子（P0-19 补充）
-- ============================================================
-- 背景：
--   V2026.08.08.0011 执行时 schools 表仅 6 所学校（1-6），其后的
--   V2026.08.08.0012 补齐了 12 所高校（19-30，含北京大学/清华大学等）。
--   本迁移为这些后补学校（以及未来任何无话题学校）补齐 9 条话题，
--   保证已绑定学校的用户校园话题页非空。
--
--   修复（R4-00424）：本迁移现已完全取代 V2026.08.08.0011（该文件已删除）——
--   0011 使用硬编码 author_id（10007/10009 等，与真实用户可能冲突）且与 0014 几乎
--   完全重复；本迁移对所有学校（含原 6 所）用子查询取该校已认证用户作作者，
--   幂等（WHERE NOT EXISTS）可安全补齐。已应用 0011 的库执行本迁移后话题作者
--   保持原样（已存在行跳过）；全新库仅执行本迁移，作者全部为真实认证用户。
--
--   幂等性：WHERE NOT EXISTS（school_id + title），可安全重跑。
--   作者：优先取该校已验证用户（user_campus_profile），兜底 id=1。
-- ============================================================

INSERT INTO campus_topics (school_id, category, title, content, author_id,
                           reply_count, view_count, is_anonymous, created_at, updated_at)
SELECT s.id, m.category, m.title, REPLACE(m.content, '{school}', s.name),
       COALESCE((SELECT ucp.user_id FROM user_campus_profile ucp
                  WHERE ucp.campus_name = s.name COLLATE utf8mb4_unicode_ci
                    AND ucp.verification_status = 'verified'
                  ORDER BY ucp.user_id LIMIT 1), 1),
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
