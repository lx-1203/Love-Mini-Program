-- ============================================================
-- 迁移：创建 VIP 续费交易流水表 vip_billing_log
-- ============================================================
-- 背景：
--   Task 12.2（REAUDIT-REPORT-100+ 编号 39）：AutoRenewService 自动续费分布式锁与对账。
--   并发续费可能导致多扣费、VIP 时间被多次延长。通过 Redisson 分布式锁串行化
--   单用户的续费流程，并将每次续费明细写入流水表用于对账。
--
-- 字段说明：
--   * user_id：用户 ID
--   * order_no：本次续费的订单号（与 vip_bills.transaction_id 关联）
--   * amount：续费金额（分）
--   * status：续费状态 SUCCESS/FAILED
--   * created_at：续费时间
--
-- 索引说明：
--   * idx_vip_billing_log_user：按用户查询续费流水
--   * idx_vip_billing_log_order：按订单号查询（对账场景）
--   * idx_vip_billing_log_status：按状态筛选
-- ============================================================

CREATE TABLE IF NOT EXISTS vip_billing_log (
    id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT       NOT NULL                COMMENT '用户ID',
    order_no        VARCHAR(64)  NOT NULL                COMMENT '本次续费订单号',
    amount          INT          NOT NULL                COMMENT '续费金额（分）',
    status          VARCHAR(16)  NOT NULL                COMMENT '续费状态 SUCCESS/FAILED',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '续费时间',
    INDEX idx_vip_billing_log_user (user_id),
    INDEX idx_vip_billing_log_order (order_no),
    INDEX idx_vip_billing_log_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='VIP 续费交易流水表';

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP TABLE IF EXISTS vip_billing_log;
