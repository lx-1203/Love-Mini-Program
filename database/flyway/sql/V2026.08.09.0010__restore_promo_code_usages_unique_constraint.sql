-- ============================================================
-- 迁移：恢复 promo_code_usages 唯一约束（R4-00418，P1）
-- ============================================================
-- 背景：
--   V2026.07.25.0003 建表时定义 UNIQUE KEY uk_promo_code_usages
--   (promo_code_id, user_id)，原注释明确「防止同一用户重复使用」。
--   V2026.07.27.0004 为支持 max_uses_per_user > 1 删除了该唯一约束，
--   改为普通索引 idx_promo_code_usages_code_user，防重放仅依赖应用层计数校验，
--   同一用户可对同一优惠码重复插入使用记录（白嫖折扣），存在资金/权益风险
--   （R4 审计定级 P1：应用层若未原子防重则白嫖）。
--
-- 本迁移：
--   1. 清理历史重复使用记录：同一 (promo_code_id, user_id) 仅保留最早一条
--      （id 最小者，即首次使用记录）
--   2. 恢复 UNIQUE KEY uk_promo_code_usages (promo_code_id, user_id)
--   3. 移除冗余普通索引 idx_promo_code_usages_code_user
--      （列序与唯一键相同，唯一索引可完全覆盖其按优惠码+用户计数场景）
--
-- 应用层防重（PromoCodeService.redeem）保留，双保险：
--   - 悲观锁（SELECT ... FOR UPDATE）串行化同一优惠码的并发兑换
--   - countByPromoCodeIdAndUserId < max_uses_per_user 校验
--   - 唯一约束作为数据库层兜底，即使应用层校验被绕过也无法重复使用
--
-- 语义说明：唯一约束恢复后，同一用户对同一优惠码最多使用一次
-- （max_uses_per_user > 1 的配置将不再生效，符合 R4 审计定级结论）。
--
-- 幂等性：DELETE 去重语句天然幂等（重复执行无重复行可删）；
-- DDL 通过 information_schema 判断约束/索引存在性（MySQL 不支持
-- ADD/DROP INDEX IF NOT EXISTS 语法，沿用项目既有模式，
-- 见 V2026.07.26.0002__add_open_id_unique_constraint.sql）。
-- ============================================================

-- 1. 清理重复使用记录：同一 (promo_code_id, user_id) 仅保留 id 最小（最早）的一条
DELETE u1
FROM promo_code_usages u1
JOIN promo_code_usages u2
  ON u1.promo_code_id = u2.promo_code_id
 AND u1.user_id = u2.user_id
 AND u2.id < u1.id;

-- 2. 恢复唯一约束（缺失时创建）
DROP PROCEDURE IF EXISTS restore_promo_code_usages_unique_constraint;

DELIMITER $$
CREATE PROCEDURE restore_promo_code_usages_unique_constraint()
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = 'promo_code_usages'
          AND index_name = 'uk_promo_code_usages'
    ) THEN
        ALTER TABLE promo_code_usages
            ADD UNIQUE KEY uk_promo_code_usages (promo_code_id, user_id);
    END IF;
END$$
DELIMITER ;

CALL restore_promo_code_usages_unique_constraint();

DROP PROCEDURE IF EXISTS restore_promo_code_usages_unique_constraint;

-- 3. 移除冗余普通索引（存在时删除；与唯一键列序一致，查询被唯一索引覆盖）
DROP PROCEDURE IF EXISTS drop_promo_code_usages_code_user_index;

DELIMITER $$
CREATE PROCEDURE drop_promo_code_usages_code_user_index()
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = 'promo_code_usages'
          AND index_name = 'idx_promo_code_usages_code_user'
    ) THEN
        ALTER TABLE promo_code_usages
            DROP INDEX idx_promo_code_usages_code_user;
    END IF;
END$$
DELIMITER ;

CALL drop_promo_code_usages_code_user_index();

DROP PROCEDURE IF EXISTS drop_promo_code_usages_code_user_index;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP INDEX uk_promo_code_usages ON promo_code_usages;
-- CREATE INDEX idx_promo_code_usages_code_user
--     ON promo_code_usages (promo_code_id, user_id);
