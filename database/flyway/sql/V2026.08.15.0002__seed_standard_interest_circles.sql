-- ============================================================
-- 迁移：v3 Nearby 兴趣圈 8 个标准圈种子（system 官方推荐）
-- ============================================================
-- 说明：8 个标准圈 = 摄影/旅行/音乐/运动/美食/游戏/阅读/宠物。
--   兴趣圈 = 开放社交，任何用户可加入/发帖/评论，无需校园认证。
--   幂等：按 name 判重，既有/用户自建圈子保留不删。
-- ============================================================

INSERT INTO interest_circles (name, icon, description, member_count, sort_order, category)
SELECT '摄影', '📷', '分享光影与构图，一起扫街、看展、记录生活', 12000, 1, NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM interest_circles WHERE name = '摄影');

INSERT INTO interest_circles (name, icon, description, member_count, sort_order, category)
SELECT '旅行', '🧳', '记录旅途中的美好，寻找同行旅伴', 8932, 2, 'travel'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM interest_circles WHERE name = '旅行');

INSERT INTO interest_circles (name, icon, description, member_count, sort_order, category)
SELECT '音乐', '🎵', '分享你喜欢的音乐，发现更多好声音', 8123, 3, 'music'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM interest_circles WHERE name = '音乐');

INSERT INTO interest_circles (name, icon, description, member_count, sort_order, category)
SELECT '运动', '⚽', '跑步、篮球、羽毛球，运动让生活更精彩', 6532, 4, 'sports'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM interest_circles WHERE name = '运动');

INSERT INTO interest_circles (name, icon, description, member_count, sort_order, category)
SELECT '美食', '🍜', '发现身边的美食，分享你的味蕾体验', 7240, 5, 'food'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM interest_circles WHERE name = '美食');

INSERT INTO interest_circles (name, icon, description, member_count, sort_order, category)
SELECT '游戏', '🎮', '组队开黑、聊新作，找到一起玩的人', 8123, 6, 'game'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM interest_circles WHERE name = '游戏');

INSERT INTO interest_circles (name, icon, description, member_count, sort_order, category)
SELECT '阅读', '📚', '一起读书，一起成长，分享读书心得', 6532, 7, 'reading'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM interest_circles WHERE name = '阅读');

INSERT INTO interest_circles (name, icon, description, member_count, sort_order, category)
SELECT '宠物', '🐾', '晒猫晒狗，交流养宠心得', 5621, 8, NULL
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM interest_circles WHERE name = '宠物');
