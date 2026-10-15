-- ============================================================
-- 迁移：新增第三档后台角色 AUDITOR（只读审核员）
-- ============================================================
-- 背景：
--   后台原有两档角色 SUPER_ADMIN（全局）/ ADMIN（校区可写）。本次引入第三档 AUDITOR：
--   可读后台业务数据、不可写任何数据。读写分离由 SecurityConfig 按 HTTP 方法完成
--   （POST/PUT/PATCH/DELETE 的 /api/v1/admin/** 仅放行 ADMIN / SUPER_ADMIN），
--   本迁移只负责两件事：角色本身存在（roles 行）+ 角色可见菜单（role_menus 绑定）。
--
--   roles.code 与 users.role 双轨对齐（见 V2026.08.07.0012）。AUDITOR 的 data_scope
--   固定为 CAMPUS：AdminDataScope 不承认「全局审核员」，users.campus_name 为空的
--   AUDITOR 读不到任何校区数据（fail-closed），因此不写 ALL。
--
--   可见菜单直接复制 ADMIN（校区管理员）已绑定的 role_menus：审核员读的就是校区管理员
--   能看到的那批业务列表，系统管理目录（menus.id=100）随 ADMIN 的既有绑定一并排除。
--
-- 幂等性：roles 采用 INSERT...SELECT + WHERE NOT EXISTS（按 uk_roles_code 判重）；
--         role_menus 逐行 NOT EXISTS 补种，重跑为空操作。
--         id 不写死，交由 AUTO_INCREMENT 分配，避免与存量库自建角色撞主键。
-- ============================================================

-- AUDITOR 角色种子
INSERT INTO roles (name, code, data_scope, description)
SELECT '审核员', 'AUDITOR', 'CAMPUS', '只读审核员：可见本校区业务菜单，不得执行任何写操作'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'AUDITOR');

-- AUDITOR 菜单绑定：复制 ADMIN 角色的 role_menus 行（ADMIN 缺行时本语句自然为空集）
INSERT INTO role_menus (role_id, menu_id)
SELECT auditor_role.id, admin_menu.menu_id
FROM roles auditor_role
CROSS JOIN (
    SELECT rm.menu_id AS menu_id
    FROM role_menus rm
    INNER JOIN roles admin_role ON admin_role.id = rm.role_id
    WHERE admin_role.code = 'ADMIN'
) admin_menu
WHERE auditor_role.code = 'AUDITOR'
  AND NOT EXISTS (
      SELECT 1 FROM role_menus existed
      WHERE existed.role_id = auditor_role.id AND existed.menu_id = admin_menu.menu_id
  );

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM role_menus WHERE role_id IN (SELECT id FROM roles WHERE code = 'AUDITOR');
-- DELETE FROM roles WHERE code = 'AUDITOR';
