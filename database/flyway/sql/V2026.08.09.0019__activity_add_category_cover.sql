-- ============================================================
-- 迁移：活动增加分类（category）与封面图（cover_image）
-- ============================================================
-- 背景（2026-08-09 用户需求）：
--   1. 活动要有「具体场景」展示：分类标签（联谊/运动/桌游/学习/志愿/美食/音乐/其他）
--      + 封面图，小程序列表/详情与后台表格按分类划分展示；
--   2. 分类 code 与前端 i18n 映射保持一致：
--      social（联谊）/ sports（运动）/ game（桌游）/ study（学习）/
--      volunteer（志愿）/ food（美食）/ music（音乐）/ other（其他）
-- ============================================================

ALTER TABLE activities
    ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT 'other' COMMENT '活动分类：social/sports/game/study/volunteer/food/music/other',
    ADD COLUMN cover_image VARCHAR(512) NULL COMMENT '活动封面图 URL（空则前端回退占位图）';

-- 按标题回填分类（存量活动归类，幂等：仅当 category 仍为默认值时更新）
UPDATE activities SET category = 'game'   WHERE category = 'other' AND (title LIKE '%桌游%' OR title LIKE '%棋牌%');
UPDATE activities SET category = 'sports' WHERE category = 'other' AND (title LIKE '%徒步%' OR title LIKE '%骑行%' OR title LIKE '%篮球%' OR title LIKE '%运动%' OR title LIKE '%露营%' OR title LIKE '%踏春%' OR title LIKE '%爬山%');
UPDATE activities SET category = 'social' WHERE category = 'other' AND (title LIKE '%联谊%' OR title LIKE '%派对%' OR title LIKE '%遇见%' OR title LIKE '%交友%' OR title LIKE '%迎新%' OR title LIKE '%晚会%');
UPDATE activities SET category = 'music'  WHERE category = 'other' AND (title LIKE '%歌手%' OR title LIKE '%音乐%' OR title LIKE '%演唱会%');
UPDATE activities SET category = 'study'  WHERE category = 'other' AND (title LIKE '%读书%' OR title LIKE '%讲座%' OR title LIKE '%招聘%' OR title LIKE '%学习%' OR title LIKE '%分享会%');
UPDATE activities SET category = 'food'   WHERE category = 'other' AND (title LIKE '%美食%' OR title LIKE '%火锅%' OR title LIKE '%聚餐%');
UPDATE activities SET category = 'volunteer' WHERE category = 'other' AND (title LIKE '%志愿%' OR title LIKE '%公益%' OR title LIKE '%义工%');
