-- ============================================================
-- 迁移：清理语义重复的兴趣圈（审查报告 2026-08-31 P3-9）
-- ============================================================
-- 「美食探店圈」并入「美食」、「萌宠交流圈」并入「宠物」：
--   旧圈话题迁移至标准圈（保留外键完整），旧圈删除。
--   实测旧圈 0 成员、各 1 话题、无回复，合并无数据损失。
-- 幂等：仅当旧圈仍存在时执行。
-- ============================================================

UPDATE circle_topics t
JOIN interest_circles old_c ON t.circle_id = old_c.id AND old_c.name = '美食探店圈'
SET t.circle_id = (SELECT id FROM interest_circles WHERE name = '美食')
WHERE old_c.id IS NOT NULL;

DELETE FROM interest_circles WHERE name = '美食探店圈';

UPDATE circle_topics t
JOIN interest_circles old_c ON t.circle_id = old_c.id AND old_c.name = '萌宠交流圈'
SET t.circle_id = (SELECT id FROM interest_circles WHERE name = '宠物')
WHERE old_c.id IS NOT NULL;

DELETE FROM interest_circles WHERE name = '萌宠交流圈';
