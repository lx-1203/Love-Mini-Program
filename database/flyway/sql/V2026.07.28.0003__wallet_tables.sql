-- ============================================================
-- 迁移：创建用户钱包表 user_wallet + 钱包交易流水表 wallet_transaction_log
-- ============================================================
-- 背景：
--   Task 2（FIN-00003）+ Task 15（FIN-00171）：VIP 自动续费真实扣减 + VIP 红包真实扣款。
--   前序 reaudit-fixall 已完成 AutoRenewService 分布式锁与 VipRedPacketService 悲观锁，
--   但仅记录日志未真实扣减用户余额，存在 CRITICAL 资金安全漏洞。
--   本迁移创建 user_wallet（用户钱包账户主表）与 wallet_transaction_log（流水表），
--   支持真实扣减/充值/对账/审计/幂等。
--
-- 表结构说明：
--   * user_wallet：用户钱包账户主表，每用户一条记录，存储可用余额与冻结金额
--   * wallet_transaction_log：钱包交易流水表，每次扣减（DEBIT）/充值（CREDIT）写入一条
--
-- 字段单位说明：
--   * 金额统一以"分"为 BIGINT 整数存储（balance_cents / frozen_cents / amount），
--     避免浮点精度问题；Long 类型支持超大金额，无溢出风险
--
-- 并发安全策略：
--   * user_wallet.user_id 唯一索引：保证一用户一钱包
--   * user_wallet.version 乐观锁：配合悲观锁双重防护
--   * wallet_transaction_log.order_id 唯一索引：业务幂等键，防止重复扣减/充值
--   * WalletService 通过 SELECT ... FOR UPDATE 悲观锁钱包行
--
-- 索引说明：
--   * uk_user_wallet_user：user_id 唯一索引，保证一用户一钱包
--   * idx_user_wallet_user：user_id 普通索引（显式声明便于查询规划）
--   * uk_wallet_transaction_log_order：order_id 唯一索引，业务幂等键
--   * idx_wallet_log_user_created：(user_id, created_at) 联合索引，按用户分页查询流水
--   * idx_wallet_log_related：related_type 索引，按业务类型对账
--   * idx_wallet_log_related_id：related_id 索引，按业务实体反查
-- ============================================================

CREATE TABLE IF NOT EXISTS user_wallet (
    id              BIGINT UNSIGNED       PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED       NOT NULL                COMMENT '用户ID',
    balance_cents   BIGINT       NOT NULL DEFAULT 0      COMMENT '可用余额（分）',
    frozen_cents    BIGINT       NOT NULL DEFAULT 0      COMMENT '冻结金额（分，预留）',
    version         BIGINT       NOT NULL DEFAULT 0      COMMENT '乐观锁版本号',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_user_wallet_user (user_id),
    INDEX idx_user_wallet_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户钱包账户主表';

CREATE TABLE IF NOT EXISTS wallet_transaction_log (
    id              BIGINT UNSIGNED       PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED       NOT NULL                COMMENT '用户ID',
    type            VARCHAR(16)  NOT NULL                COMMENT '交易类型 DEBIT(扣减)/CREDIT(充值)',
    amount          BIGINT       NOT NULL                COMMENT '交易金额（分）',
    balance_after   BIGINT                               COMMENT '交易后余额（分，便于审计追溯）',
    related_type    VARCHAR(32)  NOT NULL                COMMENT '关联业务类型 VIP_RENEW/RED_PACKET_SEND/RED_PACKET_CLAIM/RED_PACKET_REFUND',
    related_id      VARCHAR(64)                          COMMENT '关联业务实体ID（如renewalId/redPacketId）',
    order_id        VARCHAR(128) NOT NULL                COMMENT '业务订单号（幂等键）',
    remark          VARCHAR(200)                         COMMENT '备注',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_wallet_transaction_log_order (order_id),
    INDEX idx_wallet_log_user_created (user_id, created_at),
    INDEX idx_wallet_log_related (related_type),
    INDEX idx_wallet_log_related_id (related_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='钱包交易流水表';

-- ============================================================
-- 初始化已有用户的钱包记录（余额 0）
-- ============================================================
-- 背景：
--   已注册用户在钱包表创建前就已存在，需初始化对应钱包记录，
--   避免后续 WalletService.deduct 调用时需走 initWallet 分支。
--   初始余额为 0，用户后续通过充值或领取红包积累余额。
--
-- 注意：
--   使用 INSERT IGNORE 避免与 user_id 唯一索引冲突，
--   重复执行迁移时不会报错（Flyway 本身保证单次执行，此处为双保险）。
-- ============================================================

INSERT IGNORE INTO user_wallet (user_id, balance_cents, frozen_cents, version, created_at, updated_at)
SELECT u.id, 0, 0, 0, NOW(), NOW()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_wallet w WHERE w.user_id = u.id
);

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP TABLE IF EXISTS wallet_transaction_log;
-- DROP TABLE IF EXISTS user_wallet;
