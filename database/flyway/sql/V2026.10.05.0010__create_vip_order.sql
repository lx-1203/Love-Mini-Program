-- ============================================================
-- 迁移：创建 VIP 微信支付订单表 vip_order
-- ============================================================
-- 背景（2026-10-05 微信支付工程补齐）：
--   原 vip_bills 仅在支付成功后写入（SUCCESS/FAILED/REFUNDED 三态），
--   无「下单 → 待支付 → 支付成功」的完整订单生命周期，导致：
--   * 无法对接微信 JSAPI 统一下单（prepay_id 无落点）；
--   * 回调幂等依赖 vip_bills.transaction_id 反查，订单号与交易号语义混用；
--   * 超时未支付订单无法关单。
--
-- 状态机（VipOrderService 唯一迁移入口，非法迁移拒绝）：
--   PENDING  （已创建，待获取 prepay_id）
--     → PAYING（已拿到 prepay_id，等待用户支付）
--     → CLOSED（超时/主动关单）
--     → FAILED（下单失败等终态）
--   PAYING   → SUCCESS（支付回调确认）/ CLOSED / FAILED
--   SUCCESS  → REFUNDING（发起退款）
--   REFUNDING → REFUNDED（退款回调确认）
--   CLOSED / FAILED / REFUNDED 为终态。
--
-- 索引说明：
--   uk_vip_order_no：order_no 全局唯一（对外订单号，回调幂等键）；
--   idx_vip_order_user：按用户查询订单列表；
--   idx_vip_order_status_expire：状态+过期时间复合索引（定时关单扫描）。
-- ============================================================

CREATE TABLE IF NOT EXISTS vip_order (
    id                  BIGINT       PRIMARY KEY AUTO_INCREMENT,
    order_no            VARCHAR(32)  NOT NULL                COMMENT '商户订单号（全局唯一，回调幂等键）',
    user_id             BIGINT UNSIGNED NOT NULL             COMMENT '下单用户ID',
    plan_id             VARCHAR(32)  NOT NULL                COMMENT '套餐ID（monthly/quarterly/yearly）',
    plan_name           VARCHAR(64)  NOT NULL                COMMENT '套餐名称快照',
    plan_days           INT          NOT NULL DEFAULT 30     COMMENT '套餐时长（天）快照',
    amount_cents        INT          NOT NULL                COMMENT '订单金额（分，服务端定价，不信客户端）',
    status              VARCHAR(16)  NOT NULL DEFAULT 'PENDING'
                        COMMENT '状态 PENDING/PAYING/SUCCESS/CLOSED/REFUNDING/REFUNDED/FAILED',
    openid              VARCHAR(128)                          COMMENT '支付用户 openid 快照（JSAPI payer）',
    prepay_id           VARCHAR(64)                           COMMENT '微信统一下单 prepay_id',
    wx_transaction_id   VARCHAR(64)                           COMMENT '微信支付交易单号（回调回填）',
    refund_id           VARCHAR(64)                           COMMENT '微信退款单号（退款受理回填）',
    expire_at           DATETIME                             COMMENT '订单过期时间（超时关单依据）',
    paid_at             DATETIME                             COMMENT '支付成功时间（回调回填）',
    closed_at           DATETIME                             COMMENT '关单时间',
    refunded_at         DATETIME                             COMMENT '退款完成时间',
    notify_processed_at DATETIME                             COMMENT '支付回调处理时间（幂等排查用）',
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                                                             COMMENT '更新时间',
    version             BIGINT       NOT NULL DEFAULT 0      COMMENT '乐观锁版本号',
    UNIQUE KEY uk_vip_order_no (order_no),
    INDEX idx_vip_order_user (user_id),
    INDEX idx_vip_order_status_expire (status, expire_at),
    CONSTRAINT fk_vip_order_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='VIP 微信支付订单表';

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- ALTER TABLE vip_order DROP FOREIGN KEY fk_vip_order_user;
-- DROP TABLE IF EXISTS vip_order;
