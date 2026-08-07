-- ============================================================
-- 迁移：修正 users.campus_name 不变量（P1-26）
-- ============================================================
-- 背景：
--   user.campus_name 的语义（V2026.08.07.0001/0010 约定）是「管理员管辖校区名」，
--   仅对 role 为 ADMIN/SUPER_ADMIN 的账号有意义；普通用户（role=USER）
--   该字段恒为 NULL，学校归属统一存于 user_campus_profile.campus_name。
--
--   历史种子 V2026.08.07.0021 直接写 users.campus_name（虚拟用户），
--   违反上述不变量，导致按 users.campus_name 关联 schools 的查询
--   （如 resolveSchoolId、校区话题隔离）与推荐池过滤结果错乱。
--
--   本迁移仅清理 USER 角色残留的 campus_name，保留 ADMIN/SUPER_ADMIN 的
--   管辖校区配置。
--
--   幂等性：UPDATE 本身天然幂等，可安全重跑。
-- ============================================================

-- ========== 1. 执行前确认（手动核对，勿删） ==========
-- SELECT role, COUNT(*) AS cnt, SUM(campus_name IS NOT NULL) AS has_campus
-- FROM users GROUP BY role;

-- ========== 2. 清理 USER 角色残留 campus_name ==========
UPDATE users
SET campus_name = NULL
WHERE role = 'USER'
  AND campus_name IS NOT NULL;

-- ========== 3. 执行后确认（手动核对，勿删） ==========
-- SELECT COUNT(*) AS residual FROM users WHERE role = 'USER' AND campus_name IS NOT NULL;

-- ============================================================
-- DOWN 回滚脚本（手动执行）
--   无法精确还原被清理的历史值，如需回滚请从备份恢复该表；
--   或按业务需求重新补齐 user_campus_profile 与 users 的关联数据。
-- ============================================================
