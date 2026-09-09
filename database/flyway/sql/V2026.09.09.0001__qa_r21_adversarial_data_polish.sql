-- ============================================================================
-- R21（2026-09-09）对抗验收数据修补：距离散点 / 标签丰富 / 未读角标 / 话题量级 / 时效
-- 对应第二轮对抗式审查发现：
--   · 附近的人多人连续相同「6km」——种子用户坐标完全相同；
--   · 匹配卡仅 2 个兴趣标签（理想 4 个）——user_basic_profile.interest_tags 种子过少；
--   · 寻觅助手入口卡无未读红点——体验账号（100151）通知全部已读；
--   · 兴趣圈列表「N 条动态」量级过小（1-3 条）；
--   · 社区动态帖子时间过旧（两周前），相对时间退化为绝对日期。
-- 幂等：UPDATE 天然幂等；INSERT 带 NOT EXISTS 守卫。
-- ============================================================================

-- 1) 演示用户地理坐标散点化（北师大坐标为基点，按 id 确定性偏移 0.3~3.5km）
UPDATE users
SET latitude  = 39.961300 + ((id MOD 40) + 1) * 0.0035,
    longitude = 116.370700 + ((id MOD 25) + 1) * 0.0045
WHERE id BETWEEN 10001 AND 100999
  AND id NOT IN (100000, 100001, 100002);

-- 2) 演示用户兴趣标签丰富到 4 个（JSON 数组整体覆写，语义幂等）
UPDATE user_basic_profile SET interest_tags = JSON_ARRAY('摄影', '电影', '旅行', '音乐')
WHERE user_id = 10002 AND (JSON_LENGTH(interest_tags) < 3 OR interest_tags IS NULL);

UPDATE user_basic_profile SET interest_tags = JSON_ARRAY('阅读', '摄影', '篮球', '音乐')
WHERE user_id = 10001 AND (JSON_LENGTH(interest_tags) < 3 OR interest_tags IS NULL);

UPDATE user_basic_profile SET interest_tags = JSON_ARRAY('插画', '心理学', '旅行', '摄影')
WHERE user_id = 100151 AND (JSON_LENGTH(interest_tags) < 3 OR interest_tags IS NULL);

-- 3) 体验账号（100151）未读通知补种（寻觅助手入口卡红点 / tab 角标数据源）
INSERT INTO notifications (user_id, source_user_id, reference_id, is_read, type, reference_type)
SELECT 100151, 10002, NULL, 0, 'like', 'user' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = 100151 AND source_user_id = 10002 AND type = 'like' AND is_read = 0);

INSERT INTO notifications (user_id, source_user_id, reference_id, is_read, type, reference_type)
SELECT 100151, 10005, NULL, 0, 'visitor', 'user' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = 100151 AND source_user_id = 10005 AND type = 'visitor' AND is_read = 0);

INSERT INTO notifications (user_id, source_user_id, reference_id, is_read, type, reference_type)
SELECT 100151, 10001, NULL, 0, 'like', 'user' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = 100151 AND source_user_id = 10001 AND type = 'like' AND is_read = 0);

-- 4) 圈子话题扩充（摄影/音乐/美食/宠物各补 4 条，音乐/宠物此前仅 1 条）
INSERT INTO circle_topics (circle_id, author_id, title, content, images, reply_count, is_pinned, audit_status)
SELECT * FROM (
    SELECT 8 AS circle_id, 10002 AS author_id, '人像摄影的用光入门' AS title,
           '逆光拍发丝、侧光拍轮廓，整理了三种最容易上手的自然光位，附对比样片说明～' AS content,
           NULL AS images, 6 AS reply_count, 0 AS is_pinned, 'approved' AS audit_status
    UNION ALL SELECT 8, 10005, '手机也能拍出胶片感', '参数调对是关键：压高光、拉阴影、白平衡偏黄，后三张都是手机直出。', NULL, 4, 0, 'approved'
    UNION ALL SELECT 8, 10009, '校园晚霞拍摄机位地图', '图书馆天台、西门操场看台、湖心亭三个机位，日落后二十分钟是黄金窗口。', NULL, 8, 0, 'approved'
    UNION ALL SELECT 8, 10012, '微单镜头求推荐', '预算 2000 想拍人像和夜景，在 35 定焦和 50 定焦之间纠结，求过来人指点～', NULL, 5, 0, 'approved'
    UNION ALL SELECT 10, 10004, '吉他社期中汇演招募', '会三个和弦就能上台！本期曲目单已出，报名截至周三晚上。', NULL, 3, 0, 'approved'
    UNION ALL SELECT 10, 10007, '一个人去 livehouse 尴尬吗', '完全不！前排都是一个人来的，散场还能认识几个同好，这周想去看后摇现场。', NULL, 7, 0, 'approved'
    UNION ALL SELECT 10, 10011, '民谣翻唱合集（宿舍版）', '用宿舍扫把当麦克风录的合集，跑调预警但快乐拉满，欢迎点歌～', NULL, 4, 0, 'approved'
    UNION ALL SELECT 12, 10006, '二食堂三楼新开的麻辣香锅', '称重自助，人均 15， Beatles 拌饭酱是灵魂，去晚了要排队。', NULL, 9, 0, 'approved'
    UNION ALL SELECT 12, 10010, '校门口那家烤冷面测评', '连吃五天得出的结论：加两份料才是完全体，甜辣酱比蒜蓉酱更配。', NULL, 5, 0, 'approved'
    UNION ALL SELECT 12, 10013, '宿舍电煮锅食谱交换', '芝士年糕、咖喱乌冬、可乐鸡翅一键焖，宿舍党求生指南互相补充～', NULL, 6, 0, 'approved'
    UNION ALL SELECT 15, 10003, '柯基 meeting 每周六', '学校东门小公园，柯基屁股聚会固定周六下午四点，欢迎遛狗顺路来玩。', NULL, 4, 0, 'approved'
    UNION ALL SELECT 15, 10008, '流浪猫投喂点地图更新', '图书馆后门、南门传达室、三食堂侧门三个点位，猫粮由社团统一采购。', NULL, 8, 0, 'approved'
    UNION ALL SELECT 15, 10014, '猫咪名字征集', '后门新来的三花小猫求起名，目前候选：汤圆、煤球、布丁，评论区投票～', NULL, 12, 0, 'approved'
) seed
WHERE NOT EXISTS (
    SELECT 1 FROM circle_topics t WHERE t.circle_id = seed.circle_id AND t.title = seed.title
);

-- 5) 帖子时间刷新到近 72 小时内（相对时间「N 小时前/N 天前」可读，杜绝绝对日期退化）
UPDATE posts
SET created_at = NOW()
    - INTERVAL ((id * 7) MOD 60) HOUR
    - INTERVAL ((id * 13) MOD 50) MINUTE
WHERE status = 'active'
  AND created_at < NOW() - INTERVAL 72 HOUR;
