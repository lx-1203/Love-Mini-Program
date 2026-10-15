-- ============================================================
-- 迁移：为「私信会话」「发布内容」两个后台页面登记菜单
-- ============================================================
-- 背景：
--   本后台是 eladmin 式「后端菜单驱动路由」——前端 componentMap 里有的组件，
--   必须在 menus 表有对应行、并在 role_menus 里绑给角色，才会被
--   addDynamicRoutes() 注册成可访问的路由（见 apps/admin/src/router/index.ts）。
--   新增的 views/content/Conversations.vue 与 views/forum/PostCompose.vue
--   因此需要菜单行，否则页面永远点不到。
--
-- 角色可见性（与后端鉴权口径一致，不是只为了藏按钮）：
--   私信会话  → SUPER_ADMIN / ADMIN / AUDITOR 均可读
--               （正文仅 SUPER_ADMIN 可见，其余角色后端已脱敏）
--   发布内容  → 仅 SUPER_ADMIN / ADMIN
--               （AUDITOR 是只读档，后端按 HTTP 方法拦掉其所有写请求，
--                 故不给它菜单，避免点进去再吃 403）
--
-- 幂等性：menus.name 有唯一键，用 WHERE NOT EXISTS 判重；
--         role_menus 逐行 NOT EXISTS 补种，重跑为空操作。
--         id 显式给出（209/308）以延续各分组既有编号段，
--         且与存量库无冲突时才插入。
-- ============================================================

-- 私信会话（挂在「用户与内容」分组 200 下）
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, hidden, menu_type)
SELECT 209, 200, '私信会话', 'Conversations', '/content/conversations',
       'views/content/Conversations.vue', 'chat.svg', 9, 0, 'MENU'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Conversations');

-- 发布内容（挂在「论坛管理」分组 300 下）
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, hidden, menu_type)
SELECT 308, 300, '发布内容', 'PostCompose', '/forum/compose',
       'views/forum/PostCompose.vue', 'file-text.svg', 8, 0, 'MENU'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'PostCompose');

-- 角色绑定：私信会话对三类后台角色可读
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id
FROM roles r
JOIN menus m ON m.name = 'Conversations'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN', 'AUDITOR')
  AND NOT EXISTS (
      SELECT 1 FROM role_menus existed
      WHERE existed.role_id = r.id AND existed.menu_id = m.id
  );

-- 角色绑定：发布内容仅可写角色
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id
FROM roles r
JOIN menus m ON m.name = 'PostCompose'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM role_menus existed
      WHERE existed.role_id = r.id AND existed.menu_id = m.id
  );

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM role_menus WHERE menu_id IN (SELECT id FROM menus WHERE name IN ('Conversations','PostCompose'));
-- DELETE FROM menus WHERE name IN ('Conversations','PostCompose');
