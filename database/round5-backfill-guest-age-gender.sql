-- ============================================================
-- 第五轮（2026-08-30）R1 种子数据补齐 + 圈子去重
-- 背景：
--   1. 推荐卡片（寻觅/附近）消费 user_basic_profile.gender / birth_year
--      渲染「年龄+性别」小标；存量游客账号（openid LIKE 'guest:%'）
--      两字段为 NULL，导致卡片与理想图《寻觅匹配卡片页面》不一致。
--      代码侧 RealAuthService.provisionGuestProfile 已同步补齐（新游客
--      直接写 female / 2003 / birth_date 2003-06-15）。
--   2. 兴趣圈存在重复：「摄影圈子」(id=2) 与「摄影」(id=8) 并存，
--      保留「摄影」，归并其下话题后删除「摄影圈子」。
-- 幂等：所有 UPDATE 带 IS NULL 守卫，可重复执行。
-- ============================================================

-- 1. 游客账号补性别（奇偶交替 male/female，保证演示列表有男有女）
UPDATE user_basic_profile bp
JOIN users u ON u.id = bp.user_id
SET bp.gender = CASE WHEN bp.user_id % 2 = 0 THEN 'male' ELSE 'female' END
WHERE u.openid LIKE 'guest:%'
  AND bp.gender IS NULL;

-- 2. 游客账号补出生年份（1998-2005 之间按 id 轮转，年龄 21-28 岁）
UPDATE user_basic_profile bp
JOIN users u ON u.id = bp.user_id
SET bp.birth_year = 1998 + (bp.user_id % 8)
WHERE u.openid LIKE 'guest:%'
  AND bp.birth_year IS NULL;

-- 3. 游客账号补出生日期（星座推导依赖 users.birth_date；取每年 6 月 15 日）
UPDATE users u
LEFT JOIN user_basic_profile bp ON bp.user_id = u.id
SET u.birth_date = MAKEDATE(IFNULL(bp.birth_year, 2003), 166)
WHERE u.openid LIKE 'guest:%'
  AND u.birth_date IS NULL;

-- 4. 圈子去重：先把「摄影圈子」(id=2) 的话题归并到「摄影」(id=8)
UPDATE circle_topics
SET circle_id = 8
WHERE circle_id = 2;

-- 5. 圈子成员归并（若存在）
UPDATE circle_memberships
SET circle_id = 8
WHERE circle_id = 2;

-- 6. 删除重复圈子「摄影圈子」（保留 member_count 更大的「摄影」）
DELETE FROM interest_circles
WHERE id = 2
  AND name = '摄影圈子';
