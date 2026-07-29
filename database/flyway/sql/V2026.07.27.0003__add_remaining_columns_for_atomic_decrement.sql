-- ============================================================
-- 迁移：为优惠码与红包表新增"剩余"字段，支持原子扣减
-- ============================================================
-- 背景：
--   Task 12.3 / 12.4（REAUDIT-REPORT-100+ 编号 40、41）：
--   并发场景下使用 UPDATE ... WHERE remaining > 0 原子扣减，避免超发。
--
-- 变更说明：
--   1. promo_codes 新增 remaining_uses INT NOT NULL DEFAULT 0：
--      剩余可用次数（创建时 = max_uses，每使用一次原子 -1）。
--      与原有 used_count 字段并存，remaining_uses 用于原子扣减，used_count 用于统计展示。
--   2. promo_codes 新增 max_uses_per_user INT NOT NULL DEFAULT 1：
--      单用户最大使用次数，默认 1（即同一用户对同一优惠码只能用一次）。
--   3. vip_red_packets 新增 remaining_amount INT NOT NULL DEFAULT 0：
--      红包剩余金额（分），创建时 = total_amount，领取时原子扣减。
--   4. vip_red_packets 新增 remaining_count INT NOT NULL DEFAULT 0：
--      红包剩余份数，创建时 = total_count，领取时原子 -1。
--
-- 数据迁移：
--   * promo_codes.remaining_uses = max_uses - used_count（不为负）
--   * vip_red_packets.remaining_amount = total_amount - claimed_amount
--   * vip_red_packets.remaining_count = total_count - claimed_count
-- ============================================================

ALTER TABLE promo_codes
    ADD COLUMN remaining_uses INT NOT NULL DEFAULT 0 COMMENT '剩余可用次数（原子扣减用）' AFTER used_count,
    ADD COLUMN max_uses_per_user INT NOT NULL DEFAULT 1 COMMENT '单用户最大使用次数' AFTER max_uses;

-- 初始化 remaining_uses = max_uses - used_count（限制不小于 0）
UPDATE promo_codes
SET remaining_uses = GREATEST(max_uses - used_count, 0)
WHERE max_uses > 0;
-- max_uses = 0 表示不限次数，remaining_uses 设为大值（2147483647）表示无限
UPDATE promo_codes
SET remaining_uses = 2147483647
WHERE max_uses = 0;

ALTER TABLE vip_red_packets
    ADD COLUMN remaining_amount INT NOT NULL DEFAULT 0 COMMENT '红包剩余金额（分，原子扣减用）' AFTER claimed_amount,
    ADD COLUMN remaining_count INT NOT NULL DEFAULT 0 COMMENT '红包剩余份数（原子扣减用）' AFTER remaining_amount;

-- 初始化 remaining_amount = total_amount - claimed_amount；remaining_count = total_count - claimed_count
UPDATE vip_red_packets
SET remaining_amount = total_amount - claimed_amount,
    remaining_count = total_count - claimed_count;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- ALTER TABLE vip_red_packets
--     DROP COLUMN remaining_count,
--     DROP COLUMN remaining_amount;
-- ALTER TABLE promo_codes
--     DROP COLUMN max_uses_per_user,
--     DROP COLUMN remaining_uses;
