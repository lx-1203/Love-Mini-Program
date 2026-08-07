-- ============================================================
-- 演示数据种子脚本（2026-08-07 全模块测试数据填充）
-- 用途：本地联调全功能演示——50+ 虚拟用户、帖子、评论、喜欢/访客
-- 执行：mysql -u<user> -p <db> < database/seed-demo-data.sql
-- 幂等：重复执行前先清理本脚本创建的行（按固定 user_id 识别）
-- ============================================================

-- 1. 清理旧种子（幂等）
DELETE FROM post_like WHERE post_id >= 9000;
DELETE FROM comments WHERE post_id >= 9000;
DELETE FROM posts WHERE id >= 9000;
DELETE FROM user_basic_profile WHERE user_id BETWEEN 20000 AND 20049;
DELETE FROM user_campus_profile WHERE user_id BETWEEN 20000 AND 20049;
DELETE FROM user_schedule_profile WHERE user_id BETWEEN 20000 AND 20049;
DELETE FROM users WHERE id BETWEEN 20000 AND 20049;

-- 2. 插入 50 个虚拟用户（users + 基本资料 + 校园资料）

-- 用户 20000 林夕
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20000, 'demo-openid-20000', '林夕', '188000000', 'USER', 'active', 100, 0, 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20000, '林夕', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 160, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20000, '北京', '北京大学', '计算机科学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20001 陈默
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20001, 'demo-openid-20001', '陈默', '188000001', 'USER', 'active', 100, 1, 6, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20001, '陈默', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 161, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20001, '上海', '复旦大学', '经济学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20002 顾言
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20002, 'demo-openid-20002', '顾言', '188000002', 'USER', 'active', 100, 2, 7, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20002, '顾言', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 162, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20002, '杭州', '浙江大学', '新闻传播', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20003 夏言
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20003, 'demo-openid-20003', '夏言', '188000003', 'USER', 'active', 100, 3, 8, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20003, '夏言', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 163, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20003, '广州', '南京大学', '心理学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20004 苏晴
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20004, 'demo-openid-20004', '苏晴', '188000004', 'USER', 'active', 100, 4, 9, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20004, '苏晴', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 164, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20004, '成都', '武汉大学', '法学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20005 周然
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20005, 'demo-openid-20005', '周然', '188000005', 'USER', 'active', 100, 5, 10, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20005, '周然', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 165, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20005, '北京', '中山大学', '数学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20006 叶知秋
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20006, 'demo-openid-20006', '叶知秋', '188000006', 'USER', 'active', 100, 6, 11, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20006, '叶知秋', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 166, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20006, '上海', '四川大学', '工业设计', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20007 沈星河
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20007, 'demo-openid-20007', '沈星河', '188000007', 'USER', 'active', 100, 7, 12, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20007, '沈星河', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 167, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20007, '杭州', '厦门大学', '汉语言文学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20008 江晚吟
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20008, 'demo-openid-20008', '江晚吟', '188000008', 'USER', 'active', 100, 8, 13, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20008, '江晚吟', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 168, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20008, '广州', '天津大学', '建筑学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20009 陆离
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20009, 'demo-openid-20009', '陆离', '188000009', 'USER', 'active', 100, 9, 14, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20009, '陆离', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 169, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20009, '成都', '中南大学', '医学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20010 温言
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20010, 'demo-openid-20010', '温言', '188000010', 'USER', 'active', 100, 10, 15, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20010, '温言', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 170, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20010, '北京', '大连理工大学', '自动化', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20011 白夜
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20011, 'demo-openid-20011', '白夜', '188000011', 'USER', 'active', 100, 11, 16, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20011, '白夜', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 171, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20011, '上海', '重庆大学', '外语学院', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20012 许清欢
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20012, 'demo-openid-20012', '许清欢', '188000012', 'USER', 'active', 100, 12, 17, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20012, '许清欢', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 172, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20012, '杭州', '西安交通大学', '物理学院', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20013 顾北辰
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20013, 'demo-openid-20013', '顾北辰', '188000013', 'USER', 'active', 100, 13, 18, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20013, '顾北辰', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 173, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20013, '广州', '中国人民大学', '生物工程', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20014 林晚
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20014, 'demo-openid-20014', '林晚', '188000014', 'USER', 'active', 100, 14, 19, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20014, '林晚', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 174, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20014, '成都', '北京师范大学', '市场营销', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20015 沈知微
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20015, 'demo-openid-20015', '沈知微', '188000015', 'USER', 'active', 100, 15, 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20015, '沈知微', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 160, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20015, '北京', '上海交通大学', '金融学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20016 苏黎
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20016, 'demo-openid-20016', '苏黎', '188000016', 'USER', 'active', 100, 16, 6, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20016, '苏黎', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 161, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20016, '上海', '同济大学', '计算机科学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20017 周子衿
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20017, 'demo-openid-20017', '周子衿', '188000017', 'USER', 'active', 100, 17, 7, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20017, '周子衿', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 162, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20017, '杭州', '华中科技大学', '经济学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20018 陆时寒
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20018, 'demo-openid-20018', '陆时寒', '188000018', 'USER', 'active', 100, 18, 8, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20018, '陆时寒', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 163, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20018, '广州', '山东大学', '新闻传播', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20019 叶青梧
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20019, 'demo-openid-20019', '叶青梧', '188000019', 'USER', 'active', 100, 19, 9, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20019, '叶青梧', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 164, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20019, '成都', '吉林大学', '心理学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20020 江疏影
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20020, 'demo-openid-20020', '江疏影', '188000020', 'USER', 'active', 100, 0, 10, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20020, '江疏影', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 165, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20020, '北京', '东南大学', '法学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20021 顾南烟
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20021, 'demo-openid-20021', '顾南烟', '188000021', 'USER', 'active', 100, 1, 11, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20021, '顾南烟', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 166, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20021, '上海', '南开大学', '数学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20022 秦朗
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20022, 'demo-openid-20022', '秦朗', '188000022', 'USER', 'active', 100, 2, 12, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20022, '秦朗', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 167, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20022, '杭州', '哈尔滨工业大学', '工业设计', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20023 许星河
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20023, 'demo-openid-20023', '许星河', '188000023', 'USER', 'active', 100, 3, 13, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20023, '许星河', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 168, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20023, '广州', '湖南大学', '汉语言文学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20024 温以宁
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20024, 'demo-openid-20024', '温以宁', '188000024', 'USER', 'active', 100, 4, 14, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20024, '温以宁', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 169, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20024, '成都', '北京大学', '建筑学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20025 宋远山
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20025, 'demo-openid-20025', '宋远山', '188000025', 'USER', 'active', 100, 5, 15, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20025, '宋远山', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 170, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20025, '北京', '复旦大学', '医学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20026 唐糖
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20026, 'demo-openid-20026', '唐糖', '188000026', 'USER', 'active', 100, 6, 16, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20026, '唐糖', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 171, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20026, '上海', '浙江大学', '自动化', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20027 韩清
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20027, 'demo-openid-20027', '韩清', '188000027', 'USER', 'active', 100, 7, 17, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20027, '韩清', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 172, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20027, '杭州', '南京大学', '外语学院', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20028 孟繁星
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20028, 'demo-openid-20028', '孟繁星', '188000028', 'USER', 'active', 100, 8, 18, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20028, '孟繁星', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 173, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20028, '广州', '武汉大学', '物理学院', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20029 洛小满
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20029, 'demo-openid-20029', '洛小满', '188000029', 'USER', 'active', 100, 9, 19, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20029, '洛小满', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 174, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20029, '成都', '中山大学', '生物工程', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20030 谢朝
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20030, 'demo-openid-20030', '谢朝', '188000030', 'USER', 'active', 100, 10, 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20030, '谢朝', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 160, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20030, '北京', '四川大学', '市场营销', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20031 舒然
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20031, 'demo-openid-20031', '舒然', '188000031', 'USER', 'active', 100, 11, 6, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20031, '舒然', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 161, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20031, '上海', '厦门大学', '金融学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20032 穆清和
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20032, 'demo-openid-20032', '穆清和', '188000032', 'USER', 'active', 100, 12, 7, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20032, '穆清和', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 162, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20032, '杭州', '天津大学', '计算机科学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20033 柳依依
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20033, 'demo-openid-20033', '柳依依', '188000033', 'USER', 'active', 100, 13, 8, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20033, '柳依依', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 163, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20033, '广州', '中南大学', '经济学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20034 盛云
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20034, 'demo-openid-20034', '盛云', '188000034', 'USER', 'active', 100, 14, 9, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20034, '盛云', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 164, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20034, '成都', '大连理工大学', '新闻传播', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20035 许墨
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20035, 'demo-openid-20035', '许墨', '188000035', 'USER', 'active', 100, 15, 10, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20035, '许墨', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 165, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20035, '北京', '重庆大学', '心理学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20036 顾栀
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20036, 'demo-openid-20036', '顾栀', '188000036', 'USER', 'active', 100, 16, 11, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20036, '顾栀', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 166, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20036, '上海', '西安交通大学', '法学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20037 沈括
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20037, 'demo-openid-20037', '沈括', '188000037', 'USER', 'active', 100, 17, 12, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20037, '沈括', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 167, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20037, '杭州', '中国人民大学', '数学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20038 黎洛
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20038, 'demo-openid-20038', '黎洛', '188000038', 'USER', 'active', 100, 18, 13, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20038, '黎洛', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 168, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20038, '广州', '北京师范大学', '工业设计', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20039 闻人暖
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20039, 'demo-openid-20039', '闻人暖', '188000039', 'USER', 'active', 100, 19, 14, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20039, '闻人暖', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 169, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20039, '成都', '上海交通大学', '汉语言文学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20040 赵子墨
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20040, 'demo-openid-20040', '赵子墨', '188000040', 'USER', 'active', 100, 0, 15, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20040, '赵子墨', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 170, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20040, '北京', '同济大学', '建筑学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20041 钱多多
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20041, 'demo-openid-20041', '钱多多', '188000041', 'USER', 'active', 100, 1, 16, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20041, '钱多多', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 171, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20041, '上海', '华中科技大学', '医学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20042 孙明澈
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20042, 'demo-openid-20042', '孙明澈', '188000042', 'USER', 'active', 100, 2, 17, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20042, '孙明澈', '会弹吉他，喜欢民谣。', '大3', 'TA', '["音乐", "阅读", "手工"]', 172, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20042, '杭州', '山东大学', '自动化', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20043 李未央
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20043, 'demo-openid-20043', '李未央', '188000043', 'USER', 'active', 100, 3, 18, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20043, '李未央', '心理学在读，擅长倾听。', '大4', 'TA', '["电影", "咖啡", "写作"]', 173, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20043, '广州', '吉林大学', '外语学院', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20044 周知远
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20044, 'demo-openid-20044', '周知远', '188000044', 'USER', 'active', 100, 4, 19, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20044, '周知远', '喜欢电影、咖啡与写作。', '大1', 'TA', '["天文", "摄影", "辩论"]', 174, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20044, '成都', '东南大学', '物理学院', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20045 吴桐
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20045, 'demo-openid-20045', '吴桐', '188000045', 'USER', 'active', 100, 5, 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20045, '吴桐', '天文爱好者，也爱辩论。', '大2', 'TA', '["艺术", "美食", "桌游"]', 160, 'bachelor', 'never', '北京', '北京', '北京', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20045, '北京', '南开大学', '生物工程', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20046 郑嘉言
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20046, 'demo-openid-20046', '郑嘉言', '188000046', 'USER', 'active', 100, 6, 6, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20046, '郑嘉言', '图书馆常客，咖啡重度依赖。', '大3', 'TA', '["游戏", "篮球", "旅行"]', 161, 'bachelor', 'never', '上海', '上海', '上海', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20046, '上海', '哈尔滨工业大学', '市场营销', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20047 王云深
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20047, 'demo-openid-20047', '王云深', '188000047', 'USER', 'active', 100, 7, 7, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20047, '王云深', '健身三年，作息规律。', '大4', 'TA', '["舞蹈", "音乐", "美食"]', 162, 'bachelor', 'never', '杭州', '杭州', '杭州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20047, '杭州', '湖南大学', '金融学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20048 冯念
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20048, 'demo-openid-20048', '冯念', '188000048', 'USER', 'active', 100, 8, 8, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20048, '冯念', '热爱生活，喜欢图书馆的下午和操场晚风。', '大1', 'TA', '["阅读", "旅行", "摄影"]', 163, 'bachelor', 'never', '广州', '广州', '广州', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20048, '广州', '北京大学', '计算机科学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 用户 20049 陈星野
INSERT INTO users (id, openid, nickname, phone, role, status, profile_completion, following_count, followers_count, created_at, updated_at)
VALUES (20049, 'demo-openid-20049', '陈星野', '188000049', 'USER', 'active', 100, 9, 9, NOW(), NOW())
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags, height, education_level, relationship_status, hometown_province, hometown_city, future_city, future_plan_tags, photo_gallery)
VALUES (20049, '陈星野', '周末爬山，平时泡实验室。', '大2', 'TA', '["运动", "美食", "电影"]', 164, 'bachelor', 'never', '成都', '成都', '成都', '["旅行","读书","事业"]', '[]')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES (20049, '成都', '复旦大学', '经济学', 'verified')
ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name);

-- 3. 插入 30 条帖子（id 9000-9029，作者轮换）

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9000, 20000, '周末去爬山，山顶的日落太治愈了，有一起的朋友吗？', 'sincere', '[]', '["爬山", "周末活动"]', 20, 3, 0, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 1 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9001, 20007, '刚看完《长安三万里》，李白的一生太浪漫了，推荐！', 'sincere', '[]', '["电影", "分享"]', 27, 6, 1, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 4 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9002, 20014, '想找个人一起学做咖啡，拉花入门中，进度缓慢但快乐～', 'sincere', '[]', '["咖啡", "兴趣"]', 34, 9, 2, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 7 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9003, 20021, '图书馆偶遇计划：周五下午三点，二楼靠窗位置，来搭话吧。', 'sincere', '[]', '["校园日常", "图书馆"]', 41, 12, 3, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 10 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9004, 20028, '第一次尝试露营，星空下的近郊太美了。', 'sincere', '[]', '["露营", "户外"]', 48, 15, 4, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 13 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9005, 20035, '养了一只英短，叫年糕，每天回家都治愈一天的疲惫。', 'sincere', '[]', '["宠物", "日常"]', 55, 18, 5, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 16 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9006, 20042, '健身第三个月，终于能看到一点线条了，坚持就是胜利！', 'sincere', '[]', '["健身", "打卡"]', 62, 21, 6, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 19 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9007, 20049, '毕业两年，从深圳到成都，慢下来的生活真好。', 'sincere', '[]', '["城市生活", "慢生活"]', 69, 24, 7, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 22 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9008, 20006, '周末羽毛球局缺人，有没有组队的朋友？', 'sincere', '[]', '["运动", "球局"]', 76, 27, 8, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 25 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9009, 20013, '雨天宅家，泡杯茶看看书，难得的悠闲时光。', 'sincere', '[]', '["雨天", "阅读"]', 83, 30, 9, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 28 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9010, 20020, '辞职后gap三个月，计划走遍中国西部，有人同行吗？', 'sincere', '[]', '["旅行", "gap"]', 90, 3, 0, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 31 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9011, 20027, '最近迷上了陶艺，做了个歪歪扭扭的杯子，丑得可爱。', 'sincere', '[]', '["手作", "陶艺"]', 97, 6, 1, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 34 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9012, 20034, '深夜放毒：亲手做的红烧肉，肥而不腻，绝了！', 'sincere', '[]', '["美食", "深夜食堂"]', 104, 9, 2, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 37 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9013, 20041, '想找语伴练英语口语，每周两次线上，有人吗？', 'sincere', '[]', '["学习", "英语"]', 111, 12, 3, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 40 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9014, 20048, '滑雪初体验！摔了十几次终于会刹车了，明年再战。', 'sincere', '[]', '["滑雪", "冬天"]', 118, 15, 4, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 43 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9015, 20005, '整理了今年拍的照片，才发现生活比想象中美好。', 'sincere', '[]', '["摄影", "生活记录"]', 125, 18, 5, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 46 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9016, 20012, '加班到深夜，楼下便利店的热豆浆是唯一的慰藉。', 'sincere', '[]', '["加班", "打工日常"]', 132, 21, 6, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 49 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9017, 20019, '春天来了，想找个人一起看樱花，花开好了。', 'sincere', '[]', '["春天", "樱花"]', 139, 24, 7, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 52 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9018, 20026, '学了三个月吉他，终于能弹完整一首《晴天》了！', 'sincere', '[]', '["吉他", "音乐"]', 146, 27, 8, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 55 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9019, 20033, '搬家整理出小时候的日记，笑到肚子疼，太可爱了。', 'sincere', '[]', '["童年", "回忆"]', 153, 30, 9, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 58 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9020, 20040, '跑步第100天打卡！从3公里到10公里，变化看得见。', 'sincere', '[]', '["跑步", "坚持"]', 160, 3, 0, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 61 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9021, 20047, '最近在研究咖啡手冲，喜欢的朋友可以交流下～', 'sincere', '[]', '["咖啡", "手冲"]', 167, 6, 1, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 64 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9022, 20004, '周末去看展，遇见一幅很喜欢的画，忍不住拍下来。', 'sincere', '[]', '["看展", "艺术"]', 24, 9, 2, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 67 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9023, 20011, '一个人吃了火锅，味道不错，但下次还是想两个人。', 'sincere', '[]', '["火锅", "美食"]', 31, 12, 3, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 70 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9024, 20018, '深度讨论：异地恋到底有没有未来？想听听大家的看法。', 'sincere', '[]', '["异地恋", "讨论"]', 38, 15, 4, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 73 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9025, 20025, 'MBTI测试分享：我是INFJ，有一样的吗？', 'sincere', '[]', '["MBTI", "性格"]', 45, 18, 5, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 76 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9026, 20032, '《三体》读了三遍，每次都有新感受，推荐给科幻迷。', 'sincere', '[]', '["三体", "科幻"]', 52, 21, 6, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 79 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9027, 20039, '分享我的旅行清单：想去冰岛看极光，攒钱中！', 'sincere', '[]', '["旅行", "极光"]', 59, 24, 7, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 82 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9028, 20046, '最近迷上烘焙，做了巴斯克蛋糕，同事们都说好吃。', 'sincere', '[]', '["烘焙", "美食"]', 66, 27, 8, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 85 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO posts (id, author_id, content, category, images, tags, likes_count, comments_count, share_count, audit_status, status, created_at, updated_at)
VALUES (9029, 20003, '有没有喜欢逛博物馆的朋友？周末组个局？', 'sincere', '[]', '["博物馆", "周末"]', 73, 30, 9, 'approved', 'active', DATE_SUB(NOW(), INTERVAL 88 HOUR), NOW())
ON DUPLICATE KEY UPDATE content = VALUES(content);

-- 4. 插入帖子评论（每帖 5-8 条）

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99001, 9000, 20000, '写得真好！', DATE_SUB(NOW(), INTERVAL 2 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99002, 9000, 20011, '同感同感', DATE_SUB(NOW(), INTERVAL 3 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99003, 9000, 20022, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 4 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99004, 9000, 20033, '求带！', DATE_SUB(NOW(), INTERVAL 5 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99005, 9000, 20044, '我也想去', DATE_SUB(NOW(), INTERVAL 6 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99006, 9001, 20003, '同感同感', DATE_SUB(NOW(), INTERVAL 5 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99007, 9001, 20014, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 6 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99008, 9001, 20025, '求带！', DATE_SUB(NOW(), INTERVAL 7 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99009, 9001, 20036, '我也想去', DATE_SUB(NOW(), INTERVAL 8 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99010, 9001, 20047, '有画面了', DATE_SUB(NOW(), INTERVAL 9 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99011, 9001, 20008, '支持支持', DATE_SUB(NOW(), INTERVAL 10 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99012, 9002, 20006, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 8 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99013, 9002, 20017, '求带！', DATE_SUB(NOW(), INTERVAL 9 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99014, 9002, 20028, '我也想去', DATE_SUB(NOW(), INTERVAL 10 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99015, 9002, 20039, '有画面了', DATE_SUB(NOW(), INTERVAL 11 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99016, 9002, 20000, '支持支持', DATE_SUB(NOW(), INTERVAL 12 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99017, 9002, 20011, '收藏了', DATE_SUB(NOW(), INTERVAL 13 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99018, 9002, 20022, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 14 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99019, 9003, 20009, '求带！', DATE_SUB(NOW(), INTERVAL 11 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99020, 9003, 20020, '我也想去', DATE_SUB(NOW(), INTERVAL 12 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99021, 9003, 20031, '有画面了', DATE_SUB(NOW(), INTERVAL 13 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99022, 9003, 20042, '支持支持', DATE_SUB(NOW(), INTERVAL 14 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99023, 9003, 20003, '收藏了', DATE_SUB(NOW(), INTERVAL 15 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99024, 9003, 20014, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 16 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99025, 9003, 20025, '下次一起呀', DATE_SUB(NOW(), INTERVAL 17 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99026, 9003, 20036, '写得真好！', DATE_SUB(NOW(), INTERVAL 18 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99027, 9004, 20012, '我也想去', DATE_SUB(NOW(), INTERVAL 14 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99028, 9004, 20023, '有画面了', DATE_SUB(NOW(), INTERVAL 15 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99029, 9004, 20034, '支持支持', DATE_SUB(NOW(), INTERVAL 16 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99030, 9004, 20045, '收藏了', DATE_SUB(NOW(), INTERVAL 17 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99031, 9004, 20006, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 18 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99032, 9005, 20015, '有画面了', DATE_SUB(NOW(), INTERVAL 17 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99033, 9005, 20026, '支持支持', DATE_SUB(NOW(), INTERVAL 18 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99034, 9005, 20037, '收藏了', DATE_SUB(NOW(), INTERVAL 19 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99035, 9005, 20048, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 20 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99036, 9005, 20009, '下次一起呀', DATE_SUB(NOW(), INTERVAL 21 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99037, 9005, 20020, '写得真好！', DATE_SUB(NOW(), INTERVAL 22 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99038, 9006, 20018, '支持支持', DATE_SUB(NOW(), INTERVAL 20 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99039, 9006, 20029, '收藏了', DATE_SUB(NOW(), INTERVAL 21 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99040, 9006, 20040, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 22 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99041, 9006, 20001, '下次一起呀', DATE_SUB(NOW(), INTERVAL 23 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99042, 9006, 20012, '写得真好！', DATE_SUB(NOW(), INTERVAL 24 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99043, 9006, 20023, '同感同感', DATE_SUB(NOW(), INTERVAL 25 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99044, 9006, 20034, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 26 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99045, 9007, 20021, '收藏了', DATE_SUB(NOW(), INTERVAL 23 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99046, 9007, 20032, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 24 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99047, 9007, 20043, '下次一起呀', DATE_SUB(NOW(), INTERVAL 25 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99048, 9007, 20004, '写得真好！', DATE_SUB(NOW(), INTERVAL 26 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99049, 9007, 20015, '同感同感', DATE_SUB(NOW(), INTERVAL 27 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99050, 9007, 20026, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 28 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99051, 9007, 20037, '求带！', DATE_SUB(NOW(), INTERVAL 29 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99052, 9007, 20048, '我也想去', DATE_SUB(NOW(), INTERVAL 30 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99053, 9008, 20024, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 26 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99054, 9008, 20035, '下次一起呀', DATE_SUB(NOW(), INTERVAL 27 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99055, 9008, 20046, '写得真好！', DATE_SUB(NOW(), INTERVAL 28 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99056, 9008, 20007, '同感同感', DATE_SUB(NOW(), INTERVAL 29 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99057, 9008, 20018, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 30 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99058, 9009, 20027, '下次一起呀', DATE_SUB(NOW(), INTERVAL 29 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99059, 9009, 20038, '写得真好！', DATE_SUB(NOW(), INTERVAL 30 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99060, 9009, 20049, '同感同感', DATE_SUB(NOW(), INTERVAL 31 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99061, 9009, 20010, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 32 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99062, 9009, 20021, '求带！', DATE_SUB(NOW(), INTERVAL 33 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99063, 9009, 20032, '我也想去', DATE_SUB(NOW(), INTERVAL 34 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99064, 9010, 20030, '写得真好！', DATE_SUB(NOW(), INTERVAL 32 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99065, 9010, 20041, '同感同感', DATE_SUB(NOW(), INTERVAL 33 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99066, 9010, 20002, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 34 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99067, 9010, 20013, '求带！', DATE_SUB(NOW(), INTERVAL 35 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99068, 9010, 20024, '我也想去', DATE_SUB(NOW(), INTERVAL 36 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99069, 9010, 20035, '有画面了', DATE_SUB(NOW(), INTERVAL 37 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99070, 9010, 20046, '支持支持', DATE_SUB(NOW(), INTERVAL 38 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99071, 9011, 20033, '同感同感', DATE_SUB(NOW(), INTERVAL 35 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99072, 9011, 20044, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 36 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99073, 9011, 20005, '求带！', DATE_SUB(NOW(), INTERVAL 37 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99074, 9011, 20016, '我也想去', DATE_SUB(NOW(), INTERVAL 38 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99075, 9011, 20027, '有画面了', DATE_SUB(NOW(), INTERVAL 39 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99076, 9011, 20038, '支持支持', DATE_SUB(NOW(), INTERVAL 40 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99077, 9011, 20049, '收藏了', DATE_SUB(NOW(), INTERVAL 41 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99078, 9011, 20010, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 42 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99079, 9012, 20036, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 38 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99080, 9012, 20047, '求带！', DATE_SUB(NOW(), INTERVAL 39 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99081, 9012, 20008, '我也想去', DATE_SUB(NOW(), INTERVAL 40 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99082, 9012, 20019, '有画面了', DATE_SUB(NOW(), INTERVAL 41 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99083, 9012, 20030, '支持支持', DATE_SUB(NOW(), INTERVAL 42 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99084, 9013, 20039, '求带！', DATE_SUB(NOW(), INTERVAL 41 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99085, 9013, 20000, '我也想去', DATE_SUB(NOW(), INTERVAL 42 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99086, 9013, 20011, '有画面了', DATE_SUB(NOW(), INTERVAL 43 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99087, 9013, 20022, '支持支持', DATE_SUB(NOW(), INTERVAL 44 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99088, 9013, 20033, '收藏了', DATE_SUB(NOW(), INTERVAL 45 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99089, 9013, 20044, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 46 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99090, 9014, 20042, '我也想去', DATE_SUB(NOW(), INTERVAL 44 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99091, 9014, 20003, '有画面了', DATE_SUB(NOW(), INTERVAL 45 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99092, 9014, 20014, '支持支持', DATE_SUB(NOW(), INTERVAL 46 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99093, 9014, 20025, '收藏了', DATE_SUB(NOW(), INTERVAL 47 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99094, 9014, 20036, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 48 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99095, 9014, 20047, '下次一起呀', DATE_SUB(NOW(), INTERVAL 49 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99096, 9014, 20008, '写得真好！', DATE_SUB(NOW(), INTERVAL 50 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99097, 9015, 20045, '有画面了', DATE_SUB(NOW(), INTERVAL 47 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99098, 9015, 20006, '支持支持', DATE_SUB(NOW(), INTERVAL 48 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99099, 9015, 20017, '收藏了', DATE_SUB(NOW(), INTERVAL 49 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99100, 9015, 20028, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 50 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99101, 9015, 20039, '下次一起呀', DATE_SUB(NOW(), INTERVAL 51 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99102, 9015, 20000, '写得真好！', DATE_SUB(NOW(), INTERVAL 52 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99103, 9015, 20011, '同感同感', DATE_SUB(NOW(), INTERVAL 53 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99104, 9015, 20022, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 54 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99105, 9016, 20048, '支持支持', DATE_SUB(NOW(), INTERVAL 50 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99106, 9016, 20009, '收藏了', DATE_SUB(NOW(), INTERVAL 51 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99107, 9016, 20020, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 52 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99108, 9016, 20031, '下次一起呀', DATE_SUB(NOW(), INTERVAL 53 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99109, 9016, 20042, '写得真好！', DATE_SUB(NOW(), INTERVAL 54 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99110, 9017, 20001, '收藏了', DATE_SUB(NOW(), INTERVAL 53 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99111, 9017, 20012, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 54 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99112, 9017, 20023, '下次一起呀', DATE_SUB(NOW(), INTERVAL 55 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99113, 9017, 20034, '写得真好！', DATE_SUB(NOW(), INTERVAL 56 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99114, 9017, 20045, '同感同感', DATE_SUB(NOW(), INTERVAL 57 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99115, 9017, 20006, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 58 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99116, 9018, 20004, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 56 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99117, 9018, 20015, '下次一起呀', DATE_SUB(NOW(), INTERVAL 57 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99118, 9018, 20026, '写得真好！', DATE_SUB(NOW(), INTERVAL 58 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99119, 9018, 20037, '同感同感', DATE_SUB(NOW(), INTERVAL 59 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99120, 9018, 20048, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 60 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99121, 9018, 20009, '求带！', DATE_SUB(NOW(), INTERVAL 61 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99122, 9018, 20020, '我也想去', DATE_SUB(NOW(), INTERVAL 62 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99123, 9019, 20007, '下次一起呀', DATE_SUB(NOW(), INTERVAL 59 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99124, 9019, 20018, '写得真好！', DATE_SUB(NOW(), INTERVAL 60 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99125, 9019, 20029, '同感同感', DATE_SUB(NOW(), INTERVAL 61 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99126, 9019, 20040, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 62 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99127, 9019, 20001, '求带！', DATE_SUB(NOW(), INTERVAL 63 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99128, 9019, 20012, '我也想去', DATE_SUB(NOW(), INTERVAL 64 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99129, 9019, 20023, '有画面了', DATE_SUB(NOW(), INTERVAL 65 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99130, 9019, 20034, '支持支持', DATE_SUB(NOW(), INTERVAL 66 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99131, 9020, 20010, '写得真好！', DATE_SUB(NOW(), INTERVAL 62 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99132, 9020, 20021, '同感同感', DATE_SUB(NOW(), INTERVAL 63 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99133, 9020, 20032, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 64 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99134, 9020, 20043, '求带！', DATE_SUB(NOW(), INTERVAL 65 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99135, 9020, 20004, '我也想去', DATE_SUB(NOW(), INTERVAL 66 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99136, 9021, 20013, '同感同感', DATE_SUB(NOW(), INTERVAL 65 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99137, 9021, 20024, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 66 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99138, 9021, 20035, '求带！', DATE_SUB(NOW(), INTERVAL 67 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99139, 9021, 20046, '我也想去', DATE_SUB(NOW(), INTERVAL 68 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99140, 9021, 20007, '有画面了', DATE_SUB(NOW(), INTERVAL 69 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99141, 9021, 20018, '支持支持', DATE_SUB(NOW(), INTERVAL 70 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99142, 9022, 20016, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 68 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99143, 9022, 20027, '求带！', DATE_SUB(NOW(), INTERVAL 69 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99144, 9022, 20038, '我也想去', DATE_SUB(NOW(), INTERVAL 70 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99145, 9022, 20049, '有画面了', DATE_SUB(NOW(), INTERVAL 71 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99146, 9022, 20010, '支持支持', DATE_SUB(NOW(), INTERVAL 72 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99147, 9022, 20021, '收藏了', DATE_SUB(NOW(), INTERVAL 73 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99148, 9022, 20032, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 74 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99149, 9023, 20019, '求带！', DATE_SUB(NOW(), INTERVAL 71 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99150, 9023, 20030, '我也想去', DATE_SUB(NOW(), INTERVAL 72 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99151, 9023, 20041, '有画面了', DATE_SUB(NOW(), INTERVAL 73 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99152, 9023, 20002, '支持支持', DATE_SUB(NOW(), INTERVAL 74 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99153, 9023, 20013, '收藏了', DATE_SUB(NOW(), INTERVAL 75 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99154, 9023, 20024, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 76 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99155, 9023, 20035, '下次一起呀', DATE_SUB(NOW(), INTERVAL 77 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99156, 9023, 20046, '写得真好！', DATE_SUB(NOW(), INTERVAL 78 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99157, 9024, 20022, '我也想去', DATE_SUB(NOW(), INTERVAL 74 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99158, 9024, 20033, '有画面了', DATE_SUB(NOW(), INTERVAL 75 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99159, 9024, 20044, '支持支持', DATE_SUB(NOW(), INTERVAL 76 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99160, 9024, 20005, '收藏了', DATE_SUB(NOW(), INTERVAL 77 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99161, 9024, 20016, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 78 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99162, 9025, 20025, '有画面了', DATE_SUB(NOW(), INTERVAL 77 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99163, 9025, 20036, '支持支持', DATE_SUB(NOW(), INTERVAL 78 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99164, 9025, 20047, '收藏了', DATE_SUB(NOW(), INTERVAL 79 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99165, 9025, 20008, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 80 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99166, 9025, 20019, '下次一起呀', DATE_SUB(NOW(), INTERVAL 81 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99167, 9025, 20030, '写得真好！', DATE_SUB(NOW(), INTERVAL 82 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99168, 9026, 20028, '支持支持', DATE_SUB(NOW(), INTERVAL 80 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99169, 9026, 20039, '收藏了', DATE_SUB(NOW(), INTERVAL 81 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99170, 9026, 20000, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 82 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99171, 9026, 20011, '下次一起呀', DATE_SUB(NOW(), INTERVAL 83 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99172, 9026, 20022, '写得真好！', DATE_SUB(NOW(), INTERVAL 84 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99173, 9026, 20033, '同感同感', DATE_SUB(NOW(), INTERVAL 85 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99174, 9026, 20044, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 86 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99175, 9027, 20031, '收藏了', DATE_SUB(NOW(), INTERVAL 83 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99176, 9027, 20042, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 84 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99177, 9027, 20003, '下次一起呀', DATE_SUB(NOW(), INTERVAL 85 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99178, 9027, 20014, '写得真好！', DATE_SUB(NOW(), INTERVAL 86 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99179, 9027, 20025, '同感同感', DATE_SUB(NOW(), INTERVAL 87 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99180, 9027, 20036, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 88 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99181, 9027, 20047, '求带！', DATE_SUB(NOW(), INTERVAL 89 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99182, 9027, 20008, '我也想去', DATE_SUB(NOW(), INTERVAL 90 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99183, 9028, 20034, '认真的吗哈哈', DATE_SUB(NOW(), INTERVAL 86 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99184, 9028, 20045, '下次一起呀', DATE_SUB(NOW(), INTERVAL 87 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99185, 9028, 20006, '写得真好！', DATE_SUB(NOW(), INTERVAL 88 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99186, 9028, 20017, '同感同感', DATE_SUB(NOW(), INTERVAL 89 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99187, 9028, 20028, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 90 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99188, 9029, 20037, '下次一起呀', DATE_SUB(NOW(), INTERVAL 89 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99189, 9029, 20048, '写得真好！', DATE_SUB(NOW(), INTERVAL 90 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99190, 9029, 20009, '同感同感', DATE_SUB(NOW(), INTERVAL 91 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99191, 9029, 20020, '哈哈哈哈太真实了', DATE_SUB(NOW(), INTERVAL 92 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99192, 9029, 20031, '求带！', DATE_SUB(NOW(), INTERVAL 93 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (99193, 9029, 20042, '我也想去', DATE_SUB(NOW(), INTERVAL 94 HOUR))
ON DUPLICATE KEY UPDATE content = VALUES(content);

-- 5. 插入喜欢记录（22 条，用户喜欢超级测试账号）

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30000, 20000, 100000, DATE_SUB(NOW(), INTERVAL 1 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30001, 20013, 100000, DATE_SUB(NOW(), INTERVAL 2 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30002, 20026, 100000, DATE_SUB(NOW(), INTERVAL 3 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30003, 20039, 100000, DATE_SUB(NOW(), INTERVAL 4 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30004, 20002, 100000, DATE_SUB(NOW(), INTERVAL 5 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30005, 20015, 100000, DATE_SUB(NOW(), INTERVAL 6 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30006, 20028, 100000, DATE_SUB(NOW(), INTERVAL 7 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30007, 20041, 100000, DATE_SUB(NOW(), INTERVAL 8 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30008, 20004, 100000, DATE_SUB(NOW(), INTERVAL 9 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30009, 20017, 100000, DATE_SUB(NOW(), INTERVAL 10 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30010, 20030, 100000, DATE_SUB(NOW(), INTERVAL 11 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30011, 20043, 100000, DATE_SUB(NOW(), INTERVAL 12 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30012, 20006, 100000, DATE_SUB(NOW(), INTERVAL 13 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30013, 20019, 100000, DATE_SUB(NOW(), INTERVAL 14 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30014, 20032, 100000, DATE_SUB(NOW(), INTERVAL 15 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30015, 20045, 100000, DATE_SUB(NOW(), INTERVAL 16 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30016, 20008, 100000, DATE_SUB(NOW(), INTERVAL 17 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30017, 20021, 100000, DATE_SUB(NOW(), INTERVAL 18 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30018, 20034, 100000, DATE_SUB(NOW(), INTERVAL 19 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30019, 20047, 100000, DATE_SUB(NOW(), INTERVAL 20 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30020, 20010, 100000, DATE_SUB(NOW(), INTERVAL 21 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);

INSERT INTO likes (id, user_id, target_user_id, created_at)
VALUES (30021, 20023, 100000, DATE_SUB(NOW(), INTERVAL 22 HOUR))
ON DUPLICATE KEY UPDATE target_user_id = VALUES(target_user_id);
