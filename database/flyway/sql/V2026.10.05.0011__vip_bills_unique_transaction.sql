-- ============================================================
-- 迁移：vip_bills.transaction_id 升级为唯一约束（堵支付回调重放）
-- ============================================================
-- 背景（2026-10-05 微信支付工程补齐）：
--   V2026.07.25.0005 建表时 transaction_id 为普通索引（idx_vip_bills_transaction），
--   「同一笔支付重复开通 VIP」仅有应用层校验兜底——应用层幂等被绕过
--   （如同 orderNo 换新 notificationId 重放回调）时，数据库层无法拦截重复账单。
--   本次将其升级为唯一键 uk_vip_bills_transaction：
--   * 微信交易单号（或商户订单号）全局唯一，重复回调写第二笔账单直接被
--     数据库拒绝（防重放纵深防御）；
--   * MySQL 唯一键允许多个 NULL：历史 FAILED/无交易号账单不受影响。
--
-- 去重策略（先去重再加约束，避免加约束失败）：
--   迁移种子数据不含 vip_bills 插入（全库检索确认），runtime 数据按
--   「保留最早一条、其余置 NULL」处理——置 NULL 而非删除，保留账单记录
--   但允许同交易号唯一键成立；同批重复行一并置 NULL。
-- ============================================================

-- 1. 去重：同一 transaction_id 仅保留最早（id 最小）一条，其余置 NULL
UPDATE vip_bills b
JOIN (
    SELECT transaction_id
    FROM vip_bills
    WHERE transaction_id IS NOT NULL
    GROUP BY transaction_id
    HAVING COUNT(*) > 1
) dup ON b.transaction_id = dup.transaction_id
LEFT JOIN (
    SELECT MIN(id) AS keep_id, transaction_id
    FROM vip_bills
    WHERE transaction_id IS NOT NULL
    GROUP BY transaction_id
) keep ON keep.transaction_id = b.transaction_id
SET b.transaction_id = NULL
WHERE b.id <> keep.keep_id;

-- 2. 加唯一键（若已存在则跳过——幂等保护，正常 Flyway 单次执行不会命中）
SET @uk_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'vip_bills'
      AND INDEX_NAME = 'uk_vip_bills_transaction'
);
SET @ddl := IF(@uk_exists = 0,
    'ALTER TABLE vip_bills ADD UNIQUE KEY uk_vip_bills_transaction (transaction_id)',
    'SELECT ''uk_vip_bills_transaction already exists''');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 移除旧的普通索引（被唯一键取代，避免重复索引）
SET @old_idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'vip_bills'
      AND INDEX_NAME = 'idx_vip_bills_transaction'
);
SET @ddl2 := IF(@old_idx_exists > 0,
    'ALTER TABLE vip_bills DROP INDEX idx_vip_bills_transaction',
    'SELECT ''idx_vip_bills_transaction not exists''');
PREPARE stmt2 FROM @ddl2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- ALTER TABLE vip_bills DROP INDEX uk_vip_bills_transaction;
-- ALTER TABLE vip_bills ADD INDEX idx_vip_bills_transaction (transaction_id);
