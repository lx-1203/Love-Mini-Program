-- ============================================================
-- 迁移：修复后台菜单三处「权责不一」缺口（FIX 2 + FIX 3）
--   1) 让已实现的「主页运营配置」页可达（补菜单行 + 角色绑定）
--   2) 解绑校区管理员/审核员够得着却存不了的三个配置页
-- ============================================================
--
-- 背景（后台是 eladmin 式「后端菜单驱动路由」）：
--   apps/admin/src/router/index.ts 的 componentMap 里有组件，还必须在 menus 表有
--   对应行、并在 role_menus 里绑给角色，才会被 addDynamicRoutes() 注册成可点开的
--   路由；反之 role_menus 里绑了一个角色写权限端点够不到的页面，就会造出
--   「能打开、能填表、一点保存就 403」的权责断裂。本迁移处理这两个方向的不一致。
--
-- ── FIX 2：ProfileConfig.vue 有前后端、无菜单行 ──────────────────────
--   apps/admin/src/views/config/ProfileConfig.vue 已接线：
--     GET  /api/v1/admin/profile-config
--     PUT  /api/v1/admin/profile-config
--   后端 AdminProfileConfigController 类级 @PreAuthorize("hasAnyRole('ADMIN',
--   'SUPER_ADMIN', 'AUDITOR')")，PUT 无额外收窄 →
--     · SUPER_ADMIN：读 + 存 ✓
--     · ADMIN（校区管理员）：读 + 存 ✓（URL 层 PUT 放行 ADMIN/SUPER_ADMIN）
--     · AUDITOR：可读、URL 层拦掉所有 PUT（写必 403）
--   所以本行只绑 SUPER_ADMIN + ADMIN，不绑 AUDITOR——与 V2026.10.14.0002
--   「不给只读角色挂它存不了的写页」的既有口径一致，避免重演 FIX 3 的断裂。
--
--   落位（父级/分组的选择与理由）：
--     父级 = 400「运营」。本轮菜单已收成三组：内容 200 / 运营 400 / 权限 100。
--       · ProfileConfig 是「个人主页各模块显隐 + 数量上限」的运营开关，语义属「发与管」
--         的运营组，而非「配置与追责」的权限组；
--       · 权限组(100)当前只绑了 SUPER_ADMIN（校区管理员/审核员拿不到该 DIR），
--         若挂 100，ADMIN 会因 buildTree「父不在可见集合」被顶到根、破坏分组；
--       · 运营组(400) 已绑 SUPER_ADMIN/ADMIN/AUDITOR 三角色，本行绑定的两种角色
--         均已在该 DIR 可见集合内，落位即用、无需再动 400 的角色绑定。
--     id = 403：延续 400 分组既有编号段（400→401/402 已占用，实测 403/404 空），
--              不与全表（当前 MAX(id)=700）及 name 唯一键冲突。
--     component 必须与 componentMap 的 key 逐字一致：'views/config/ProfileConfig.vue'。
--     path 用绝对值 '/configs/profile'，与父级 400 的 /activity 前缀无关。
--
-- ── FIX 3：三个配置页能打开却存不了 ──────────────────────────────────
--   实测（apps/api 三个控制器的方法级注解原文）：
--     AdminConfigController（603 /configs/global）
--       类级 @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
--       PUT /configs/{key}   → @PreAuthorize("hasRole('SUPER_ADMIN')")
--       PUT /rules/{id}      → @PreAuthorize("hasRole('SUPER_ADMIN')")
--       PUT /switches/{key}  → @PreAuthorize("hasRole('SUPER_ADMIN')")
--     AdminNotifyConfigController（601 /configs/notify）
--       类级同上；PUT（根）  → @PreAuthorize("hasRole('SUPER_ADMIN')")
--     AdminMatchConfigController（602 /configs/match）
--       类级同上；PUT /match-config          → @PreAuthorize("hasRole('SUPER_ADMIN')")
--                PUT /recommend-strategy    → @PreAuthorize("hasRole('SUPER_ADMIN')")
--   三个页的每一个写端点都是 SUPER_ADMIN 独占，无一放行 ADMIN 写。故对 601/602/603
--   删除 ADMIN、AUDITOR 的 role_menus 绑定（保留 SUPER_ADMIN），让非超管根本看不到
--   这些点进去也存不了的页面——彻底消除 403。实测这三角色当前都绑了 601/602/603。
--
--   hidden 处理（有意不动）：
--     601/602 在 V2026.10.14.0003 已被置 hidden=1（挂在退役的 600 配置管理 DIR 下），
--       本次只需再解绑 ADMIN/AUDITOR；
--     603「系统配置」现为 hidden=0、且是 SUPER_ADMIN 在权限组(100)里的正常入口，
--       SUPER_ADMIN 要能用它 → 绝不能置 hidden=1（否则连超管也看不到）。
--     因此本迁移不改任何 hidden，仅解绑；权限组的连贯性由「603 只留 SUPER_ADMIN」达成。
--
-- ── 幂等与可重跑 ────────────────────────────────────────────────────
--   * menus 新增：INSERT ... WHERE NOT EXISTS（按 id 或 name 判重）+ 紧随其后的
--     规范化 UPDATE（按 name 定位）把字段拉回方案值，重跑不产生第二行、不留漂移。
--   * role_menus 绑定：NOT EXISTS 判重；解绑用 DELETE（天然幂等，重跑为空操作）。
--   * 不编辑任何历史脚本；不改 name/component/path 之外的历史行。
-- ============================================================

-- ============================================================
-- FIX 2-A：新增「主页运营配置」菜单行（id 403，父级 400 运营组）
-- ============================================================
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, hidden, menu_type)
SELECT 403, 400, '主页运营配置', 'ProfileConfig', '/configs/profile',
       'views/config/ProfileConfig.vue', 'setting.svg', 6, 0, 'MENU'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 403 OR name = 'ProfileConfig');

-- 规范化：行已存在（重跑 / 曾被后台编辑过）时把字段拉回方案值（按 name 唯一键定位）
UPDATE menus
   SET parent_id = 400,
       title = '主页运营配置',
       path = '/configs/profile',
       component = 'views/config/ProfileConfig.vue',
       icon = 'setting.svg',
       sort = 6,
       hidden = 0,
       menu_type = 'MENU'
 WHERE name = 'ProfileConfig';

-- FIX 2-B：角色绑定 —— 仅 SUPER_ADMIN + ADMIN（AUDITOR 只读、存不了，故不绑）
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id
FROM roles r
JOIN menus m ON m.name = 'ProfileConfig'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM role_menus existed
      WHERE existed.role_id = r.id AND existed.menu_id = m.id
  );

-- ============================================================
-- FIX 3：解绑 601/602/603 上 ADMIN、AUDITOR 的绑定（保留 SUPER_ADMIN）
--   DELETE 幂等；用 JOIN 按角色 code / 菜单 id 定位，不依赖具体 role_id 常量。
-- ============================================================
DELETE rm FROM role_menus rm
JOIN roles r ON r.id = rm.role_id
JOIN menus m ON m.id = rm.menu_id
WHERE r.code IN ('ADMIN', 'AUDITOR')
  AND m.id IN (601, 602, 603);

-- ============================================================
-- 落库后自检（只读，人工执行）
-- ============================================================
-- SELECT id, parent_id, title, path, component, hidden FROM menus WHERE id = 403;
--   -- 期望：403 / 400 / 主页运营配置 / /configs/profile / views/config/ProfileConfig.vue / 0
-- SELECT r.code FROM role_menus rm JOIN roles r ON r.id = rm.role_id WHERE rm.menu_id = 403;
--   -- 期望：仅 SUPER_ADMIN、ADMIN（无 AUDITOR）
-- SELECT m.id, r.code FROM role_menus rm JOIN menus m ON m.id = rm.menu_id
--   JOIN roles r ON r.id = rm.role_id WHERE m.id IN (601,602,603) ORDER BY m.id, r.code;
--   -- 期望：601/602/603 各只剩 SUPER_ADMIN 一行
-- SELECT hidden FROM menus WHERE id = 603;   -- 期望：仍为 0（超管要能在权限组里看到它）

-- ============================================================
-- DOWN 回滚脚本（手动执行；仅撤销本迁移的两处改动）
-- ============================================================
-- -- 撤销 FIX 2：删除新菜单行及其绑定
-- DELETE FROM role_menus WHERE menu_id IN (SELECT id FROM menus WHERE name = 'ProfileConfig');
-- DELETE FROM menus WHERE name = 'ProfileConfig';   -- id 403
--
-- -- 撤销 FIX 3：把 ADMIN、AUDITOR 对 601/602/603 的绑定补回来
-- INSERT INTO role_menus (role_id, menu_id)
-- SELECT r.id, m.id FROM roles r JOIN menus m ON m.id IN (601,602,603)
-- WHERE r.code IN ('ADMIN','AUDITOR')
--   AND NOT EXISTS (SELECT 1 FROM role_menus e WHERE e.role_id = r.id AND e.menu_id = m.id);
