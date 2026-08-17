-- V2026.08.16.0002：user_basic_profile 增加 gender（性别）字段
ALTER TABLE user_basic_profile ADD COLUMN gender VARCHAR(16) NULL COMMENT '性别 male/female' AFTER pronouns;

-- 演示数据回填：按 person 人像轮换设定性别（1/3/5/7/9 → female，2/4/6/8 → male）
UPDATE user_basic_profile ub
JOIN users u ON u.id = ub.user_id
SET ub.gender = CASE WHEN ((ub.user_id - 2) % 9) IN (0,2,4,6,8) THEN 'female' ELSE 'male' END
WHERE ub.user_id >= 2 AND ub.gender IS NULL;
