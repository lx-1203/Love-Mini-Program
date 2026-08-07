-- ============================================================
-- 迁移：消息会话 + 喜欢我的 + 访客数据种子
-- ============================================================
-- 背景（用户需求）：
--   消息页需要全场景会话数据，对标微信交互逻辑：
--   1. 会话列表：10+ 条会话，含 2 个官方号（产品助手/活动运营）、
--      普通用户私信、匿名匹配会话（已互发 8 条消息，解锁进度可见）
--   2. 排序：按最后一条消息时间倒序；未读数字红点
--   3. 「喜欢我的」「我的访客」独立二级页：20+ 条数据，关联超级账号 id=1
--
--   匿名匹配会话使用 temp_chat_session/temp_chat_message
--   （前端「匿名匹配聊天」入口 → RealMatchService 的匿名会话）
--   普通私信使用 private_conversations/private_messages
--
--   幂等性：固定 conversation_uid / session_uid + WHERE NOT EXISTS。
-- ============================================================

-- ========== 1. 普通私信会话（private_conversations，超级账号 id=1 与虚拟用户） ==========
-- 1.1 与「周屿」(10001) 的会话
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-seed-1-10001', 1, 10001, '周末一起去看展吗？', DATE_SUB(NOW(), INTERVAL 1 HOUR), 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM private_conversations WHERE conversation_uid = 'conv-seed-1-10001');

-- 1.2 与「林晚」(10002) 的会话
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-seed-1-10002', 1, 10002, '那家咖啡店我常去，他家手冲很赞', DATE_SUB(NOW(), INTERVAL 2 HOUR), 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM private_conversations WHERE conversation_uid = 'conv-seed-1-10002');

-- 1.3 与「顾一鸣」(10003) 的会话
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-seed-1-10003', 1, 10003, '哈哈哈那就说定了，周末约球', DATE_SUB(NOW(), INTERVAL 3 HOUR), 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM private_conversations WHERE conversation_uid = 'conv-seed-1-10003');

-- 1.4 与「苏念」(10004) 的会话
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-seed-1-10004', 1, 10004, '我最近在学播音，可以交流一下', DATE_SUB(NOW(), INTERVAL 5 HOUR), 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM private_conversations WHERE conversation_uid = 'conv-seed-1-10004');

-- 1.5 与「陈叙」(10005) 的会话
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-seed-1-10005', 1, 10005, '下次带你看我收藏的科幻小说', DATE_SUB(NOW(), INTERVAL 1 DAY), 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM private_conversations WHERE conversation_uid = 'conv-seed-1-10005');

-- 1.6 与「许知夏」(10006) 的会话
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-seed-1-10006', 1, 10006, '民谣现场真的值得一去', DATE_SUB(NOW(), INTERVAL 2 DAY), 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM private_conversations WHERE conversation_uid = 'conv-seed-1-10006');

-- 1.7 与「沈亦舟」(10007) 的会话（置顶会话）
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-seed-1-10007', 1, 10007, '健身房走起？老地方见', DATE_SUB(NOW(), INTERVAL 4 DAY), 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM private_conversations WHERE conversation_uid = 'conv-seed-1-10007');

-- 1.8 与「叶清欢」(10008) 的会话
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview,
                                   last_message_at, pinned, created_at, updated_at)
SELECT 'conv-seed-1-10008', 1, 10008, '我家猫今天又拆家了，愁', DATE_SUB(NOW(), INTERVAL 6 DAY), 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM private_conversations WHERE conversation_uid = 'conv-seed-1-10008');

-- ========== 2. 私信消息（private_messages，对应上面会话） ==========
INSERT INTO private_messages (conversation_id, sender_id, content, message_kind, is_read, created_at, delivery_status)
SELECT c.id, CASE WHEN m.sender = 'a' THEN c.user_a_id ELSE c.user_b_id END, m.body, 'text', 0,
       DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR), 'sent'
FROM (
    SELECT 'conv-seed-1-10001' uid, 'a' sender, 1 hours_ago, '嗨，我看到你也喜欢摄影，交个朋友？' body UNION ALL
    SELECT 'conv-seed-1-10001', 'b', 2, '你好呀，你拍的照片很有感觉' UNION ALL
    SELECT 'conv-seed-1-10001', 'a', 3, '谢谢夸奖，你平时也拍照吗？' UNION ALL
    SELECT 'conv-seed-1-10001', 'b', 5, '偶尔拍拍，周末一起去看展吗？' UNION ALL
    SELECT 'conv-seed-1-10002', 'b', 1, '你推荐的咖啡店我去啦，环境超好' UNION ALL
    SELECT 'conv-seed-1-10002', 'a', 2, '那家咖啡店我常去，他家手冲很赞' UNION ALL
    SELECT 'conv-seed-1-10002', 'b', 4, '下次一起去？' UNION ALL
    SELECT 'conv-seed-1-10003', 'a', 1, '周末打篮球吗？' UNION ALL
    SELECT 'conv-seed-1-10003', 'b', 2, '哈哈哈那就说定了，周末约球' UNION ALL
    SELECT 'conv-seed-1-10003', 'a', 3, '好，不见不散' UNION ALL
    SELECT 'conv-seed-1-10004', 'b', 1, '我最近在学播音，可以交流一下' UNION ALL
    SELECT 'conv-seed-1-10004', 'a', 2, '厉害！你声音一定很好听' UNION ALL
    SELECT 'conv-seed-1-10004', 'b', 3, '哈哈谢谢，改天给你读首诗' UNION ALL
    SELECT 'conv-seed-1-10005', 'b', 1, '你也在看这本科幻小说？' UNION ALL
    SELECT 'conv-seed-1-10005', 'a', 2, '对，我超爱这个作者' UNION ALL
    SELECT 'conv-seed-1-10005', 'b', 3, '下次带你看我收藏的科幻小说' UNION ALL
    SELECT 'conv-seed-1-10006', 'b', 1, '你听民谣吗？推荐几首' UNION ALL
    SELECT 'conv-seed-1-10006', 'a', 2, '听！最近在循环陈粒的歌' UNION ALL
    SELECT 'conv-seed-1-10006', 'b', 3, '民谣现场真的值得一去' UNION ALL
    SELECT 'conv-seed-1-10007', 'a', 1, '健身房走起？老地方见' UNION ALL
    SELECT 'conv-seed-1-10007', 'b', 2, '可以，几点？' UNION ALL
    SELECT 'conv-seed-1-10007', 'a', 3, '晚上七点吧' UNION ALL
    SELECT 'conv-seed-1-10008', 'b', 1, '我家猫今天又拆家了，愁' UNION ALL
    SELECT 'conv-seed-1-10008', 'a', 2, '哈哈哈猫猫是这样的' UNION ALL
    SELECT 'conv-seed-1-10008', 'b', 3, '改天给你看它拆家现场' UNION ALL
    SELECT 'conv-seed-1-10008', 'a', 4, '期待！' UNION ALL
    SELECT 'conv-seed-1-10008', 'b', 5, '对了，你喜欢什么类型的电影？' UNION ALL
    SELECT 'conv-seed-1-10008', 'a', 6, '悬疑推理类的' UNION ALL
    SELECT 'conv-seed-1-10008', 'b', 7, '我也是！推荐《消失的她》'
) m
JOIN private_conversations c ON c.conversation_uid = m.uid
WHERE NOT EXISTS (SELECT 1 FROM private_messages pm WHERE pm.conversation_id = c.id AND pm.content = m.body);

-- ========== 3. 匿名匹配会话（temp_chat_session，已互发 8 条消息 → 解锁进度可见） ==========
INSERT INTO temp_chat_session (session_uid, user_a_id, user_b_id, recommended_person_id, match_id,
                               closes_at, closed_reason, is_pinned, user_a_unread_count, user_b_unread_count,
                               last_message_preview, last_message_at, created_at, updated_at, phase)
SELECT 'tmp-seed-1-10020', 1, 10020, 'CL-10020', 'match-seed-anon-001',
       DATE_ADD(NOW(), INTERVAL 20 HOUR), NULL, 0, 0, 0,
       '感觉你很有趣，想多了解你一点', DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW(), NOW(), 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM temp_chat_session WHERE session_uid = 'tmp-seed-1-10020');

-- 匿名会话 8 条消息（sender: a=超级账号, b=匿名对方）
INSERT INTO temp_chat_message (session_id, sender, kind, body, duration_seconds, created_at, delivery_status)
SELECT s.id, m.sender, 'text', m.body, NULL, DATE_SUB(NOW(), INTERVAL m.minutes_ago MINUTE), 'sent'
FROM (
    SELECT 'a' sender, 8 minutes_ago, '你好，很高兴匹配到你' body UNION ALL
    SELECT 'b', 7, '你好呀，你平时喜欢做什么？' UNION ALL
    SELECT 'a', 6, '我平时喜欢看书和跑步' UNION ALL
    SELECT 'b', 5, '好巧，我也喜欢跑步！' UNION ALL
    SELECT 'a', 4, '那你一般跑多远？' UNION ALL
    SELECT 'b', 3, '五公里左右，你呢？' UNION ALL
    SELECT 'a', 2, '我也差不多，周末可以一起' UNION ALL
    SELECT 'b', 1, '感觉你很有趣，想多了解你一点'
) m
JOIN temp_chat_session s ON s.session_uid = 'tmp-seed-1-10020'
WHERE NOT EXISTS (SELECT 1 FROM temp_chat_message tm WHERE tm.session_id = s.id AND tm.body = m.body);

-- ========== 4. 「喜欢我的」（likes 表：target_user_id=1 被喜欢） ==========
INSERT INTO likes (user_id, target_user_id, status, created_at, updated_at)
SELECT v.id, 1, 'active', DATE_SUB(NOW(), INTERVAL v.days_ago DAY), NOW()
FROM (
    SELECT 10001 id, 0 days_ago UNION ALL SELECT 10002, 0 UNION ALL SELECT 10003, 0
    UNION ALL SELECT 10004, 1 UNION ALL SELECT 10005, 1 UNION ALL SELECT 10006, 1
    UNION ALL SELECT 10007, 2 UNION ALL SELECT 10008, 2 UNION ALL SELECT 10009, 2
    UNION ALL SELECT 10010, 3 UNION ALL SELECT 10011, 3 UNION ALL SELECT 10012, 3
    UNION ALL SELECT 10013, 4 UNION ALL SELECT 10014, 4 UNION ALL SELECT 10015, 4
    UNION ALL SELECT 10016, 5 UNION ALL SELECT 10017, 5 UNION ALL SELECT 10018, 5
    UNION ALL SELECT 10019, 6 UNION ALL SELECT 10020, 6 UNION ALL SELECT 10021, 6
    UNION ALL SELECT 10022, 7 UNION ALL SELECT 10023, 7 UNION ALL SELECT 10024, 7
) v
WHERE NOT EXISTS (SELECT 1 FROM likes l WHERE l.user_id = v.id AND l.target_user_id = 1);

-- ========== 5. 「我的访客」（visitors 表：visited_user_id=1 被访问） ==========
INSERT INTO visitors (visitor_id, visited_user_id, is_read, created_at)
SELECT v.id, 1, 0, DATE_SUB(NOW(), INTERVAL v.days_ago DAY)
FROM (
    SELECT 10001 id, 0 days_ago UNION ALL SELECT 10002, 0 UNION ALL SELECT 10003, 1
    UNION ALL SELECT 10004, 1 UNION ALL SELECT 10005, 2 UNION ALL SELECT 10006, 2
    UNION ALL SELECT 10007, 3 UNION ALL SELECT 10008, 3 UNION ALL SELECT 10009, 4
    UNION ALL SELECT 10010, 4 UNION ALL SELECT 10011, 5 UNION ALL SELECT 10012, 5
    UNION ALL SELECT 10013, 6 UNION ALL SELECT 10014, 6 UNION ALL SELECT 10015, 7
    UNION ALL SELECT 10016, 7 UNION ALL SELECT 10017, 8 UNION ALL SELECT 10018, 8
    UNION ALL SELECT 10019, 9 UNION ALL SELECT 10020, 9 UNION ALL SELECT 10021, 10
    UNION ALL SELECT 10022, 10 UNION ALL SELECT 10023, 11 UNION ALL SELECT 10024, 11
) v
WHERE NOT EXISTS (SELECT 1 FROM visitors vis WHERE vis.visitor_id = v.id AND vis.visited_user_id = 1);

-- ========== 6. 关注关系（user_follows：超级账号关注虚拟用户 → 圈子「关注 Tab」数据源） ==========
INSERT INTO user_follows (follower_id, following_id, created_at)
SELECT 1, v.id, DATE_SUB(NOW(), INTERVAL v.days_ago DAY)
FROM (
    SELECT 10001 id, 0 days_ago UNION ALL SELECT 10002, 0 UNION ALL SELECT 10003, 1
    UNION ALL SELECT 10004, 1 UNION ALL SELECT 10005, 2 UNION ALL SELECT 10006, 2
    UNION ALL SELECT 10007, 3 UNION ALL SELECT 10008, 3 UNION ALL SELECT 10009, 4
    UNION ALL SELECT 10010, 4 UNION ALL SELECT 10011, 5 UNION ALL SELECT 10012, 5
    UNION ALL SELECT 10013, 6 UNION ALL SELECT 10014, 6 UNION ALL SELECT 10015, 7
) v
WHERE NOT EXISTS (SELECT 1 FROM user_follows f WHERE f.follower_id = 1 AND f.following_id = v.id);

-- 同步超级账号关注数
UPDATE users SET following_count = (SELECT COUNT(*) FROM user_follows WHERE follower_id = 1) WHERE id = 1;
UPDATE users SET followers_count = (SELECT COUNT(*) FROM user_follows WHERE following_id = 1) WHERE id = 1;

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM private_messages WHERE conversation_id IN (SELECT id FROM private_conversations WHERE conversation_uid LIKE 'conv-seed-%');
-- DELETE FROM private_conversations WHERE conversation_uid LIKE 'conv-seed-%';
-- DELETE FROM temp_chat_message WHERE session_id IN (SELECT id FROM temp_chat_session WHERE session_uid = 'tmp-seed-1-10020');
-- DELETE FROM temp_chat_session WHERE session_uid = 'tmp-seed-1-10020';
-- DELETE FROM likes WHERE target_user_id = 1 AND user_id BETWEEN 10001 AND 10024;
-- DELETE FROM visitors WHERE visited_user_id = 1 AND visitor_id BETWEEN 10001 AND 10024;
-- DELETE FROM user_follows WHERE follower_id = 1 AND following_id BETWEEN 10001 AND 10015;
