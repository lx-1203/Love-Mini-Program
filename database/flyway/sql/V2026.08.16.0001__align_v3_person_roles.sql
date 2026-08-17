-- ============================================================
-- 迁移：v3 冻结 9 人角色表对齐（姓名/简介/头像统一）
-- ============================================================
-- 说明：
--   V2026.08.15.0001 已把虚拟用户头像/相册/背景映射到 person-02..09，
--   但 users / user_basic_profile 的 nickname/bio 仍是旧演示名，导致
--   “同名不同脸 / 同脸不同名”。本迁移把 10001-10014 统一到冻结角色表。
--   冻结映射：
--     10001/10012 -> person-02 夏言
--     10002/10013 -> person-03 阿辰
--     10003/10014 -> person-04 小满
--     10004       -> person-05 Luna
--     10005       -> person-06 草莓
--     10009       -> person-07 苏奈
--     10010       -> person-08 周岚
--     10011       -> person-09 林晚
-- ============================================================

UPDATE users
SET nickname = CASE id
    WHEN 10001 THEN '夏言'
    WHEN 10002 THEN '阿辰'
    WHEN 10003 THEN '小满'
    WHEN 10004 THEN 'Luna'
    WHEN 10005 THEN '草莓'
    WHEN 10009 THEN '苏奈'
    WHEN 10010 THEN '周岚'
    WHEN 10011 THEN '林晚'
    WHEN 10012 THEN '夏言'
    WHEN 10013 THEN '阿辰'
    WHEN 10014 THEN '小满'
    ELSE nickname
  END,
  avatar_url = CASE id
    WHEN 10001 THEN '/static/assets/images/avatars/person-02-avatar.webp'
    WHEN 10002 THEN '/static/assets/images/avatars/person-03-avatar.webp'
    WHEN 10003 THEN '/static/assets/images/avatars/person-04-avatar.webp'
    WHEN 10004 THEN '/static/assets/images/avatars/person-05-avatar.webp'
    WHEN 10005 THEN '/static/assets/images/avatars/person-06-avatar.webp'
    WHEN 10009 THEN '/static/assets/images/avatars/person-07-avatar.webp'
    WHEN 10010 THEN '/static/assets/images/avatars/person-08-avatar.webp'
    WHEN 10011 THEN '/static/assets/images/avatars/person-09-avatar.webp'
    WHEN 10012 THEN '/static/assets/images/avatars/person-02-avatar.webp'
    WHEN 10013 THEN '/static/assets/images/avatars/person-03-avatar.webp'
    WHEN 10014 THEN '/static/assets/images/avatars/person-04-avatar.webp'
    ELSE avatar_url
  END,
  bio = CASE id
    WHEN 10001 THEN '更喜欢从音乐话题切入，再配一段短距离校园散步。'
    WHEN 10002 THEN '喜欢直接定计划、边界清楚、气氛放松的咖啡聊天。'
    WHEN 10003 THEN '理性与感性并存，喜欢美食探店和博物馆。'
    WHEN 10004 THEN '建筑学大五，未来想去成都定居，喜欢户外运动与城市探索。'
    WHEN 10005 THEN '南京大学大三法学，理性与感性并存，喜欢美食探店和博物馆。'
    WHEN 10009 THEN '医学生，周末一定会给自己放风，喜欢爬山和露营。'
    WHEN 10010 THEN '电影研究专业，喜欢老电影和独立导演。'
    WHEN 10011 THEN '摄影爱好者，随身带相机记录校园光影。'
    WHEN 10012 THEN '更喜欢从音乐话题切入，再配一段短距离校园散步。'
    WHEN 10013 THEN '喜欢直接定计划、边界清楚、气氛放松的咖啡聊天。'
    WHEN 10014 THEN '理性与感性并存，喜欢美食探店和博物馆。'
    ELSE bio
  END
WHERE id IN (10001, 10002, 10003, 10004, 10005, 10009, 10010, 10011, 10012, 10013, 10014);

UPDATE user_basic_profile
SET nickname = CASE user_id
    WHEN 10001 THEN '夏言'
    WHEN 10002 THEN '阿辰'
    WHEN 10003 THEN '小满'
    WHEN 10004 THEN 'Luna'
    WHEN 10005 THEN '草莓'
    WHEN 10009 THEN '苏奈'
    WHEN 10010 THEN '周岚'
    WHEN 10011 THEN '林晚'
    WHEN 10012 THEN '夏言'
    WHEN 10013 THEN '阿辰'
    WHEN 10014 THEN '小满'
    ELSE nickname
  END,
  bio = CASE user_id
    WHEN 10001 THEN '更喜欢从音乐话题切入，再配一段短距离校园散步。'
    WHEN 10002 THEN '喜欢直接定计划、边界清楚、气氛放松的咖啡聊天。'
    WHEN 10003 THEN '理性与感性并存，喜欢美食探店和博物馆。'
    WHEN 10004 THEN '建筑学大五，未来想去成都定居，喜欢户外运动与城市探索。'
    WHEN 10005 THEN '南京大学大三法学，理性与感性并存，喜欢美食探店和博物馆。'
    WHEN 10009 THEN '医学生，周末一定会给自己放风，喜欢爬山和露营。'
    WHEN 10010 THEN '电影研究专业，喜欢老电影和独立导演。'
    WHEN 10011 THEN '摄影爱好者，随身带相机记录校园光影。'
    WHEN 10012 THEN '更喜欢从音乐话题切入，再配一段短距离校园散步。'
    WHEN 10013 THEN '喜欢直接定计划、边界清楚、气氛放松的咖啡聊天。'
    WHEN 10014 THEN '理性与感性并存，喜欢美食探店和博物馆。'
    ELSE bio
  END
WHERE user_id IN (10001, 10002, 10003, 10004, 10005, 10009, 10010, 10011, 10012, 10013, 10014);
