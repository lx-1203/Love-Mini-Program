-- ============================================================
-- 体验账号(47)资料完善脚本（2026-08-07）
-- 目标：让体验账号资料完整、校园认证通过、课表就绪，
--       profile_completion=100，可使用所有功能。
-- 幂等：全部使用 UPDATE/INSERT ... ON DUPLICATE KEY，可重复执行。
-- ============================================================

-- 1. 基本资料完善（用户之前填写了占位数据 111/11，统一替换为完整资料）
UPDATE user_basic_profile SET
  nickname          = '体验用户',
  bio               = '热爱生活，喜欢图书馆的下午和操场晚风。想认识有趣的灵魂。',
  grade_label       = '大三',
  pronouns          = 'TA',
  interest_tags     = JSON_ARRAY('阅读','旅行','摄影','音乐','美食'),
  height            = 170,
  education_level   = 'bachelor',
  relationship_status = 'never',
  hometown_province = '北京',
  hometown_city     = '北京',
  future_city       = '北京',
  future_plan_tags  = JSON_ARRAY('旅行','读书','事业','健康'),
  updated_at        = NOW()
WHERE user_id = 47;

-- 2. 校园认证置为已通过（此前为 pending/draft）
UPDATE user_campus_profile SET
  verification_status = 'verified',
  updated_at          = NOW()
WHERE user_id = 47;

-- 3. 时间安排（课表可选项，为体验账号预置一份以便演示「我的→时间安排」）
INSERT INTO user_schedule_profile
  (user_id, preferred_campus_area, preferred_time_window_json, course_block_json)
VALUES
  (47, '图书馆和北草坪', JSON_ARRAY('今晚', '本周三下午'), JSON_ARRAY())
ON DUPLICATE KEY UPDATE
  preferred_campus_area   = VALUES(preferred_campus_area),
  preferred_time_window_json = VALUES(preferred_time_window_json),
  course_block_json       = VALUES(course_block_json),
  updated_at              = NOW();

-- 4. 用户主表：昵称 + 完成度 100
UPDATE users SET
  nickname          = '体验用户',
  profile_completion = 100,
  updated_at        = NOW()
WHERE id = 47;
