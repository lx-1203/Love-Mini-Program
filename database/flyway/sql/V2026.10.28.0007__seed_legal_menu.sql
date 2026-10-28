-- 法律文本 CMS 菜单（2026-10-28）
-- 父级 100（权限组），仅 SUPER_ADMIN 可见；与 admin staticFallbackMenus 的 701 对齐。
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, hidden, permission, menu_type)
SELECT 701, 100, '法律文本', 'LegalTexts', '/configs/legal', 'views/config/LegalTexts.vue', '', 7, 0, NULL, 'MENU'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'LegalTexts');

INSERT INTO role_menus (role_id, menu_id)
SELECT 1, 701
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM role_menus WHERE role_id = 1 AND menu_id = 701);
