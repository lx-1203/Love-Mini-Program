-- 验收演示数据（2026-08-08 走查收尾）
--
-- 1. 心动信号种子：超级账号 100000 三组（pending/accepted/expired），支撑「已接受 → 开聊」验收
-- 2. 楼中楼样例：为 0024 种子评论补 parent_id 子评论（贴吧式嵌套回复渲染验收）
-- 3. 钱包明细补齐：100000 收支分类完整（签到/任务=收入，悄悄话/解锁访客=支出）
--
-- 全部幂等：固定 order_id / 功能唯一约束 + WHERE NOT EXISTS，可重复执行。

-- ========== 1. 心动信号（heart_signals，uk_heart_signals_users 按用户对唯一） ==========

-- 1.1 待处理：虚拟用户 10002 发起 → 100000 接收（24h 内有效）
INSERT INTO heart_signals (user_a_id, user_b_id, status, match_type, expires_at, created_at, updated_at)
SELECT 10002, 100000, 'pending', 'mutual_like', DATE_ADD(NOW(), INTERVAL 24 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR)
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM heart_signals hs
    WHERE LEAST(hs.user_a_id, hs.user_b_id) = 10002
      AND GREATEST(hs.user_a_id, hs.user_b_id) = 100000
);

-- 1.2 已接受：虚拟用户 10001 发起 → 100000 接收（开聊验收入口）
INSERT INTO heart_signals (user_a_id, user_b_id, status, match_type, expires_at, created_at, updated_at)
SELECT 10001, 100000, 'accepted', 'mutual_like', DATE_ADD(NOW(), INTERVAL 24 HOUR), DATE_SUB(NOW(), INTERVAL 8 HOUR), DATE_SUB(NOW(), INTERVAL 6 HOUR)
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM heart_signals hs
    WHERE LEAST(hs.user_a_id, hs.user_b_id) = 10001
      AND GREATEST(hs.user_a_id, hs.user_b_id) = 100000
);

-- 1.3 已过期：虚拟用户 10003 发起 → 100000 接收（expires_at 已过 + status=expired）
INSERT INTO heart_signals (user_a_id, user_b_id, status, match_type, expires_at, created_at, updated_at)
SELECT 10003, 100000, 'expired', 'mutual_like', DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 30 HOUR), DATE_SUB(NOW(), INTERVAL 30 HOUR)
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM heart_signals hs
    WHERE LEAST(hs.user_a_id, hs.user_b_id) = 10003
      AND GREATEST(hs.user_a_id, hs.user_b_id) = 100000
);

-- ========== 2. 楼中楼样例（comments.parent_id，V2026.08.08.0002 加列） ==========
-- 为 0024 种子的若干根评论补 1 条子回复（按内容匹配根评论，幂等）

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 100010, '回复楼上：确实如此，我也是这么想的！', c.id, DATE_ADD(c.created_at, INTERVAL 30 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '说得太好了，支持！'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '回复楼上：确实如此，我也是这么想的！');

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 100011, '附议，楼上+1', c.id, DATE_ADD(c.created_at, INTERVAL 40 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '同感，我也这么觉得'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '附议，楼上+1');

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 100012, '笑死，太真实了哈哈哈', c.id, DATE_ADD(c.created_at, INTERVAL 50 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '哈哈哈太真实了'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '笑死，太真实了哈哈哈');

-- ========== 3. 钱包明细补齐（user_wallet + wallet_transaction_log，用户 100000） ==========

-- 3.1 钱包余额兜底（无记录时初始化 100 分 = 1 交友币）
INSERT INTO user_wallet (user_id, balance_cents, frozen_cents, created_at, updated_at)
SELECT 100000, 100, 0, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM user_wallet w WHERE w.user_id = 100000);

-- 3.2 收支明细：签到/任务 = 收入，悄悄话/解锁访客 = 支出（order_id 幂等）
INSERT INTO wallet_transaction_log (user_id, type, amount, balance_after, related_type, related_id, order_id, remark, created_at)
SELECT 100000, m.type, m.amount, m.balance, m.related_type, NULL, m.order_id, m.remark, DATE_SUB(NOW(), INTERVAL m.hours_ago HOUR)
FROM (
    SELECT 'INCOME' type, 100 amount, 100 balance, 'CHECKIN' related_type, 'txn-demo-100000-in-1' order_id, '每日签到奖励' remark, 24 hours_ago UNION ALL
    SELECT 'INCOME', 300, 400, 'TASK', 'txn-demo-100000-in-2', '完成新人任务奖励', 20 UNION ALL
    SELECT 'EXPENSE', 200, 200, 'WHISPER', 'txn-demo-100000-out-1', '向对方发送悄悄话', 8 UNION ALL
    SELECT 'EXPENSE', 100, 100, 'UNLOCK_VISITOR', 'txn-demo-100000-out-2', '解锁访客名单', 4
) m
WHERE NOT EXISTS (SELECT 1 FROM wallet_transaction_log w WHERE w.order_id = m.order_id);
