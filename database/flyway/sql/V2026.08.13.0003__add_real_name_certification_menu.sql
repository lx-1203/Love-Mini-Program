-- ============================================================
-- 迁移：实名认证审核菜单（管理后台「用户与内容 → 实名认证」）
-- ============================================================
-- 背景：
--   实名认证审核功能（real_name_certifications 审核闭环）需要管理后台入口。
--   菜单挂「用户与内容」(200) 第 7 位（现有 201-206），id=207。
--   注意：V2026.08.07.0016 的 CROSS JOIN 关联逻辑已执行过，不会自动
--   覆盖新菜单，因此本迁移必须显式补 role_menus 关联（幂等）。
--
-- 幂等性：全部 WHERE NOT EXISTS / DUAL 守卫，可安全重跑。
-- ============================================================

-- 菜单项（id=207，sort=7）
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 207, 200, '实名认证', 'RealNameCertifications', '/content/real-name-certifications', 'views/content/RealNameCertifications.vue', 'eye.svg', 7, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 207);

-- 角色关联：SUPER_ADMIN / ADMIN（对齐 V2026.08.07.0016 的业务菜单口径，均可见）
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, 207 FROM roles r
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (SELECT 1 FROM role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = 207);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM role_menus WHERE menu_id = 207;
-- DELETE FROM menus WHERE id = 207;
