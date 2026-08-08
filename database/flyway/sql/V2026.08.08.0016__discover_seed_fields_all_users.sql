-- ============================================================================
-- V2026.08.08.0016：寻觅页推荐池全量字段补齐（验收轮）
-- ----------------------------------------------------------------------------
-- 背景（验收走查发现）：
--   V0015 只覆盖 user_id IN (1,8,47) / 10001-10056，导致同校种子 5-10、
--   虚拟用户 20000-20060、10057/10059 的推荐卡片字段大量缺失
--   （age/halfBody/认证/性格/MBTI/期待画像/动态全空，卡片残缺）；
--   且 V0015 写入的 personality_tags 存在编码损坏（emoji 截断，
--   列 utf8mb4 但连接编码异常，7 个用户返回乱码）。
--
-- 本迁移（幂等可重跑）：
--   1) 确保 user_basic_profile 行存在（INSERT ... ON DUPLICATE KEY）
--   2) 全量补齐画像字段（ELT 确定性推导，与 V0015 同口径，避开 emoji）；
--      同时覆盖 V0015 损坏的 personality_tags 行（重新写入干净值）
--   3) 头像/半身照/照片墙（本地 static + pexels 图源）
--   4) 同校种子 5-10 校园认证 APPROVED → 卡片「双重认证」角标
--   5) 同校种子 5-10 发布帖子 → 卡片动态预览 recentPosts
--   6) 修复测试占位昵称「?????」（users 6/7 → 北岛/江晚）
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. user_basic_profile 行存在性（缺失则按 users 基础信息补行，幂等）
-- ----------------------------------------------------------------------------
INSERT INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns)
SELECT u.id,
       u.nickname,
       COALESCE(NULLIF(u.bio, ''), '这个人很神秘，等 TA 自己来介绍~'),
       COALESCE(NULLIF(u.grade_label, ''), '大三'),
       COALESCE(NULLIF(u.pronouns, ''), 'ta')
FROM users u
WHERE u.id IN (5, 6, 7, 8, 9, 10)
   OR (u.id BETWEEN 20000 AND 20060)
   OR u.id IN (10057, 10059)
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ----------------------------------------------------------------------------
-- 2. 画像字段全量补齐（确定性推导；同时修复 V0015 损坏的 personality_tags）
-- ----------------------------------------------------------------------------
UPDATE user_basic_profile SET
  occupation = ELT(1 + (user_id MOD 6), '产品经理', '互联网运营', '研究生在读', '程序员', '设计', '自媒体'),
  income_range = ELT(1 + (user_id MOD 4), '3k-8k', '8k-15k', '15k-30k', '30k+'),
  mbti = ELT(1 + (user_id MOD 8), 'INFJ', 'INTP', 'ENFP', 'ISFP', 'ENTJ', 'INFP', 'ESTJ', 'ISTP'),
  expected_partner = ELT(1 + (user_id MOD 4),
    '真诚、边界感清晰，聊天节奏合拍。',
    '喜欢深度对话，对生活有自己的节奏。',
    '温柔有耐心，愿意从一杯咖啡慢慢认识彼此。',
    '直接、不绕弯子，共同规划未来的生活。'),
  birth_year = 2026 - (20 + (user_id MOD 6)),
  personality_tags = JSON_ARRAY(
    ELT(1 + (user_id MOD 5), '阳光开朗', '慢热但真诚', '理性务实', '温柔细腻', '幽默健谈'),
    ELT(1 + ((user_id MOD 5) + 1) % 5, '行动力强', '共情力强', '安静专注', '靠谱', '爱探索')),
  interest_tags = JSON_ARRAY(
    ELT(1 + (user_id MOD 6), '摄影', '阅读', '旅行', '音乐', '美食', '运动'),
    ELT(1 + ((user_id MOD 6) + 2) % 6, '咖啡', '猫咪', '电影', '绘画', '健身', '户外')),
  relationship_status = 'never',
  education_level = ELT(1 + (user_id MOD 3), 'bachelor', 'bachelor', 'master'),
  height = 158 + (user_id MOD 20),
  hometown_province = ELT(1 + (user_id MOD 4), '北京', '江苏', '浙江', '四川'),
  hometown_city = ELT(1 + (user_id MOD 4), '北京', '南京', '杭州', '成都'),
  future_city = '北京'
WHERE user_id IN (5, 6, 7, 8, 9, 10)
   OR (user_id BETWEEN 20000 AND 20060)
   OR user_id IN (10057, 10059)
   -- 修复 V0015 编码损坏的 personality_tags（重新写入干净中文，幂等）
   OR user_id IN (10002, 10036, 10015, 10022, 10043, 10050, 8);

-- ----------------------------------------------------------------------------
-- 3. 头像（users 表）/ 半身照 / 照片墙（user_basic_profile）
--    本地 static 头像 + pexels 图源（与虚拟用户 10002 同口径，模拟器已验证可加载）
-- ----------------------------------------------------------------------------
UPDATE users SET
  avatar_url = CONCAT('/static/assets/images/avatars/avatar-', 1 + (id MOD 19), '.jpg')
WHERE id IN (5, 6, 7, 8, 9, 10)
   OR (id BETWEEN 20000 AND 20060)
   OR id IN (10057, 10059);

UPDATE user_basic_profile SET
  half_body_photo_url = ELT(1 + (user_id MOD 6),
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    'https://images.pexels.com/photos/313601/pexels-photo-313601.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    'https://images.pexels.com/photos/2422290/pexels-photo-2422290.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    'https://images.pexels.com/photos/3026288/pexels-photo-3026288.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'),
  photo_gallery = JSON_ARRAY(
    ELT(1 + (user_id MOD 6),
      'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      'https://images.pexels.com/photos/313601/pexels-photo-313601.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      'https://images.pexels.com/photos/2422290/pexels-photo-2422290.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      'https://images.pexels.com/photos/3026288/pexels-photo-3026288.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'),
    ELT(1 + ((user_id MOD 6) + 1) % 6,
      'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      'https://images.pexels.com/photos/313601/pexels-photo-313601.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      'https://images.pexels.com/photos/2422290/pexels-photo-2422290.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      'https://images.pexels.com/photos/3026288/pexels-photo-3026288.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'))
WHERE user_id IN (5, 6, 7, 8, 9, 10)
   OR (user_id BETWEEN 20000 AND 20060)
   OR user_id IN (10057, 10059);

-- ----------------------------------------------------------------------------
-- 4. 同校种子 5-10 校园认证 APPROVED → 推荐卡片「双重认证」角标
--    （RecommendationRanker：badge=school → machineVerified+humanVerified=true）
-- ----------------------------------------------------------------------------
INSERT INTO campus_certifications
    (user_id, school_name, major, student_id_card_url, status, reviewer_id,
     review_comment, submitted_at, reviewed_at)
SELECT u.id,
       '北京大学',
       ELT(1 + (u.id MOD 4), '计算机科学与技术', '经济学', '新闻传播学', '心理学'),
       CONCAT('https://campus-love.example/student-id/CL-', u.id),
       'APPROVED',
       1,
       '种子数据：校园认证审核通过',
       NOW() - INTERVAL 7 DAY,
       NOW() - INTERVAL 6 DAY
FROM users u
WHERE u.id IN (5, 6, 7, 8, 9, 10)
ON DUPLICATE KEY UPDATE
  status = 'APPROVED',
  school_name = '北京大学',
  reviewed_at = NOW();

-- ----------------------------------------------------------------------------
-- 5. 同校种子 5-10 发布帖子 → 卡片动态预览 recentPosts（贴吧式结构）
-- ----------------------------------------------------------------------------
INSERT INTO posts (author_id, content, images, tags, category, likes_count, comments_count, share_count, status, audit_status, created_at) VALUES
  (5, '喜欢图书馆的下午和操场晚风，有一起自习的朋友吗？', JSON_ARRAY('https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'), JSON_ARRAY('学习', '日常'), 'interest', 12, 3, 0, 'active', 'approved', NOW() - INTERVAL 1 DAY),
  (6, '北岛的黄昏最美，有人在球场等我一起散步吗？', JSON_ARRAY('https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'), JSON_ARRAY('日常', '运动'), 'interest', 8, 2, 0, 'active', 'approved', NOW() - INTERVAL 2 DAY),
  (7, '新开的那家咖啡馆拿铁不错，找个搭子试试。', JSON_ARRAY('https://images.pexels.com/photos/3026288/pexels-photo-3026288.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'), JSON_ARRAY('美食', '生活'), 'interest', 15, 5, 0, 'active', 'approved', NOW() - INTERVAL 3 DAY),
  (8, '周末的读书会有人去吗？带上自己最喜欢的一本书。', JSON_ARRAY('https://images.pexels.com/photos/313601/pexels-photo-313601.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'), JSON_ARRAY('阅读', '学习'), 'interest', 10, 4, 0, 'active', 'approved', NOW() - INTERVAL 4 DAY),
  (9, '摄影社招新，用镜头记录校园的四季。', JSON_ARRAY('https://images.pexels.com/photos/2422290/pexels-photo-2422290.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'), JSON_ARRAY('摄影', '社团'), 'interest', 20, 6, 0, 'active', 'approved', NOW() - INTERVAL 5 DAY),
  (10, '最近迷上羽毛球，求一个水平相当的小伙伴！', JSON_ARRAY('https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'), JSON_ARRAY('运动', '日常'), 'interest', 9, 3, 0, 'active', 'approved', NOW() - INTERVAL 6 DAY);

-- ----------------------------------------------------------------------------
-- 6. 修复测试占位昵称（users 6/7 原为「?????」占位符，模拟器显示为匿名）
-- ----------------------------------------------------------------------------
UPDATE users SET nickname = '北岛' WHERE id = 6;
UPDATE users SET nickname = '江晚' WHERE id = 7;
UPDATE user_basic_profile SET nickname = '北岛' WHERE user_id = 6;
UPDATE user_basic_profile SET nickname = '江晚' WHERE user_id = 7;
