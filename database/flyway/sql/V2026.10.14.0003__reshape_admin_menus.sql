-- ============================================================
-- 迁移：后台菜单收缩为「内容 / 运营 / 权限」三组（每组 ≤5 项）+ 新增「能力总览」页
-- ============================================================
-- 目标（用户已签核的方案）：把侧边栏从「6 组 38 个页面」收成 3 组 15 项，
-- 未入选的页面 **隐藏而非删除**（hidden=1），路由必须仍能按 URL 直达，
-- 避免书签失效与角色绑定悬空（role_menus 有 FK ON DELETE CASCADE，删行会连带删绑定）。
--
--   内容（看与审）：数据看板 村落动态 评论管理 用户管理 图片审核
--   运营（发与管）：发布内容 官方号公告 私信会话 圈层管理 活动管理
--   权限（配置与追责）：管理员管理 角色管理 菜单管理 审计日志 系统配置（+ 能力总览）
--
-- 现状口径修正（与下发任务时的描述有出入，以本库 SELECT 实测为准）：
--   * menus 共 44 行 = 6 个 DIR + **38** 个 MENU（不是「41 项」；id 506 从未存在过，
--     500 组只有 501/502/503/504/505/507）。
--   * role_menus 实测：SUPER_ADMIN 44、ADMIN 34、AUDITOR 33（不是 42/32/32）；
--     AUDITOR 比 ADMIN 少 308「发布内容」（只读角色不给写入口，符合 V2026.10.14.0002）。
--
-- ── 三个分组的落位（决定与理由）────────────────────────────────────────
--   复用 3 个既有 DIR 行，不新建 DIR：
--     200 name='Content' → title 改「内容」，path /content 不变（组内子项全是绝对 path，
--         目录 path 只做视觉前缀，不影响任何 URL）
--     400 name='Activity' → title 改「运营」，path /activity 不变
--         ← 选 400 而不是新建 DIR 的理由：① 语义本就是「活动运营」，改名即成「运营」；
--            ② role_menus 已把 400 绑给 SUPER_ADMIN/ADMIN/AUDITOR 三种角色，
--              新分组对校区管理员/审核员立即可见，无需再补绑定；
--            ③ 新建 DIR 要么占 700 段（与本页 id 冲突）要么吃 AUTO_INCREMENT，
--              且必须手写 3 条 role_menus 才不出现「组存在但角色看不见」。
--     100 name='System' → title 改「权限」，path /system 不变（同上，绝对 path 不受影响）
--   退役 3 个 DIR：300 论坛管理 / 500 商业模式 / 600 配置管理 → hidden=1、sort 顶到 7/8/9。
--     不删除：它们的子页仍挂在原父级上（保持树形完整 + 角色绑定有效）。
--
-- ── 605 圈层管理 path 归一（为什么必须改）──────────────────────────────
--   605 是全表唯一用 **相对 path**（'circle-layers'）的 MENU 行，其余兄弟均为绝对 path。
--   addDynamicRoutes()/Layout.resolvePath() 对相对 path 会拼父级前缀：
--   原先父级 100(/system) → 实际 URL 是 /system/circle-layers；本迁移把它挪到 400(/activity)
--   后，若仍是相对 path，URL 会变成 /activity/circle-layers —— 已发出的链接/书签全部 404。
--   故归一为 '/system/circle-layers'：**字符串变了，解析出的 URL 一个字节都没变**
--   （仍与迁移前完全一致），同时消除「一个表里两种 path 约定」这个长期坑。
--
-- ── 幂等与可重跑 ────────────────────────────────────────────────────
--   * 所有变更都是「按主键/唯一键覆写目标值」的 UPDATE，不带相对算术（不用 sort=sort+50
--     这类重跑会叠加的写法），执行 N 次与执行 1 次结果相同。
--   * 可见项显式写 hidden=0、退役 DIR 与未入选页显式写 hidden=1，因此即便有人在后台
--     手改过 hidden/parent_id/sort，重跑本迁移会把状态拉回方案规定的形状（自愈）。
--   * 新增行用 name 唯一键判重的 INSERT ... WHERE NOT EXISTS + 紧随其后的规范化 UPDATE，
--     重跑不产生第二行、也不会留下「插了但字段漂移」的半态。
--   * role_menus 绑定同样 NOT EXISTS 判重（PK (role_id, menu_id) 天然防重）。
--   * 只读性：不删行、不改 name/component/path（除 605 的归一），历史脚本未被编辑。
--
-- ── ⚠ 已知缺口（必须配套前端一处改动才真正生效，见文件末尾说明）────────
--   后端 GET /v1/admin/menus/current **不过滤 hidden**（MenuRepository 的两个查询都没有
--   hidden 条件，hidden 只是随节点一起下发），而 apps/admin/src/views/Layout.vue 的
--   visibleMenuTree 目前只按 superAdminOnly 过滤、完全没读 hidden 字段（AdminMenuNode
--   原先连 hidden 都没声明）。也就是说：本迁移落库后，hidden=1 的行「仍然会出现在侧边栏」，
--   直到 Layout 增加「剔除 hidden 节点 + 剔除被剔空的 DIR」这一处过滤。
--   这一处改动刻意不能写在迁移里，也不能靠后端过滤实现（后端过滤 hidden 会让
--   addDynamicRoutes() 收不到这些节点 → 路由不注册 → 直达 URL 变成 404，
--   正好违反「隐藏而非删除、路由保持可达」的硬要求）。改动方案见文末 FRONTEND 段。
--
-- ── 其他副作用（有意接受）────────────────────────────────────────────
--   603 系统配置从 600 挪到 100，而 ADMIN/AUDITOR 只有 603 的绑定、没有 100 的绑定
--   （权限组本就是超管专属）。后端 buildTree 遇到「父不在可见集合」会把子挂到根，
--   所以校区管理员/审核员会把它看成一条顶级项而非空组——页面照常可用，不新增绑定。
-- ============================================================


-- ============================================================
-- A. 三个分组目录：改名 + 排序 + 重新可见
-- ============================================================
UPDATE menus SET parent_id = 0, title = '内容', sort = 1, hidden = 0 WHERE id = 200;  -- name='Content'
UPDATE menus SET parent_id = 0, title = '运营', sort = 2, hidden = 0 WHERE id = 400;  -- name='Activity'
UPDATE menus SET parent_id = 0, title = '权限', sort = 3, hidden = 0 WHERE id = 100;  -- name='System'

-- 退役目录：整组隐藏（其子项在 E 段单独隐藏），sort 顶到可见组之后
UPDATE menus SET hidden = 1, sort = 7 WHERE id = 300;  -- name='Forum'    论坛管理
UPDATE menus SET hidden = 1, sort = 8 WHERE id = 500;  -- name='Business' 商业模式
UPDATE menus SET hidden = 1, sort = 9 WHERE id = 600;  -- name='Configs'  配置管理


-- ============================================================
-- B. 内容组（parent 200）：看与审，5 项
--    path 均为绝对值 → 换父级不改 URL
-- ============================================================
UPDATE menus SET parent_id = 200, sort = 1, hidden = 0 WHERE id = 101;  -- 数据看板   /dashboard
UPDATE menus SET parent_id = 200, sort = 2, hidden = 0 WHERE id = 301;  -- 村落动态   /forum/village-posts
UPDATE menus SET parent_id = 200, sort = 3, hidden = 0 WHERE id = 305;  -- 评论管理   /forum/comments
UPDATE menus SET parent_id = 200, sort = 4, hidden = 0 WHERE id = 201;  -- 用户管理   /content/users
UPDATE menus SET parent_id = 200, sort = 5, hidden = 0 WHERE id = 206;  -- 图片审核   /content/media-assets

-- ============================================================
-- C. 运营组（parent 400）：发与管，5 项
-- ============================================================
UPDATE menus SET parent_id = 400, sort = 1, hidden = 0 WHERE id = 308;  -- 发布内容   /forum/compose
UPDATE menus SET parent_id = 400, sort = 2, hidden = 0, title = '官方号公告' WHERE id = 604; -- /configs/official-accounts
UPDATE menus SET parent_id = 400, sort = 3, hidden = 0 WHERE id = 209;  -- 私信会话   /content/conversations
-- 圈层管理：同时归一相对 path（理由见文件头「605」段），URL 保持 /system/circle-layers 不变
UPDATE menus SET parent_id = 400, sort = 4, hidden = 0, path = '/system/circle-layers' WHERE id = 605;
UPDATE menus SET parent_id = 400, sort = 5, hidden = 0 WHERE id = 401;  -- 活动管理   /activity/activities

-- ============================================================
-- D. 权限组（parent 100）：配置与追责，5 项（+ F 段的能力总览 = 超管看到 6 项）
-- ============================================================
UPDATE menus SET parent_id = 100, sort = 1, hidden = 0 WHERE id = 106;  -- 管理员管理 /system/admins
UPDATE menus SET parent_id = 100, sort = 2, hidden = 0 WHERE id = 103;  -- 角色管理   /system/roles
UPDATE menus SET parent_id = 100, sort = 3, hidden = 0 WHERE id = 102;  -- 菜单管理   /system/menus
UPDATE menus SET parent_id = 100, sort = 4, hidden = 0 WHERE id = 107;  -- 审计日志   /system/audit-logs
UPDATE menus SET parent_id = 100, sort = 5, hidden = 0, title = '系统配置' WHERE id = 603; -- /configs/global

-- ============================================================
-- E. 未入选的 23 个页面：hidden=1，不删行、不改 path/component/name、不动 role_menus
--    sort 统一 90 → 排在各组可见项之后（绝对值写法，重跑不叠加）
--      原 100 系统管理 ：104 高校管理 105 数据字典 108 在线用户
--      原 200 用户与内容：202 校园认证 203 举报管理 204 反馈管理 205 敏感词管理
--                        207 实名认证 208 悄悄话
--      原 300 论坛管理 ：302 兴趣圈管理 303 圈内话题 304 校园圈话题 306 热度榜管理 307 热搜词管理
--      原 400 活动运营 ：402 报名管理
--      原 500 商业模式 ：501 VIP套餐 502 VIP账单 503 兑换码 504 钱包管理 505 金币管理 507 积分商城
--      原 600 配置管理 ：601 通知配置 602 匹配配置
-- ============================================================
UPDATE menus SET hidden = 1, sort = 90
 WHERE id IN (104, 105, 108,
              202, 203, 204, 205, 207, 208,
              302, 303, 304, 306, 307,
              402,
              501, 502, 503, 504, 505, 507,
              601, 602);

-- 兜底自愈：任何仍挂在退役目录下的 MENU 行（含后续误挂在 300/500/600 的新行）一并隐藏。
-- 注意这里不改 sort——避免把 605（已迁到 400）这类行重新排到队尾。
UPDATE menus SET hidden = 1
 WHERE menu_type = 'MENU' AND parent_id IN (300, 500, 600) AND hidden = 0;


-- ============================================================
-- F. 新增页面：能力总览（id 700，挂在「权限」组末位，sort=6）
--    静态清单页，无后端接口——数据来自对本仓代码的逐一核查（见组件头部说明）。
--    component 必须与 apps/admin/src/router/index.ts componentMap 的 key 完全一致，
--    否则 addDynamicRoutes() 不会注册路由。
-- ============================================================
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, hidden, permission, menu_type)
SELECT 700, 100, '能力总览', 'CapabilityOverview', '/system/capability',
       'views/system/CapabilityOverview.vue', 'eye.svg', 6, 0, 'system:capability:view', 'MENU'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 700 OR name = 'CapabilityOverview');

-- 规范化：行已存在（重跑 / 曾被后台编辑过）时把字段拉回方案值。
-- 按 name 定位（唯一键），与上面 INSERT 的判重口径一致。
UPDATE menus
   SET parent_id = 100,
       title = '能力总览',
       path = '/system/capability',
       component = 'views/system/CapabilityOverview.vue',
       icon = 'eye.svg',
       sort = 6,
       hidden = 0,
       permission = 'system:capability:view',
       menu_type = 'MENU'
 WHERE name = 'CapabilityOverview';

-- ============================================================
-- G. 角色可见性：能力总览只给 SUPER_ADMIN
--    （它是「本后台到底哪些页面有数据」的内部审计页，校区管理员/审核员无需看到）
-- ============================================================
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id
FROM roles r
JOIN menus m ON m.name = 'CapabilityOverview'
WHERE r.code = 'SUPER_ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM role_menus existed
      WHERE existed.role_id = r.id AND existed.menu_id = m.id
  );


-- ============================================================
-- 落库后自检（只读，人工执行）
-- ============================================================
-- SELECT id, parent_id, title, path, sort, hidden FROM menus
--  WHERE hidden = 0 ORDER BY parent_id, sort;                    -- 期望：3 个 DIR + 15 个 MENU + 700
-- SELECT parent_id, COUNT(*) FROM menus WHERE hidden = 0 AND menu_type = 'MENU' GROUP BY parent_id;
--                                                               -- 期望：100→6, 200→5, 400→5
-- SELECT COUNT(*) AS visible_le_5 FROM (
--   SELECT parent_id FROM menus WHERE hidden = 0 AND menu_type = 'MENU'
--   GROUP BY parent_id HAVING COUNT(*) > 5) t;                   -- 期望：0（权限组的第 6 项是超管专属审计页）
-- SELECT id, name, path FROM menus WHERE id IN (605, 700);        -- 期望：/system/circle-layers, /system/capability
-- SELECT COUNT(*) FROM role_menus rm JOIN menus m ON m.id = rm.menu_id
--  WHERE m.name = 'CapabilityOverview';                            -- 期望：1


-- ============================================================
-- DOWN 回滚脚本（手动执行；恢复迁移前的 44 行原状）
-- ============================================================
-- DELETE FROM role_menus WHERE menu_id IN (SELECT id FROM menus WHERE name = 'CapabilityOverview');
-- DELETE FROM menus WHERE name = 'CapabilityOverview';           -- id 700
--
-- UPDATE menus SET path = 'circle-layers' WHERE id = 605;       -- 还原相对 path
--
-- UPDATE menus SET title = CASE id WHEN 100 THEN '系统管理' WHEN 200 THEN '用户与内容'
--                                  WHEN 400 THEN '活动运营' WHEN 603 THEN '全局配置'
--                                  WHEN 604 THEN '官方号管理' END
--  WHERE id IN (100, 200, 400, 603, 604);
--
-- -- parent_id 还原
-- UPDATE menus SET parent_id = 100 WHERE id IN (101,102,103,104,105,106,107,108,605);
-- UPDATE menus SET parent_id = 200 WHERE id IN (201,202,203,204,205,206,207,208,209);
-- UPDATE menus SET parent_id = 300 WHERE id IN (301,302,303,304,305,306,307,308);
-- UPDATE menus SET parent_id = 400 WHERE id IN (401,402);
-- UPDATE menus SET parent_id = 500 WHERE id IN (501,502,503,504,505,507);
-- UPDATE menus SET parent_id = 600 WHERE id IN (601,602,603,604);
--
-- -- sort 还原（迁移前：各组按 1..8 顺序，605=99，507=7）
-- UPDATE menus SET sort = CASE id
--   WHEN 101 THEN 1 WHEN 102 THEN 2 WHEN 103 THEN 3 WHEN 104 THEN 4 WHEN 105 THEN 5
--   WHEN 106 THEN 6 WHEN 107 THEN 7 WHEN 108 THEN 8 WHEN 605 THEN 99
--   WHEN 201 THEN 1 WHEN 202 THEN 2 WHEN 203 THEN 3 WHEN 204 THEN 4 WHEN 205 THEN 5
--   WHEN 206 THEN 6 WHEN 207 THEN 7 WHEN 208 THEN 8 WHEN 209 THEN 9
--   WHEN 301 THEN 1 WHEN 302 THEN 2 WHEN 303 THEN 3 WHEN 304 THEN 4 WHEN 305 THEN 5
--   WHEN 306 THEN 6 WHEN 307 THEN 7 WHEN 308 THEN 8
--   WHEN 401 THEN 1 WHEN 402 THEN 2
--   WHEN 501 THEN 1 WHEN 502 THEN 2 WHEN 503 THEN 3 WHEN 504 THEN 4 WHEN 505 THEN 5 WHEN 507 THEN 7
--   WHEN 601 THEN 1 WHEN 602 THEN 2 WHEN 603 THEN 3 WHEN 604 THEN 4
--   ELSE sort END
--  WHERE menu_type = 'MENU';        -- 只改 MENU，避免把 DIR 的 sort 撞进 CASE 空分支写成 NULL
-- UPDATE menus SET sort = CASE id WHEN 100 THEN 1 WHEN 200 THEN 2 WHEN 300 THEN 3
--                                 WHEN 400 THEN 4 WHEN 500 THEN 5 WHEN 600 THEN 6 END
--  WHERE id IN (100,200,300,400,500,600);
--
-- UPDATE menus SET hidden = 0;                                  -- 迁移前全表无隐藏行


-- ============================================================
-- FRONTEND 配套改动（不在本迁移内，属 apps/admin，必须由前端一处补上）
-- ============================================================
-- apps/admin/src/views/Layout.vue 的 visibleMenuTree 需要按 hidden 过滤，且过滤后
-- 子项为空的 DIR 要一并剔除（现成写法：把 filterSuperAdminOnlyMenus 的递归里加一句
--   if (node.hidden === true) continue;
-- 并把 visibleMenuTree 的超管分支也走同一个过滤函数——目前超管分支直接返回未过滤的
-- menuStore.menuTree，等于完全不过滤）。AdminMenuNode 的 hidden?: boolean 字段
-- 已随本次改动在 stores/menu.ts 声明，Layout 侧无需再动类型。
-- 千万不要改成「后端过滤 hidden」：那样 addDynamicRoutes() 收不到这些节点，
-- 路由不注册，直达 URL 会掉进 NotFound，正好破坏本迁移「隐藏但可达」的前提。
