-- ============================================================
-- 迁移：悄悄话管理菜单（管理后台「用户与内容 → 悄悄话」）
-- ============================================================
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 208, 200, '悄悄话', 'Whispers', '/content/whispers', 'views/content/Whispers.vue', 'chat.svg', 8, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 208);

INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, 208 FROM roles r
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (SELECT 1 FROM role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = 208);
