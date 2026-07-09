-- 为 users 表添加 role 字段并初始化管理员账号
--
-- 用途：
--   1. 给 users 表新增 role 列，区分普通用户(USER)与管理员(ADMIN)，
--      配合 SecurityConfig 中 /api/admin/** 的 hasRole('ADMIN') 权限校验。
--   2. 给现有用户回填默认角色 USER，保证历史数据一致性。
--   3. 通过 Flyway placeholder 机制初始化一个管理员账号，避免明文硬编码。
--
-- 注意事项：
--   * 管理员账号的 openid / nickname 通过 application-db.yml 中
--     spring.flyway.placeholders.admin-openid / admin-nickname 配置默认值，
--     并可由环境变量 ADMIN_OPENID / ADMIN_NICKNAME 覆盖。
--   * 仅当 users 表中尚不存在 role='ADMIN' 的用户时才插入，避免重复初始化。
--   * 管理员密码不在此脚本中初始化，由应用层通过环境变量 ADMIN_PASSWORD 配置，
--     详见 RealAuthService#loginAsAdmin。
--   * 迁移脚本中引用占位符使用 Flyway 默认 placeholder 语法 ${...}，
--     与 application-db.yml 的 spring.flyway.placeholders 配合使用。
--   * 注意：为避免与 Spring 属性占位符 ${...} 冲突，application-db.yml 中
--     spring.flyway.placeholderPrefix 已配置为 #[，本脚本同步改用 #[...] 语法。

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'USER' COMMENT '用户角色: USER/ADMIN';

-- 给现有用户回填默认值（防御性处理，ADD COLUMN ... DEFAULT 已覆盖新行，此处保证存量数据）
UPDATE users SET role = 'USER' WHERE role IS NULL OR role = '';

-- 初始化管理员账号（仅在不存在 ADMIN 用户时执行）
-- 使用 #[...] 占位符前缀（避免与 Spring ${...} 冲突），
-- 由 application-db.yml 的 spring.flyway.placeholders 提供值。
INSERT INTO users (openid, nickname, role, profile_completion, following_count, followers_count, created_at, updated_at)
SELECT #[admin-openid], #[admin-nickname], 'ADMIN', 100, 0, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'ADMIN' LIMIT 1);
