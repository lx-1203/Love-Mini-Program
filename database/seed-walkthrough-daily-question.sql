-- ============================================================
-- 体验走查数据补充（2026-08-08 修正版，按真实库状态核对）
-- 用途：体验账号（userId=47）全链路走查的前置数据
--
-- 真实库状态核对结果：
--   ✓ daily_questions 已有 08-07~08-11 每日种子（今天 08-08 有专属问题，
--     id=2「你心中完美的第一次约会是什么样子的？」），无需插入
--   ✓ 走查用户甲/乙/丙（id 8/9/10）已存在，资料完整
--   ✗ 超级账号 100000 不在库中（前端 userId===100000 特殊逻辑不生效）
--   ✗ 体验账号 47 钱包余额 750 分（不够解锁+红包全链路）
--
-- 执行：mysql -h127.0.0.1 -P3307 -uroot -p campus_love < 本文件
-- 幂等：全部可重复执行
-- 修复（R4-00511）：钱包流水 type 由 INCOME 改为 CREDIT——管理端
-- WalletTransactionView 仅识别 DEBIT/CREDIT 枚举，INCOME 会原样展示为原始值；
-- 余额增加一律使用 CREDIT（扣减用 DEBIT），与后端枚举对齐。
-- ============================================================

-- ---------- 1. 体验账号钱包余额：750 → 5000 分（50 交友币） ----------
-- 供解锁喜欢/访客列表（300 分/次）+ 发 VIP 红包（真实扣款）+ 余额流水演示
UPDATE user_wallet
SET balance_cents = 5000, updated_at = NOW()
WHERE user_id = 47;

-- 补一条流水便于钱包页「余额明细」有内容
INSERT INTO wallet_transaction_log (user_id, type, amount, balance_after, related_type, related_id, order_id, remark, created_at)
SELECT 47, 'CREDIT', 5000, 5000, 'TASK', NULL, CONCAT('txn-walkthrough-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s')), '体验走查预充值', NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM wallet_transaction_log t WHERE t.user_id = 47 AND t.order_id LIKE 'txn-walkthrough-%');

-- ---------- 2. 第二账号（走查用户甲 id=8，手机 13800000002）----------
-- 用途：双向聊天 / 临时会话交换联系方式 / 红包互发 的「对方视角」
-- 说明：原 password 为 BCrypt 哈希（明文未知），此处直接置明文；
--       后端 loginWithPhone 支持历史明文自动迁移（RealAuthService ~L671：
--       非 BCrypt 格式时明文 equals 校验通过后自动升级为 BCrypt）
-- BCrypt 哈希对应明文 Walkthrough@123（由 spring-security-crypto 生成）
UPDATE users
SET password = '$2a$10$p2MRcSPmHeIDfe3rJ9uDEemo/31OcZejgnrNENMfGwMr..7DhxeEy'
WHERE id = 8;

-- 8 号钱包也给 5000 分，用于给 47 发红包
INSERT INTO user_wallet (user_id, balance_cents, frozen_cents, version, created_at, updated_at)
SELECT 8, 5000, 0, 0, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM user_wallet w WHERE w.user_id = 8);
