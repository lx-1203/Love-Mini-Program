-- ============================================================
-- 迁移：创建 VIP 红包相关表（vip_red_packets + vip_red_packet_claims）
-- ============================================================
-- 背景：
--   VIP 红包功能要求支持用户发送红包、领取红包，
--   可关联聊天会话（聊天红包）或独立发送（VIP 专属红包）。
--   支持普通红包（等额）与拼手气红包（随机金额）两种类型。
--
-- 表结构说明：
--   * vip_red_packets：红包主表，记录发送者、总金额、总个数、过期时间、状态等
--   * vip_red_packet_claims：领取记录表，记录每个用户对每个红包的领取明细
--
-- 字段单位说明：
--   * 金额统一以"分"为整数存储（total_amount / claimed_amount / amount），
--     避免浮点精度问题，前端展示时除以 100 转换为元
--
-- 索引说明：
--   * idx_vip_red_packets_sender：按发送者查询红包列表
--   * idx_vip_red_packets_chat：按聊天会话查询红包（聊天红包场景）
--   * idx_vip_red_packets_status：按状态筛选（可领取/已过期/已领完）
--   * uk_vip_red_packet_claims：唯一索引 (red_packet_id, claimer_id) 防止重复领取
-- ============================================================

CREATE TABLE IF NOT EXISTS vip_red_packets (
    id              BIGINT UNSIGNED       PRIMARY KEY AUTO_INCREMENT,
    sender_id       BIGINT UNSIGNED NOT NULL                COMMENT '发送者用户ID',
    total_amount    INT          NOT NULL                COMMENT '红包总金额（单位：分）',
    total_count     INT          NOT NULL                COMMENT '红包总个数',
    claimed_count   INT          NOT NULL DEFAULT 0      COMMENT '已领取个数',
    claimed_amount  INT          NOT NULL DEFAULT 0      COMMENT '已领取金额（分）',
    type            VARCHAR(16)  NOT NULL DEFAULT 'NORMAL' COMMENT '红包类型 NORMAL/LUCKY',
    chat_id         VARCHAR(128)                         COMMENT '关联聊天会话ID（可选，用于聊天红包）',
    blessing        VARCHAR(200)                         COMMENT '祝福语',
    expire_at       DATETIME     NOT NULL                COMMENT '过期时间',
    status          VARCHAR(16)  NOT NULL DEFAULT 'PENDING' COMMENT '状态 PENDING/EXPIRED/DEPLETED',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_vip_red_packets_sender (sender_id),
    INDEX idx_vip_red_packets_chat (chat_id),
    INDEX idx_vip_red_packets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='VIP 红包表';

CREATE TABLE IF NOT EXISTS vip_red_packet_claims (
    id              BIGINT UNSIGNED       PRIMARY KEY AUTO_INCREMENT,
    red_packet_id   BIGINT UNSIGNED NOT NULL                COMMENT '红包ID',
    claimer_id      BIGINT UNSIGNED NOT NULL                COMMENT '领取人用户ID',
    amount          INT          NOT NULL                COMMENT '领取金额（分）',
    claimed_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '领取时间',
    UNIQUE KEY uk_vip_red_packet_claims (red_packet_id, claimer_id),
    INDEX idx_vip_red_packet_claims_packet (red_packet_id),
    INDEX idx_vip_red_packet_claims_claimer (claimer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='VIP 红包领取记录表';

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP TABLE IF EXISTS vip_red_packet_claims;
-- DROP TABLE IF EXISTS vip_red_packets;
