-- ============================================================
-- 迁移：超级管理员角色支持（infra R2-00025）
-- ============================================================
-- 背景：
--   审查发现管理后台无超级管理员分级：所有 admin 端点仅要求 ROLE_ADMIN，
--   普通管理员可改动全局通知模板/敏感词库/系统配置/匹配策略等敏感配置，
--   无审批与隔离。本迁移引入 SUPER_ADMIN 角色：
--
--   1. 将存量唯一 ADMIN（最早创建的管理员，即初始化管理员）升级为 SUPER_ADMIN，
--      保证现有单管理员部署升级后功能不受影响；
--   2. 后续新增的管理员默认 ADMIN，仅具备日常运营权限（用户/帖子/举报/评论/认证），
--      敏感系统配置（configs/rules/switches/match-config/notify-config/sensitive-words）
--      需 SUPER_ADMIN 权限（由后端 @PreAuthorize 强制执行）。
--
-- 幂等性：
--   通过 information_schema 检查 role 列存在性；UPDATE 按条件执行可安全重跑。
-- ============================================================

-- 若 role 列不存在（极端情况下未执行 V2026.06.25.0001），跳过
SET @has_role_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'role'
);

-- 将初始化管理员升级为 SUPER_ADMIN（仅当尚无 SUPER_ADMIN 时）
-- 选择规则（security_review 修复 R2-LOW-03）：优先按 ${admin_openid} 占位符精确匹配
-- （即 V2026.06.25.0001 初始化脚本写入的管理员 openid）；占位符未配置/已变更时
-- 回退为 created_at 最早的 ADMIN（避免多管理员部署按时间提升错误账号）。
-- 修复（infra R2-00025 review）：MySQL 不允许 UPDATE 的 WHERE 子查询直接引用
-- 被更新表（ERROR 1093），全部子查询必须用派生表包装。
-- security_review 说明(R2-LOW-02):${admin_openid} 为 Flyway 纯文本占位符,值由
-- AdminOpenidValidator(启动 fail-fast)校验非空/非占位/长度≥16;生产部署者可控,
-- 注入面受限。此处保持直接比较,不引入 REPLACE 转义(纯文本替换发生在转义解析前,
-- 无法真正防御且易破坏 SQL)。含引号的异常值只会导致无匹配,回退 created_at 提升。
SET @sql := IF(
    @has_role_col > 0,
    'UPDATE users SET role = ''SUPER_ADMIN'' WHERE role = ''ADMIN'' AND (openid = ''${admin_openid}'' OR (openid <> ''${admin_openid}'' AND created_at = (SELECT MIN(created_at) FROM (SELECT created_at FROM users WHERE role = ''ADMIN'') t))) AND NOT EXISTS (SELECT 1 FROM (SELECT 1 AS x FROM users WHERE role = ''SUPER_ADMIN'') s)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- UPDATE users SET role = 'ADMIN' WHERE role = 'SUPER_ADMIN';
