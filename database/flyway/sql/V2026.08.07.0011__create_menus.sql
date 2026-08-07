-- ============================================================
-- 迁移：菜单管理（eladmin 风格动态菜单）
-- ============================================================
-- 背景：
--   原后台菜单硬编码在 apps/admin 前端（Layout.vue menuItems + router/index.ts）。
--   本次引入 menu 表 + role_menu 关联，实现 eladmin 风格动态菜单：
--   管理员登录后从 GET /api/v1/admin/menus/current 拉取可见菜单树。
--
--   菜单字段：
--     parent_id   父菜单 ID（0 = 顶级）
--     title       菜单标题（中文）
--     name        路由 name（对应前端 router name）
--     path        路由路径（/users 等）
--     component   前端组件路径（views/Users.vue，用于动态路由生成）
--     icon        图标文件名（icons/*.svg）
--     sort        排序权重（升序）
--     hidden      是否隐藏（1=隐藏）
--     permission  权限标识（预留，如 system:user:list）
--     menu_type   菜单类型：DIR 目录 / MENU 菜单（预留扩展）
--
-- 幂等性：information_schema 检查表存在性后 CREATE TABLE，种子数据 WHERE NOT EXISTS。
-- ============================================================

SET @has_menus := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'menus'
);

SET @sql_menus := IF(
    @has_menus = 0,
    'CREATE TABLE menus (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        parent_id BIGINT NOT NULL DEFAULT 0 COMMENT ''父菜单 ID（0=顶级）'',
        title VARCHAR(64) NOT NULL COMMENT ''菜单标题（中文）'',
        name VARCHAR(64) NOT NULL COMMENT ''路由 name（前端路由唯一标识）'',
        path VARCHAR(128) NOT NULL COMMENT ''路由路径（/users 等）'',
        component VARCHAR(255) NULL COMMENT ''前端组件路径（views/Users.vue）'',
        icon VARCHAR(64) NOT NULL DEFAULT '''' COMMENT ''图标文件名（icons/*.svg）'',
        sort INT NOT NULL DEFAULT 0 COMMENT ''排序权重（升序）'',
        hidden TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否隐藏（1=隐藏不出现在侧边栏）'',
        permission VARCHAR(128) NULL COMMENT ''权限标识（预留，如 system:user:list）'',
        menu_type VARCHAR(16) NOT NULL DEFAULT ''MENU'' COMMENT ''菜单类型：DIR 目录 / MENU 菜单'',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_menus_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''菜单表''',
    'SELECT 1'
);
PREPARE stmt_menus FROM @sql_menus;
EXECUTE stmt_menus;
DEALLOCATE PREPARE stmt_menus;

-- ============================================================
-- 种子数据（WHERE NOT EXISTS 幂等）
-- 菜单 ID 约定：父级 100/200/300/400/500/600，子级 X01-X08
-- ============================================================

-- ---------- 顶级目录 ----------
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 100, 0, '系统管理', 'System', '/system', NULL, 'setting.svg', 1, 'DIR'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 100);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 200, 0, '用户与内容', 'Content', '/content', NULL, 'user.svg', 2, 'DIR'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 200);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 300, 0, '论坛管理', 'Forum', '/forum', NULL, 'file-text.svg', 3, 'DIR'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 300);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 400, 0, '活动运营', 'Activity', '/activity', NULL, 'bolt.svg', 4, 'DIR'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 400);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 500, 0, '商业模式', 'Business', '/business', NULL, 'chart.svg', 5, 'DIR'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 500);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 600, 0, '配置管理', 'Configs', '/configs', NULL, 'lock.svg', 6, 'DIR'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 600);

-- ---------- 系统管理（100） ----------
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 101, 100, '数据看板', 'Dashboard', '/dashboard', 'views/Dashboard.vue', 'chart.svg', 1, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 101);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type, permission)
SELECT 102, 100, '菜单管理', 'Menus', '/system/menus', 'views/system/Menus.vue', 'list.svg', 2, 'MENU', 'system:menu:manage'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 102);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type, permission)
SELECT 103, 100, '角色管理', 'Roles', '/system/roles', 'views/system/Roles.vue', 'user.svg', 3, 'MENU', 'system:role:manage'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 103);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type, permission)
SELECT 104, 100, '高校管理', 'Schools', '/system/schools', 'views/system/Schools.vue', 'user.svg', 4, 'MENU', 'system:school:manage'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 104);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type, permission)
SELECT 105, 100, '数据字典', 'Dicts', '/system/dicts', 'views/system/Dicts.vue', 'clipboard.svg', 5, 'MENU', 'system:dict:manage'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 105);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type, permission)
SELECT 106, 100, '管理员管理', 'Admins', '/system/admins', 'views/system/Admins.vue', 'user.svg', 6, 'MENU', 'system:admin:manage'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 106);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 107, 100, '审计日志', 'AuditLogs', '/system/audit-logs', 'views/system/AuditLogs.vue', 'clipboard.svg', 7, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 107);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type, permission)
SELECT 108, 100, '在线用户', 'OnlineUsers', '/system/online-users', 'views/system/OnlineUsers.vue', 'user.svg', 8, 'MENU', 'system:online:manage'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 108);

-- ---------- 用户与内容（200） ----------
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 201, 200, '用户管理', 'Users', '/content/users', 'views/content/Users.vue', 'user.svg', 1, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 201);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 202, 200, '校园认证', 'Certifications', '/content/certifications', 'views/content/Certifications.vue', 'eye.svg', 2, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 202);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 203, 200, '举报管理', 'Reports', '/content/reports', 'views/content/Reports.vue', 'prohibited.svg', 3, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 203);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 204, 200, '反馈管理', 'Feedback', '/content/feedback', 'views/content/Feedback.vue', 'list.svg', 4, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 204);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 205, 200, '敏感词管理', 'SensitiveWords', '/content/sensitive-words', 'views/content/SensitiveWords.vue', 'prohibited.svg', 5, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 205);

-- ---------- 论坛管理（300） ----------
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 301, 300, '村落动态', 'VillagePosts', '/forum/village-posts', 'views/forum/VillagePosts.vue', 'file-text.svg', 1, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 301);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 302, 300, '兴趣圈管理', 'InterestCircles', '/forum/interest-circles', 'views/forum/InterestCircles.vue', 'list.svg', 2, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 302);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 303, 300, '圈内话题', 'CircleTopics', '/forum/circle-topics', 'views/forum/CircleTopics.vue', 'list.svg', 3, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 303);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 304, 300, '校园圈话题', 'CampusTopics', '/forum/campus-topics', 'views/forum/CampusTopics.vue', 'list.svg', 4, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 304);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 305, 300, '评论管理', 'Comments', '/forum/comments', 'views/forum/Comments.vue', 'list.svg', 5, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 305);

-- ---------- 活动运营（400） ----------
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 401, 400, '活动管理', 'Activities', '/activity/activities', 'views/activity/Activities.vue', 'bolt.svg', 1, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 401);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 402, 400, '报名管理', 'Enrollments', '/activity/enrollments', 'views/activity/Enrollments.vue', 'list.svg', 2, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 402);

-- ---------- 商业模式（500） ----------
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 501, 500, 'VIP 套餐', 'VipPlans', '/business/vip-plans', 'views/business/VipPlans.vue', 'chart.svg', 1, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 501);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 502, 500, 'VIP 账单', 'VipBills', '/business/vip-bills', 'views/business/VipBills.vue', 'chart.svg', 2, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 502);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 503, 500, '兑换码', 'PromoCodes', '/business/promo-codes', 'views/business/PromoCodes.vue', 'bolt.svg', 3, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 503);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 504, 500, '钱包管理', 'Wallets', '/business/wallets', 'views/business/Wallets.vue', 'chart.svg', 4, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 504);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 505, 500, '金币管理', 'Coins', '/business/coins', 'views/business/Coins.vue', 'chart.svg', 5, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 505);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 506, 500, '红包管理', 'RedPackets', '/business/red-packets', 'views/business/RedPackets.vue', 'chart.svg', 6, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 506);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 507, 500, '积分商城', 'Shop', '/business/shop', 'views/business/Shop.vue', 'chart.svg', 7, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 507);

-- ---------- 配置管理（600） ----------
INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 601, 600, '通知配置', 'NotifyConfig', '/configs/notify', 'views/config/NotifyConfig.vue', 'lock.svg', 1, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 601);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 602, 600, '匹配配置', 'MatchConfig', '/configs/match', 'views/config/MatchConfig.vue', 'bolt.svg', 2, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 602);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 603, 600, '全局配置', 'Config', '/configs/global', 'views/config/Config.vue', 'lock.svg', 3, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 603);

INSERT INTO menus (id, parent_id, title, name, path, component, icon, sort, menu_type)
SELECT 604, 600, '官方号管理', 'OfficialAccounts', '/configs/official-accounts', 'views/config/OfficialAccounts.vue', 'bolt.svg', 4, 'MENU'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menus WHERE id = 604);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DROP TABLE IF EXISTS menus;
