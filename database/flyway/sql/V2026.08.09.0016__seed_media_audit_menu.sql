-- ============================================================
-- 迁移：图片审核菜单（管理后台「用户与内容 → 图片审核」）
-- ============================================================
-- 背景：
--   图片审核功能（media_asset 审核闭环）需要管理后台入口。
--   菜单挂「用户与内容」(200) 第 6 位（现有 201-205），id=206。
--   注意：V2026.08.07.0016 的 CROSS JOIN 关联逻辑已执行过，不会自动
--   覆盖新菜单，因此本迁移必须显式补 role_menus 关联（幂等）。
--
-- 幂等性：全部 WHERE NOT EXISTS / DUAL 守卫，可安全重跑。
-- ============================================================

-- 菜单项（id=206，sort=6）
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 206, 200, '图片审核', 'MediaAssets', '/content/media-assets', 'views/content/MediaAssets.vue', 'eye.svg', 6, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 206);

-- 角色关联：SUPER_ADMIN / ADMIN（对齐 V2026.08.07.0016 的业务菜单口径，均可见）
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, 206 FROM roles r
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (SELECT 1 FROM role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = 206);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM role_menus WHERE menu_id = 206;
-- DELETE FROM menus WHERE id = 206;
