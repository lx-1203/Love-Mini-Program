-- ============================================================
-- 迁移：体验账号 47 「今天」多会话聊天演示数据
-- ============================================================
-- 背景（2026-08-08 聊天页微信化重构验收演示）：
--   给体验账号 47（guest-login 一键登录）造 3 个私信会话的「今天」完整聊天记录：
--   1. 47 ↔ 8（走查号，双向可登录演示）：约 28 条，早/午/晚三个时段，含语音，
--      对方最新 3 条未读 → 列表红点 = 3
--   2. 47 ↔ 10001（周屿，匹配池虚拟用户）：约 20 条，含语音/emoji/活动卡片消息，
--      对方 2 条未读 → 红点 = 2
--   3. 47 ↔ 10002（林晚，匹配池虚拟用户）：约 15 条，全部已读 → 红点 = 0（演示无红点会话）
--
--   时间基准：DATE_SUB(NOW(), INTERVAL x MINUTE) 相对当前时间（迁移执行时刻为「今天」），
--   凌晨执行时最早几条可能落到「昨天」，可接受。
--
--   幂等性：
--   - 会话按「用户对」判重（不限 uid，避免走查时手动建过会话导致重复）
--   - 消息按 content 判重（每会话文案唯一，含语音 URL 唯一）
--   文案全部新写，避免与 V2026.08.07.0023 撞车。
-- ============================================================

-- ========== 1. 会话（3 个） ==========

-- 1.1 47 ↔ 8（走查号）
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-demo-47-8', 47, 8, '等你回复哦～', DATE_SUB(NOW(), INTERVAL 5 MINUTE), 0, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM private_conversations c
    WHERE (c.user_a_id = 47 AND c.user_b_id = 8) OR (c.user_a_id = 8 AND c.user_b_id = 47)
);

-- 1.2 47 ↔ 10001（周屿）
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-demo-47-10001', 47, 10001, '想约你去看那个新上映的电影', DATE_SUB(NOW(), INTERVAL 30 MINUTE), 0, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM private_conversations c
    WHERE (c.user_a_id = 47 AND c.user_b_id = 10001) OR (c.user_a_id = 10001 AND c.user_b_id = 47)
);

-- 1.3 47 ↔ 10002（林晚）
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-demo-47-10002', 47, 10002, '好，周六下午见', DATE_SUB(NOW(), INTERVAL 150 MINUTE), 0, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM private_conversations c
    WHERE (c.user_a_id = 47 AND c.user_b_id = 10002) OR (c.user_a_id = 10002 AND c.user_b_id = 47)
);

-- ========== 2. 会话 1 消息（47 ↔ 8，28 条，最后 3 条对方未读） ==========
INSERT INTO private_messages (conversation_id, sender_id, content, message_kind, is_read,
                              created_at, delivery_status, duration_seconds)
SELECT c.id,
       CASE WHEN m.sender = 'a' THEN c.user_a_id ELSE c.user_b_id END,
       m.body, m.kind, m.is_read,
       DATE_SUB(NOW(), INTERVAL m.minutes_ago MINUTE), 'sent', m.duration
FROM (
    -- 早 8:00-9:00 时段（600~550 分钟前）
    SELECT 'a' sender, 600 minutes_ago, '早呀，昨晚睡得怎么样' body, 'text' kind, 1 is_read, NULL duration UNION ALL
    SELECT 'b', 590, '还不错～就是梦到赶不上早八课了哈哈哈', 'text', 1, NULL UNION ALL
    SELECT 'a', 580, '哈哈那你现在可没有早八课了', 'text', 1, NULL UNION ALL
    SELECT 'b', 570, '也对，周末都不用上课了', 'text', 1, NULL UNION ALL
    SELECT 'a', 560, '对了，你上次说想去看那个画展', 'text', 1, NULL UNION ALL
    SELECT 'b', 550, '对对，听说这周有梵高的特展', 'text', 1, NULL
    UNION ALL
    -- 午 12:00-13:00 时段（360~310 分钟前）
    SELECT 'a', 360, '午饭吃了啥', 'text', 1, NULL UNION ALL
    SELECT 'b', 350, '食堂二楼的酸菜鱼！yyds', 'text', 1, NULL UNION ALL
    SELECT 'a', 340, '那我下次也去尝尝', 'text', 1, NULL UNION ALL
    SELECT 'b', 330, '必须的，我带你吃', 'text', 1, NULL UNION ALL
    SELECT 'a', 320, '说好了啊', 'text', 1, NULL UNION ALL
    SELECT 'b', 310, '拉钩', 'text', 1, NULL
    UNION ALL
    -- 晚 19:00-23:00 时段（240~5 分钟前）
    SELECT 'a', 240, '晚上去操场散步吗', 'text', 1, NULL UNION ALL
    SELECT 'b', 230, '好啊，正好消食', 'text', 1, NULL UNION ALL
    SELECT 'a', 220, '七点半老地方？', 'text', 1, NULL UNION ALL
    SELECT 'b', 210, '可以可以', 'text', 1, NULL UNION ALL
    SELECT 'b', 200, 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3', 'voice', 1, 6 UNION ALL
    SELECT 'a', 190, '来啦来啦', 'text', 1, NULL UNION ALL
    SELECT 'a', 180, '今天月色真好看', 'text', 1, NULL UNION ALL
    SELECT 'b', 170, '是啊，和你一起散步心情都变好了', 'text', 1, NULL UNION ALL
    SELECT 'a', 160, '我也是', 'text', 1, NULL UNION ALL
    SELECT 'b', 150, '那以后经常一起散步吧', 'text', 1, NULL UNION ALL
    SELECT 'a', 140, '好呀', 'text', 1, NULL UNION ALL
    SELECT 'b', 130, '对了，你周末有空吗？', 'text', 1, NULL UNION ALL
    SELECT 'a', 120, '有空啊，怎么了', 'text', 1, NULL UNION ALL
    SELECT 'b', 110, '想约你一起去看展', 'text', 1, NULL UNION ALL
    SELECT 'a', 100, '可以呀，哪个展', 'text', 1, NULL UNION ALL
    SELECT 'b', 90, '就是早上说的梵高特展', 'text', 1, NULL UNION ALL
    SELECT 'a', 80, '好耶，那说定了', 'text', 1, NULL UNION ALL
    SELECT 'b', 70, '嗯嗯！对了你平时喜欢吃什么', 'text', 1, NULL UNION ALL
    SELECT 'a', 60, '火锅！超爱', 'text', 1, NULL UNION ALL
    SELECT 'b', 50, '哈哈我也是，改天一起吃火锅', 'text', 1, NULL UNION ALL
    SELECT 'a', 40, '必须安排', 'text', 1, NULL UNION ALL
    -- 对方最新 3 条未读（红点 = 3）
    SELECT 'b', 30, '那你周末有空的话一起去看展吧～', 'text', 0, NULL UNION ALL
    SELECT 'b', 20, '顺便吃个火锅？', 'text', 0, NULL UNION ALL
    SELECT 'b', 5, '等你回复哦～', 'text', 0, NULL
) m
JOIN private_conversations c
  ON (c.user_a_id = 47 AND c.user_b_id = 8) OR (c.user_a_id = 8 AND c.user_b_id = 47)
WHERE NOT EXISTS (SELECT 1 FROM private_messages pm WHERE pm.conversation_id = c.id AND pm.content = m.body);

-- ========== 3. 会话 2 消息（47 ↔ 10001 周屿，20 条，含语音/emoji/活动卡片，对方 2 条未读） ==========
INSERT INTO private_messages (conversation_id, sender_id, content, message_kind, is_read,
                              created_at, delivery_status, duration_seconds)
SELECT c.id,
       CASE WHEN m.sender = 'a' THEN c.user_a_id ELSE c.user_b_id END,
       m.body, m.kind, m.is_read,
       DATE_SUB(NOW(), INTERVAL m.minutes_ago MINUTE), 'sent', m.duration
FROM (
    SELECT 'a' sender, 300 minutes_ago, '你好呀，看到你也喜欢徒步' body, 'text' kind, 1 is_read, NULL duration UNION ALL
    SELECT 'b', 290, '你好！对啊，周末经常去爬山', 'text', 1, NULL UNION ALL
    SELECT 'a', 280, '太巧了，我也喜欢户外', 'text', 1, NULL UNION ALL
    SELECT 'b', 270, '那下次可以一起约徒步', 'text', 1, NULL UNION ALL
    SELECT 'a', 260, '好呀，你一般去哪里', 'text', 1, NULL UNION ALL
    SELECT 'b', 250, '香山或者奥森，都挺近的', 'text', 1, NULL UNION ALL
    SELECT 'a', 240, '你主页的爬山照片拍得真好看', 'text', 1, NULL UNION ALL
    SELECT 'b', 230, '谢谢～', 'emoji', 1, NULL UNION ALL
    -- 活动卡片消息（47 发送推荐，私聊 kind=activity，content 为 JSON）
    SELECT 'a', 220, '{"title":"校园春日联谊会","desc":"一场轻松的春日联谊会，有破冰游戏、桌游互动、自由交流，帮你认识同校有趣的人。","tag":"本周活动","targetUrl":"/pages/activities/detail?id=sample-weekend-party"}', 'activity', 1, NULL UNION ALL
    SELECT 'b', 210, '这个活动看起来不错诶', 'text', 1, NULL UNION ALL
    SELECT 'a', 200, '要不要一起去？', 'text', 1, NULL UNION ALL
    SELECT 'b', 190, '可以呀，正好周末没事', 'text', 1, NULL UNION ALL
    SELECT 'a', 180, '那我到时候叫你', 'text', 1, NULL UNION ALL
    SELECT 'b', 170, 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3', 'voice', 1, 5 UNION ALL
    SELECT 'a', 160, '你平时还喜欢做什么', 'text', 1, NULL UNION ALL
    SELECT 'b', 150, '看电影、打游戏，宅的时候比较多', 'text', 1, NULL UNION ALL
    SELECT 'a', 140, '那我下次拉你一起玩桌游', 'text', 1, NULL UNION ALL
    SELECT 'b', 130, '桌游我也喜欢！', 'text', 1, NULL UNION ALL
    SELECT 'a', 120, '哈哈那就说定了', 'text', 1, NULL UNION ALL
    -- 对方 2 条未读（红点 = 2）
    SELECT 'b', 60, '对了，你明天有时间吗', 'text', 0, NULL UNION ALL
    SELECT 'b', 30, '想约你去看那个新上映的电影', 'text', 0, NULL
) m
JOIN private_conversations c
  ON (c.user_a_id = 47 AND c.user_b_id = 10001) OR (c.user_a_id = 10001 AND c.user_b_id = 47)
WHERE NOT EXISTS (SELECT 1 FROM private_messages pm WHERE pm.conversation_id = c.id AND pm.content = m.body);

-- ========== 4. 会话 3 消息（47 ↔ 10002 林晚，15 条，全部已读 → 红点 0） ==========
INSERT INTO private_messages (conversation_id, sender_id, content, message_kind, is_read,
                              created_at, delivery_status, duration_seconds)
SELECT c.id,
       CASE WHEN m.sender = 'a' THEN c.user_a_id ELSE c.user_b_id END,
       m.body, m.kind, m.is_read,
       DATE_SUB(NOW(), INTERVAL m.minutes_ago MINUTE), 'sent', m.duration
FROM (
    SELECT 'a' sender, 400 minutes_ago, '哈喽，看你也喜欢拍照' body, 'text' kind, 1 is_read, NULL duration UNION ALL
    SELECT 'b', 390, '你好呀，对呀，平时爱拍拍风景', 'text', 1, NULL UNION ALL
    SELECT 'a', 380, '我也是，以后可以互相交流', 'text', 1, NULL UNION ALL
    SELECT 'b', 370, '好呀，你有作品可以发我看看', 'text', 1, NULL UNION ALL
    SELECT 'a', 360, '我相册里有几张夜景，还挺满意的', 'text', 1, NULL UNION ALL
    SELECT 'b', 350, '夜景不好拍，你肯定花了不少心思', 'text', 1, NULL UNION ALL
    SELECT 'a', 340, '哈哈被你猜中了，蹲了两个晚上', 'text', 1, NULL UNION ALL
    SELECT 'b', 330, '真厉害！我也该学着拍夜景了', 'text', 1, NULL UNION ALL
    SELECT 'a', 320, '改天一起去拍？', 'text', 1, NULL UNION ALL
    SELECT 'b', 310, '好呀，我正好想学', 'text', 1, NULL UNION ALL
    SELECT 'a', 200, '对了你周末有什么安排', 'text', 1, NULL UNION ALL
    SELECT 'b', 190, '周六上午去图书馆，下午没安排', 'text', 1, NULL UNION ALL
    SELECT 'a', 180, '那下午可以约咖啡？', 'text', 1, NULL UNION ALL
    SELECT 'b', 170, '可以呀，你说的那家', 'text', 1, NULL UNION ALL
    SELECT 'a', 160, '嗯嗯，那家我常去', 'text', 1, NULL UNION ALL
    SELECT 'b', 150, '好，周六下午见', 'text', 1, NULL
) m
JOIN private_conversations c
  ON (c.user_a_id = 47 AND c.user_b_id = 10002) OR (c.user_a_id = 10002 AND c.user_b_id = 47)
WHERE NOT EXISTS (SELECT 1 FROM private_messages pm WHERE pm.conversation_id = c.id AND pm.content = m.body);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM private_messages WHERE conversation_id IN (
--     SELECT id FROM private_conversations WHERE conversation_uid IN ('conv-demo-47-8','conv-demo-47-10001','conv-demo-47-10002'));
-- DELETE FROM private_conversations WHERE conversation_uid IN ('conv-demo-47-8','conv-demo-47-10001','conv-demo-47-10002');
