-- ============================================================
-- 迁移：热度运营菜单 + 热度权重配置 seed
-- ============================================================
-- 背景：
--   后台新增「热度榜管理」「热搜词管理」两个菜单（论坛管理下），
--   并 seed 热度公式权重到 app_config（后台全局配置页可改，实时生效）。
--
-- 幂等性：菜单 INSERT 使用 WHERE NOT EXISTS；app_config 使用 ON DUPLICATE KEY UPDATE。
-- ============================================================

-- ---------- 论坛管理（300）新增菜单 ----------
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 306, 300, '热度榜管理', 'HotBoardManage', '/forum/hot-board-manage', 'views/forum/HotBoardManage.vue', 'bolt.svg', 6, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 306);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 307, 300, '热搜词管理', 'HotSearchManage', '/forum/hot-search-manage', 'views/forum/HotSearchManage.vue', 'search.svg', 7, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 307);

-- SUPER_ADMIN 关联全部菜单（含新增）
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id FROM roles r CROSS JOIN menus m
WHERE r.code = 'SUPER_ADMIN'
  AND m.id IN (306, 307)
  AND NOT EXISTS (SELECT 1 FROM role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = m.id);

-- ADMIN 关联业务菜单（论坛管理属业务菜单）
INSERT INTO role_menus (role_id, menu_id)
SELECT r.id, m.id FROM roles r CROSS JOIN menus m
WHERE r.code = 'ADMIN'
  AND m.id IN (306, 307)
  AND NOT EXISTS (SELECT 1 FROM role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = m.id);

-- ---------- 热度公式权重（app_config，后台「全局配置」页可改） ----------
INSERT INTO app_config (config_key, config_value, description) VALUES
    ('hot.likesWeight', '1', '热度公式：点赞权重'),
    ('hot.commentsWeight', '3', '热度公式：评论权重（贴吧式回复权重最高）'),
    ('hot.sharesWeight', '2', '热度公式：转发权重'),
    ('hot.favoritesWeight', '2', '热度公式：收藏权重'),
    ('hot.viewsWeight', '0.1', '热度公式：浏览权重'),
    ('hot.gravity', '1.5', '热度公式：时间衰减指数（越大热度越冷越快）'),
    ('hot.boardLimit', '20', '热度榜单页返回上限'),
    ('hot.recommendMix', '0.7', '推荐流混合排序：热度占比（0.7=热度7成+新鲜度3成）')
ON DUPLICATE KEY UPDATE config_value = config_value;
