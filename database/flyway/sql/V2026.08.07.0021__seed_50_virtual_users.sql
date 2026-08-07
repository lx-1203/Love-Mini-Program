-- ============================================================
-- 迁移：50+ 虚拟用户种子（匹配卡片池 + 完整资料 + 动态）
-- ============================================================
-- 背景：
--   用户要求匹配页有 50+ 虚拟用户卡片池，每张卡片覆盖全部字段：
--   露脸头像 / 唯一ID / 双重认证 / 年龄 / 学校 / 距离 / 活跃 /
--   身高 / 学历 / 职业 / 感情状态 / 自我描述 / 喜好标签 / MBTI /
--   期待画像 / 动态预览。所有头像来自 Pexels 免费可商用图床。
--
--   关键约束（后端契约）：
--   1. 推荐候选池 candidatePageSize（match_config 表）默认 50，
--      已按 id 升序返回前 N 条；必须扩到 200，新用户（id 10001+）
--      才能进入匹配候选池。
--   2. 卡片字段映射（RecommendationRanker.toRecommendedPersonView）：
--      - name/headline/avatarUrl ← users.nickname/bio/avatar_url
--      - campusName ← user_campus_profile.campus_name
--      - tags/bio/height/educationLevel ← user_basic_profile
--      - displayId ← "CL-{id}"（后端推导）
--      - 双重认证 ← campus verification_status='verified'
--      - 动态预览 ← posts（作者最新帖子）
--
--   幂等性：固定 id + WHERE NOT EXISTS，可安全重跑。
-- ============================================================

-- ========== 0. 扩大推荐候选池（否则新用户不进匹配页） ==========
UPDATE match_config
SET config_value = '200',
    description = '匹配候选用户分页查询数量上限（已扩至 200 容纳 50+ 虚拟用户池）',
    updated_at = NOW()
WHERE config_key = 'candidatePageSize';

-- ========== 1. 插入 50 个虚拟用户（users 表） ==========
-- 固定 id 10001-10050；openid 用 seed-user-{id} 保证唯一
INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10001, 'seed-user-10001', '周屿', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '喜欢图书馆的下午和操场晚风，工科男但爱写诗。', '13700001001', 'USER', 'active', 100,
       JSON_ARRAY('阅读','摄影','篮球','音乐'), 0, 3, '北京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10001);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10002, 'seed-user-10002', '林晚', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '设计系学姐，爱猫爱咖啡，周末逛展看展。', '13700001002', 'USER', 'active', 100,
       JSON_ARRAY('绘画','咖啡','旅行','猫咪'), 2, 8, '北京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10002);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10003, 'seed-user-10003', '顾一鸣', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '医学院研究生，认真生活，相信缘分。', '13700001003', 'USER', 'active', 100,
       JSON_ARRAY('健身','美食','电影','桌游'), 1, 5, '清华大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10003);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10004, 'seed-user-10004', '苏念', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '新闻系大三，声音好听，电台主播。', '13700001004', 'USER', 'active', 100,
       JSON_ARRAY('播音','阅读','旅行','烘焙'), 3, 12, '清华大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10004);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10005, 'seed-user-10005', '陈叙', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '计算机系学长，安静但有趣，愿意倾听。', '13700001005', 'USER', 'active', 100,
       JSON_ARRAY('编程','游戏','跑步','科幻'), 0, 2, '复旦大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10005);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10006, 'seed-user-10006', '许知夏', 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '汉语言文学，文艺少女，喜欢民谣和旧书店。', '13700001006', 'USER', 'active', 100,
       JSON_ARRAY('民谣','写作','手账','探店'), 4, 15, '复旦大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10006);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10007, 'seed-user-10007', '沈亦舟', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '金融专业，爱运动爱生活，阳光开朗。', '13700001007', 'USER', 'active', 100,
       JSON_ARRAY('篮球','健身','旅行','投资'), 2, 6, '南京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10007);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10008, 'seed-user-10008', '叶清欢', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '药学大四，温柔耐心，喜欢小动物。', '13700001008', 'USER', 'active', 100,
       JSON_ARRAY('撸猫','园艺','烘焙','养生'), 5, 18, '南京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10008);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10009, 'seed-user-10009', '江叙白', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '物理系，理性与浪漫并存，会弹吉他。', '13700001009', 'USER', 'active', 100,
       JSON_ARRAY('吉他','天文','跑步','纪录片'), 1, 4, '浙江大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10009);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10010, 'seed-user-10010', '白鹿', 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '舞蹈系，灵动有生命力，爱爵士和街舞。', '13700001010', 'USER', 'active', 100,
       JSON_ARRAY('舞蹈','音乐','穿搭','旅行'), 6, 22, '浙江大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10010);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10011, 'seed-user-10011', '韩朔', 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '建筑学，爱摄影爱城市，喜欢天台看日落。', '13700001011', 'USER', 'active', 100,
       JSON_ARRAY('摄影','建筑','骑行','咖啡'), 0, 3, '武汉大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10011);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10012, 'seed-user-10012', '温如言', 'https://images.pexels.com/photos/846741/pexels-photo-846741.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '法学院，逻辑清晰，温柔坚定，爱推理小说。', '13700001012', 'USER', 'active', 100,
       JSON_ARRAY('推理','辩论','瑜伽','茶道'), 3, 10, '武汉大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10012);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10013, 'seed-user-10013', '陆之行', 'https://images.pexels.com/photos/718978/pexels-photo-718978.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '历史系，博学低调，喜欢逛博物馆。', '13700001013', 'USER', 'active', 100,
       JSON_ARRAY('历史','博物馆','围棋','古琴'), 1, 2, '东南大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10013);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10014, 'seed-user-10014', '姜糖', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '动画专业，脑洞大开，喜欢治愈系。', '13700001014', 'USER', 'active', 100,
       JSON_ARRAY('动漫','画画','游戏','盲盒'), 7, 25, '东南大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10014);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10015, 'seed-user-10015', '宋延年', 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '体育教育，阳光运动型，热爱篮球足球。', '13700001015', 'USER', 'active', 100,
       JSON_ARRAY('篮球','足球','健身','露营'), 2, 9, '北京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10015);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10016, 'seed-user-10016', '谢知意', 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '心理学，善解人意，温暖治愈系女生。', '13700001016', 'USER', 'active', 100,
       JSON_ARRAY('心理学','读书','冥想','手作'), 4, 14, '清华大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10016);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10017, 'seed-user-10017', '傅行云', 'https://images.pexels.com/photos/2712752/pexels-photo-2712752.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '航空航天，心怀星辰大海，也爱人间烟火。', '13700001017', 'USER', 'active', 100,
       JSON_ARRAY('天文','航模','跑步','科幻'), 0, 1, '复旦大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10017);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10018, 'seed-user-10018', '纪晨曦', 'https://images.pexels.com/photos/1987301/pexels-photo-1987301.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '学前教育，亲和力满分，喜欢小朋友和手工。', '13700001018', 'USER', 'active', 100,
       JSON_ARRAY('手工','烘焙','钢琴','园艺'), 5, 16, '南京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10018);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10019, 'seed-user-10019', '程砚秋', 'https://images.pexels.com/photos/1806920/pexels-photo-1806920.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '音乐系，钢琴八级，细腻温柔。', '13700001019', 'USER', 'active', 100,
       JSON_ARRAY('钢琴','古典乐','电影','阅读'), 1, 4, '浙江大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10019);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10020, 'seed-user-10020', '唐绾绾', 'https://images.pexels.com/photos/1382731/pexels-photo-1382731.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '汉服社社长，古风少女，会古筝。', '13700001020', 'USER', 'active', 100,
       JSON_ARRAY('汉服','古筝','国风','旅行'), 8, 28, '武汉大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10020);

-- ========== 2. 第二个 10 个用户（10021-10030） ==========
INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10021, 'seed-user-10021', '顾北辰', 'https://images.pexels.com/photos/257360/pexels-photo-257360.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '土木工程，靠谱踏实，爱做饭的理工男。', '13700001021', 'USER', 'active', 100,
       JSON_ARRAY('做饭','健身','钓鱼','徒步'), 0, 3, '东南大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10021);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10022, 'seed-user-10022', '陶然', 'https://images.pexels.com/photos/313601/pexels-photo-313601.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '社会学，好奇人间百态，喜欢街拍记录。', '13700001022', 'USER', 'active', 100,
       JSON_ARRAY('街拍','写作','播客','咖啡'), 3, 11, '北京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10022);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10023, 'seed-user-10023', '裴语嫣', 'https://images.pexels.com/photos/936119/pexels-photo-936119.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '法语专业，浪漫优雅，喜欢巴黎和文学。', '13700001023', 'USER', 'active', 100,
       JSON_ARRAY('法语','文学','烘焙','香水'), 6, 20, '复旦大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10023);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10024, 'seed-user-10024', '聂云帆', 'https://images.pexels.com/photos/548753/pexels-photo-548753.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '电子信息，动手能力强的极客，爱折腾。', '13700001024', 'USER', 'active', 100,
       JSON_ARRAY('DIY','无人机','编程','摄影'), 1, 2, '清华大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10024);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10025, 'seed-user-10025', '阮绵绵', 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '护理专业，耐心细致，爱心满满。', '13700001025', 'USER', 'active', 100,
       JSON_ARRAY('瑜伽','养生','电影','拼图'), 5, 17, '南京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10025);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10026, 'seed-user-10026', '霍去病', 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '军事理论爱好者，热血但沉稳。', '13700001026', 'USER', 'active', 100,
       JSON_ARRAY('军史','健身','登山','策略游戏'), 0, 1, '浙江大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10026);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10027, 'seed-user-10027', '夏晚晴', 'https://images.pexels.com/photos/2787341/pexels-photo-2787341.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '英语教育，声音甜，爱绘本和小朋友。', '13700001027', 'USER', 'active', 100,
       JSON_ARRAY('英语','绘本','手工','烘焙'), 7, 23, '武汉大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10027);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10028, 'seed-user-10028', '孟浩然', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '生态学，亲近自然，喜欢户外和环保。', '13700001028', 'USER', 'active', 100,
       JSON_ARRAY('露营','徒步','摄影','骑行'), 2, 5, '东南大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10028);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10029, 'seed-user-10029', '花想容', 'https://images.pexels.com/photos/2422290/pexels-photo-2422290.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '美术系，才女，国画和油画都会。', '13700001029', 'USER', 'active', 100,
       JSON_ARRAY('国画','油画','书法','茶艺'), 9, 30, '北京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10029);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10030, 'seed-user-10030', '萧何', 'https://images.pexels.com/photos/2764978/pexels-photo-2764978.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '管理科学，稳重靠谱，爱下棋喝茶。', '13700001030', 'USER', 'active', 100,
       JSON_ARRAY('围棋','茶道','财经','书法'), 1, 4, '清华大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10030);

-- ========== 3. 第三批 10 个用户（10031-10040） ==========
INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10031, 'seed-user-10031', '沐春风', 'https://images.pexels.com/photos/2422294/pexels-photo-2422294.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '新闻传播，笑点低，元气满满。', '13700001031', 'USER', 'active', 100,
       JSON_ARRAY('脱口秀','美食','旅行','社交'), 4, 13, '复旦大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10031);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10032, 'seed-user-10032', '洛璃', 'https://images.pexels.com/photos/2174656/pexels-photo-2174656.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '珠宝设计，审美在线，喜欢一切美好的事物。', '13700001032', 'USER', 'active', 100,
       JSON_ARRAY('珠宝','穿搭','插花','看展'), 6, 19, '南京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10032);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10033, 'seed-user-10033', '司空摘星', 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '天文学，仰望星空的人，也脚踏实地。', '13700001033', 'USER', 'active', 100,
       JSON_ARRAY('天文','望远镜','露营','科幻'), 1, 2, '浙江大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10033);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10034, 'seed-user-10034', '顾南枝', 'https://images.pexels.com/photos/3184611/pexels-photo-3184611.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '园林设计，温柔恬静，爱花花草草。', '13700001034', 'USER', 'active', 100,
       JSON_ARRAY('园艺','水彩','烘焙','阅读'), 5, 15, '武汉大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10034);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10035, 'seed-user-10035', '东方既白', 'https://images.pexels.com/photos/3031397/pexels-photo-3031397.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '人工智能，理性务实，偶尔文艺。', '13700001035', 'USER', 'active', 100,
       JSON_ARRAY('AI','编程','围棋','爵士'), 0, 3, '东南大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10035);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10036, 'seed-user-10036', '温酒', 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '酒店管理，懂生活，会调酒会做菜。', '13700001036', 'USER', 'active', 100,
       JSON_ARRAY('调酒','烹饪','品酒','旅行'), 3, 9, '北京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10036);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10037, 'seed-user-10037', '闻人雅', 'https://images.pexels.com/photos/3184618/pexels-photo-3184618.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '音乐教育，温柔知性，会大提琴。', '13700001037', 'USER', 'active', 100,
       JSON_ARRAY('大提琴','古典乐','读书','瑜伽'), 7, 24, '清华大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10037);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10038, 'seed-user-10038', '徐凤年', 'https://images.pexels.com/photos/3184293/pexels-photo-3184293.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '汉语言文学，潇洒不羁，写得一手好字。', '13700001038', 'USER', 'active', 100,
       JSON_ARRAY('书法','武侠','茶道','历史'), 1, 5, '复旦大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10038);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10039, 'seed-user-10039', '江疏影', 'https://images.pexels.com/photos/3184395/pexels-photo-3184395.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '会计学，细心严谨，记账小能手。', '13700001039', 'USER', 'active', 100,
       JSON_ARRAY('理财','收纳','烘焙','手工'), 4, 12, '南京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10039);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10040, 'seed-user-10040', '谢怜', 'https://images.pexels.com/photos/3065588/pexels-photo-3065588.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '哲学系，思辨深邃，温柔而有力量。', '13700001040', 'USER', 'active', 100,
       JSON_ARRAY('哲学','辩论','写作','冥想'), 2, 6, '浙江大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10040);

-- ========== 4. 第四批 10 个用户（10041-10050） ==========
INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10041, 'seed-user-10041', '夜北', 'https://images.pexels.com/photos/3046611/pexels-photo-3046611.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '电竞专业，技术流，但细心体贴。', '13700001041', 'USER', 'active', 100,
       JSON_ARRAY('电竞','游戏','健身','火锅'), 0, 2, '武汉大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10041);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10042, 'seed-user-10042', '云想衣裳', 'https://images.pexels.com/photos/3046624/pexels-photo-3046624.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '服装设计，时尚敏锐，会缝纫。', '13700001042', 'USER', 'active', 100,
       JSON_ARRAY('时尚','穿搭','缝纫','看展'), 8, 26, '东南大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10042);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10043, 'seed-user-10043', '柳下惠', 'https://images.pexels.com/photos/3026288/pexels-photo-3026288.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '法学，正直有原则，但反差萌。', '13700001043', 'USER', 'active', 100,
       JSON_ARRAY('辩论','篮球','咖啡','电影'), 1, 4, '北京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10043);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10044, 'seed-user-10044', '傅晚晴', 'https://images.pexels.com/photos/3026284/pexels-photo-3026284.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '播音主持，声音治愈，台风大气。', '13700001044', 'USER', 'active', 100,
       JSON_ARRAY('播音','朗诵','主持','瑜伽'), 6, 21, '清华大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10044);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10045, 'seed-user-10045', '陌上花', 'https://images.pexels.com/photos/2897187/pexels-photo-2897187.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '广告学，创意十足，脑洞大开。', '13700001045', 'USER', 'active', 100,
       JSON_ARRAY('创意','插画','旅行','探店'), 5, 14, '复旦大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10045);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10046, 'seed-user-10046', '西门吹雪', 'https://images.pexels.com/photos/2903953/pexels-photo-2903953.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '数学系，专注高冷，但热爱生活。', '13700001046', 'USER', 'active', 100,
       JSON_ARRAY('数学','钢琴','围棋','跑步'), 0, 1, '南京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10046);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10047, 'seed-user-10047', '花弄影', 'https://images.pexels.com/photos/2913121/pexels-photo-2913121.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '新闻系，聪慧灵动，能言善辩。', '13700001047', 'USER', 'active', 100,
       JSON_ARRAY('辩论','写作','街舞','咖啡'), 7, 22, '浙江大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10047);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10048, 'seed-user-10048', '秦朗', 'https://images.pexels.com/photos/3467755/pexels-photo-3467755.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '交通工程，踏实肯干，爱骑行。', '13700001048', 'USER', 'active', 100,
       JSON_ARRAY('骑行','跑步','摄影','烹饪'), 2, 3, '武汉大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10048);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10049, 'seed-user-10049', '莫忘初', 'https://images.pexels.com/photos/3467920/pexels-photo-3467920.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '图书情报，安静内敛，喜欢泡图书馆。', '13700001049', 'USER', 'active', 100,
       JSON_ARRAY('阅读','写作','咖啡','手账'), 4, 10, '东南大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10049);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10050, 'seed-user-10050', '顾星辰', 'https://images.pexels.com/photos/3493594/pexels-photo-3493594.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '光学工程，严谨细腻，会天文摄影。', '13700001050', 'USER', 'active', 100,
       JSON_ARRAY('天文摄影','跑步','科幻','吉他'), 1, 4, '北京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10050);

-- 补充：第 51-55 位（确保 50+）
INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10051, 'seed-user-10051', '林小满', 'https://images.pexels.com/photos/3506136/pexels-photo-3506136.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '农业科学，元气少女，爱花花草草。', '13700001051', 'USER', 'active', 100,
       JSON_ARRAY('园艺','烘焙','骑行','画画'), 5, 16, '清华大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10051);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10052, 'seed-user-10052', '迟子墨', 'https://images.pexels.com/photos/3512386/pexels-photo-3512386.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '信息安全，低调技术宅，安全感满分。', '13700001052', 'USER', 'active', 100,
       JSON_ARRAY('编程','安全','健身','游戏'), 0, 2, '复旦大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10052);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10053, 'seed-user-10053', '安知鱼', 'https://images.pexels.com/photos/3519030/pexels-photo-3519030.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '水产养殖，阳光温暖，爱钓鱼也爱吃鱼。', '13700001053', 'USER', 'active', 100,
       JSON_ARRAY('钓鱼','做饭','露营','游泳'), 3, 8, '南京大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10053);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10054, 'seed-user-10054', '白鹭洲', 'https://images.pexels.com/photos/3522001/pexels-photo-3522001.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '环境设计，艺术气息，爱摄影爱自然。', '13700001054', 'USER', 'active', 100,
       JSON_ARRAY('摄影','水彩','徒步','看展'), 6, 18, '浙江大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10054);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10055, 'seed-user-10055', '许平生', 'https://images.pexels.com/photos/3532409/pexels-photo-3532409.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '临床医学，温柔担当，认真负责。', '13700001055', 'USER', 'active', 100,
       JSON_ARRAY('健身','读书','音乐','烹饪'), 2, 7, '武汉大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10055);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10056, 'seed-user-10056', '禾苗', 'https://images.pexels.com/photos/3534186/pexels-photo-3534186.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '小学教育，亲和治愈，爱笑爱闹。', '13700001056', 'USER', 'active', 100,
       JSON_ARRAY('手工','钢琴','绘本','瑜伽'), 7, 20, '东南大学', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10056);

-- ============================================================
-- 说明：user_basic_profile / user_campus_profile / posts
--       在 V2026.08.07.0022 迁移中批量补齐（单文件过大会超限）。
-- ============================================================
