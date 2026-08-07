-- ============================================================
-- 迁移：修复超级测试账号登录（重置管理员密码 + 补手机号）
-- ============================================================
-- 背景：
--   历史迁移 V2026.08.07.0004 按 openid 幂等插入 id=100000 超级测试账号，
--   但库中已存在 openid = 'local-dev-admin-openid-123456' 的 id=1 超级管理员，
--   导致 id=100000 插入被跳过（WHERE NOT EXISTS 不成立）。
--
--   用户要求登录凭据（本地）：
--     - 后台登录：openid = local-dev-admin-openid-123456 / Admin@12345
--     - 前端手机号登录：19900000000 / Admin@12345
--
--   本迁移将 id=1 超级管理员作为唯一超级测试账号：
--     - password 重置为 Admin@12345 的 BCrypt 哈希
--     - phone 补为 19900000000（前端 phone-login 可用，且保持全功能）
--
-- 幂等性：按 openid 定位，重复执行结果一致（UPDATE 幂等）。
-- ============================================================

-- 1. 重置超级管理员密码为 Admin@12345 的 BCrypt 哈希
--    哈希由 spring-security-crypto BCryptPasswordEncoder(cost=10) 生成
UPDATE users
SET password = '$2a$10$CjX5HfkDnKv7gfy6oGi3g.PWizPQ2D1h1QO6D/yhqwmm/dGOJ8TYe',
    updated_at = NOW()
WHERE openid = 'local-dev-admin-openid-123456'
  AND role IN ('SUPER_ADMIN', 'ADMIN');

-- 2. 补手机号 19900000000（幂等：仅当 phone 为空或不同时更新）
UPDATE users
SET phone = '19900000000',
    updated_at = NOW()
WHERE openid = 'local-dev-admin-openid-123456'
  AND role IN ('SUPER_ADMIN', 'ADMIN')
  AND (phone IS NULL OR phone <> '19900000000');

-- 3. 确保超级账号资料完整度 100（防止历史数据缺失）
UPDATE users
SET profile_completion = 100,
    status = 'active'
WHERE openid = 'local-dev-admin-openid-123456'
  AND role IN ('SUPER_ADMIN', 'ADMIN');

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- UPDATE users SET password = NULL, updated_at = NOW() WHERE openid = 'local-dev-admin-openid-123456';
