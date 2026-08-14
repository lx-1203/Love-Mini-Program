-- 给 interest_circles 表添加 category 分类字段（2026-08-10 B4：圈子分类服务端过滤）
-- 分类枚举（与前端 CATEGORY_KEY_MAP 一致）：study/sports/music/movie/travel/game/food/reading；NULL=未分类
ALTER TABLE interest_circles ADD COLUMN category VARCHAR(20) NULL COMMENT '圈子分类（study/sports/music/movie/travel/game/food/reading，NULL=未分类）' AFTER description;

-- 存量种子圈按名称关键词归类（幂等：只更新已有行，不重复执行）
UPDATE interest_circles SET category = 'sports'  WHERE category IS NULL AND (name LIKE '%篮球%' OR name LIKE '%运动%' OR name LIKE '%球%');
UPDATE interest_circles SET category = 'study'   WHERE category IS NULL AND (name LIKE '%考研%' OR name LIKE '%读书%' OR name LIKE '%学习%');
UPDATE interest_circles SET category = 'game'    WHERE category IS NULL AND (name LIKE '%桌游%' OR name LIKE '%游戏%');
UPDATE interest_circles SET category = 'food'    WHERE category IS NULL AND (name LIKE '%美食%' OR name LIKE '%探店%');
UPDATE interest_circles SET category = 'music'   WHERE category IS NULL AND name LIKE '%音乐%';
UPDATE interest_circles SET category = 'movie'   WHERE category IS NULL AND name LIKE '%电影%';
UPDATE interest_circles SET category = 'travel'  WHERE category IS NULL AND name LIKE '%旅行%';
UPDATE interest_circles SET category = 'reading' WHERE category IS NULL AND name LIKE '%阅读%';
