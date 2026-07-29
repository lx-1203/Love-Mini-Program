-- ============================================================
-- 迁移：创建支付回调日志表 payment_callback_log
-- ============================================================
-- 背景：
--   Task 12.1（REAUDIT-REPORT-100+ 编号 38）：BillingService 支付回调幂等性。
--   微信支付可能因网络抖动多次推送同一回调通知，若不幂等将导致重复开通 VIP、
--   重复生成账单等资金风险。通过 notification_id 唯一索引保证回调只处理一次。
--
-- 字段说明：
--   * notification_id：微信回调通知 ID（唯一索引，重复回调直接返回 SUCCESS）
--   * order_no：业务订单号（与 vip_bills.transaction_id 关联）
--   * amount：回调通知中的支付金额（分），用于与订单金额对账
--   * status：回调处理状态 SUCCESS/FAIL
--
-- 索引说明：
--   * uk_payment_callback_notification：notification_id 唯一索引，幂等性兜底
--   * idx_payment_callback_order：按订单号查询历史回调（对账场景）
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_callback_log (
    id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
    notification_id VARCHAR(128) NOT NULL                COMMENT '微信回调通知ID（幂等键）',
    order_no        VARCHAR(64)  NOT NULL                COMMENT '业务订单号',
    amount          DECIMAL(10,2) NOT NULL               COMMENT '回调通知金额（元）',
    status          VARCHAR(16)  NOT NULL                COMMENT '处理状态 SUCCESS/FAIL',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    UNIQUE KEY uk_payment_callback_notification (notification_id),
    INDEX idx_payment_callback_order (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='支付回调日志表（幂等性）';

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP TABLE IF EXISTS payment_callback_log;
