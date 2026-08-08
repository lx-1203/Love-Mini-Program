-- ============================================================
-- 匹配链路完整化种子脚本（2026-08-08）
-- 用途：修复「寻觅页卡片区空白/字段缺失」——
--   1. 42 个空壳测试用户补齐完整基本资料（bio/标签/身高/学历/MBTI/期待画像等）
--   2. 全部用户头像本地化（pexels 外链 → /static 包内路径，mp 端可加载）
--   3. 空壳用户补校区资料（默认同校北京大学，保 campus_first 推荐可见）
--   4. 空壳用户补昵称（替换 SmokeV2 等英文测试名）
--   5. 无动态用户补 1 条帖子
--   6. 修复乱码帖子
-- 幂等：所有 INSERT 使用固定 user_id + ON DUPLICATE KEY UPDATE / 先删后插。
-- 执行：mysql --default-character-set=utf8mb4 -h127.0.0.1 -P3307 -uroot -p < seed-match-users-full.sql
-- ============================================================

-- ---------- 0. 目标用户列表（42 个空壳测试用户） ----------
-- id: 2,3,4,11..46,20102,20103,20106（早期测试号，无基本资料/校区/本地头像）

-- ---------- 1. 补昵称（固定映射，替换 SmokeV2 等英文测试名） ----------
UPDATE users SET nickname = '半夏' WHERE id = 2;
UPDATE users SET nickname = '南絮' WHERE id = 3;
UPDATE users SET nickname = '星野' WHERE id = 4;
UPDATE users SET nickname = '顾栀' WHERE id = 11;
UPDATE users SET nickname = '苏晚' WHERE id = 12;
UPDATE users SET nickname = '林溪' WHERE id = 13;
UPDATE users SET nickname = '楚辞' WHERE id = 14;
UPDATE users SET nickname = '江离' WHERE id = 15;
UPDATE users SET nickname = '温言' WHERE id = 16;
UPDATE users SET nickname = '洛枳' WHERE id = 17;
UPDATE users SET nickname = '许清欢' WHERE id = 18;
UPDATE users SET nickname = '沈月' WHERE id = 19;
UPDATE users SET nickname = '周予安' WHERE id = 20;
UPDATE users SET nickname = '陈屿' WHERE id = 21;
UPDATE users SET nickname = '陆时谦' WHERE id = 22;
UPDATE users SET nickname = '顾南衣' WHERE id = 23;
UPDATE users SET nickname = '谢之遥' WHERE id = 24;
UPDATE users SET nickname = '白芷' WHERE id = 25;
UPDATE users SET nickname = '程又青' WHERE id = 26;
UPDATE users SET nickname = '木子李' WHERE id = 27;
UPDATE users SET nickname = '未名' WHERE id = 28;
UPDATE users SET nickname = '朝雾' WHERE id = 29;
UPDATE users SET nickname = '旧梦' WHERE id = 30;
UPDATE users SET nickname = '晚风' WHERE id = 31;
UPDATE users SET nickname = '拾光' WHERE id = 32;
UPDATE users SET nickname = '云深' WHERE id = 33;
UPDATE users SET nickname = '初阳' WHERE id = 34;
UPDATE users SET nickname = '南栀' WHERE id = 35;
UPDATE users SET nickname = '秋屿' WHERE id = 36;
UPDATE users SET nickname = '冬青' WHERE id = 37;
UPDATE users SET nickname = '春和' WHERE id = 38;
UPDATE users SET nickname = '星河' WHERE id = 39;
UPDATE users SET nickname = '拾壹' WHERE id = 40;
UPDATE users SET nickname = '慕晴' WHERE id = 41;
UPDATE users SET nickname = '知微' WHERE id = 42;
UPDATE users SET nickname = '若水' WHERE id = 43;
UPDATE users SET nickname = '清欢' WHERE id = 44;
UPDATE users SET nickname = '遥山' WHERE id = 45;
UPDATE users SET nickname = '沐雪' WHERE id = 46;
UPDATE users SET nickname = '林晚秋' WHERE id = 20102;
UPDATE users SET nickname = '顾北' WHERE id = 20103;
UPDATE users SET nickname = '苏黎' WHERE id = 20106;

-- ---------- 2. 头像本地化（所有用户：pexels/空 → 本地包内素材） ----------
-- 62 张本地素材（avatar-1..avatar-62），按 user_id 稳定映射
UPDATE users
   SET avatar_url = CONCAT('/static/assets/images/avatars/avatar-', 1 + MOD(id, 62), '.jpg')
 WHERE avatar_url IS NULL OR avatar_url = '' OR avatar_url NOT LIKE '/static%';

-- 基本资料照片墙/半身照同样本地化（pexels → 本地；空 → 本地）
UPDATE user_basic_profile
   SET half_body_photo_url = CONCAT('/static/assets/images/avatars/avatar-', 1 + MOD(user_id, 62), '.jpg'),
       photo_gallery = JSON_ARRAY(
         CONCAT('/static/assets/images/avatars/avatar-', 1 + MOD(user_id, 62), '.jpg')
       )
 WHERE half_body_photo_url IS NULL
    OR half_body_photo_url = ''
    OR half_body_photo_url LIKE '%pexels%'
    OR photo_gallery LIKE '%pexels%';

-- ---------- 3. 空壳用户补齐校区资料（40 个北京大学 + 清华/人大 各1，幂等先删后插） ----------
DELETE FROM user_campus_profile WHERE user_id IN (2,3,4,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,20102,20103,20106);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status) VALUES
  (2,  '北京', '北京大学', '计算机科学', 'verified'),
  (3,  '北京', '北京大学', '经济学',     'verified'),
  (4,  '北京', '北京大学', '新闻传播',   'verified'),
  (11, '北京', '北京大学', '心理学',     'verified'),
  (12, '北京', '北京大学', '法学',       'verified'),
  (13, '北京', '北京大学', '数学',       'verified'),
  (14, '北京', '北京大学', '物理',       'verified'),
  (15, '北京', '北京大学', '化学',       'verified'),
  (16, '北京', '北京大学', '生物医学',   'verified'),
  (17, '北京', '北京大学', '外语',       'verified'),
  (18, '北京', '北京大学', '建筑学',     'verified'),
  (19, '北京', '北京大学', '历史',       'verified'),
  (20, '北京', '北京大学', '哲学',       'verified'),
  (21, '北京', '北京大学', '社会学',     'verified'),
  (22, '北京', '北京大学', '艺术管理',   'verified'),
  (23, '北京', '北京大学', '计算机科学', 'verified'),
  (24, '北京', '北京大学', '经济学',     'verified'),
  (25, '北京', '北京大学', '新闻传播',   'verified'),
  (26, '北京', '北京大学', '心理学',     'verified'),
  (27, '北京', '北京大学', '法学',       'verified'),
  (28, '北京', '北京大学', '数学',       'verified'),
  (29, '北京', '北京大学', '物理',       'verified'),
  (30, '北京', '北京大学', '化学',       'verified'),
  (31, '北京', '北京大学', '生物医学',   'verified'),
  (32, '北京', '北京大学', '外语',       'verified'),
  (33, '北京', '北京大学', '建筑学',     'verified'),
  (34, '北京', '北京大学', '历史',       'verified'),
  (35, '北京', '北京大学', '哲学',       'verified'),
  (36, '北京', '北京大学', '社会学',     'verified'),
  (37, '北京', '北京大学', '艺术管理',   'verified'),
  (38, '北京', '北京大学', '计算机科学', 'verified'),
  (39, '北京', '北京大学', '经济学',     'verified'),
  (40, '北京', '北京大学', '新闻传播',   'verified'),
  (41, '北京', '北京大学', '心理学',     'verified'),
  (42, '北京', '北京大学', '法学',       'verified'),
  (43, '北京', '北京大学', '数学',       'verified'),
  (44, '北京', '北京大学', '物理',       'verified'),
  (45, '北京', '北京大学', '化学',       'verified'),
  (46, '北京', '北京大学', '生物医学',   'verified'),
  -- 少量其他学校（体验账号切「不限」范围时可见，保证学校多样性）
  (20102, '北京', '清华大学',       '自动化', 'verified'),
  (20103, '北京', '中国人民大学',   '新闻传播', 'verified'),
  (20106, '北京', '北京师范大学',   '教育学', 'verified');

-- ---------- 4. 空壳用户补齐基本资料（候选池按 user_id 取模，稳定分配） ----------
-- bio 池（16 条）
INSERT INTO user_basic_profile
  (user_id, nickname, bio, grade_label, pronouns, interest_tags, height,
   education_level, relationship_status, hometown_province, hometown_city,
   future_city, future_plan_tags, photo_gallery, half_body_photo_url,
   occupation, income_range, personality_tags, mbti, expected_partner, birth_year)
SELECT
  u.id,
  u.nickname,
  ELT(1 + MOD(u.id, 16),
    '喜欢图书馆的下午和操场晚风',
    '周末爬山，平时泡实验室',
    '会弹吉他，喜欢民谣',
    '心理学在读，擅长倾听',
    '法学院但爱看天文，反差萌',
    '数学系卷王，也爱逛展',
    '摄影爱好者，追光也追风',
    '校辩论队队长，逻辑控',
    '爱做饭的吃货，治愈系',
    '夜跑十公里，也看十页书',
    '社团达人，周末活动永不缺席',
    '安静的二次元，熟了话很多',
    '打篮球的医学生，认真又松弛',
    '喜欢收集旧书和黑胶唱片',
    '养了一只橘猫，猫奴本奴',
    '正在学烘焙，烤糊过三次'),
  ELT(1 + MOD(u.id, 6), '大一', '大二', '大三', '大四', '研一', '研二'),
  ELT(1 + MOD(u.id, 4), '她', '她', '她', '她'),
  JSON_ARRAY(
    ELT(1 + MOD(u.id, 9),  '阅读', '旅行', '摄影', '运动', '美食', '电影', '音乐', '手工', '写作'),
    ELT(1 + MOD(u.id, 6),  '咖啡', '天文', '艺术', '桌游', '辩论', '健身'),
    ELT(1 + MOD(u.id, 5),  '动漫', '宠物', '烘焙', '徒步', '骑行')
  ),
  156 + MOD(u.id, 20),
  ELT(1 + MOD(u.id, 2), 'bachelor', 'master'),
  'never',
  ELT(1 + MOD(u.id, 6), '广东省', '北京市', '上海市', '浙江省', '江苏省', '四川省'),
  ELT(1 + MOD(u.id, 6), '广州市', '北京市', '上海市', '杭州市', '南京市', '成都市'),
  ELT(1 + MOD(u.id, 5), '北京市', '上海市', '深圳市', '杭州市', '广州市'),
  JSON_ARRAY(ELT(1 + MOD(u.id, 4), '旅行', '健身', '读书', '美食')),
  JSON_ARRAY(CONCAT('/static/assets/images/avatars/avatar-', 1 + MOD(u.id, 62), '.jpg')),
  CONCAT('/static/assets/images/avatars/avatar-', 1 + MOD(u.id, 62), '.jpg'),
  ELT(1 + MOD(u.id, 6), '产品经理', '互联网运营', '研究生在读', '程序员', '设计', '自媒体'),
  ELT(1 + MOD(u.id, 4), '3k-8k', '8k-15k', '15k-30k', '30k+'),
  JSON_ARRAY(
    ELT(1 + MOD(u.id, 8), '阳光开朗', '慢热但真诚', '理性务实', '温柔细腻', '幽默健谈', '安静专注', '行动力强', '共情力强'),
    ELT(1 + MOD(u.id, 5), '爱探索', '夜猫子', '细节控', '执行力强', '好奇心重')
  ),
  ELT(1 + MOD(u.id, 8), 'INFJ', 'INTP', 'ENFP', 'ISFP', 'ENTJ', 'INFP', 'ESTJ', 'ISTP'),
  ELT(1 + MOD(u.id, 4),
    '真诚、边界感清晰，聊天节奏合拍。',
    '喜欢深度对话，对生活有自己的节奏。',
    '温柔有耐心，愿意从一杯咖啡慢慢认识彼此。',
    '直接、不绕弯子，共同规划未来的生活。'),
  2007 - MOD(u.id, 9)
FROM users u
WHERE u.id IN (2,3,4,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,20102,20103,20106)
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  bio = VALUES(bio),
  grade_label = VALUES(grade_label),
  pronouns = VALUES(pronouns),
  interest_tags = VALUES(interest_tags),
  height = VALUES(height),
  education_level = VALUES(education_level),
  relationship_status = VALUES(relationship_status),
  hometown_province = VALUES(hometown_province),
  hometown_city = VALUES(hometown_city),
  future_city = VALUES(future_city),
  future_plan_tags = VALUES(future_plan_tags),
  photo_gallery = VALUES(photo_gallery),
  half_body_photo_url = VALUES(half_body_photo_url),
  occupation = VALUES(occupation),
  income_range = VALUES(income_range),
  personality_tags = VALUES(personality_tags),
  mbti = VALUES(mbti),
  expected_partner = VALUES(expected_partner),
  birth_year = VALUES(birth_year);

-- ---------- 5. 同步 profile_completion ----------
UPDATE users SET profile_completion = 100
 WHERE id IN (2,3,4,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,20102,20103,20106);

-- ---------- 6. 无动态用户补 1 条帖子（动态预览来源） ----------
-- 帖子内容池（10 条），幂等：仅插入「尚无帖子」的目标用户
INSERT INTO posts (author_id, title, content, images, tags, category, status, audit_status, created_at)
SELECT
  u.id,
  ELT(1 + MOD(u.id, 10),
    '周末去郊外看日落，有一起的吗？',
    '新学了一道菜，成功率高到离谱',
    '图书馆靠窗的位置永远是我的幸运座',
    '第一次跑完十公里，纪念一下',
    '最近在追一部冷门纪录片，安利',
    '有人交换书单吗？想看点什么',
    '春游照片整理好了，都给我夸',
    '今天拍到了超好看的云，分享',
    '实验室忙了一周，终于周末了',
    '养猫一个月的心得，猫砂盆是玄学'),
  ELT(1 + MOD(u.id, 10),
    '周末天气不错，打算去郊外看日落，有人想一起拼车吗？顺便带相机。',
    '新学了一道番茄牛腩，朋友吃完连汤都拌饭了，成就感爆棚。',
    '图书馆靠窗的位置永远是我的幸运座，今天又占到啦，效率翻倍。',
    '第一次跑完十公里，配速虽然一般但坚持下来了，纪念一下。',
    '最近在追一部冷门纪录片，讲深海生物的，画面绝了，安利给所有人。',
    '有人交换书单吗？最近想看推理小说，悬疑控请大胆砸过来。',
    '春游照片整理好了，樱花开得正好，先放一张预告，其他慢慢更。',
    '今天拍到了超好看的云，像奶油一样，忍不住拍了一下午。',
    '实验室忙了一周，终于到周末了，先去补个觉再约饭。',
    '养猫一个月的心得：猫砂盆是玄学，但猫是治愈解药。'),
  JSON_ARRAY(CONCAT('/static/assets/images/avatars/avatar-', 1 + MOD(u.id, 62), '.jpg')),
  JSON_ARRAY(ELT(1 + MOD(u.id, 4), '日常', '兴趣', '校园', '安利')),
  'interest', 'active', 'approved',
  DATE_SUB(NOW(), INTERVAL MOD(u.id, 7) DAY)
FROM users u
WHERE u.id IN (2,3,4,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,20102,20103,20106)
  AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.author_id = u.id);

-- ---------- 7. 修复乱码帖子（UTF-8 截断残留） ----------
UPDATE posts
   SET title = '今日份心动记录',
       content = '今天在食堂遇到一个很好看的人，没敢上去说话，记录一下。',
       updated_at = NOW()
 WHERE id = 2;
