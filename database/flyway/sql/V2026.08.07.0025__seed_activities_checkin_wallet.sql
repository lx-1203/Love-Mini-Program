-- ============================================================
-- 迁移：活动 + 签到 + 积分/交友币 + 语音介绍 + 官方消息 + 外链配置种子
-- ============================================================
-- 背景（用户需求）：
--   1. 活动：5+ 个官方活动（已上架 + 已结束混合），消息页官方号推送
--   2. 签到系统：超级账号预置签到记录、连续天数
--   3. 积分/交友币：钱包余额 + 获取/消费流水完整
--   4. 语音介绍：60 秒内语音 URL（免费 TTS 在线资源）
--   5. 外部跳转：恋爱咨询/课程/MBTI 测试 WebView 链接
--
--   幂等性：固定标识 + WHERE NOT EXISTS，可安全重跑。
-- ============================================================

-- ========== 1. 官方活动（activities，5+ 个） ==========
INSERT INTO activities (title, location, schedule_text, description, city_name, campus_name,
                        enrollment_count, participant_avatars, activity_date, status, published, created_at, updated_at)
SELECT m.title, m.location, m.schedule_text, m.description, m.city_name, m.campus_name,
       m.enrollment_count,
       JSON_ARRAY('https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
                  'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'),
       m.activity_date, m.status, m.published, NOW(), NOW()
FROM (
    SELECT '校园春日联谊会' title, '紫金校区体育馆' location, '3月15日 14:00-17:00' schedule_text,
           '一场轻松的春日联谊会，有破冰游戏、桌游互动、自由交流，帮你认识同校有趣的人。' description,
           '北京' city_name, '北京大学' campus_name, 36 enrollment_count, DATE_ADD(CURDATE(), INTERVAL 8 DAY) activity_date, 'upcoming' status, 1 published UNION ALL
    SELECT '周末桌游之夜', '南山路咖啡馆', '每周六 19:00-22:00', '狼人杀、UNO、剧本杀，桌游爱好者集合！现场提供零食和饮品。',
           '南京', '南京大学', 24, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'upcoming', 1 UNION ALL
    SELECT '校园歌手大赛决赛', '大学生活动中心', '4月1日 19:30', '年度校园歌手大赛决赛之夜，12 位选手巅峰对决，现场还有抽奖环节。',
           '武汉', '武汉大学', 120, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'upcoming', 1 UNION ALL
    SELECT '骑行踏春活动', '西湖风景区', '3月22日 09:00 集合', '环西湖骑行踏春，全程约 20 公里，途中安排补给点和摄影点，欢迎新手。',
           '杭州', '浙江大学', 42, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'upcoming', 1 UNION ALL
    SELECT '春季招聘会（往期）', '就业指导中心', '2月28日 09:00-16:00', '春季校园招聘会，80+ 企业到场，涵盖互联网、金融、教育等行业。',
           '上海', '复旦大学', 300, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'ended', 1 UNION ALL
    SELECT '迎新晚会（往期）', '大礼堂', '9月25日 19:00', '迎新晚会，各社团精彩演出，欢迎新同学。',
           '南京', '东南大学', 200, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'ended', 1 UNION ALL
    SELECT '读书分享会', '图书馆报告厅', '3月18日 18:30', '本期主题：你今年读过最打动你的一本书。欢迎带书来分享。',
           '北京', '清华大学', 18, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'upcoming', 1
) m
WHERE NOT EXISTS (SELECT 1 FROM activities a WHERE a.title = m.title AND a.activity_date = m.activity_date);

-- ========== 2. 超级账号签到记录（check_ins，连续 7 天） ==========
INSERT INTO check_ins (user_id, check_in_date, consecutive_days, source, created_at)
SELECT 1, DATE_SUB(CURDATE(), INTERVAL n.days_ago DAY), n.consecutive, 'NORMAL', NOW()
FROM (
    SELECT 0 days_ago, 7 consecutive UNION ALL SELECT 1, 6 UNION ALL SELECT 2, 5
    UNION ALL SELECT 3, 4 UNION ALL SELECT 4, 3 UNION ALL SELECT 5, 2 UNION ALL SELECT 6, 1
) n
WHERE NOT EXISTS (SELECT 1 FROM check_ins c WHERE c.user_id = 1 AND c.check_in_date = DATE_SUB(CURDATE(), INTERVAL n.days_ago DAY));

-- ========== 3. 钱包（user_wallet，积分=balance_cents 单位分 + 交友币表） ==========
-- 3.1 user_wallet（交友币余额 2000 分 = 20 交友币）
INSERT INTO user_wallet (user_id, balance_cents, frozen_cents, created_at, updated_at)
SELECT 1, 2000, 0, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM user_wallet w WHERE w.user_id = 1);

-- 3.2 wallet_transaction_log（获取/消费流水）
INSERT INTO wallet_transaction_log (user_id, type, amount, balance_after, related_type, related_id, order_id, remark, created_at)
SELECT 1, m.type, m.amount, m.balance, m.related_type, m.related_id, m.order_id, m.remark, DATE_SUB(NOW(), INTERVAL m.days_ago DAY)
FROM (
    SELECT 'INCOME' type, 100 amount, 100 balance, 'CHECKIN' related_type, NULL related_id, CONCAT('txn-seed-in-1') order_id, '每日签到奖励' remark, 0 days_ago UNION ALL
    SELECT 'INCOME', 300, 400, 'TASK', NULL, 'txn-seed-in-2', '完成新人任务', 1 UNION ALL
    SELECT 'INCOME', 500, 900, 'RECHARGE', NULL, 'txn-seed-in-3', '充值 5 交友币', 3 UNION ALL
    SELECT 'EXPENSE', 200, 700, 'WHISPER', NULL, 'txn-seed-out-1', '向周屿发送悄悄话', 2 UNION ALL
    SELECT 'INCOME', 200, 900, 'TASK', NULL, 'txn-seed-in-4', '连续签到 7 天奖励', 2 UNION ALL
    SELECT 'INCOME', 100, 1000, 'SHARE', NULL, 'txn-seed-in-5', '分享应用奖励', 4 UNION ALL
    SELECT 'EXPENSE', 300, 700, 'UNLOCK_VISITOR', NULL, 'txn-seed-out-2', '解锁访客名单', 3 UNION ALL
    SELECT 'INCOME', 500, 1200, 'TASK', NULL, 'txn-seed-in-6', '完善资料奖励', 5 UNION ALL
    SELECT 'INCOME', 800, 2000, 'RECHARGE', NULL, 'txn-seed-in-7', '充值 8 交友币', 6
) m
WHERE NOT EXISTS (SELECT 1 FROM wallet_transaction_log w WHERE w.order_id = m.order_id);

-- 同步余额为最新值
UPDATE user_wallet SET balance_cents = 2000 WHERE user_id = 1;

-- ========== 4. 超级账号语音介绍（users.bio 已有，语音存 voice 相关字段） ==========
-- 4.1 检查是否有语音字段（若存在则填充；VoiceMessage 相关表可能不存在，用 app_config 存语音 URL 供前端读取）
INSERT INTO app_config (config_key, config_value, description, created_at, updated_at)
SELECT 'voice.intro.url', 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
       '超级账号语音介绍示例 URL（免费公开音频资源）', NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM app_config WHERE config_key = 'voice.intro.url');

-- 4.2 我的页语音介绍（若存在 voice_intro 相关列则用 ALTER 补齐——先用 app_config 兼容）
INSERT INTO app_config (config_key, config_value, description, created_at, updated_at)
SELECT 'voice.intro.duration', '45', '语音介绍时长（秒）', NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM app_config WHERE config_key = 'voice.intro.duration');

-- ========== 5. 官方账号消息（official_messages，2 个官方号各 2 条） ==========
INSERT INTO official_messages (account_id, message_type, content, card_title, card_desc, card_tag,
                               card_target_url, sort_order, published_at, created_at)
SELECT m.account_id, 'text', m.content, m.card_title, m.card_desc, m.card_tag, m.card_target_url,
       m.sort_order, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR), NOW()
FROM (
    SELECT 1 account_id, '欢迎加入校园恋爱社区！完成资料认证，认识同校有趣的灵魂。' content,
           '新手必读' card_title, '完成校园认证，解锁同校专属匹配' card_desc, '官方' card_tag,
           NULL card_target_url, 1 sort_order, 2 hours_ago UNION ALL
    SELECT 1, '每日一问更新啦，今天的话题是「你理想中的第一次约会是什么样？」快去回答吧！',
           '今日话题', '点击参与每日一问', '热门', NULL, 2, 6 UNION ALL
    SELECT 2, '春季联谊会开始报名啦！名额有限，手慢无。',
           '活动报名', '校园春日联谊会 3月15日', '活动', 'https://example.com/event', 1, 3 UNION ALL
    SELECT 2, '签到奖励已更新：连续签到 7 天额外赠送 2 交友币！',
           '福利通知', '每日签到领奖励', '福利', NULL, 2, 12
) m
WHERE NOT EXISTS (SELECT 1 FROM official_messages om WHERE om.account_id = m.account_id AND om.content = m.content);

-- ========== 6. 外部跳转链接（恋爱咨询/课程/MBTI 测试） ==========
INSERT INTO app_config (config_key, config_value, description, created_at, updated_at)
SELECT m.k, m.v, m.d, NOW(), NOW()
FROM (
    SELECT 'link.love-consult' k, 'https://www.xinli001.com' v, '恋爱咨询（壹心理公开页）' d UNION ALL
    SELECT 'link.love-course', 'https://study.163.com', '恋爱课程（网易公开课）' UNION ALL
    SELECT 'link.social-consult', 'https://www.psycom.net', '社交咨询（公开心理学资源）' UNION ALL
    SELECT 'link.social-course', 'https://www.coursera.org', '社交课程（Coursera 免费课程）' UNION ALL
    SELECT 'link.mbti-test', 'https://www.16personalities.com', 'MBTI 人格测试（16Personalities 免费版）' UNION ALL
    SELECT 'link.love-consult-desc', '专业恋爱心理问答与情感咨询内容', '恋爱咨询板块说明' UNION ALL
    SELECT 'link.mbti-desc', '免费 MBTI 十六型人格测试', 'MBTI 板块说明'
) m
WHERE NOT EXISTS (SELECT 1 FROM app_config WHERE config_key = m.k);

-- ========== 7. 积分商城商品（shop_items，供积分商城页展示） ==========
INSERT INTO shop_items (title, category, price_cents, original_price, image_url, description, stock, sales_count, published, sort_order, created_at, updated_at)
SELECT m.title, m.category, m.price_cents, m.original_price,
       CONCAT('https://images.pexels.com/photos/', m.img_id, '/pexels-photo-', m.img_id, '.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'),
       m.description, m.stock, m.sales_count, 1, m.sort_order, NOW(), NOW()
FROM (
    SELECT '实体积分礼盒' title, 'goods' category, 990 price_cents, 1290 original_price, 257360 img_id,
           '限量版校园恋爱周边礼盒（含抱枕+贴纸+明信片）' description, 50 stock, 12 sales_count, 1 sort_order UNION ALL
    SELECT 'VIP 月卡', 'vip', 2990, 3990, 313601, '开通 VIP 会员，解锁全部高级功能', 999, 34, 2 UNION ALL
    SELECT '悄悄话次数 ×3', 'whisper', 600, 900, 936119, '获得 3 次悄悄话发送机会', 999, 56, 3 UNION ALL
    SELECT '匿名解锁券', 'unlock', 400, 600, 1222271, '解锁一位喜欢我/访客的完整资料', 999, 41, 4 UNION ALL
    SELECT '专属头像框（月度）', 'vip', 1500, 2000, 415829, '佩戴一个月专属金色头像框', 200, 18, 5 UNION ALL
    SELECT '宠物猫咖啡店代金券', 'goods', 800, 1000, 733872, '猫咖 20 元代金券（全城通用）', 100, 27, 6
) m
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.title = m.title);

-- ========== 8. 兴趣圈（interest_circles，供圈子页分类） ==========
INSERT INTO interest_circles (name, icon, description, member_count, sort_order, created_at)
SELECT m.name, m.icon, m.description, m.member_count, m.sort_order, NOW()
FROM (
    SELECT '篮球搭子圈' name, '🏀' icon, '一起打球、看比赛、交流篮球心得' description, 128 member_count, 1 sort_order UNION ALL
    SELECT '摄影圈子' , '📷', '用镜头记录生活，交流摄影技巧', 96, 2 UNION ALL
    SELECT '考研互助圈', '📚', '考研资料共享、每日打卡、加油打气', 256, 3 UNION ALL
    SELECT '桌游爱好者', '🎲', '狼人杀/UNO/剧本杀组局', 64, 4 UNION ALL
    SELECT '美食探店圈', '🍜', '分享好吃的店，一起探店', 180, 5 UNION ALL
    SELECT '萌宠交流圈', '🐱', '晒猫晒狗，交流养宠心得', 143, 6
) m
WHERE NOT EXISTS (SELECT 1 FROM interest_circles c WHERE c.name = m.name);

-- 兴趣圈话题（circle_topics，每个圈 1-2 条）
INSERT INTO circle_topics (circle_id, author_id, title, content, images, reply_count, is_pinned, created_at)
SELECT c.id, m.author_id, m.title, m.content,
       JSON_ARRAY(CONCAT('https://images.pexels.com/photos/', m.img_id, '/pexels-photo-', m.img_id, '.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop')),
       m.reply_count, m.is_pinned, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM interest_circles c
JOIN (
    SELECT '篮球搭子圈' circle, 10001 author_id, '周末室内场约球' title, '周六下午 2 点，校体育馆 2 号场，缺两个队友。' content, 257360 img_id, 8 reply_count, 1 is_pinned, 2 hours_ago UNION ALL
    SELECT '篮球搭子圈', 10007, '有人一起看 NBA 季后赛吗', '宿舍投影已准备好，欢迎来一起看！', 313601, 5, 0, 8 UNION ALL
    SELECT '摄影圈子', 10011, '城市夜景拍摄攻略', '整理了三个适合拍夜景的机位，附参数设置。', 936119, 12, 1, 3 UNION ALL
    SELECT '考研互助圈', 10016, '每日打卡第 30 天', '坚持就是胜利，大家一起加油！', 1222271, 15, 1, 1 UNION ALL
    SELECT '桌游爱好者', 10031, '周三晚上狼人杀组局', '老地方，缺 3 人，新手也欢迎。', 415829, 7, 0, 6 UNION ALL
    SELECT '美食探店圈', 10021, '学校附近性价比最高的五家店', '亲测无广，学生党友好。', 733872, 20, 1, 5 UNION ALL
    SELECT '萌宠交流圈', 10008, '我家猫的迷惑行为大赏', '每天都有新花样，笑不活了。', 91227, 18, 0, 4
) m ON c.name = m.circle
WHERE NOT EXISTS (SELECT 1 FROM circle_topics ct WHERE ct.title = m.title);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM circle_topics WHERE title IN ('周末室内场约球','有人一起看 NBA 季后赛吗','城市夜景拍摄攻略','每日打卡第 30 天','周三晚上狼人杀组局','学校附近性价比最高的五家店','我家猫的迷惑行为大赏');
-- DELETE FROM interest_circles WHERE name IN ('篮球搭子圈','摄影圈子','考研互助圈','桌游爱好者','美食探店圈','萌宠交流圈');
-- DELETE FROM shop_items WHERE title IN ('实体积分礼盒','VIP 月卡','悄悄话次数 ×3','匿名解锁券','专属头像框（月度）','宠物猫咖啡店代金券');
-- DELETE FROM app_config WHERE config_key LIKE 'link.%' OR config_key LIKE 'voice.%';
-- DELETE FROM official_messages WHERE content IN (...);
-- DELETE FROM wallet_transaction_log WHERE order_id LIKE 'txn-seed-%';
-- DELETE FROM user_wallet WHERE user_id = 1;
-- DELETE FROM check_ins WHERE user_id = 1;
-- DELETE FROM activities WHERE title IN ('校园春日联谊会','周末桌游之夜','校园歌手大赛决赛','骑行踏春活动','春季招聘会（往期）','迎新晚会（往期）','读书分享会');
