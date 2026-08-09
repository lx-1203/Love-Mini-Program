-- ============================================================
-- 迁移：喜欢 / 访客 / 通知 演示闭环种子（2026-08-09）
-- ============================================================
-- 背景（用户需求）：
--   喜欢/访客/通知闭环完善后，演示账号登录应能立即看到：
--   1. 「喜欢我的」：多位虚拟用户喜欢了演示账号
--   2. 「我的访客」：多位虚拟用户访问过演示账号主页
--   3. 消息页「喜欢与访客」入口红点：like / visitor / match 类型未读通知
--      （驱动前端 messagesStore.notifications → 快捷入口数字角标）
--   4. 双向喜欢对：演示账号 ↔ 10001，支撑「互相喜欢 → 进入聊天」演示
--
--   管理员账号（openid=local-dev-admin-openid-123456）在不同库中 id 可能不同
--   （旧库为 1，新库按 V2026.08.07.0004 固定 100000），全部通过 openid 动态解析，兼容两者。
--   虚拟用户 10001-10024 由 V2026.08.07.0023 创建，此处以 EXISTS 守卫引用，不存在则跳过。
--
--   幂等性：全部 WHERE NOT EXISTS，可重复执行。
-- ============================================================

-- ========== 1. 补充「喜欢我的」（likes：虚拟用户 10009-10016 → 管理员） ==========
INSERT INTO likes (user_id, target_user_id, status, created_at, updated_at)
SELECT m.uid, u.id, 'active', DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR), DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM users u
JOIN (
    SELECT 10009 uid, 3 hours_ago UNION ALL
    SELECT 10010, 4 UNION ALL
    SELECT 10011, 5 UNION ALL
    SELECT 10012, 6 UNION ALL
    SELECT 10013, 7 UNION ALL
    SELECT 10014, 8 UNION ALL
    SELECT 10015, 12 UNION ALL
    SELECT 10016, 16
) m ON 1 = 1
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND EXISTS (SELECT 1 FROM users v WHERE v.id = m.uid)
  AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.user_id = m.uid AND l.target_user_id = u.id);

-- ========== 2. 补充「我的访客」（visitors：虚拟用户 10001-10008 → 管理员） ==========
INSERT INTO visitors (visitor_id, visited_user_id, is_read, created_at)
SELECT m.uid, u.id, 0, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM users u
JOIN (
    SELECT 10001 uid, 1 hours_ago UNION ALL
    SELECT 10002, 2 UNION ALL
    SELECT 10003, 3 UNION ALL
    SELECT 10004, 6 UNION ALL
    SELECT 10005, 9 UNION ALL
    SELECT 10006, 14 UNION ALL
    SELECT 10007, 22 UNION ALL
    SELECT 10008, 30
) m ON 1 = 1
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND EXISTS (SELECT 1 FROM users v WHERE v.id = m.uid)
  AND NOT EXISTS (SELECT 1 FROM visitors vis WHERE vis.visitor_id = m.uid AND vis.visited_user_id = u.id);

-- ========== 3. 通知（notifications：驱动消息页「喜欢与访客」入口红点） ==========

-- 3.1 like 通知：有人喜欢了你
INSERT INTO notifications (user_id, type, source_user_id, reference_id, reference_type, is_read, created_at, version)
SELECT u.id, 'like', m.uid, NULL, 'user', 0, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR), 0
FROM users u
JOIN (
    SELECT 10009 uid, 3 hours_ago UNION ALL
    SELECT 10010, 4 UNION ALL
    SELECT 10011, 5 UNION ALL
    SELECT 10012, 6 UNION ALL
    SELECT 10013, 7 UNION ALL
    SELECT 10014, 8
) m ON 1 = 1
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND EXISTS (SELECT 1 FROM users v WHERE v.id = m.uid)
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.type = 'like' AND n.source_user_id = m.uid);

-- 3.2 visitor 通知：有人查看了你的资料
INSERT INTO notifications (user_id, type, source_user_id, reference_id, reference_type, is_read, created_at, version)
SELECT u.id, 'visitor', m.uid, NULL, 'user', 0, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR), 0
FROM users u
JOIN (
    SELECT 10001 uid, 1 hours_ago UNION ALL
    SELECT 10002, 2 UNION ALL
    SELECT 10003, 3 UNION ALL
    SELECT 10004, 6 UNION ALL
    SELECT 10005, 9
) m ON 1 = 1
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND EXISTS (SELECT 1 FROM users v WHERE v.id = m.uid)
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.type = 'visitor' AND n.source_user_id = m.uid);

-- 3.3 match 通知：互相喜欢（匹配成功）
INSERT INTO notifications (user_id, type, source_user_id, reference_id, reference_type, is_read, created_at, version)
SELECT u.id, 'match', 10001, NULL, 'user', 0, DATE_SUB(NOW(), INTERVAL 20 HOUR), 0
FROM users u
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND EXISTS (SELECT 1 FROM users v WHERE v.id = 10001)
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.type = 'match' AND n.source_user_id = 10001);

-- ========== 4. 双向喜欢（likes：管理员 → 10001，让「我发出的喜欢」也有数据 + 支撑去聊天） ==========
INSERT INTO likes (user_id, target_user_id, status, created_at, updated_at)
SELECT u.id, 10001, 'active', DATE_SUB(NOW(), INTERVAL 20 HOUR), DATE_SUB(NOW(), INTERVAL 20 HOUR)
FROM users u
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND EXISTS (SELECT 1 FROM users v WHERE v.id = 10001)
  AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.user_id = u.id AND l.target_user_id = 10001);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM likes WHERE target_user_id IN (SELECT id FROM users WHERE openid = 'local-dev-admin-openid-123456') AND user_id BETWEEN 10009 AND 10016;
-- DELETE FROM visitors WHERE visited_user_id IN (SELECT id FROM users WHERE openid = 'local-dev-admin-openid-123456') AND visitor_id BETWEEN 10001 AND 10008;
-- DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE openid = 'local-dev-admin-openid-123456') AND type IN ('like','visitor','match') AND source_user_id BETWEEN 10001 AND 10016;
-- DELETE FROM likes WHERE user_id IN (SELECT id FROM users WHERE openid = 'local-dev-admin-openid-123456') AND target_user_id = 10001;
