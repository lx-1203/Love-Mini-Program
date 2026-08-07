-- ============================================================
-- 测试数据种子脚本（2026-08-07）
-- 用途：本地联调「寻觅」推荐流——体验账号(47)无同校区候选导致推荐为空。
-- 内容：
--   1. 修正体验账号(47)的脏校区数据（此前被写入 "1"）
--   2. 为 6 个测试用户补齐校区资料 + 基本资料（同校区「北京大学」）
--   3. 同步更新 users.profile_completion
-- 幂等：重复执行前先清理本脚本创建的行（按固定 user_id 识别）。
-- ============================================================

-- 1. 修正体验账号校区资料
UPDATE user_campus_profile
   SET city_name = '北京', campus_name = '北京大学', department_name = '工业设计'
 WHERE user_id = 47;

-- 2. 清理旧的种子数据（幂等）
DELETE FROM user_basic_profile WHERE user_id IN (5,6,7,8,9,10);
DELETE FROM user_campus_profile WHERE user_id IN (5,6,7,8,9,10);

-- 3. 插入测试用户校区资料（同校区，供 campus_first 模式推荐）
INSERT INTO user_campus_profile
  (user_id, city_name, campus_name, department_name, verification_status)
VALUES
  (5,  '北京', '北京大学', '计算机科学', 'verified'),
  (6,  '北京', '北京大学', '经济学',     'verified'),
  (7,  '北京', '北京大学', '新闻传播',   'verified'),
  (8,  '北京', '北京大学', '心理学',     'verified'),
  (9,  '北京', '北京大学', '法学',       'verified'),
  (10, '北京', '北京大学', '数学',       'verified');

-- 4. 插入测试用户基本资料（昵称/简介/标签，供推荐卡片展示）
INSERT INTO user_basic_profile
  (user_id, nickname, bio, grade_label, pronouns, interest_tags,
   height, education_level, relationship_status, future_plan_tags)
VALUES
  (5,  '小鹿',   '喜欢图书馆的下午和操场晚风', '大三', '她', JSON_ARRAY('阅读','旅行','摄影'),  165, 'bachelor', 'never',  JSON_ARRAY('旅行','读书')),
  (6,  '阿禾',   '周末爬山，平时泡实验室',     '研一', '她', JSON_ARRAY('运动','美食','电影'),    168, 'master',   'never',  JSON_ARRAY('健身','美食')),
  (7,  '橙子',   '会弹吉他，喜欢民谣',         '大二', '她', JSON_ARRAY('音乐','阅读','手工'),    162, 'bachelor', 'never',  JSON_ARRAY('音乐','旅行')),
  (8,  '小满',   '心理学在读，擅长倾听',       '大四', '她', JSON_ARRAY('电影','咖啡','写作'),    170, 'bachelor', 'never',  JSON_ARRAY('旅行','写作')),
  (9,  '青柠',   '法学院但爱看天文，反差萌',   '研二', '她', JSON_ARRAY('天文','摄影','辩论'),    166, 'master',   'never',  JSON_ARRAY('旅行','摄影')),
  (10, '桃桃',   '数学系卷王，也爱逛展',       '大三', '她', JSON_ARRAY('艺术','美食','桌游'),    163, 'bachelor', 'never',  JSON_ARRAY('美食','旅行'));

-- 5. 同步 profile_completion（与后端 basic profile 完善度口径一致，视为已完善）
UPDATE users SET profile_completion = 100 WHERE id IN (5,6,7,8,9,10);

-- 6. 测试用户头像（本地免费图，小程序包内路径可直接显示；与 users.avatar_url 映射）
UPDATE users SET
  avatar_url = '/static/assets/images/avatars/avatar-1.jpg'
WHERE id = 5;
UPDATE users SET
  avatar_url = '/static/assets/images/avatars/avatar-2.jpg'
WHERE id = 6;
UPDATE users SET
  avatar_url = '/static/assets/images/avatars/avatar-3.jpg'
WHERE id = 7;
UPDATE users SET
  avatar_url = '/static/assets/images/avatars/avatar-4.jpg'
WHERE id = 8;
UPDATE users SET
  avatar_url = '/static/assets/images/avatars/avatar-5.jpg'
WHERE id = 9;
UPDATE users SET
  avatar_url = '/static/assets/images/avatars/avatar-6.jpg'
WHERE id = 10;
UPDATE users SET
  avatar_url = '/static/assets/images/avatars/avatar-7.jpg'
WHERE id = 47;
