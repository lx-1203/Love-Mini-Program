-- ============================================================
-- 迁移：高校管理（商业模式：每个高校一个管理员）
-- ============================================================
-- 背景：
--   user.campus_name（V2026.08.07.0001）已用字符串记录校区名，
--   本次引入 schools 主表作为高校的一级管理对象，支持增删改查、
--   启用/停用，创建校区管理员时从该表下拉选择。
--
--   关联方式：user.campus_name 与 school.name 字符串对齐（不做外键，
--   保持与现有产品模型一致；school 停用时由登录流程校验拦截）。
--
-- 幂等性：information_schema 检查表存在性后 CREATE TABLE，可安全重跑。
-- ============================================================

SET @has_schools := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schools'
);

SET @sql_schools := IF(
    @has_schools = 0,
    'CREATE TABLE schools (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(128) NOT NULL COMMENT ''高校全称（与 user.campus_name 对齐）'',
        code VARCHAR(32) NOT NULL COMMENT ''高校编码（如 NJU/ZJU，唯一）'',
        status VARCHAR(16) NOT NULL DEFAULT ''active'' COMMENT ''状态：active 启用 / disabled 停用'',
        sort_order INT NOT NULL DEFAULT 0 COMMENT ''排序权重（升序）'',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_schools_code (code),
        UNIQUE KEY uk_schools_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''高校表''',
    'SELECT 1'
);
PREPARE stmt_schools FROM @sql_schools;
EXECUTE stmt_schools;
DEALLOCATE PREPARE stmt_schools;

-- ============================================================
-- 种子数据（WHERE NOT EXISTS 幂等）：与现有校区管理员对齐
-- ============================================================
INSERT INTO schools (name, code, sort_order)
SELECT '南京大学', 'NJU', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'NJU');

INSERT INTO schools (name, code, sort_order)
SELECT '浙江大学', 'ZJU', 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'ZJU');

INSERT INTO schools (name, code, sort_order)
SELECT '复旦大学', 'FDU', 3
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'FDU');

INSERT INTO schools (name, code, sort_order)
SELECT '武汉大学', 'WHU', 4
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'WHU');

INSERT INTO schools (name, code, sort_order)
SELECT '东南大学', 'SEU', 5
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'SEU');

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DROP TABLE IF EXISTS schools;
