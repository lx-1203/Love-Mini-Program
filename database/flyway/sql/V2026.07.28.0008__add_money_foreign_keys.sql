-- ============================================================
-- 迁移：为资金/核心业务表补充缺失外键
-- ============================================================
-- 背景：
--   审计发现资金与核心业务表缺少外键约束：
--     * user_wallet.user_id               → users(id)
--     * wallet_transaction_log.user_id    → users(id)
--     * vip_red_packets.sender_id         → users(id)
--     * vip_red_packet_claims.red_packet_id → vip_red_packets(id)
--     * vip_red_packet_claims.claimer_id  → users(id)
--     * promo_codes.created_by            → users(id)
--     * promo_code_usages.promo_code_id   → promo_codes(id)
--     * promo_code_usages.user_id         → users(id)
--     * vip_bills.user_id                 → users(id)
--     * video_calls.caller_id/callee_id   → users(id)
--   资金类外键使用 ON DELETE RESTRICT：资金记录不得随用户删除而丢失，
--   必须保留审计链（用户删除走软删除/归档流程，见应用层处理）。
--
-- 幂等性：
--   每张表通过 information_schema.KEY_COLUMN_USAGE 检查约束是否存在，
--   存在则跳过，保证迁移可安全重跑。
-- ============================================================

-- 辅助存储过程：为指定列添加外键（幂等）
DROP PROCEDURE IF EXISTS add_fk_if_missing;
DELIMITER $$
CREATE PROCEDURE add_fk_if_missing(
    IN tbl_name VARCHAR(64),
    IN col_name VARCHAR(64),
    IN fk_name VARCHAR(64),
    IN ref_table VARCHAR(64),
    IN ref_col VARCHAR(64),
    IN on_delete VARCHAR(16)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tbl_name
          AND COLUMN_NAME = col_name
          AND REFERENCED_TABLE_NAME = ref_table
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', tbl_name, '` ADD CONSTRAINT `', fk_name,
            '` FOREIGN KEY (`', col_name, '`) REFERENCES `', ref_table, '` (`', ref_col,
            '`) ON DELETE ', on_delete
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- 1. 钱包
CALL add_fk_if_missing('user_wallet', 'user_id', 'fk_user_wallet_user', 'users', 'id', 'RESTRICT');
CALL add_fk_if_missing('wallet_transaction_log', 'user_id', 'fk_wallet_log_user', 'users', 'id', 'RESTRICT');

-- 2. VIP 红包
CALL add_fk_if_missing('vip_red_packets', 'sender_id', 'fk_vip_red_packets_sender', 'users', 'id', 'RESTRICT');
CALL add_fk_if_missing('vip_red_packet_claims', 'red_packet_id', 'fk_claims_red_packet', 'vip_red_packets', 'id', 'CASCADE');
CALL add_fk_if_missing('vip_red_packet_claims', 'claimer_id', 'fk_claims_claimer', 'users', 'id', 'RESTRICT');

-- 3. 优惠码
CALL add_fk_if_missing('promo_codes', 'created_by', 'fk_promo_codes_creator', 'users', 'id', 'RESTRICT');
CALL add_fk_if_missing('promo_code_usages', 'promo_code_id', 'fk_usage_promo_code', 'promo_codes', 'id', 'CASCADE');
CALL add_fk_if_missing('promo_code_usages', 'user_id', 'fk_usage_user', 'users', 'id', 'RESTRICT');

-- 4. VIP 账单
CALL add_fk_if_missing('vip_bills', 'user_id', 'fk_vip_bills_user', 'users', 'id', 'RESTRICT');

-- 5. 视频通话
CALL add_fk_if_missing('video_calls', 'caller_id', 'fk_video_calls_caller', 'users', 'id', 'RESTRICT');
CALL add_fk_if_missing('video_calls', 'callee_id', 'fk_video_calls_callee', 'users', 'id', 'RESTRICT');

-- 清理辅助存储过程
DROP PROCEDURE IF EXISTS add_fk_if_missing;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- ALTER TABLE user_wallet DROP FOREIGN KEY fk_user_wallet_user;
-- ALTER TABLE wallet_transaction_log DROP FOREIGN KEY fk_wallet_log_user;
-- ALTER TABLE vip_red_packets DROP FOREIGN KEY fk_vip_red_packets_sender;
-- ALTER TABLE vip_red_packet_claims DROP FOREIGN KEY fk_claims_red_packet;
-- ALTER TABLE vip_red_packet_claims DROP FOREIGN KEY fk_claims_claimer;
-- ALTER TABLE promo_codes DROP FOREIGN KEY fk_promo_codes_creator;
-- ALTER TABLE promo_code_usages DROP FOREIGN KEY fk_usage_promo_code;
-- ALTER TABLE promo_code_usages DROP FOREIGN KEY fk_usage_user;
-- ALTER TABLE vip_bills DROP FOREIGN KEY fk_vip_bills_user;
-- ALTER TABLE video_calls DROP FOREIGN KEY fk_video_calls_caller;
-- ALTER TABLE video_calls DROP FOREIGN KEY fk_video_calls_callee;
