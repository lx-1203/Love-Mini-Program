-- ============================================================================
-- R20（2026-09-08）QA 残留数据清理 + 演示数据真实化
-- 背景：多轮 QA 自动化验收在小程序/后端/管理后台全链路联调时，
--   以运行时接口写入了大量验收话术数据（研究账号甲/乙、R16/R17 验收帖、
--   「111」聊天压测消息、MCP 验证客服消息等），污染真实使用场景。
-- 目标：
--   1. 删除验收话术帖子/评论/私聊/客服消息；
--   2. 下线旧版非标准兴趣圈（篮球搭子圈/考研互助圈/桌游爱好者），
--      保证「热门兴趣圈」只呈现 8 个标准圈（对齐理想图）；
--   3. 测试账号昵称去测试化 + 全量用户头像唯一化（原先 9 张 person 图
--      被 116 个用户共用，「头像高度相似」即源于此）；
--   4. 无图帖子按 id 轮换本地真实配图（消除相邻帖同图占位）；
--   5. 为超管/体验账号补种悄悄话与访客（首页关系动态不再有空格）。
-- 幂等性：全部语句按模式或显式 id 执行，重复运行无副作用。
-- ============================================================================

-- ---------------------------------------------------------------- 1) 帖子区 --
-- 1a. 验收话术帖子关联数据（评论点赞/收藏/评论）先行清理
DELETE FROM comment_likes
WHERE comment_id IN (
    SELECT id FROM comments
    WHERE content LIKE '%R16%' OR content LIKE '%R17%' OR content LIKE '%验收%'
       OR content LIKE '%QA%' OR content LIKE '%测试%'
);

DELETE FROM comments
WHERE content LIKE '%R16%' OR content LIKE '%R17%' OR content LIKE '%验收%'
   OR content LIKE '%QA%' OR content LIKE '%测试%';

DELETE FROM post_likes
WHERE post_id IN (
    SELECT id FROM posts
    WHERE content LIKE '%R16%' OR content LIKE '%R17%' OR content LIKE '%验收%'
       OR content LIKE '%全链路%' OR content LIKE '%QA自动化%'
       OR content LIKE '%审核流闭环%' OR author_id IN (100001, 100002)
);

DELETE FROM post_favorites
WHERE post_id IN (
    SELECT id FROM posts
    WHERE content LIKE '%R16%' OR content LIKE '%R17%' OR content LIKE '%验收%'
       OR content LIKE '%全链路%' OR content LIKE '%QA自动化%'
       OR content LIKE '%审核流闭环%' OR author_id IN (100001, 100002)
);

DELETE FROM comments
WHERE post_id IN (
    SELECT id FROM posts
    WHERE content LIKE '%R16%' OR content LIKE '%R17%' OR content LIKE '%验收%'
       OR content LIKE '%全链路%' OR content LIKE '%QA自动化%'
       OR content LIKE '%审核流闭环%' OR author_id IN (100001, 100002)
);

-- 1b. 验收话术帖子本体（研究账号乙全链路验证帖、R17 改造验证帖、审核流闭环测试帖、
--      自动化链路验证帖、纯净构建终验帖等）
DELETE FROM posts
WHERE content LIKE '%R16%' OR content LIKE '%R17%' OR content LIKE '%验收%'
   OR content LIKE '%全链路%' OR content LIKE '%QA自动化%'
   OR content LIKE '%审核流闭环%' OR author_id IN (100001, 100002)
   OR content LIKE '%自动化链路%' OR content LIKE '%终验%'
   OR content LIKE '%进入发布，验证%' OR content REGEXP '0验';

-- 1c. 评论计数重算（删评后与真实评论数对齐）
UPDATE posts p
SET p.comments_count = (
    SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id
)
WHERE EXISTS (SELECT 1 FROM comments c2 WHERE c2.post_id = p.id);

-- -------------------------------------------------- 2) 私聊 QA 压测数据 --
-- 2a. QA 期间创建的压测会话（conv-10016-100151 / conv-10050-100151 / 100151 位置一致性会话）
DELETE FROM private_messages WHERE conversation_id IN (460, 462, 463);
DELETE FROM private_conversations WHERE id IN (460, 462, 463);

-- 2b. 散落的压测消息（「111」、R16/R17 验收话术）
DELETE FROM private_messages
WHERE content = '111'
   OR content LIKE '%R16%' OR content LIKE '%R17%'
   OR content LIKE '%验收%' OR content LIKE '%一致性测试%';

-- 2c. 会话预览修正（预览仍为压测话术的会话取最新真实消息，无消息回退打招呼语）
UPDATE private_conversations pc
LEFT JOIN (
    SELECT pm.conversation_id, pm.content
    FROM private_messages pm
    JOIN (
        SELECT conversation_id, MAX(created_at) AS max_ts
        FROM private_messages GROUP BY conversation_id
    ) m ON m.conversation_id = pm.conversation_id AND m.max_ts = pm.created_at
) last ON last.conversation_id = pc.id
SET pc.last_message_preview = COALESCE(last.content, '嗨～')
WHERE pc.last_message_preview = '111'
   OR pc.last_message_preview LIKE '%R16%' OR pc.last_message_preview LIKE '%验收%';

-- ---------------------------------------------------- 3) 客服（寻觅助手） --
-- 3a. QA 客服验证消息（R16 客服验收 / MCP验证 及其配套回复）
DELETE FROM official_chat_messages
WHERE content LIKE 'R16 %' OR content LIKE 'MCP验证%';

-- 3a-2. R21：客服重复回复去重（同 direction+content 保留最早一条）
DELETE t1 FROM official_chat_messages t1
JOIN official_chat_messages t2
  ON t1.user_id = t2.user_id
 AND t1.direction = t2.direction
 AND t1.content = t2.content
 AND t1.id > t2.id;

-- 3b. 首条英文压测问句改为自然中文场景
UPDATE official_chat_messages
SET content = '活动怎么报名呀？'
WHERE content = 'how to join activities';

-- ------------------------------------------ 4) 非标准兴趣圈下线（对齐理想图） --
DELETE FROM circle_replies
WHERE topic_id IN (SELECT id FROM circle_topics WHERE circle_id IN (1, 3, 4));
DELETE FROM circle_topics WHERE circle_id IN (1, 3, 4);
DELETE FROM circle_memberships WHERE circle_id IN (1, 3, 4);
DELETE FROM interest_circles WHERE id IN (1, 3, 4);

-- ------------------------------------------- 5) 测试账号去测试化 + 头像唯一化 --
-- 5a. 研究账号甲/乙 → 真实感昵称（保留账号避免级联外键清理）
UPDATE users SET nickname = '陆则言'
WHERE id = 100001 AND nickname = '研究账号甲';
UPDATE users SET nickname = '顾清晏'
WHERE id = 100002 AND nickname = '研究账号乙';

-- 5b. 全量普通用户头像按 id 唯一化轮换（62 张本地真人头像池；
--     原先 9 张 person 图被 116 个用户共用，是「头像高度相似」的根因）。
--     超管（100000）头像保持不变。
UPDATE users
SET avatar_url = CONCAT('/static/assets/images/avatars/avatar-', 1 + MOD(id, 62), '.jpg')
WHERE id BETWEEN 10001 AND 100999
  AND id <> 100000
  AND avatar_url LIKE '/static/assets/images/people/person-%.png';

-- ------------------------------------------------- 6) 无图帖子补真实配图 --
-- 6a. 高赞帖给 3 图轮换（社区动态卡片与理想图一致的图集观感）
UPDATE posts
SET images = JSON_ARRAY(
    CONCAT('/static/assets/images/posts/post-', 1 + MOD(id, 8), '.jpg'),
    CONCAT('/static/assets/images/posts/post-', 1 + MOD(id + 3, 8), '.jpg'),
    CONCAT('/static/assets/images/posts/post-', 1 + MOD(id + 5, 8), '.jpg'))
WHERE status = 'active' AND audit_status = 'approved'
  AND likes_count >= 80 AND JSON_LENGTH(images) < 3;

-- 6b. 其余无图帖子按 id 轮换 8 张本地真实照片（消除相邻帖同图占位）
UPDATE posts
SET images = JSON_ARRAY(CONCAT('/static/assets/images/posts/post-', 1 + MOD(id, 8), '.jpg'))
WHERE status = 'active' AND audit_status = 'approved'
  AND JSON_LENGTH(images) = 0;

-- 6c. 近期 QA 帖均挂同一张 post-7.jpg → 同样按 id 轮换打散
UPDATE posts
SET images = JSON_ARRAY(CONCAT('/static/assets/images/posts/post-', 1 + MOD(id, 8), '.jpg'))
WHERE status = 'active'
  AND JSON_LENGTH(images) = 1
  AND JSON_UNQUOTE(JSON_EXTRACT(images, '$[0]')) = '/static/assets/images/posts/post-7.jpg';

-- ------------------------------------- 7) 关系动态数据补种（首页 4 格不空格） --
-- 7a. 超管悄悄话收件（原先 whisper_message 全表 0 行，「条悄悄话」恒 0）
INSERT INTO whisper_message (sender_id, receiver_id, content, status, client_request_id, price_cents, created_at)
SELECT 10001, 100000, '悄悄告诉你：今天在图书馆看到你啦，下次可以坐一起吗～', 'delivered', 'seed-r20-whisper-1', 200, NOW() - INTERVAL 3 HOUR
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM whisper_message WHERE client_request_id = 'seed-r20-whisper-1');

INSERT INTO whisper_message (sender_id, receiver_id, content, status, client_request_id, price_cents, created_at)
SELECT 10002, 100000, '昨晚的月亮特别圆，忽然就想分享给你看 🌙', 'delivered', 'seed-r20-whisper-2', 200, NOW() - INTERVAL 26 HOUR
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM whisper_message WHERE client_request_id = 'seed-r20-whisper-2');

INSERT INTO whisper_message (sender_id, receiver_id, content, status, client_request_id, price_cents, created_at)
SELECT 10003, 100000, '社团招新我在摊位呀，路过的话来找我玩～', 'sent', 'seed-r20-whisper-3', 200, NOW() - INTERVAL 50 HOUR
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM whisper_message WHERE client_request_id = 'seed-r20-whisper-3');

-- 7b. 超管访客记录（首页「人看过你」/消息页访客入口数据源为 visitors 表）
INSERT INTO visitors (visitor_id, visited_user_id, is_read, created_at)
SELECT 10004, 100000, 0, NOW() - INTERVAL 5 HOUR FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM visitors WHERE visitor_id = 10004 AND visited_user_id = 100000);

INSERT INTO visitors (visitor_id, visited_user_id, is_read, created_at)
SELECT 10006, 100000, 0, NOW() - INTERVAL 30 HOUR FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM visitors WHERE visitor_id = 10006 AND visited_user_id = 100000);

INSERT INTO visitors (visitor_id, visited_user_id, is_read, created_at)
SELECT 10007, 100000, 0, NOW() - INTERVAL 52 HOUR FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM visitors WHERE visitor_id = 10007 AND visited_user_id = 100000);
