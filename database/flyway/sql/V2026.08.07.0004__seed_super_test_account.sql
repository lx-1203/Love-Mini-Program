-- ============================================================
-- 迁移：超级测试账号种子（全功能解锁的本地联调账号）
-- ============================================================
-- 背景：
--   本地联调需要一个「全功能可用」的超级测试账号：
--     - 登录凭据：手机号 19900000000 / 密码 Admin@12345
--     - 唯一标识：openid = local-dev-admin-openid-123456
--     - 权限：role = SUPER_ADMIN（后台全管理）+ 前端全功能
--       （资料完整度 100%，前端按 openid 识别后放行匹配次数/解锁限制）
--
--   密码存储说明：按需求明文存储于本地测试库（password = 'Admin@12345'），
--   后端 loginWithPhone 支持「历史明文密码兼容 + 自动迁移 BCrypt」，
--   首次登录校验通过后自动升级为 BCrypt 哈希。
--
-- 幂等性：按 openid 判断是否已存在，WHERE NOT EXISTS 可安全重跑。
-- ============================================================

-- 1. 插入超级测试账号（users 表）。
--    显式指定固定 id = 100000：前端以 userId === '100000' 识别超级账号
--    （匹配次数无限 / 解锁免费 / dev 页身份切换），避免依赖自增 ID 的不确定性。
INSERT INTO users (id, openid, nickname, phone, password, role, status, profile_completion,
                   following_count, followers_count, created_at, updated_at)
SELECT 100000, 'local-dev-admin-openid-123456', '超级测试账号', '19900000000', 'Admin@12345',
       'SUPER_ADMIN', 'active', 100, 0, 0, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE openid = 'local-dev-admin-openid-123456');

-- 2. 基本资料（资料完整度 100：昵称/简介/年级/代词/兴趣标签/身高/学历/婚况/籍贯/未来城市）
INSERT INTO user_basic_profile
  (user_id, nickname, bio, grade_label, pronouns, interest_tags,
   height, education_level, relationship_status,
   hometown_province, hometown_city, future_city, future_plan_tags,
   photo_gallery, profile_background_url)
SELECT u.id, '超级测试账号', '全功能测试账号：可体验匹配/消息/圈子/我的全部功能，后台全管理权限。',
       '大三', 'TA', JSON_ARRAY('阅读','旅行','摄影','音乐','美食','桌游'),
       175, 'bachelor', 'never',
       '北京', '北京', '北京', JSON_ARRAY('旅行','读书','事业','健康'),
       JSON_ARRAY(), ''
FROM users u
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND NOT EXISTS (SELECT 1 FROM user_basic_profile b WHERE b.user_id = u.id);

-- 3. 校园资料（直接置为已认证通过，同校匹配/校友圈子权限全开）
INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
SELECT u.id, '北京', '北京大学', '工业设计', 'verified'
FROM users u
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND NOT EXISTS (SELECT 1 FROM user_campus_profile c WHERE c.user_id = u.id);

-- 4. 课表偏好
INSERT INTO user_schedule_profile (user_id, preferred_campus_area, preferred_time_window_json, course_block_json)
SELECT u.id, '图书馆', JSON_ARRAY('周一晚上','周三下午'), JSON_ARRAY()
FROM users u
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND NOT EXISTS (SELECT 1 FROM user_schedule_profile s WHERE s.user_id = u.id);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM user_basic_profile WHERE user_id = (SELECT id FROM users WHERE openid = 'local-dev-admin-openid-123456');
-- DELETE FROM user_campus_profile WHERE user_id = (SELECT id FROM users WHERE openid = 'local-dev-admin-openid-123456');
-- DELETE FROM user_schedule_profile WHERE user_id = (SELECT id FROM users WHERE openid = 'local-dev-admin-openid-123456');
-- DELETE FROM users WHERE openid = 'local-dev-admin-openid-123456';
