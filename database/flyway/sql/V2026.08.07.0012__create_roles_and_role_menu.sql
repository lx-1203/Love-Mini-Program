-- ============================================================
-- 迁移：角色管理（eladmin 风格）+ 角色-菜单关联
-- ============================================================
-- 背景：
--   user.role 现有字符串（USER/ADMIN/SUPER_ADMIN），保留双轨（风险点 6）：
--   roles.code 与 user.role 对齐（SUPER_ADMIN / ADMIN），role_menu 关联
--   各角色可访问的菜单。角色支持自定义 data_scope（ALL 全局 / CAMPUS 校区）。
--
-- 幂等性：information_schema 检查表存在性后 CREATE TABLE，种子数据 WHERE NOT EXISTS。
-- ============================================================

SET @has_roles := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'roles'
);

SET @sql_roles := IF(
    @has_roles = 0,
    'CREATE TABLE roles (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(64) NOT NULL COMMENT ''角色名称（中文，如 超级管理员 / 校区管理员）'',
        code VARCHAR(32) NOT NULL COMMENT ''角色编码（与 user.role 对齐：SUPER_ADMIN / ADMIN）'',
        data_scope VARCHAR(16) NOT NULL DEFAULT ''CAMPUS'' COMMENT ''数据范围：ALL 全局 / CAMPUS 校区隔离'',
        description VARCHAR(255) NOT NULL DEFAULT '''' COMMENT ''角色描述'',
        enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''是否启用'',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_roles_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''角色表''',
    'SELECT 1'
);
PREPARE stmt_roles FROM @sql_roles;
EXECUTE stmt_roles;
DEALLOCATE PREPARE stmt_roles;

-- ---------- role_menus 关联表 ----------
SET @has_role_menus := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'role_menus'
);

SET @sql_role_menus := IF(
    @has_role_menus = 0,
    'CREATE TABLE role_menus (
        role_id BIGINT NOT NULL COMMENT ''角色 ID（FK -> roles.id）'',
        menu_id BIGINT NOT NULL COMMENT ''菜单 ID（FK -> menus.id）'',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, menu_id),
        KEY idx_role_menus_menu (menu_id),
        CONSTRAINT fk_role_menus_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
        CONSTRAINT fk_role_menus_menu FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''角色-菜单关联表''',
    'SELECT 1'
);
PREPARE stmt_role_menus FROM @sql_role_menus;
EXECUTE stmt_role_menus;
DEALLOCATE PREPARE stmt_role_menus;

-- ============================================================
-- 种子数据（WHERE NOT EXISTS 幂等）
-- ============================================================

-- SUPER_ADMIN：全局数据范围，可见全部菜单
INSERT INTO roles (id, name, code, data_scope, description)
SELECT 1, '超级管理员', 'SUPER_ADMIN', 'ALL', '全局超级管理员：可见全部菜单与全部校区数据'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'SUPER_ADMIN');

-- ADMIN：校区数据隔离，可见业务菜单（论坛/活动/商业/配置/用户内容），隐藏系统管理
INSERT INTO roles (id, name, code, data_scope, description)
SELECT 2, '校区管理员', 'ADMIN', 'CAMPUS', '校区管理员：仅见本校区数据与业务菜单'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'ADMIN');

-- ============================================================
-- 角色-菜单关联种子
-- SUPER_ADMIN（role_id=1）：全部菜单（101-108, 201-205, 301-305, 401-402, 501-507, 601-604）
-- ADMIN（role_id=2）：业务菜单（201-205, 301-305, 401-402, 501-507, 601-604）
-- ============================================================

-- SUPER_ADMIN 全部菜单
INSERT INTO role_menus (role_id, menu_id)
SELECT 1, m.id FROM menus m
WHERE NOT EXISTS (SELECT 1 FROM role_menus rm WHERE rm.role_id = 1 AND rm.menu_id = m.id);

-- ADMIN 业务菜单：排除系统管理（100 目录及 101-108）
INSERT INTO role_menus (role_id, menu_id)
SELECT 2, m.id FROM menus m
WHERE m.parent_id != 100
  AND NOT EXISTS (SELECT 1 FROM role_menus rm WHERE rm.role_id = 2 AND rm.menu_id = m.id);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DROP TABLE IF EXISTS role_menus;
-- DROP TABLE IF EXISTS roles;
