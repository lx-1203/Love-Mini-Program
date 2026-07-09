-- ============================================================
-- 迁移：扩展 users.password 字段语义至所有密码登录用户
-- ============================================================
-- 背景：
--   Phase 1 任务 3（V2026.06.25.0002）添加了 users.password 字段，
--   当时 javadoc 限制为"仅管理员账号使用"，并仅为 role='ADMIN' 的用户初始化 BCrypt 哈希。
--   普通用户该字段保持 NULL（微信登录无密码）。
--
-- Phase 3 任务 13 扩展：
--   将 password 字段语义扩展为"支持管理员与密码登录的普通用户"，
--   为未来可能开通的手机号+密码登录等场景预留字段。
--   字段定义本身未变更（VARCHAR(100)，可空），仅修正列注释以反映新语义。
--
-- 设计决策：
--   * 字段类型保持 VARCHAR(100)：BCrypt cost=10 的哈希长度约 60 字符，100 字符留有余量。
--   * 不为存量普通用户初始化占位哈希：
--     - 微信登录用户无需密码，NULL 表示"该用户无密码登录方式"。
--     - 强制首次登录改密的策略应在前端业务层实现，而非通过占位哈希。
--     - 如未来开通密码登录，注册时由 RealAuthService 调用 passwordEncoder.encode() 写入。
--   * 不删除/重建字段：避免影响已存在的管理员账号哈希。
--
-- 兼容性：
--   * V2026.06.25.0002 已使用 ADD COLUMN IF NOT EXISTS 添加字段，本脚本再次幂等确认。
--   * 列注释更新使用 MODIFY COLUMN，保留原数据。
--   * 应用层 RealAuthService#loginAsAdmin 已保留对历史明文密码的兼容校验与自动迁移逻辑。
-- ============================================================

-- 1. 幂等确保 password 字段存在（如 V2026.06.25.0002 已执行则跳过）
-- MySQL 8.0 不支持 ADD COLUMN IF NOT EXISTS，使用 INFORMATION_SCHEMA 动态 SQL 实现幂等。
SET @add_password_sql = IF(
    EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'password'
    ),
    'SELECT 1',
    "ALTER TABLE users ADD COLUMN password VARCHAR(100) DEFAULT NULL COMMENT '密码 BCrypt 哈希，管理员与密码登录用户使用，微信登录用户为 NULL'"
);
PREPARE stmt FROM @add_password_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 更新列注释以反映扩展后的语义（不影响数据，仅修改元数据）
ALTER TABLE users
    MODIFY COLUMN password VARCHAR(100) DEFAULT NULL
    COMMENT '密码 BCrypt 哈希（管理员与密码登录用户使用，微信登录用户为 NULL）';

-- ============================================================
-- 注意事项：
--   * 本脚本不进行任何数据迁移，存量普通用户 password 保持 NULL。
--   * 管理员账号的 BCrypt 哈希由 V2026.06.25.0002 初始化，保持不变。
--   * 如生产环境存在手工录入的明文密码（理论上不应存在），
--     RealAuthService#loginAsAdmin 会在登录时自动迁移为 BCrypt 哈希（一次性升级）。
-- ============================================================