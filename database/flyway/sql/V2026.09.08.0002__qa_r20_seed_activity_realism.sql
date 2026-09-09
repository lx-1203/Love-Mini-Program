-- ============================================================================
-- R20（2026-09-08）演示数据补全：活动 / 圈子话题 / 悄悄话 / 官方文案
-- 背景：QA 清理（0001）后部分板块数据过空，页面观感与理想图差距大：
--   · 活动全部 ended/published=0 → 消息页「活动推荐」退化为推广卡、附近页活动区为空；
--   · 旅行/运动/游戏/阅读 4 个标准圈 0 话题 → 兴趣圈列表恒显「0 条动态」；
--   · 广播文案自称「产品助手」与「寻觅助手」人设不符；
--   · 体验账号（100151）缺悄悄话 → 首页「条悄悄话」恒 0（0001 只补了超管）。
-- 幂等：INSERT 均带唯一键判重或 NOT EXISTS 守卫；UPDATE 语义幂等。
-- ============================================================================

-- 1) 官方广播文案对齐「寻觅助手」人设
UPDATE official_messages
SET content = '你好，我是寻觅助手 🌱 有任何恋爱困惑、功能使用问题都可以问我～'
WHERE content LIKE '%产品助手%';

-- 2) 图文不符修正：夜景攻略帖不再挂白天人像图
UPDATE circle_topics SET images = NULL WHERE title LIKE '%夜景%';

-- 3) 即将开始的活动补种（消息页活动推荐 / 附近页活动区 / 助手活动卡数据源）
UPDATE activities SET published = 1, status = 'upcoming', activity_date = '2026-09-13'
WHERE id = 4; -- 骑行踏春活动
UPDATE activities SET published = 1, status = 'upcoming', activity_date = '2026-09-14'
WHERE id = 7; -- 读书分享会
UPDATE activities SET published = 1, status = 'upcoming', activity_date = '2026-09-12'
WHERE id = 9; -- 周末篮球友谊赛

INSERT INTO activities (title, location, schedule_text, description, city_name, campus_name,
                        enrollment_count, activity_date, status, published, category, cover_image)
SELECT '城市露营计划', '中央公园草坪区', '周六 14:00-18:00',
       '一起搭帐篷、野餐、看日落，边玩边认识新朋友！装备由组织方提供，自带一份小零食即可参加～',
       '北京市', '北京大学', 12, '2026-09-13', 'upcoming', 1, 'outdoor', NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE title = '城市露营计划' AND published = 1);

INSERT INTO activities (title, location, schedule_text, description, city_name, campus_name,
                        enrollment_count, activity_date, status, published, category, cover_image)
SELECT '中秋游园夜话会', '未名湖畔草坪', '中秋当晚 18:30-21:30',
       '提灯夜游、月饼DIY、星空夜话专场。一个人来的同学可以找举灯笼的工作人员组队破冰～',
       '北京市', '北京师范大学', 20, '2026-09-15', 'upcoming', 1, 'social', NULL
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE title = '中秋游园夜话会' AND published = 1);

-- 4) 标准圈话题补种（旅行/运动/游戏/阅读 0 话题；摄影/美食/宠物少量补充）
--    内容均为真实校园场景话术，不含验收字样
INSERT INTO circle_topics (circle_id, author_id, title, content, images, reply_count, is_pinned, audit_status)
SELECT * FROM (
    SELECT 9 AS circle_id, 10001 AS author_id, '青海湖环湖骑行招募' AS title,
           '国庆前约一波环湖骑行，4 天行程，已有 2 人确定出发，求 2-4 位时间合适的同学～' AS content,
           NULL AS images, 3 AS reply_count, 0 AS is_pinned, 'approved' AS audit_status
    UNION ALL SELECT 9, 10003, '第一次独自旅行是什么体验？', '上个月自己去了趟大理，学会了做攻略、砍价和问路。想听听大家的第一次独自出行故事～', NULL, 5, 0, 'approved'
    UNION ALL SELECT 9, 10006, '周末citywalk路线分享', '把南锣-什刹海-鼓楼串成一条线，边走边拍，3 小时刚好，日落时分在银锭桥收尾绝美。', NULL, 2, 0, 'approved'
    UNION ALL SELECT 9, 10008, '学生党穷游攻略互助贴', '假期想去重庆玩 3 天，预算 1500 以内，求过来人分享住宿区域和交通建议～', NULL, 4, 0, 'approved'
    UNION ALL SELECT 11, 10002, '羽毛球固定局招人', '每周三晚 8 点体育馆 3 号场地，固定 4 人局缺 1 位，水平相当优先～', NULL, 3, 0, 'approved'
    UNION ALL SELECT 11, 10005, '夜跑搭子长期招募', '操场 5 圈起步，配速 6 分半，跑完一起拉伸聊天。风雨无阻型选手优先！', NULL, 6, 0, 'approved'
    UNION ALL SELECT 11, 10007, '三分球大赛报名开启', '月底院系三分赛，目前报名 12 人，冠军奖品是签名篮球一枚，来挑战？', NULL, 2, 0, 'approved'
    UNION ALL SELECT 13, 10004, '剧本杀组车：校园本', '周六下午 6 人本《毕业前夜》，3 男 3 女限招，新手友好，地点南门剧本社～', NULL, 5, 0, 'approved'
    UNION ALL SELECT 13, 10009, 'Switch 马车联机找队友', '代码放评论区，晚上 9 点后在线，语音开麦，欢乐局不喷人。', NULL, 3, 0, 'approved'
    UNION ALL SELECT 13, 10012, '桌游新人类求带', '只会斗地主的大学生想学德州和狼人杀，线下线上都可以，脾气好不玻璃心～', NULL, 4, 0, 'approved'
    UNION ALL SELECT 14, 10006, '九月共读打卡：《月亮与六便士》', '月底线下茶话会交流，目前 8 人参加。进度表在圈子公告里，随时可以加入～', NULL, 7, 0, 'approved'
    UNION ALL SELECT 14, 10010, '图书馆不许错过的角落', '三楼西侧靠窗那排座位，下午的阳光刚好打在书页上，学习氛围直接拉满。', NULL, 2, 0, 'approved'
    UNION ALL SELECT 14, 10013, '有没有互换书友的', '我这里有东野圭吾全集和三体三部曲，想换些散文或历史类，诚信交换～', NULL, 3, 0, 'approved'
) seed
WHERE NOT EXISTS (
    SELECT 1 FROM circle_topics t WHERE t.circle_id = seed.circle_id AND t.title = seed.title
);

-- 5) 体验账号（100151）悄悄话补种（首页「条悄悄话」不再恒 0）
INSERT INTO whisper_message (sender_id, receiver_id, content, status, client_request_id, price_cents)
SELECT 10002, 100151, '悄悄说：昨天社团招新看到你啦，你报名的社团我也想加～', 'delivered', 'seed-r20-whisper-g1', 200
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM whisper_message WHERE client_request_id = 'seed-r20-whisper-g1');

INSERT INTO whisper_message (sender_id, receiver_id, content, status, client_request_id, price_cents)
SELECT 10003, 100151, '昨晚路过琴房听到有人弹《天空之城》，是你吗？', 'sent', 'seed-r20-whisper-g2', 200
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM whisper_message WHERE client_request_id = 'seed-r20-whisper-g2');

-- 6) 帖子文案与配图场景对齐（西湖骑行帖实际配图为海岸悬崖照）
UPDATE posts SET content = '今天和骑行社的朋友沿海岸线骑了一圈，海风和崖景太治愈了，求偶遇同好！#骑行 #踏春'
WHERE id = 220 AND content LIKE '%西湖%';
