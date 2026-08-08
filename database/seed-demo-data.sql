-- ============================================================
-- 演示数据种子脚本（2026-08-07 全模块测试数据填充）
-- 用途：本地联调全功能演示——50+ 虚拟用户、帖子、评论、喜欢/访客
-- 执行：mysql -u<user> -p <db> < database/seed-demo-data.sql
-- 幂等：重复执行前先清理本脚本创建的行（按固定 user_id 识别）
-- ============================================================

-- 1. 清理旧种子（幂等）
-- 修复（2026-08-08）：原表名 post_like 不存在（实际为 post_likes），执行必报错中断
DELETE FROM post_likes WHERE post_id >= 9000;
DELETE FROM comments WHERE post_id >= 9000;
DELETE FROM posts WHERE id >= 9000;
DELETE FROM user_basic_profile WHERE user_id BETWEEN 20000 AND 20049;
DELETE FROM user_campus_profile WHERE user_id BETWEEN 20000 AND 20049;
DELETE FROM user_schedule_profile WHERE user_id BETWEEN 20000 AND 20049;
DELETE FROM users WHERE id BETWEEN 20000 AND 20049;

-- 2. 插入 50 个虚拟用户（users + 基本资料 + 校园资料）

-- 用户 20000 林夕
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20000, 'demo-openid-20000', '林夕', '18800000000', 'USER', 'active', 100, 0, 5, DATE_SUB(NOW(), INTERVAL 20 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20000, '林夕', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 160, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20000, '北京', '北京大学', '计算机科学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20001 陈默
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20001, 'demo-openid-20001', '陈默', '18800000001', 'USER', 'active', 100, 1, 6, DATE_SUB(NOW(), INTERVAL 21 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20001, '陈默', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 161, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20001, '上海', '复旦大学', '经济学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20002 顾言
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20002, 'demo-openid-20002', '顾言', '18800000002', 'USER', 'active', 100, 2, 7, DATE_SUB(NOW(), INTERVAL 22 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20002, '顾言', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 162, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20002, '杭州', '浙江大学', '新闻传播', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20003 夏言
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20003, 'demo-openid-20003', '夏言', '18800000003', 'USER', 'active', 100, 3, 8, DATE_SUB(NOW(), INTERVAL 23 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20003, '夏言', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 163, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20003, '南京', '南京大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20004 苏晴
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20004, 'demo-openid-20004', '苏晴', '18800000004', 'USER', 'active', 100, 4, 9, DATE_SUB(NOW(), INTERVAL 24 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20004, '苏晴', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 164, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20004, '武汉', '武汉大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20005 周然
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20005, 'demo-openid-20005', '周然', '18800000005', 'USER', 'active', 100, 5, 10, DATE_SUB(NOW(), INTERVAL 25 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20005, '周然', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 165, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20005, '广州', '中山大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20006 叶知秋
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20006, 'demo-openid-20006', '叶知秋', '18800000006', 'USER', 'active', 100, 6, 11, DATE_SUB(NOW(), INTERVAL 26 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20006, '叶知秋', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 166, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20006, '成都', '四川大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20007 沈星河
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20007, 'demo-openid-20007', '沈星河', '18800000007', 'USER', 'active', 100, 7, 12, DATE_SUB(NOW(), INTERVAL 27 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20007, '沈星河', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 167, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20007, '厦门', '厦门大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20008 江晚吟
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20008, 'demo-openid-20008', '江晚吟', '18800000008', 'USER', 'active', 100, 8, 13, DATE_SUB(NOW(), INTERVAL 28 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20008, '江晚吟', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 168, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20008, '天津', '天津大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20009 陆离
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20009, 'demo-openid-20009', '陆离', '18800000009', 'USER', 'active', 100, 9, 14, DATE_SUB(NOW(), INTERVAL 29 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20009, '陆离', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 169, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20009, '长沙', '中南大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20010 温言
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20010, 'demo-openid-20010', '温言', '18800000010', 'USER', 'active', 100, 10, 15, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20010, '温言', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 170, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20010, '大连', '大连理工大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20011 白夜
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20011, 'demo-openid-20011', '白夜', '18800000011', 'USER', 'active', 100, 11, 16, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20011, '白夜', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 171, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20011, '重庆', '重庆大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20012 许清欢
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20012, 'demo-openid-20012', '许清欢', '18800000012', 'USER', 'active', 100, 12, 17, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20012, '许清欢', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 172, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20012, '西安', '西安交通大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20013 顾北辰
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20013, 'demo-openid-20013', '顾北辰', '18800000013', 'USER', 'active', 100, 13, 18, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20013, '顾北辰', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 173, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20013, '北京', '中国人民大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20014 林晚
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20014, 'demo-openid-20014', '林晚', '18800000014', 'USER', 'active', 100, 14, 19, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20014, '林晚', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 174, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20014, '北京', '北京师范大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20015 沈知微
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20015, 'demo-openid-20015', '沈知微', '18800000015', 'USER', 'active', 100, 15, 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20015, '沈知微', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 160, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20015, '上海', '上海交通大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20016 苏黎
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20016, 'demo-openid-20016', '苏黎', '18800000016', 'USER', 'active', 100, 16, 6, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20016, '苏黎', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 161, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20016, '上海', '同济大学', '计算机科学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20017 周子衿
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20017, 'demo-openid-20017', '周子衿', '18800000017', 'USER', 'active', 100, 17, 7, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20017, '周子衿', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 162, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20017, '武汉', '华中科技大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20018 陆时寒
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20018, 'demo-openid-20018', '陆时寒', '18800000018', 'USER', 'active', 100, 18, 8, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20018, '陆时寒', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 163, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20018, '济南', '山东大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20019 叶青梧
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20019, 'demo-openid-20019', '叶青梧', '18800000019', 'USER', 'active', 100, 19, 9, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20019, '叶青梧', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 164, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20019, '长春', '吉林大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20020 江疏影
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20020, 'demo-openid-20020', '江疏影', '18800000020', 'USER', 'active', 100, 0, 10, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20020, '江疏影', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 165, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20020, '南京', '东南大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20021 顾南烟
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20021, 'demo-openid-20021', '顾南烟', '18800000021', 'USER', 'active', 100, 1, 11, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20021, '顾南烟', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 166, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20021, '天津', '南开大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20022 秦朗
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20022, 'demo-openid-20022', '秦朗', '18800000022', 'USER', 'active', 100, 2, 12, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20022, '秦朗', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 167, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20022, '哈尔滨', '哈尔滨工业大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20023 许星河
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20023, 'demo-openid-20023', '许星河', '18800000023', 'USER', 'active', 100, 3, 13, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20023, '许星河', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 168, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20023, '广州', '湖南大学', '汉语言文学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20024 温以宁
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20024, 'demo-openid-20024', '温以宁', '18800000024', 'USER', 'active', 100, 4, 14, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20024, '温以宁', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 169, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20024, '北京', '北京大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20025 宋远山
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20025, 'demo-openid-20025', '宋远山', '18800000025', 'USER', 'active', 100, 5, 15, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20025, '宋远山', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 170, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20025, '上海', '复旦大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20026 唐糖
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20026, 'demo-openid-20026', '唐糖', '18800000026', 'USER', 'active', 100, 6, 16, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20026, '唐糖', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 171, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20026, '杭州', '浙江大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20027 韩清
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20027, 'demo-openid-20027', '韩清', '18800000027', 'USER', 'active', 100, 7, 17, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20027, '韩清', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 172, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20027, '南京', '南京大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20028 孟繁星
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20028, 'demo-openid-20028', '孟繁星', '18800000028', 'USER', 'active', 100, 8, 18, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20028, '孟繁星', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 173, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20028, '武汉', '武汉大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20029 洛小满
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20029, 'demo-openid-20029', '洛小满', '18800000029', 'USER', 'active', 100, 9, 19, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20029, '洛小满', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 174, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20029, '广州', '中山大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20030 谢朝
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20030, 'demo-openid-20030', '谢朝', '18800000030', 'USER', 'active', 100, 10, 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20030, '谢朝', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 160, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20030, '成都', '四川大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20031 舒然
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20031, 'demo-openid-20031', '舒然', '18800000031', 'USER', 'active', 100, 11, 6, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20031, '舒然', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 161, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20031, '厦门', '厦门大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20032 穆清和
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20032, 'demo-openid-20032', '穆清和', '18800000032', 'USER', 'active', 100, 12, 7, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20032, '穆清和', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 162, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20032, '天津', '天津大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20033 柳依依
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20033, 'demo-openid-20033', '柳依依', '18800000033', 'USER', 'active', 100, 13, 8, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20033, '柳依依', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 163, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20033, '长沙', '中南大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20034 盛云
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20034, 'demo-openid-20034', '盛云', '18800000034', 'USER', 'active', 100, 14, 9, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20034, '盛云', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 164, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20034, '大连', '大连理工大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20035 许墨
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20035, 'demo-openid-20035', '许墨', '18800000035', 'USER', 'active', 100, 15, 10, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20035, '许墨', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 165, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20035, '重庆', '重庆大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20036 顾栀
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20036, 'demo-openid-20036', '顾栀', '18800000036', 'USER', 'active', 100, 16, 11, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20036, '顾栀', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 166, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20036, '西安', '西安交通大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20037 沈括
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20037, 'demo-openid-20037', '沈括', '18800000037', 'USER', 'active', 100, 17, 12, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20037, '沈括', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 167, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20037, '北京', '中国人民大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20038 黎洛
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20038, 'demo-openid-20038', '黎洛', '18800000038', 'USER', 'active', 100, 18, 13, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20038, '黎洛', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 168, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20038, '北京', '北京师范大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20039 闻人暖
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20039, 'demo-openid-20039', '闻人暖', '18800000039', 'USER', 'active', 100, 19, 14, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20039, '闻人暖', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 169, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20039, '上海', '上海交通大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20040 赵子墨
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20040, 'demo-openid-20040', '赵子墨', '18800000040', 'USER', 'active', 100, 0, 15, DATE_SUB(NOW(), INTERVAL 60 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20040, '赵子墨', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 170, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20040, '上海', '同济大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20041 钱多多
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20041, 'demo-openid-20041', '钱多多', '18800000041', 'USER', 'active', 100, 1, 16, DATE_SUB(NOW(), INTERVAL 61 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20041, '钱多多', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 171, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20041, '武汉', '华中科技大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20042 孙明澈
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20042, 'demo-openid-20042', '孙明澈', '18800000042', 'USER', 'active', 100, 2, 17, DATE_SUB(NOW(), INTERVAL 62 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20042, '孙明澈', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 172, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20042, '济南', '山东大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20043 李未央
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20043, 'demo-openid-20043', '李未央', '18800000043', 'USER', 'active', 100, 3, 18, DATE_SUB(NOW(), INTERVAL 63 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20043, '李未央', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 173, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20043, '长春', '吉林大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20044 周知远
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20044, 'demo-openid-20044', '周知远', '18800000044', 'USER', 'active', 100, 4, 19, DATE_SUB(NOW(), INTERVAL 64 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20044, '周知远', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 174, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20044, '南京', '东南大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20045 吴桐
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20045, 'demo-openid-20045', '吴桐', '18800000045', 'USER', 'active', 100, 5, 5, DATE_SUB(NOW(), INTERVAL 65 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20045, '吴桐', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 160, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20045, '天津', '南开大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20046 郑嘉言
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20046, 'demo-openid-20046', '郑嘉言', '18800000046', 'USER', 'active', 100, 6, 6, DATE_SUB(NOW(), INTERVAL 66 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20046, '郑嘉言', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 161, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20046, '哈尔滨', '哈尔滨工业大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20047 王云深
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20047, 'demo-openid-20047', '王云深', '18800000047', 'USER', 'active', 100, 7, 7, DATE_SUB(NOW(), INTERVAL 67 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20047, '王云深', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 162, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20047, '杭州', '湖南大学', '金融学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20048 冯念
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20048, 'demo-openid-20048', '冯念', '18800000048', 'USER', 'active', 100, 8, 8, DATE_SUB(NOW(), INTERVAL 68 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20048, '冯念', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 163, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20048, '北京', '北京大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20049 陈星野
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20049, 'demo-openid-20049', '陈星野', '18800000049', 'USER', 'active', 100, 9, 9, DATE_SUB(NOW(), INTERVAL 69 DAY), NOW()))
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20049, '陈星野', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 164, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20049, '上海', '复旦大学'
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 3. 插入 30 条帖子（id 9000-9029，作者轮换）

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9000, 20000, '周末去爬山，山顶的日落太治愈了，有一起的朋友吗？', 'sincere', '[]', '["爬山", "周末活动"]', 20, 5, 0, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 0 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9001, 20007, '刚看完《长安三万里》，李白的一生太浪漫了，推荐！', 'sincere', '[]', '["电影", "分享"]', 27, 6, 1, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9002, 20014, '想找个人一起学做咖啡，拉花入门中，进度缓慢但快乐～', 'sincere', '[]', '["咖啡", "兴趣"]', 34, 7, 2, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9003, 20021, '图书馆偶遇计划：周五下午三点，二楼靠窗位置，来搭话吧。', 'sincere', '[]', '["校园日常", "图书馆"]', 41, 8, 3, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9004, 20028, '第一次尝试露营，星空下的近郊太美了。', 'sincere', '[]', '["露营", "户外"]', 48, 5, 4, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 4 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9005, 20035, '养了一只英短，叫年糕，每天回家都治愈一天的疲惫。', 'sincere', '[]', '["宠物", "日常"]', 55, 6, 5, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 5 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9006, 20042, '健身第三个月，终于能看到一点线条了，坚持就是胜利！', 'sincere', '[]', '["健身", "打卡"]', 62, 7, 6, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 6 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9007, 20049, '毕业两年，从深圳到成都，慢下来的生活真好。', 'sincere', '[]', '["城市生活", "慢生活"]', 69, 8, 7, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 7 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9008, 20006, '周末羽毛球局缺人，有没有组队的朋友？', 'sincere', '[]', '["运动", "球局"]', 76, 5, 8, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 8 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9009, 20013, '雨天宅家，泡杯茶看看书，难得的悠闲时光。', 'sincere', '[]', '["雨天", "阅读"]', 83, 6, 9, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 9 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9010, 20020, '辞职后gap三个月，计划走遍中国西部，有人同行吗？', 'sincere', '[]', '["旅行", "gap"]', 90, 7, 0, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 10 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9011, 20027, '最近迷上了陶艺，做了个歪歪扭扭的杯子，丑得可爱。', 'sincere', '[]', '["手作", "陶艺"]', 97, 8, 1, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 11 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9012, 20034, '深夜放毒：亲手做的红烧肉，肥而不腻，绝了！', 'sincere', '[]', '["美食", "深夜食堂"]', 104, 5, 2, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 12 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9013, 20041, '想找语伴练英语口语，每周两次线上，有人吗？', 'sincere', '[]', '["学习", "英语"]', 111, 6, 3, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 13 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9014, 20048, '滑雪初体验！摔了十几次终于会刹车了，明年再战。', 'sincere', '[]', '["滑雪", "冬天"]', 118, 7, 4, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 14 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9015, 20005, '整理了今年拍的照片，才发现生活比想象中美好。', 'sincere', '[]', '["摄影", "生活记录"]', 125, 8, 5, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 15 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9016, 20012, '加班到深夜，楼下便利店的热豆浆是唯一的慰藉。', 'sincere', '[]', '["加班", "打工日常"]', 132, 5, 6, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 16 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9017, 20019, '春天来了，想找个人一起看樱花，花开好了。', 'sincere', '[]', '["春天", "樱花"]', 139, 6, 7, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 17 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9018, 20026, '学了三个月吉他，终于能弹完整一首《晴天》了！', 'sincere', '[]', '["吉他", "音乐"]', 146, 7, 8, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 18 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9019, 20033, '搬家整理出小时候的日记，笑到肚子疼，太可爱了。', 'sincere', '[]', '["童年", "回忆"]', 151, 8, 9, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 19 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9020, 20040, '跑步第100天打卡！从3公里到10公里，变化看得见。', 'sincere', '[]', '["跑步", "坚持"]', 151, 5, 0, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 20 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9021, 20047, '最近在研究咖啡手冲，喜欢的朋友可以交流下～', 'sincere', '[]', '["咖啡", "手冲"]', 151, 6, 1, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 21 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9022, 20004, '周末去看展，遇见一幅很喜欢的画，忍不住拍下来。', 'sincere', '[]', '["看展", "艺术"]', 24, 7, 2, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 22 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9023, 20011, '一个人吃了火锅，味道不错，但下次还是想两个人。', 'sincere', '[]', '["火锅", "美食"]', 31, 8, 3, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 23 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9024, 20018, '深度讨论：异地恋到底有没有未来？想听听大家的看法。', 'sincere', '[]', '["异地恋", "讨论"]', 38, 5, 4, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 24 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9025, 20025, 'MBTI测试分享：我是INFJ，有一样的吗？', 'sincere', '[]', '["MBTI", "性格"]', 45, 6, 5, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 25 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9026, 20032, '《三体》读了三遍，每次都有新感受，推荐给科幻迷。', 'sincere', '[]', '["三体", "科幻"]', 52, 7, 6, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 26 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9027, 20039, '分享我的旅行清单：想去冰岛看极光，攒钱中！', 'sincere', '[]', '["旅行", "极光"]', 59, 8, 7, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 27 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9028, 20046, '最近迷上烘焙，做了巴斯克蛋糕，同事们都说好吃。', 'sincere', '[]', '["烘焙", "美食"]', 66, 5, 8, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 28 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9029, 20003, '有没有喜欢逛博物馆的朋友？周末组个局？', 'sincere', '[]', '["博物馆", "周末"]', 73, 6, 9, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 29 DAY), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

-- 4. 插入帖子评论（每帖 5-8 条）

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99001, 9000, 20000, '写得真好！', DATE_SUB(NOW(), INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99002, 9000, 20011, '同感同感', DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99003, 9000, 20022, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 3 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99004, 9000, 20033, '求带！', DATE_SUB(NOW(), INTERVAL 4 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99005, 9000, 20044, '我也想去', DATE_SUB(NOW(), INTERVAL 5 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99006, 9001, 20003, '同感同感', DATE_SUB(NOW(), INTERVAL 6 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99007, 9001, 20014, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 7 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99008, 9001, 20025, '求带！', DATE_SUB(NOW(), INTERVAL 8 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99009, 9001, 20036, '我也想去', DATE_SUB(NOW(), INTERVAL 9 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99010, 9001, 20047, '有画面了', DATE_SUB(NOW(), INTERVAL 10 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99011, 9001, 20008, '支持支持', DATE_SUB(NOW(), INTERVAL 11 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99012, 9002, 20006, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 12 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99013, 9002, 20017, '求带！', DATE_SUB(NOW(), INTERVAL 13 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99014, 9002, 20028, '我也想去', DATE_SUB(NOW(), INTERVAL 14 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99015, 9002, 20039, '有画面了', DATE_SUB(NOW(), INTERVAL 15 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99016, 9002, 20000, '支持支持', DATE_SUB(NOW(), INTERVAL 16 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99017, 9002, 20011, '收藏了', DATE_SUB(NOW(), INTERVAL 17 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99018, 9002, 20022, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 18 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99019, 9003, 20009, '求带！', DATE_SUB(NOW(), INTERVAL 19 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99020, 9003, 20020, '我也想去', DATE_SUB(NOW(), INTERVAL 20 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99021, 9003, 20031, '有画面了', DATE_SUB(NOW(), INTERVAL 21 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99022, 9003, 20042, '支持支持', DATE_SUB(NOW(), INTERVAL 22 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99023, 9003, 20003, '收藏了', DATE_SUB(NOW(), INTERVAL 23 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99024, 9003, 20014, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 24 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99025, 9003, 20025, '下次一起呀', DATE_SUB(NOW(), INTERVAL 25 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99026, 9003, 20036, '写得真好！', DATE_SUB(NOW(), INTERVAL 26 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99027, 9004, 20012, '我也想去', DATE_SUB(NOW(), INTERVAL 27 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99028, 9004, 20023, '有画面了', DATE_SUB(NOW(), INTERVAL 28 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99029, 9004, 20034, '支持支持', DATE_SUB(NOW(), INTERVAL 29 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99030, 9004, 20045, '收藏了', DATE_SUB(NOW(), INTERVAL 30 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99031, 9004, 20006, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 31 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99032, 9005, 20015, '有画面了', DATE_SUB(NOW(), INTERVAL 32 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99033, 9005, 20026, '支持支持', DATE_SUB(NOW(), INTERVAL 33 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99034, 9005, 20037, '收藏了', DATE_SUB(NOW(), INTERVAL 34 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99035, 9005, 20048, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 35 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99036, 9005, 20009, '下次一起呀', DATE_SUB(NOW(), INTERVAL 36 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99037, 9005, 20020, '写得真好！', DATE_SUB(NOW(), INTERVAL 37 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99038, 9006, 20018, '支持支持', DATE_SUB(NOW(), INTERVAL 38 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99039, 9006, 20029, '收藏了', DATE_SUB(NOW(), INTERVAL 39 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99040, 9006, 20040, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 40 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99041, 9006, 20001, '下次一起呀', DATE_SUB(NOW(), INTERVAL 41 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99042, 9006, 20012, '写得真好！', DATE_SUB(NOW(), INTERVAL 42 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99043, 9006, 20023, '同感同感', DATE_SUB(NOW(), INTERVAL 43 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99044, 9006, 20034, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 44 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99045, 9007, 20021, '收藏了', DATE_SUB(NOW(), INTERVAL 45 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99046, 9007, 20032, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 46 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99047, 9007, 20043, '下次一起呀', DATE_SUB(NOW(), INTERVAL 47 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99048, 9007, 20004, '写得真好！', DATE_SUB(NOW(), INTERVAL 48 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99049, 9007, 20015, '同感同感', DATE_SUB(NOW(), INTERVAL 49 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99050, 9007, 20026, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 50 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99051, 9007, 20037, '求带！', DATE_SUB(NOW(), INTERVAL 51 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99052, 9007, 20048, '我也想去', DATE_SUB(NOW(), INTERVAL 52 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99053, 9008, 20024, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 53 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99054, 9008, 20035, '下次一起呀', DATE_SUB(NOW(), INTERVAL 54 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99055, 9008, 20046, '写得真好！', DATE_SUB(NOW(), INTERVAL 55 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99056, 9008, 20007, '同感同感', DATE_SUB(NOW(), INTERVAL 56 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99057, 9008, 20018, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 57 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99058, 9009, 20027, '下次一起呀', DATE_SUB(NOW(), INTERVAL 58 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99059, 9009, 20038, '写得真好！', DATE_SUB(NOW(), INTERVAL 59 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99060, 9009, 20049, '同感同感', DATE_SUB(NOW(), INTERVAL 60 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99061, 9009, 20010, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 61 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99062, 9009, 20021, '求带！', DATE_SUB(NOW(), INTERVAL 62 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99063, 9009, 20032, '我也想去', DATE_SUB(NOW(), INTERVAL 63 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99064, 9010, 20030, '写得真好！', DATE_SUB(NOW(), INTERVAL 64 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99065, 9010, 20041, '同感同感', DATE_SUB(NOW(), INTERVAL 65 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99066, 9010, 20002, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 66 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99067, 9010, 20013, '求带！', DATE_SUB(NOW(), INTERVAL 67 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99068, 9010, 20024, '我也想去', DATE_SUB(NOW(), INTERVAL 68 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99069, 9010, 20035, '有画面了', DATE_SUB(NOW(), INTERVAL 69 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99070, 9010, 20046, '支持支持', DATE_SUB(NOW(), INTERVAL 70 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99071, 9011, 20033, '同感同感', DATE_SUB(NOW(), INTERVAL 71 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99072, 9011, 20044, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 72 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99073, 9011, 20005, '求带！', DATE_SUB(NOW(), INTERVAL 73 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99074, 9011, 20016, '我也想去', DATE_SUB(NOW(), INTERVAL 74 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99075, 9011, 20027, '有画面了', DATE_SUB(NOW(), INTERVAL 75 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99076, 9011, 20038, '支持支持', DATE_SUB(NOW(), INTERVAL 76 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99077, 9011, 20049, '收藏了', DATE_SUB(NOW(), INTERVAL 77 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99078, 9011, 20010, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 78 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99079, 9012, 20036, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 79 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99080, 9012, 20047, '求带！', DATE_SUB(NOW(), INTERVAL 80 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99081, 9012, 20008, '我也想去', DATE_SUB(NOW(), INTERVAL 81 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99082, 9012, 20019, '有画面了', DATE_SUB(NOW(), INTERVAL 82 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99083, 9012, 20030, '支持支持', DATE_SUB(NOW(), INTERVAL 83 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99084, 9013, 20039, '求带！', DATE_SUB(NOW(), INTERVAL 84 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99085, 9013, 20000, '我也想去', DATE_SUB(NOW(), INTERVAL 85 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99086, 9013, 20011, '有画面了', DATE_SUB(NOW(), INTERVAL 86 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99087, 9013, 20022, '支持支持', DATE_SUB(NOW(), INTERVAL 87 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99088, 9013, 20033, '收藏了', DATE_SUB(NOW(), INTERVAL 88 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99089, 9013, 20044, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 89 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99090, 9014, 20042, '我也想去', DATE_SUB(NOW(), INTERVAL 0 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99091, 9014, 20003, '有画面了', DATE_SUB(NOW(), INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99092, 9014, 20014, '支持支持', DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99093, 9014, 20025, '收藏了', DATE_SUB(NOW(), INTERVAL 3 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99094, 9014, 20036, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 4 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99095, 9014, 20047, '下次一起呀', DATE_SUB(NOW(), INTERVAL 5 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99096, 9014, 20008, '写得真好！', DATE_SUB(NOW(), INTERVAL 6 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99097, 9015, 20045, '有画面了', DATE_SUB(NOW(), INTERVAL 7 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99098, 9015, 20006, '支持支持', DATE_SUB(NOW(), INTERVAL 8 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99099, 9015, 20017, '收藏了', DATE_SUB(NOW(), INTERVAL 9 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99100, 9015, 20028, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 10 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99101, 9015, 20039, '下次一起呀', DATE_SUB(NOW(), INTERVAL 11 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99102, 9015, 20000, '写得真好！', DATE_SUB(NOW(), INTERVAL 12 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99103, 9015, 20011, '同感同感', DATE_SUB(NOW(), INTERVAL 13 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99104, 9015, 20022, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 14 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99105, 9016, 20048, '支持支持', DATE_SUB(NOW(), INTERVAL 15 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99106, 9016, 20009, '收藏了', DATE_SUB(NOW(), INTERVAL 16 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99107, 9016, 20020, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 17 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99108, 9016, 20031, '下次一起呀', DATE_SUB(NOW(), INTERVAL 18 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99109, 9016, 20042, '写得真好！', DATE_SUB(NOW(), INTERVAL 19 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99110, 9017, 20001, '收藏了', DATE_SUB(NOW(), INTERVAL 20 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99111, 9017, 20012, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 21 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99112, 9017, 20023, '下次一起呀', DATE_SUB(NOW(), INTERVAL 22 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99113, 9017, 20034, '写得真好！', DATE_SUB(NOW(), INTERVAL 23 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99114, 9017, 20045, '同感同感', DATE_SUB(NOW(), INTERVAL 24 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99115, 9017, 20006, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 25 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99116, 9018, 20004, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 26 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99117, 9018, 20015, '下次一起呀', DATE_SUB(NOW(), INTERVAL 27 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99118, 9018, 20026, '写得真好！', DATE_SUB(NOW(), INTERVAL 28 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99119, 9018, 20037, '同感同感', DATE_SUB(NOW(), INTERVAL 29 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99120, 9018, 20048, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 30 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99121, 9018, 20009, '求带！', DATE_SUB(NOW(), INTERVAL 31 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99122, 9018, 20020, '我也想去', DATE_SUB(NOW(), INTERVAL 32 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99123, 9019, 20007, '下次一起呀', DATE_SUB(NOW(), INTERVAL 33 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99124, 9019, 20018, '写得真好！', DATE_SUB(NOW(), INTERVAL 34 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99125, 9019, 20029, '同感同感', DATE_SUB(NOW(), INTERVAL 35 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99126, 9019, 20040, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 36 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99127, 9019, 20001, '求带！', DATE_SUB(NOW(), INTERVAL 37 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99128, 9019, 20012, '我也想去', DATE_SUB(NOW(), INTERVAL 38 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99129, 9019, 20023, '有画面了', DATE_SUB(NOW(), INTERVAL 39 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99130, 9019, 20034, '支持支持', DATE_SUB(NOW(), INTERVAL 40 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99131, 9020, 20010, '写得真好！', DATE_SUB(NOW(), INTERVAL 41 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99132, 9020, 20021, '同感同感', DATE_SUB(NOW(), INTERVAL 42 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99133, 9020, 20032, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 43 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99134, 9020, 20043, '求带！', DATE_SUB(NOW(), INTERVAL 44 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99135, 9020, 20004, '我也想去', DATE_SUB(NOW(), INTERVAL 45 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99136, 9021, 20013, '同感同感', DATE_SUB(NOW(), INTERVAL 46 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99137, 9021, 20024, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 47 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99138, 9021, 20035, '求带！', DATE_SUB(NOW(), INTERVAL 48 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99139, 9021, 20046, '我也想去', DATE_SUB(NOW(), INTERVAL 49 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99140, 9021, 20007, '有画面了', DATE_SUB(NOW(), INTERVAL 50 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99141, 9021, 20018, '支持支持', DATE_SUB(NOW(), INTERVAL 51 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99142, 9022, 20016, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 52 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99143, 9022, 20027, '求带！', DATE_SUB(NOW(), INTERVAL 53 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99144, 9022, 20038, '我也想去', DATE_SUB(NOW(), INTERVAL 54 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99145, 9022, 20049, '有画面了', DATE_SUB(NOW(), INTERVAL 55 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99146, 9022, 20010, '支持支持', DATE_SUB(NOW(), INTERVAL 56 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99147, 9022, 20021, '收藏了', DATE_SUB(NOW(), INTERVAL 57 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99148, 9022, 20032, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 58 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99149, 9023, 20019, '求带！', DATE_SUB(NOW(), INTERVAL 59 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99150, 9023, 20030, '我也想去', DATE_SUB(NOW(), INTERVAL 60 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99151, 9023, 20041, '有画面了', DATE_SUB(NOW(), INTERVAL 61 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99152, 9023, 20002, '支持支持', DATE_SUB(NOW(), INTERVAL 62 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99153, 9023, 20013, '收藏了', DATE_SUB(NOW(), INTERVAL 63 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99154, 9023, 20024, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 64 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99155, 9023, 20035, '下次一起呀', DATE_SUB(NOW(), INTERVAL 65 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99156, 9023, 20046, '写得真好！', DATE_SUB(NOW(), INTERVAL 66 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99157, 9024, 20022, '我也想去', DATE_SUB(NOW(), INTERVAL 67 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99158, 9024, 20033, '有画面了', DATE_SUB(NOW(), INTERVAL 68 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99159, 9024, 20044, '支持支持', DATE_SUB(NOW(), INTERVAL 69 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99160, 9024, 20005, '收藏了', DATE_SUB(NOW(), INTERVAL 70 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99161, 9024, 20016, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 71 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99162, 9025, 20025, '有画面了', DATE_SUB(NOW(), INTERVAL 72 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99163, 9025, 20036, '支持支持', DATE_SUB(NOW(), INTERVAL 73 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99164, 9025, 20047, '收藏了', DATE_SUB(NOW(), INTERVAL 74 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99165, 9025, 20008, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 75 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99166, 9025, 20019, '下次一起呀', DATE_SUB(NOW(), INTERVAL 76 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99167, 9025, 20030, '写得真好！', DATE_SUB(NOW(), INTERVAL 77 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99168, 9026, 20028, '支持支持', DATE_SUB(NOW(), INTERVAL 78 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99169, 9026, 20039, '收藏了', DATE_SUB(NOW(), INTERVAL 79 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99170, 9026, 20000, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 80 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99171, 9026, 20011, '下次一起呀', DATE_SUB(NOW(), INTERVAL 81 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99172, 9026, 20022, '写得真好！', DATE_SUB(NOW(), INTERVAL 82 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99173, 9026, 20033, '同感同感', DATE_SUB(NOW(), INTERVAL 83 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99174, 9026, 20044, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 84 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99175, 9027, 20031, '收藏了', DATE_SUB(NOW(), INTERVAL 85 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99176, 9027, 20042, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 86 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99177, 9027, 20003, '下次一起呀', DATE_SUB(NOW(), INTERVAL 87 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99178, 9027, 20014, '写得真好！', DATE_SUB(NOW(), INTERVAL 88 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99179, 9027, 20025, '同感同感', DATE_SUB(NOW(), INTERVAL 89 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99180, 9027, 20036, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 0 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99181, 9027, 20047, '求带！', DATE_SUB(NOW(), INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99182, 9027, 20008, '我也想去', DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99183, 9028, 20034, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 3 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99184, 9028, 20045, '下次一起呀', DATE_SUB(NOW(), INTERVAL 4 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99185, 9028, 20006, '写得真好！', DATE_SUB(NOW(), INTERVAL 5 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99186, 9028, 20017, '同感同感', DATE_SUB(NOW(), INTERVAL 6 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99187, 9028, 20028, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 7 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99188, 9029, 20037, '下次一起呀', DATE_SUB(NOW(), INTERVAL 8 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99189, 9029, 20048, '写得真好！', DATE_SUB(NOW(), INTERVAL 9 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99190, 9029, 20009, '同感同感', DATE_SUB(NOW(), INTERVAL 10 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99191, 9029, 20020, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 11 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99192, 9029, 20031, '求带！', DATE_SUB(NOW(), INTERVAL 12 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99193, 9029, 20042, '我也想去', DATE_SUB(NOW(), INTERVAL 13 DAY))
ON DUPLICATE KEY UPDATE content = VALUES(content);

-- 5. 插入喜欢记录（22 条，用户喜欢超级测试账号）

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30000, 20000, 100000, DATE_SUB(NOW(), INTERVAL 30 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30001, 20013, 100000, DATE_SUB(NOW(), INTERVAL 31 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30002, 20026, 100000, DATE_SUB(NOW(), INTERVAL 32 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30003, 20039, 100000, DATE_SUB(NOW(), INTERVAL 33 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30004, 20002, 100000, DATE_SUB(NOW(), INTERVAL 34 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30005, 20015, 100000, DATE_SUB(NOW(), INTERVAL 35 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30006, 20028, 100000, DATE_SUB(NOW(), INTERVAL 36 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30007, 20041, 100000, DATE_SUB(NOW(), INTERVAL 37 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30008, 20004, 100000, DATE_SUB(NOW(), INTERVAL 38 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30009, 20017, 100000, DATE_SUB(NOW(), INTERVAL 39 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30010, 20030, 100000, DATE_SUB(NOW(), INTERVAL 40 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30011, 20043, 100000, DATE_SUB(NOW(), INTERVAL 41 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30012, 20006, 100000, DATE_SUB(NOW(), INTERVAL 42 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30013, 20019, 100000, DATE_SUB(NOW(), INTERVAL 43 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30014, 20032, 100000, DATE_SUB(NOW(), INTERVAL 44 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30015, 20045, 100000, DATE_SUB(NOW(), INTERVAL 45 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30016, 20008, 100000, DATE_SUB(NOW(), INTERVAL 46 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30017, 20021, 100000, DATE_SUB(NOW(), INTERVAL 47 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30018, 20034, 100000, DATE_SUB(NOW(), INTERVAL 48 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30019, 20047, 100000, DATE_SUB(NOW(), INTERVAL 49 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30020, 20010, 100000, DATE_SUB(NOW(), INTERVAL 50 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30021, 20023, 100000, DATE_SUB(NOW(), INTERVAL 51 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

-- ============================================================
-- R4-batch3 修复追加段（幂等可重复执行）
-- 覆盖：帖子点赞记录（R4-00505）/ 双向喜欢与匹配对（R4-00506） /
--       左滑记录与私信与钱包流水（R4-00512）/ 完善度中间态（R4-00509） /
--       风控场景（R4-00513）
-- ============================================================

-- ---------- R4-00505: 帖子点赞记录（支撑 likes_count，与评论数对账） ----------
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20032, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20033, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20034, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20035, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20036, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20037, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9000, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20033, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20034, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20035, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20036, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20037, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20034, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20035, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20036, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20037, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9002, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20035, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20036, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20037, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9003, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20036, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20037, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9004, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20037, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9005, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9006, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9007, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9008, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9009, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9011, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (36, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (37, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (38, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (39, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (40, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (41, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (42, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (43, 9012, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (36, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (37, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (38, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (39, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (40, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (41, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (42, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (43, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (44, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (45, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (46, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (100000, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20000, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20001, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20002, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20003, 9013, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (36, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (37, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (38, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (39, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (40, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (41, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (42, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (43, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (44, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (45, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (46, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (100000, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20000, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20001, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20002, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20003, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20004, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20005, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20006, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20007, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20008, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20009, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20010, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20011, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20012, 9014, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (36, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (37, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (38, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (39, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (40, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (41, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (42, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (43, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (44, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (45, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (46, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (100000, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20000, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20001, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20002, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20003, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20004, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20006, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20007, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20008, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20009, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20010, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20011, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20012, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20013, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20014, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20015, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20016, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20017, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20018, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20019, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20020, 9015, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (36, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (37, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (38, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (39, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (40, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (41, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (42, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (43, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (44, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (45, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (46, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (100000, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20000, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20001, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20002, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20003, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20004, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20005, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20006, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20007, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20008, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20009, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20010, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20011, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20013, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20014, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20015, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20016, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20017, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20018, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20019, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20020, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20021, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20022, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20023, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20024, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20025, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20026, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20027, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20028, 9016, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (36, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (37, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (38, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (39, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (40, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (41, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (42, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (43, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (44, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (45, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (46, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (100000, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20000, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20001, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20002, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20003, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20004, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20005, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20006, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20007, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20008, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20009, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20010, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20011, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20012, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20013, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20014, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20015, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20016, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20017, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20018, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20020, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20021, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20022, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20023, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20024, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20025, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20026, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20027, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20028, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20029, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20030, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20031, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20032, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20033, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20034, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20035, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20036, 9017, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (36, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (37, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (38, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (39, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (40, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (41, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (42, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (43, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (44, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (45, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (46, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (100000, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20000, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20001, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20002, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20003, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20004, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20005, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20006, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20007, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20008, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20009, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20010, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20011, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20012, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20013, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20014, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20015, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20016, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20017, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20018, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20019, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20020, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20021, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20022, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20023, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20024, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20025, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20027, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20028, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20029, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20030, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20031, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20032, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20033, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20034, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20035, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20036, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20037, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9018, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (36, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (37, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (38, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (39, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (40, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (41, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (42, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (43, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (44, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (45, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (46, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (100000, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20000, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20001, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20002, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20003, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20004, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20005, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20006, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20007, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20008, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20009, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20010, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20011, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20012, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20013, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20014, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20015, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20016, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20017, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20018, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20019, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20020, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20021, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20022, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20023, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20024, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20025, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20026, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20027, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20028, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20029, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20030, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20031, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20032, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20034, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20035, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20036, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20037, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (36, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (37, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (38, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (39, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (40, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (41, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (42, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (43, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (44, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (45, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (46, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (100000, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20000, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20001, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20002, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20003, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20004, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20005, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20006, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20007, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20008, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20009, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20010, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20011, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20012, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20013, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20014, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20015, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20016, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20017, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20018, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20019, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20020, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20021, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20022, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20023, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20024, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20025, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20026, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20027, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20028, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20029, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20030, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20031, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20032, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20033, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20034, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20035, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20036, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20037, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20047, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9020, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10004, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (30, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (31, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (32, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (33, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (34, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (35, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (36, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (37, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (38, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (39, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (40, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (41, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (42, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (43, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (44, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (45, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (46, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (100000, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20000, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20001, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20002, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20003, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20004, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20005, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20006, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20007, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20008, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20009, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20010, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20011, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20012, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20013, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20014, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20015, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20016, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20017, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20018, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20019, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20020, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20021, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20022, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20023, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20024, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20025, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20026, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20027, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20028, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20029, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20030, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20031, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20032, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20033, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20034, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20035, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20036, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20037, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20038, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20039, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20040, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20041, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20042, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20043, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20044, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20045, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20046, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20048, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20049, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10001, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10002, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10003, 9021, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10005, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9022, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10006, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9023, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10007, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9024, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10008, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9025, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10009, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9026, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10010, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9027, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10011, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9028, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10012, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10013, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10014, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10015, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10016, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10017, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10018, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10019, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10020, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10021, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10022, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10023, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10024, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10025, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10026, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10027, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10028, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10029, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10030, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10031, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10032, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10033, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10034, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10035, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10036, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10037, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10038, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10039, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10040, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10041, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10042, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10043, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10044, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10045, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10046, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10047, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10048, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10049, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10050, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10051, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10052, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10053, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10054, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10055, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10056, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (2, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (3, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (4, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (5, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (6, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (7, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (8, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (9, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (10, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (11, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (12, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (13, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (14, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (15, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (16, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (17, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (18, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (19, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (20, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (21, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (22, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (23, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (24, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (25, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (26, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (27, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (28, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO post_likes (user_id, post_id, created_at) VALUES (29, 9029, DATE_SUB(NOW(), INTERVAL 29 DAY));

-- ---------- R4-00506: 双向喜欢（互相喜欢=匹配，打通 匹配→私信→付费 漏斗） ----------
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30022, 100000, 20000, DATE_SUB(NOW(), INTERVAL 52 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30023, 100000, 20001, DATE_SUB(NOW(), INTERVAL 53 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30024, 100000, 20002, DATE_SUB(NOW(), INTERVAL 54 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30025, 100000, 20004, DATE_SUB(NOW(), INTERVAL 55 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30026, 100000, 20006, DATE_SUB(NOW(), INTERVAL 56 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30027, 20003, 20013, DATE_SUB(NOW(), INTERVAL 57 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30028, 20013, 20003, DATE_SUB(NOW(), INTERVAL 58 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30029, 20004, 20014, DATE_SUB(NOW(), INTERVAL 59 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30030, 20014, 20004, DATE_SUB(NOW(), INTERVAL 60 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30031, 20005, 20015, DATE_SUB(NOW(), INTERVAL 61 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30032, 20015, 20005, DATE_SUB(NOW(), INTERVAL 62 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30033, 20006, 20016, DATE_SUB(NOW(), INTERVAL 63 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30034, 20016, 20006, DATE_SUB(NOW(), INTERVAL 64 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30035, 20007, 20017, DATE_SUB(NOW(), INTERVAL 65 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30036, 20017, 20007, DATE_SUB(NOW(), INTERVAL 66 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30037, 20008, 20018, DATE_SUB(NOW(), INTERVAL 67 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30038, 20018, 20008, DATE_SUB(NOW(), INTERVAL 68 DAY))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

-- ---------- R4-00512: 左滑记录（discover 漏斗「滑动」环节） ----------
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20000, 20001, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20000, 20008, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20000, 20015, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20001, 20002, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20001, 20009, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20001, 20016, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20002, 20003, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20002, 20010, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20002, 20017, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20003, 20004, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20003, 20011, DATE_SUB(NOW(), INTERVAL 14 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20003, 20018, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20004, 20005, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20004, 20012, DATE_SUB(NOW(), INTERVAL 18 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20004, 20019, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20005, 20006, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20005, 20013, DATE_SUB(NOW(), INTERVAL 22 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20005, 20020, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20006, 20007, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20006, 20014, DATE_SUB(NOW(), INTERVAL 26 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20006, 20021, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20007, 20008, DATE_SUB(NOW(), INTERVAL 29 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20007, 20015, DATE_SUB(NOW(), INTERVAL 30 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20007, 20022, DATE_SUB(NOW(), INTERVAL 31 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20008, 20009, DATE_SUB(NOW(), INTERVAL 33 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20008, 20016, DATE_SUB(NOW(), INTERVAL 34 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20008, 20023, DATE_SUB(NOW(), INTERVAL 35 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20009, 20010, DATE_SUB(NOW(), INTERVAL 37 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20009, 20017, DATE_SUB(NOW(), INTERVAL 38 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20009, 20024, DATE_SUB(NOW(), INTERVAL 39 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20010, 20011, DATE_SUB(NOW(), INTERVAL 41 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20010, 20018, DATE_SUB(NOW(), INTERVAL 42 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20010, 20025, DATE_SUB(NOW(), INTERVAL 43 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20011, 20012, DATE_SUB(NOW(), INTERVAL 45 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20011, 20019, DATE_SUB(NOW(), INTERVAL 46 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20011, 20026, DATE_SUB(NOW(), INTERVAL 47 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20012, 20013, DATE_SUB(NOW(), INTERVAL 49 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20012, 20020, DATE_SUB(NOW(), INTERVAL 50 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20012, 20027, DATE_SUB(NOW(), INTERVAL 51 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20013, 20014, DATE_SUB(NOW(), INTERVAL 53 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20013, 20021, DATE_SUB(NOW(), INTERVAL 54 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20013, 20028, DATE_SUB(NOW(), INTERVAL 55 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20014, 20015, DATE_SUB(NOW(), INTERVAL 57 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20014, 20022, DATE_SUB(NOW(), INTERVAL 58 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20014, 20029, DATE_SUB(NOW(), INTERVAL 59 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20015, 20016, DATE_SUB(NOW(), INTERVAL 61 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20015, 20023, DATE_SUB(NOW(), INTERVAL 62 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20015, 20030, DATE_SUB(NOW(), INTERVAL 63 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20016, 20017, DATE_SUB(NOW(), INTERVAL 65 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20016, 20024, DATE_SUB(NOW(), INTERVAL 66 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20016, 20031, DATE_SUB(NOW(), INTERVAL 67 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20017, 20018, DATE_SUB(NOW(), INTERVAL 69 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20017, 20025, DATE_SUB(NOW(), INTERVAL 70 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20017, 20032, DATE_SUB(NOW(), INTERVAL 71 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20018, 20019, DATE_SUB(NOW(), INTERVAL 73 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20018, 20026, DATE_SUB(NOW(), INTERVAL 74 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20018, 20033, DATE_SUB(NOW(), INTERVAL 75 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20019, 20020, DATE_SUB(NOW(), INTERVAL 77 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20019, 20027, DATE_SUB(NOW(), INTERVAL 78 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20019, 20034, DATE_SUB(NOW(), INTERVAL 79 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20020, 20021, DATE_SUB(NOW(), INTERVAL 81 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20020, 20028, DATE_SUB(NOW(), INTERVAL 82 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20020, 20035, DATE_SUB(NOW(), INTERVAL 83 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20021, 20022, DATE_SUB(NOW(), INTERVAL 85 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20021, 20029, DATE_SUB(NOW(), INTERVAL 86 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20021, 20036, DATE_SUB(NOW(), INTERVAL 87 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20022, 20023, DATE_SUB(NOW(), INTERVAL 89 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20022, 20030, DATE_SUB(NOW(), INTERVAL 0 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20022, 20037, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20023, 20024, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20023, 20031, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20023, 20038, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20024, 20025, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20024, 20032, DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20024, 20039, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20025, 20026, DATE_SUB(NOW(), INTERVAL 11 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20025, 20033, DATE_SUB(NOW(), INTERVAL 12 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20025, 20040, DATE_SUB(NOW(), INTERVAL 13 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20026, 20027, DATE_SUB(NOW(), INTERVAL 15 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20026, 20034, DATE_SUB(NOW(), INTERVAL 16 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20026, 20041, DATE_SUB(NOW(), INTERVAL 17 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20027, 20028, DATE_SUB(NOW(), INTERVAL 19 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20027, 20035, DATE_SUB(NOW(), INTERVAL 20 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20027, 20042, DATE_SUB(NOW(), INTERVAL 21 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20028, 20029, DATE_SUB(NOW(), INTERVAL 23 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20028, 20036, DATE_SUB(NOW(), INTERVAL 24 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20028, 20043, DATE_SUB(NOW(), INTERVAL 25 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20029, 20030, DATE_SUB(NOW(), INTERVAL 27 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20029, 20037, DATE_SUB(NOW(), INTERVAL 28 DAY));
INSERT IGNORE INTO pass_records (user_id, passed_user_id, created_at) VALUES (20029, 20044, DATE_SUB(NOW(), INTERVAL 29 DAY));

-- ---------- R4-00512: 私信种子 ----------
-- 私信种子（R4-00512：漏斗「私信」环节，演示用户间可聊）
INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview, last_message_at, pinned, created_at, updated_at)
SELECT 'conv-demo-20003-20013', 20003, 20013, '这周末去图书馆吗？', DATE_SUB(NOW(), INTERVAL 2 DAY), 0, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM private_conversations c WHERE (c.user_a_id = 20003 AND c.user_b_id = 20013) OR (c.user_a_id = 20013 AND c.user_b_id = 20003));

INSERT INTO private_messages (conversation_id, sender_id, content, message_kind, is_read, created_at, delivery_status)
SELECT c.id, CASE WHEN m.sender = 'a' THEN c.user_a_id ELSE c.user_b_id END, m.body, 'text', m.is_read,
       DATE_SUB(NOW(), INTERVAL m.minutes_ago MINUTE), 'sent'
FROM (
    SELECT 'a' sender, 3000 minutes_ago, '你好呀，看到你也喜欢图书馆' body, 1 is_read UNION ALL
    SELECT 'b', 2900, '哈哈对，你平时坐几楼？', 1 UNION ALL
    SELECT 'a', 2800, '三楼靠窗，安静', 1 UNION ALL
    SELECT 'b', 2700, '我也是！下次可以一起', 1 UNION ALL
    SELECT 'a', 60, '这周末去图书馆吗？', 0
) m
JOIN private_conversations c
  ON (c.user_a_id = 20003 AND c.user_b_id = 20013) OR (c.user_a_id = 20013 AND c.user_b_id = 20003)
WHERE NOT EXISTS (SELECT 1 FROM private_messages pm WHERE pm.conversation_id = c.id);

INSERT INTO private_conversations (conversation_uid, user_a_id, user_b_id, last_message_preview, last_message_at, pinned, created_at, updated_at)
SELECT 'conv-demo-20005-20015', 20005, 20015, '改天约羽毛球！', DATE_SUB(NOW(), INTERVAL 5 DAY), 0, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM private_conversations c WHERE (c.user_a_id = 20005 AND c.user_b_id = 20015) OR (c.user_a_id = 20015 AND c.user_b_id = 20005));

-- ---------- R4-00512: 钱包流水（付费环节演示） ----------
INSERT INTO user_wallet (user_id, balance_cents, frozen_cents, version, created_at, updated_at)
SELECT 20000, 3000, 0, 0, DATE_SUB(NOW(), INTERVAL 20 DAY), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM user_wallet w WHERE w.user_id = 20000);
INSERT INTO wallet_transaction_log (user_id, type, amount, balance_after, related_type, related_id, order_id, remark, created_at)
SELECT 20000, 'CREDIT', 3000, 3000, 'TASK', NULL, CONCAT('seed-demo-wallet-', 20000), '演示数据：初始充值', DATE_SUB(NOW(), INTERVAL 20 DAY)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM wallet_transaction_log t WHERE t.user_id = 20000 AND t.order_id = CONCAT('seed-demo-wallet-', 20000));
INSERT INTO user_wallet (user_id, balance_cents, frozen_cents, version, created_at, updated_at)
SELECT 20001, 3000, 0, 0, DATE_SUB(NOW(), INTERVAL 21 DAY), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM user_wallet w WHERE w.user_id = 20001);
INSERT INTO wallet_transaction_log (user_id, type, amount, balance_after, related_type, related_id, order_id, remark, created_at)
SELECT 20001, 'CREDIT', 3000, 3000, 'TASK', NULL, CONCAT('seed-demo-wallet-', 20001), '演示数据：初始充值', DATE_SUB(NOW(), INTERVAL 21 DAY)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM wallet_transaction_log t WHERE t.user_id = 20001 AND t.order_id = CONCAT('seed-demo-wallet-', 20001));
INSERT INTO user_wallet (user_id, balance_cents, frozen_cents, version, created_at, updated_at)
SELECT 20002, 3000, 0, 0, DATE_SUB(NOW(), INTERVAL 22 DAY), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM user_wallet w WHERE w.user_id = 20002);
INSERT INTO wallet_transaction_log (user_id, type, amount, balance_after, related_type, related_id, order_id, remark, created_at)
SELECT 20002, 'CREDIT', 3000, 3000, 'TASK', NULL, CONCAT('seed-demo-wallet-', 20002), '演示数据：初始充值', DATE_SUB(NOW(), INTERVAL 22 DAY)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM wallet_transaction_log t WHERE t.user_id = 20002 AND t.order_id = CONCAT('seed-demo-wallet-', 20002));
INSERT INTO user_wallet (user_id, balance_cents, frozen_cents, version, created_at, updated_at)
SELECT 20003, 3000, 0, 0, DATE_SUB(NOW(), INTERVAL 23 DAY), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM user_wallet w WHERE w.user_id = 20003);
INSERT INTO wallet_transaction_log (user_id, type, amount, balance_after, related_type, related_id, order_id, remark, created_at)
SELECT 20003, 'CREDIT', 3000, 3000, 'TASK', NULL, CONCAT('seed-demo-wallet-', 20003), '演示数据：初始充值', DATE_SUB(NOW(), INTERVAL 23 DAY)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM wallet_transaction_log t WHERE t.user_id = 20003 AND t.order_id = CONCAT('seed-demo-wallet-', 20003));
INSERT INTO user_wallet (user_id, balance_cents, frozen_cents, version, created_at, updated_at)
SELECT 20004, 3000, 0, 0, DATE_SUB(NOW(), INTERVAL 24 DAY), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM user_wallet w WHERE w.user_id = 20004);
INSERT INTO wallet_transaction_log (user_id, type, amount, balance_after, related_type, related_id, order_id, remark, created_at)
SELECT 20004, 'CREDIT', 3000, 3000, 'TASK', NULL, CONCAT('seed-demo-wallet-', 20004), '演示数据：初始充值', DATE_SUB(NOW(), INTERVAL 24 DAY)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM wallet_transaction_log t WHERE t.user_id = 20004 AND t.order_id = CONCAT('seed-demo-wallet-', 20004));

-- ---------- R4-00509: 资料完善/认证中间态 ----------
-- 修复（R4-00509）：按比例插入资料完善/认证中间态样本，避免全部 100%/verified
-- 覆盖 注册→资料完善→认证 漏斗的中间环节（0/50/80 分、pending/rejected/unverified）
UPDATE users SET profile_completion = 80 WHERE id = 20008;
UPDATE user_campus_profile SET verification_status = 'pending' WHERE user_id = 20008;
UPDATE users SET profile_completion = 50 WHERE id = 20010;
UPDATE user_campus_profile SET verification_status = 'pending' WHERE user_id = 20010;
UPDATE users SET profile_completion = 0 WHERE id = 20016;
UPDATE user_campus_profile SET verification_status = 'unverified' WHERE user_id = 20016;
UPDATE users SET profile_completion = 80 WHERE id = 20022;
UPDATE user_campus_profile SET verification_status = 'rejected' WHERE user_id = 20022;
UPDATE users SET profile_completion = 50 WHERE id = 20028;
UPDATE user_campus_profile SET verification_status = 'pending' WHERE user_id = 20028;
UPDATE users SET profile_completion = 0 WHERE id = 20034;
UPDATE user_campus_profile SET verification_status = 'unverified' WHERE user_id = 20034;
UPDATE users SET profile_completion = 80 WHERE id = 20040;
UPDATE user_campus_profile SET verification_status = 'pending' WHERE user_id = 20040;
UPDATE users SET profile_completion = 50 WHERE id = 20046;
UPDATE user_campus_profile SET verification_status = 'rejected' WHERE user_id = 20046;

-- ---------- R4-00513: 风控场景 ----------
-- ============================================================
-- 修复（R4-00513）：风控场景演示种子
-- ------------------------------------------------------------
-- 背景：主种子 openid 为可预测序列（demo-openid-20000..），无设备维度/
-- 多开/刷量/机器注册场景数据，管理端风控看板无数据可展示。
-- 本段模拟 3 个「批量注册特征」用户：openid 无规律、注册时间密集、
-- 资料完成度极低（0%），供风控规则演示（如按 openid 生成方式/注册频率
-- 识别机器注册）。
-- 设备维度字段（设备指纹/多开检测）依赖后端设备表，当前表结构未提供，
-- 管理端风控页评估为后续工作（见 audit-round3 R4-00513）。
-- ============================================================
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20200, 'demo-bot-openid-a7f3c9', '用户_4821', '18890000001', 'USER', 'active', 0, 0, 0, DATE_SUB(NOW(), INTERVAL 1 MINUTE), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20201, 'demo-bot-openid-9k2m4x', '用户_9037', '18890000002', 'USER', 'active', 0, 0, 0, DATE_SUB(NOW(), INTERVAL 2 MINUTE), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20202, 'demo-bot-openid-5p8q1w', '用户_1130', '18890000003', 'USER', 'active', 0, 0, 0, DATE_SUB(NOW(), INTERVAL 3 MINUTE), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

