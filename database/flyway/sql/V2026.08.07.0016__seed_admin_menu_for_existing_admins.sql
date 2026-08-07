-- ============================================================
-- 迁移：为现有管理员账号补齐菜单关联（种子数据幂等补充）
-- ============================================================
-- 背景：
--   V2026.08.07.0012 已为 roles 表种子数据建立 role_menu 关联。
--   本迁移确保：即使 menu 种子被部分修改/新增，SUPER_ADMIN 仍关联全部
--   菜单、ADMIN 仍关联业务菜单（排除系统管理），可安全重跑。
--
--   同时将现有 user.role 为 SUPER_ADMIN / ADMIN 的账号按编码补齐
--   role_menu 关联（双轨：user.role 字符串 + roles.code 对齐）。
--
-- 幂等性：全部使用 WHERE NOT EXISTS，可安全重跑。
-- ============================================================

-- SUPER_ADMIN 关联全部菜单（含后续新增菜单）
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id FROM roles r CROSS JOIN menus m
WHERE r.code = 'SUPER_ADMIN'
  AND NOT EXISTS (SELECT 1 FROM role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = m.id);

-- ADMIN 关联业务菜单（排除系统管理目录 parent_id=100）
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id FROM roles r CROSS JOIN menus m
WHERE r.code = 'ADMIN'
  AND m.parent_id != 100
  AND NOT EXISTS (SELECT 1 FROM role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = m.id);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM role_menus WHERE role_id IN (SELECT id FROM roles WHERE code IN ('SUPER_ADMIN','ADMIN'));
