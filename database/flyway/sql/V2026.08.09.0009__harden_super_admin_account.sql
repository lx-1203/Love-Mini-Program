-- ============================================================
-- 迁移：加固超级测试账号（移除公开弱口令）R4-00364 / R4-00365（P0）
-- ============================================================
-- 背景：
--   历史迁移 V2026.08.07.0004（seed_super_test_account）与
--   V2026.08.07.0019（reset_super_admin_password）向 users 表写入了
--   公开已知的超级管理员凭据：
--     - openid = 'local-dev-admin-openid-123456'（id=100000 或 id=1，两者其一存在）
--     - 明文密码 'Admin@12345'（V2026.08.07.0004 写入）
--     - Admin@12345 对应的公开 BCrypt 哈希
--       '$2a$10$CjX5HfkDnKv7gfy6oGi3g.PWizPQ2D1h1QO6D/yhqwmm/dGOJ8TYe'
--       （V2026.08.07.0019 写入）
--     - 手机号 19900000000
--   已应用的迁移不可修改（Flyway checksum 校验），任何环境（含生产）执行
--   完整迁移链都会产生「凭据公开已知的超级管理员」，攻击者可用公开弱口令
--   直接登录管理后台。
--
-- 本迁移：将匹配账号的密码重置为随机不可知值（256 位随机 hex），
-- 公开弱口令明文与公开 BCrypt 哈希均无法再通过登录校验
-- （RealAuthService.matchesPasswordWithMigration 的 BCrypt 比对与
-- 明文兼容比对均不命中）。账号本身保留（openid / 手机号不变，便于运维识别）。
--
-- 密码重置方式（运维）：设置 ADMIN_PASSWORD_HASH 环境变量（BCrypt 哈希，
-- 生成方法见 PasswordEncoderConfig#encodePassword 或 flyway.toml 注释），
-- 由 Flyway placeholder ${admin_password_hash} 驱动的初始化迁移
-- （V2026.06.25.0002 等）或管理后台改密接口重新设置；本迁移不写死新口令。
--
-- 幂等性：WHERE 精确匹配账号身份（id=100000 OR openid）与弱口令值，
-- 首次执行后密码已变更，重复执行不命中任何行，结果一致。
-- ============================================================

UPDATE users
SET password = '47e0623afa20f48d5e8c396e87af741e5496f554e4334ec5b19fb929f24708cb',
    updated_at = NOW()
WHERE (id = 100000 OR openid = 'local-dev-admin-openid-123456')
  AND role IN ('SUPER_ADMIN', 'ADMIN')
  AND password IN (
        'Admin@12345',
        '$2a$10$CjX5HfkDnKv7gfy6oGi3g.PWizPQ2D1h1QO6D/yhqwmm/dGOJ8TYe'
      );

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- UPDATE users
-- SET password = '$2a$10$CjX5HfkDnKv7gfy6oGi3g.PWizPQ2D1h1QO6D/yhqwmm/dGOJ8TYe',
--     updated_at = NOW()
-- WHERE (id = 100000 OR openid = 'local-dev-admin-openid-123456')
--   AND role IN ('SUPER_ADMIN', 'ADMIN');
