-- ============================================================
-- 迁移：移除 promo_code_usages 唯一约束，支持 max_uses_per_user > 1
-- ============================================================
-- 背景：
--   Task 12.4（REAUDIT-REPORT-100+ 编号 41）：
--   V2026.07.25.0003 创建 promo_code_usages 时建立了
--   UNIQUE KEY uk_promo_code_usages (promo_code_id, user_id)，
--   假设同一用户对同一优惠码只能使用一次。
--
--   V2026.07.27.0003 新增 max_uses_per_user 字段（默认 1）后，
--   管理员可将单用户使用上限调整为 > 1（如新人礼包可领 3 次）。
--   原唯一约束会阻止第二次插入，导致 max_uses_per_user > 1 失效。
--
-- 变更说明：
--   1. 删除 UNIQUE KEY uk_promo_code_usages
--   2. 保留 idx_promo_code_usages_user 索引（按用户查询性能）
--   3. 新增 idx_promo_code_usages_code_user 普通索引（按优惠码+用户计数性能）
--
-- 防重放保障：
--   唯一约束移除后，防重放由应用层负责：
--   - PromoCodeService.redeem 调用 countByPromoCodeIdAndUserId 校验已使用次数
--     < maxUsesPerUser 才允许继续
--   - 原子扣减 UPDATE ... WHERE remaining_uses > 0 保证全局不超发
--   - 优惠码状态/有效期校验防止已禁用/过期优惠码被使用
-- ============================================================

-- 删除唯一约束（MySQL 8.0+ 支持 DROP INDEX 直接删除索引）
ALTER TABLE promo_code_usages
    DROP INDEX uk_promo_code_usages;

-- 新增普通索引支持按优惠码+用户计数查询
CREATE INDEX idx_promo_code_usages_code_user
    ON promo_code_usages (promo_code_id, user_id);

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP INDEX idx_promo_code_usages_code_user ON promo_code_usages;
-- ALTER TABLE promo_code_usages
--     ADD UNIQUE KEY uk_promo_code_usages (promo_code_id, user_id);
