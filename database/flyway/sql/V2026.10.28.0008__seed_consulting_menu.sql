-- 咨询课程内容菜单（2026-10-28）
-- 父级 400（运营），与 admin staticFallbackMenus 的 404 对齐。
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, hidden, permission, menu_type)
SELECT 404, 400, '咨询课程', 'Consulting', '/business/consulting', 'views/business/Consulting.vue', '', 6, 0, NULL, 'MENU'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Consulting');

INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, 404 FROM roles r
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (SELECT 1 FROM role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = 404);
