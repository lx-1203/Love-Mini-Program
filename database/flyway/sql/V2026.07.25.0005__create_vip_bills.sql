-- ============================================================
-- 迁移：创建 VIP 账单表 vip_bills
-- ============================================================
-- 背景：
--   VIP 账单功能要求记录用户的 VIP 订阅、续费、退款等账单明细。
--   每次支付成功后生成一条账单记录，用户可在 VIP 页面查看历史账单。
--
-- 字段说明：
--   * user_id：用户 ID
--   * plan_id / plan_name：套餐 ID 与名称（冗余便于历史展示）
--   * amount / original_amount：支付金额与原价（分）
--   * type：账单类型 SUBSCRIBE(订阅) / RENEW(续费) / REFUND(退款)
--   * status：状态 SUCCESS(成功) / FAILED(失败) / REFUNDED(已退款)
--   * payment_method：支付方式 WECHAT / ALIPAY
--   * transaction_id：第三方交易号
--   * period_start / period_end：VIP 有效期起止时间
--   * remark：备注
--
-- 索引说明：
--   * idx_vip_bills_user：按用户查询账单列表
--   * idx_vip_bills_status：按状态筛选
--   * idx_vip_bills_transaction：按第三方交易号查询（对账场景）
-- ============================================================

CREATE TABLE IF NOT EXISTS vip_bills (
    id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL                COMMENT '用户ID',
    plan_id         VARCHAR(32)  NOT NULL                COMMENT '套餐ID',
    plan_name       VARCHAR(64)  NOT NULL                COMMENT '套餐名称',
    amount          INT          NOT NULL                COMMENT '支付金额（分）',
    original_amount INT                                   COMMENT '原价（分）',
    type            VARCHAR(16)  NOT NULL DEFAULT 'SUBSCRIBE' COMMENT '账单类型 SUBSCRIBE/RENEW/REFUND',
    status          VARCHAR(16)  NOT NULL DEFAULT 'SUCCESS' COMMENT '状态 SUCCESS/FAILED/REFUNDED',
    payment_method  VARCHAR(16)  NOT NULL DEFAULT 'WECHAT' COMMENT '支付方式 WECHAT/ALIPAY',
    transaction_id  VARCHAR(128)                         COMMENT '第三方交易号',
    period_start    DATETIME                             COMMENT 'VIP有效期开始时间',
    period_end      DATETIME                             COMMENT 'VIP有效期结束时间',
    remark          VARCHAR(200)                         COMMENT '备注',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_vip_bills_user (user_id),
    INDEX idx_vip_bills_status (status),
    INDEX idx_vip_bills_transaction (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='VIP 账单表';

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP TABLE IF EXISTS vip_bills;
