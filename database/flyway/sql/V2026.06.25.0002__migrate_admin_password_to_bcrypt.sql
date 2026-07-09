-- ============================================================
-- 迁移：管理员密码改为 BCrypt 哈希存储
-- ============================================================
-- 背景：
--   原 RealAuthService#loginAsAdmin 使用 String.equals 明文比较密码，
--   管理员密码通过环境变量 ADMIN_PASSWORD 以明文形式配置，存在严重安全风险。
--
-- 修复内容：
--   1. 为 users 表新增 password 字段（VARCHAR(100)，可空），存储 BCrypt 哈希。
--      普通用户该字段为 NULL（微信登录无密码），仅管理员账号有值。
--   2. 为现有管理员账号（role='ADMIN'）初始化 BCrypt 哈希，
--      默认明文密码为 "Admin@2026"（通过环境变量 ADMIN_PASSWORD_HASH 可覆盖哈希值）。
--
-- 注意事项：
--   * BCrypt 哈希格式为 $2a$10$...（cost=10），无法逆推明文。
--   * 默认哈希值由 Flyway placeholder #[admin-password-hash] 提供，
--     可通过环境变量 ADMIN_PASSWORD_HASH 覆盖。
--   * ⚠️ 安全警告：默认密码 "Admin@2026" 仅用于初始化，
--     管理员首次登录后必须立即修改密码！
--   * 生成新哈希的方法：
--     调用 com.campuslove.api.config.PasswordEncoderConfig#encodePassword("Admin@2026")
--     或使用在线 BCrypt 生成工具（cost=10）。
--   * RealAuthService.loginAsAdmin 优先校验数据库 password 字段，
--     环境变量 ADMIN_PASSWORD（也需为 BCrypt 哈希）作为兜底。
-- ============================================================

-- 1. 为 users 表新增 password 字段（仅管理员账号使用）
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password VARCHAR(100) DEFAULT NULL COMMENT '管理员密码 BCrypt 哈希，普通用户为 NULL';

-- 2. 为现有管理员账号初始化 BCrypt 哈希
--    使用 Flyway placeholder #[admin-password-hash]，默认值见 application-db.yml
--    仅更新 password 为空的管理员账号，避免覆盖已设置的密码
UPDATE users
SET password = #[admin-password-hash],
    updated_at = NOW()
WHERE role = 'ADMIN'
  AND (password IS NULL OR password = '');