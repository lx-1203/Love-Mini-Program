-- ============================================================
-- 迁移：创建 VIP 优惠码相关表（promo_codes + promo_code_usages）
-- ============================================================
-- 背景：
--   VIP 优惠码功能要求支持优惠码验证、兑换，
--   支持满减金额（AMOUNT）与百分比折扣（PERCENT）两种类型。
--   每个用户对同一优惠码只能使用一次，全局使用次数受 maxUses 限制。
--
-- 表结构说明：
--   * promo_codes：优惠码主表，记录码、折扣类型、折扣值、有效期、使用次数等
--   * promo_code_usages：使用记录表，记录每个用户使用优惠码的历史
--
-- 字段单位说明：
--   * 金额相关字段以"分"为整数存储（discount_value 在 AMOUNT 类型时为分）
--   * PERCENT 类型时 discount_value 为 0-100 的整数
--
-- 索引说明：
--   * uk_promo_codes_code：优惠码字符串唯一索引，防止重复
--   * uk_promo_code_usages：唯一索引 (promo_code_id, user_id) 防止同一用户重复使用
--   * idx_promo_code_usages_user：按用户查询使用记录
-- ============================================================

CREATE TABLE IF NOT EXISTS promo_codes (
    id              BIGINT UNSIGNED       PRIMARY KEY AUTO_INCREMENT,
    code            VARCHAR(64)  NOT NULL                COMMENT '优惠码字符串（唯一）',
    discount_type   VARCHAR(16)  NOT NULL DEFAULT 'AMOUNT' COMMENT '折扣类型 AMOUNT/PERCENT',
    discount_value  INT          NOT NULL                COMMENT '折扣值（AMOUNT为分，PERCENT为百分比0-100）',
    max_uses        INT          NOT NULL DEFAULT 0      COMMENT '最大使用次数（0表示不限）',
    used_count      INT          NOT NULL DEFAULT 0      COMMENT '已使用次数',
    valid_from      DATETIME     NOT NULL                COMMENT '有效期开始时间',
    valid_to        DATETIME     NOT NULL                COMMENT '有效期结束时间',
    status          VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE' COMMENT '状态 ACTIVE/DISABLED',
    created_by      BIGINT UNSIGNED                      COMMENT '创建者用户ID（管理员）',
    remark          VARCHAR(200)                         COMMENT '备注',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_promo_codes_code (code),
    INDEX idx_promo_codes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='VIP 优惠码表';

CREATE TABLE IF NOT EXISTS promo_code_usages (
    id              BIGINT UNSIGNED       PRIMARY KEY AUTO_INCREMENT,
    promo_code_id   BIGINT UNSIGNED NOT NULL                COMMENT '优惠码ID',
    code            VARCHAR(64)  NOT NULL                COMMENT '优惠码字符串（冗余）',
    user_id         BIGINT UNSIGNED NOT NULL                COMMENT '使用者用户ID',
    discount_amount INT          NOT NULL                COMMENT '折扣金额（分）',
    used_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '使用时间',
    UNIQUE KEY uk_promo_code_usages (promo_code_id, user_id),
    INDEX idx_promo_code_usages_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='VIP 优惠码使用记录表';

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP TABLE IF EXISTS promo_code_usages;
-- DROP TABLE IF EXISTS promo_codes;
