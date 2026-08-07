-- ============================================================
-- 迁移：50+ 虚拟用户基本资料 + 校园认证 + 动态种子
-- ============================================================
-- 说明：
--   为 V2026.08.07.0021 创建的 50+ 虚拟用户（id 10001-10056）补齐：
--   1. user_basic_profile  —— 昵称/简介/年级/代词/兴趣/身高/学历/婚况/籍贯/未来城市/照片墙/背景图
--   2. user_campus_profile —— 城市/学校/专业/认证状态（verified → 双重认证）
--   3. posts               —— 每个用户 2 条动态（文案+配图+点赞/评论数，审核通过）
--
--   数据契约（RecommendationRanker.toRecommendedPersonView）：
--   - bio/height/educationLevel/tags/photoGallery ← user_basic_profile
--   - campusName/verification ← user_campus_profile
--   - 动态预览 ← posts（作者最新帖子）
--
--   幂等性：固定 user_id + WHERE NOT EXISTS，可安全重跑。
-- ============================================================

-- ========== 1. 基本资料（user_basic_profile） ==========
INSERT INTO user_basic_profile
  (user_id, nickname, bio, grade_label, pronouns, interest_tags,
   height, education_level, relationship_status,
   hometown_province, hometown_city, future_city, future_plan_tags,
   photo_gallery, half_body_photo_url, profile_background_url)
SELECT u.id, u.nickname,
       CASE u.id MOD 4 WHEN 0 THEN '性格慢热但熟了话很多，想找个能一起吃饭逛街看电影的人。'
                       WHEN 1 THEN '相信真诚是最高级的浪漫，希望遇到双向奔赴的感情。'
                       WHEN 2 THEN '生活需要一点仪式感，认真生活的人运气不会差。'
                       ELSE '喜欢简单舒服的相处模式，三观合比什么都重要。' END,
       CASE u.id MOD 5 WHEN 0 THEN '大一' WHEN 1 THEN '大二' WHEN 2 THEN '大三' WHEN 3 THEN '大四' ELSE '研一' END,
       'TA', u.interest_tags,
       158 + (u.id MOD 25),
       CASE u.id MOD 3 WHEN 0 THEN 'bachelor' WHEN 1 THEN 'bachelor' ELSE 'master' END,
       'never',
       CASE u.campus_name WHEN '北京大学' THEN '北京' WHEN '清华大学' THEN '北京'
                          WHEN '复旦大学' THEN '上海' WHEN '浙江大学' THEN '浙江'
                          WHEN '南京大学' THEN '江苏' WHEN '武汉大学' THEN '湖北'
                          WHEN '东南大学' THEN '江苏' ELSE '北京' END,
       CASE u.campus_name WHEN '北京大学' THEN '北京' WHEN '清华大学' THEN '北京'
                          WHEN '复旦大学' THEN '上海' WHEN '浙江大学' THEN '杭州'
                          WHEN '南京大学' THEN '南京' WHEN '武汉大学' THEN '武汉'
                          WHEN '东南大学' THEN '南京' ELSE '北京' END,
       '北京',
       JSON_ARRAY('旅行','读书','健身','美食'),
       JSON_ARRAY(u.avatar_url,
                  CONCAT('https://images.pexels.com/photos/', 220453 + (u.id MOD 40), '/pexels-photo-', 220453 + (u.id MOD 40), '.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop')),
       u.avatar_url,
       'https://images.pexels.com/photos/257360/pexels-photo-257360.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
FROM users u
WHERE u.id BETWEEN 10001 AND 10056
  AND NOT EXISTS (SELECT 1 FROM user_basic_profile b WHERE b.user_id = u.id);

-- ========== 2. 校园认证（user_campus_profile，verified → 机器+人工双重认证） ==========
INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
SELECT u.id,
       CASE u.campus_name WHEN '北京大学' THEN '北京' WHEN '清华大学' THEN '北京'
                          WHEN '复旦大学' THEN '上海' WHEN '浙江大学' THEN '杭州'
                          WHEN '南京大学' THEN '南京' WHEN '武汉大学' THEN '武汉'
                          WHEN '东南大学' THEN '南京' ELSE '北京' END,
       u.campus_name,
       CASE u.id MOD 6 WHEN 0 THEN '计算机科学与技术' WHEN 1 THEN '汉语言文学'
                       WHEN 2 THEN '经济学' WHEN 3 THEN '设计学' WHEN 4 THEN '电子信息' ELSE '机械工程' END,
       'verified'
FROM users u
WHERE u.id BETWEEN 10001 AND 10056
  AND NOT EXISTS (SELECT 1 FROM user_campus_profile c WHERE c.user_id = u.id);

-- ========== 3. 动态（posts，每用户 2 条，审核通过 active） ==========
-- 3.1 第一条动态（带配图 + 点赞/评论数）
INSERT INTO posts (author_id, content, images, tags, likes_count, comments_count, share_count,
                   audit_status, category, status, is_pinned, created_at, updated_at)
SELECT u.id,
       CASE u.id MOD 6
           WHEN 0 THEN '周末去逛了校园的旧书店，淘到一本很喜欢的诗集，生活的小确幸就是这样简单。'
           WHEN 1 THEN '图书馆的下午，阳光透过窗户洒在书页上，突然觉得努力的日子也很浪漫。'
           WHEN 2 THEN '和社团的朋友一起去爬山看日出，山顶的风很舒服，心情也开阔了。'
           WHEN 3 THEN '最近在学做甜点，第一次做提拉米苏居然成功了，成就感满满。'
           WHEN 4 THEN '想找个人一起去听音乐会，最近有场不错的爵士演出。'
           ELSE '今天在操场跑步遇到了很美的晚霞，随手拍了下来，分享给你们。' END,
       JSON_ARRAY(CONCAT('https://images.pexels.com/photos/', 220453 + (u.id MOD 60), '/pexels-photo-', 220453 + (u.id MOD 60), '.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop')),
       JSON_ARRAY('生活记录'),
       5 + (u.id MOD 40), 1 + (u.id MOD 8), 0,
       'approved', 'interest', 'active', 0,
       DATE_SUB(NOW(), INTERVAL (u.id MOD 5) DAY), NOW()
FROM users u
WHERE u.id BETWEEN 10001 AND 10056
  AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.author_id = u.id AND p.content LIKE '周末去逛了校园的旧书店%');

-- 3.2 第二条动态（纯文案 + 点赞/评论数）
INSERT INTO posts (author_id, content, images, tags, likes_count, comments_count, share_count,
                   audit_status, category, status, is_pinned, created_at, updated_at)
SELECT u.id,
       CASE u.id MOD 5
           WHEN 0 THEN '一个人也要好好吃饭，今天给自己做了一顿丰盛的晚餐。'
           WHEN 1 THEN '最近在读《小王子》，有些话小时候不懂，长大了才明白。'
           WHEN 2 THEN '想认识新朋友，欢迎来聊聊天，什么都聊。'
           WHEN 3 THEN '这学期的课终于快结束了，准备去旅行放松一下。'
           ELSE '发现了一家超好吃的餐厅，改天想带人一起去。' END,
       JSON_ARRAY(),
       JSON_ARRAY('日常'),
       3 + (u.id MOD 25), 0 + (u.id MOD 5), 0,
       'approved', 'interest', 'active', 0,
       DATE_SUB(NOW(), INTERVAL (u.id MOD 3) DAY), NOW()
FROM users u
WHERE u.id BETWEEN 10001 AND 10056
  AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.author_id = u.id AND p.content LIKE '一个人也要好好吃饭%');

-- ========== 4. 超级账号（id=1）也补齐基础资料动态，保证其主页完整 ==========
INSERT INTO user_basic_profile
  (user_id, nickname, bio, grade_label, pronouns, interest_tags,
   height, education_level, relationship_status,
   hometown_province, hometown_city, future_city, future_plan_tags,
   photo_gallery, profile_background_url)
SELECT u.id, u.nickname, '全功能超级测试账号：可体验匹配/消息/圈子/我的全部功能，后台全管理权限。',
       '大三', 'TA', JSON_ARRAY('阅读','旅行','摄影','音乐','美食','桌游'),
       175, 'bachelor', 'never', '北京', '北京', '北京',
       JSON_ARRAY('旅行','读书','事业','健康'),
       JSON_ARRAY('https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop'),
       ''
FROM users u
WHERE u.id = 1
  AND NOT EXISTS (SELECT 1 FROM user_basic_profile b WHERE b.user_id = 1);

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
SELECT 1, '北京', '北京大学', '工业设计', 'verified'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM user_campus_profile c WHERE c.user_id = 1);

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM posts WHERE author_id BETWEEN 10001 AND 10056;
-- DELETE FROM user_campus_profile WHERE user_id BETWEEN 10001 AND 10056;
-- DELETE FROM user_basic_profile WHERE user_id BETWEEN 10001 AND 10056;
-- DELETE FROM users WHERE id BETWEEN 10001 AND 10056;
