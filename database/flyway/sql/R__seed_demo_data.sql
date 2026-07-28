-- ============================================================
-- 可重复迁移：演示种子数据
-- ============================================================
-- 说明：
-- - 本脚本为 Flyway 可重复迁移（R__），每次内容变化时重新执行。
-- - 使用 INSERT IGNORE + 条件判断保证幂等性（已存在数据不重复插入）。
-- - 每当 user_follows 或 post_likes 数据变化后，需要通过
--   UPDATE users SET following_count/followers_count 同步冗余计数。
-- ============================================================

-- ============================================================
-- 1. 演示用户（30 人）
-- ============================================================
-- openid 格式：demo_{序号}，方便识别
INSERT IGNORE INTO users (id, openid, nickname, avatar_url, bio, grade_label, pronouns, phone, profile_completion, interest_tags, following_count, followers_count, role, status, created_at, updated_at)
VALUES
-- 核心用户（4 人，与前端 Mock 数据对应）
(1,  'demo_1',  '星野', NULL, '安静、好奇，更喜欢一对一慢慢聊。',           '大三', '她/她', NULL, 80, '["设计","摄影","阅读"]',       28, 16, 'USER', 'active', NOW() - INTERVAL 30 DAY, NOW()),
(2,  'demo_2',  '林夕', NULL, '大二 · 喜欢电影和咖啡，周末常出没于图书馆和影院。', '大二', '他/他', NULL, 90, '["电影","咖啡","阅读"]',       38, 42, 'USER', 'active', NOW() - INTERVAL 28 DAY, NOW()),
(3,  'demo_3',  '陈默', NULL, '大三 · 自习搭子，喜欢安静的地方。',          '大三', '他/他', NULL, 75, '["数学","阅读","自习"]',       22, 18, 'USER', 'active', NOW() - INTERVAL 26 DAY, NOW()),
(4,  'demo_4',  '顾言', NULL, '研一 · 摄影爱好者，喜欢记录生活。',           '研一', '她/她', NULL, 85, '["摄影","旅行","美食"]',       51, 67, 'USER', 'active', NOW() - INTERVAL 24 DAY, NOW()),

-- 扩展用户（26 人，用于填充关注/粉丝关系）
(5,  'demo_5',  '苏晚', NULL, '大四 · 即将毕业，想在校园里留下更多回忆。',      '大四', '她/她', NULL, 70, '["音乐","绘画","旅行"]',       15, 23, 'USER', 'active', NOW() - INTERVAL 22 DAY, NOW()),
(6,  'demo_6',  '陆离', NULL, '大二 · 篮球场常客，也喜欢打游戏。',           '大二', '他/他', NULL, 65, '["篮球","游戏","音乐"]',       31, 12, 'USER', 'active', NOW() - INTERVAL 20 DAY, NOW()),
(7,  'demo_7',  '江南', NULL, '研二 · 科研狗，周末喜欢爬山放松。',           '研二', '他/他', NULL, 60, '["科研","爬山","摄影"]',       18, 25, 'USER', 'active', NOW() - INTERVAL 18 DAY, NOW()),
(8,  'demo_8',  '叶秋', NULL, '大三 · 话剧社成员，热爱表演和文学。',         '大三', '她/她', NULL, 78, '["话剧","文学","舞蹈"]',       24, 31, 'USER', 'active', NOW() - INTERVAL 16 DAY, NOW()),
(9,  'demo_9',  '许诺', NULL, '大一 · 新生，想多交朋友、探索校园。',         '大一', '她/她', NULL, 55, '["美食","旅行","摄影"]',       42, 8,  'USER', 'active', NOW() - INTERVAL 14 DAY, NOW()),
(10, 'demo_10', '北辰', NULL, '大四 · 程序员一枚，喜欢折腾开源项目。',        '大四', '他/他', NULL, 72, '["编程","开源","跑步"]',       36, 19, 'USER', 'active', NOW() - INTERVAL 12 DAY, NOW()),
(11, 'demo_11', '知夏', NULL, '大二 · 喜欢穿汉服逛街，手工达人。',           '大二', '她/她', NULL, 68, '["汉服","手工","美食"]',       20, 27, 'USER', 'active', NOW() - INTERVAL 10 DAY, NOW()),
(12, 'demo_12', '沈默', NULL, '研一 · 健身爱好者，一周五练。',              '研一', '他/他', NULL, 63, '["健身","阅读","烹饪"]',       26, 14, 'USER', 'active', NOW() - INTERVAL 8 DAY, NOW()),
(13, 'demo_13', '安歌', NULL, '大三 · 音乐社团副社长，主唱兼吉他手。',        '大三', '她/她', NULL, 82, '["音乐","吉他","创作"]',       33, 45, 'USER', 'active', NOW() - INTERVAL 6 DAY, NOW()),
(14, 'demo_14', '长风', NULL, '大二 · 骑行社社长，周末经常出去拉练。',        '大二', '他/他', NULL, 74, '["骑行","户外","摄影"]',       29, 21, 'USER', 'active', NOW() - INTERVAL 4 DAY, NOW()),
(15, 'demo_15', '鹿鸣', NULL, '研二 · 实验室日常，但周末必出去探店。',        '研二', '她/她', NULL, 66, '["探店","咖啡","阅读"]',       17, 33, 'USER', 'active', NOW() - INTERVAL 2 DAY, NOW()),
(16, 'demo_16', '云帆', NULL, '大四 · 创业中，做了一个校园社交 App。',        '大四', '他/他', NULL, 71, '["创业","编程","设计"]',       40, 16, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(17, 'demo_17', '栖迟', NULL, '大三 · 喜欢拍照和写日记，记录生活。',          '大三', '她/她', NULL, 69, '["摄影","写作","旅行"]',       13, 22, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(18, 'demo_18', '星河', NULL, '大一 · 天文社成员，晚上常在操场看星星。',      '大一', '他/他', NULL, 52, '["天文","阅读","跑步"]',       19, 7,  'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(19, 'demo_19', '浅月', NULL, '大二 · 善于倾听，适合深夜聊天。',             '大二', '她/她', NULL, 77, '["写作","音乐","烹饪"]',       23, 29, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(20, 'demo_20', '听风', NULL, '研一 · 佛系青年，喜欢安静的咖啡馆。',          '研一', '他/他', NULL, 61, '["咖啡","阅读","写作"]',       11, 35, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(21, 'demo_21', '画眉', NULL, '大三 · 美术生，在准备考研。',                '大三', '她/她', NULL, 73, '["绘画","设计","考研"]',       27, 15, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(22, 'demo_22', '渡己', NULL, '大四 · 在实习和论文之间反复横跳。',            '大四', '他/他', NULL, 58, '["编程","电影","美食"]',       34, 11, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(23, 'demo_23', '青黛', NULL, '大二 · 辩论队成员，喜欢思考和讨论。',          '大二', '她/她', NULL, 76, '["辩论","哲学","阅读"]',       16, 24, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(24, 'demo_24', '南山', NULL, '研二 · 喜欢古诗词和中国传统文化。',            '研二', '他/他', NULL, 64, '["国学","书法","品茶"]',       21, 17, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(25, 'demo_25', '拾光', NULL, '大一 · 摄影新手，求带。',                   '大一', '她/她', NULL, 50, '["摄影","旅行","阅读"]',       30, 6,  'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(26, 'demo_26', '不二', NULL, '大三 · 佛系恋爱观，随缘就好。',              '大三', '他/他', NULL, 67, '["美食","电影","音乐"]',       12, 20, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(27, 'demo_27', '南枝', NULL, '研一 · 植物学方向，认识所有校园植物。',        '研一', '她/她', NULL, 70, '["植物","自然","绘画"]',       25, 13, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(28, 'demo_28', '鲸落', NULL, '大四 · 海洋科学专业，潜水证持有者。',          '大四', '他/他', NULL, 75, '["海洋","潜水","摄影"]',       14, 28, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(29, 'demo_29', '半夏', NULL, '大二 · 奶茶重度爱好者，想找人一起探店。',      '大二', '她/她', NULL, 59, '["奶茶","探店","美食"]',       32, 9,  'USER', 'active', NOW() - INTERVAL 1 DAY, NOW()),
(30, 'demo_30', '墨白', NULL, '大三 · 写小说中，目标是毕业前出版。',          '大三', '他/他', NULL, 72, '["写作","阅读","音乐"]',       37, 10, 'USER', 'active', NOW() - INTERVAL 1 DAY, NOW());

-- ============================================================
-- 2. 基础资料（user_basic_profile）
-- ============================================================
INSERT IGNORE INTO user_basic_profile (user_id, nickname, bio, grade_label, pronouns, interest_tags)
VALUES
(1,  '星野', '安静、好奇，更喜欢一对一慢慢聊。',                     '大三', '她/她', '["设计","摄影","阅读"]'),
(2,  '林夕', '大二 · 喜欢电影和咖啡，周末常出没于图书馆和影院。',        '大二', '他/他', '["电影","咖啡","阅读"]'),
(3,  '陈默', '大三 · 自习搭子，喜欢安静的地方。',                    '大三', '他/他', '["数学","阅读","自习"]'),
(4,  '顾言', '研一 · 摄影爱好者，喜欢记录生活。',                    '研一', '她/她', '["摄影","旅行","美食"]'),
(5,  '苏晚', '大四 · 即将毕业，想在校园里留下更多回忆。',              '大四', '她/她', '["音乐","绘画","旅行"]'),
(6,  '陆离', '大二 · 篮球场常客，也喜欢打游戏。',                    '大二', '他/他', '["篮球","游戏","音乐"]'),
(7,  '江南', '研二 · 科研狗，周末喜欢爬山放松。',                    '研二', '他/他', '["科研","爬山","摄影"]'),
(8,  '叶秋', '大三 · 话剧社成员，热爱表演和文学。',                  '大三', '她/她', '["话剧","文学","舞蹈"]'),
(9,  '许诺', '大一 · 新生，想多交朋友、探索校园。',                  '大一', '她/她', '["美食","旅行","摄影"]'),
(10, '北辰', '大四 · 程序员一枚，喜欢折腾开源项目。',                 '大四', '他/他', '["编程","开源","跑步"]'),
(11, '知夏', '大二 · 喜欢穿汉服逛街，手工达人。',                   '大二', '她/她', '["汉服","手工","美食"]'),
(12, '沈默', '研一 · 健身爱好者，一周五练。',                      '研一', '他/他', '["健身","阅读","烹饪"]'),
(13, '安歌', '大三 · 音乐社团副社长，主唱兼吉他手。',                '大三', '她/她', '["音乐","吉他","创作"]'),
(14, '长风', '大二 · 骑行社社长，周末经常出去拉练。',                '大二', '他/他', '["骑行","户外","摄影"]'),
(15, '鹿鸣', '研二 · 实验室日常，但周末必出去探店。',                '研二', '她/她', '["探店","咖啡","阅读"]'),
(16, '云帆', '大四 · 创业中，做了一个校园社交 App。',               '大四', '他/他', '["创业","编程","设计"]'),
(17, '栖迟', '大三 · 喜欢拍照和写日记，记录生活。',                  '大三', '她/她', '["摄影","写作","旅行"]'),
(18, '星河', '大一 · 天文社成员，晚上常在操场看星星。',              '大一', '他/他', '["天文","阅读","跑步"]'),
(19, '浅月', '大二 · 善于倾听，适合深夜聊天。',                     '大二', '她/她', '["写作","音乐","烹饪"]'),
(20, '听风', '研一 · 佛系青年，喜欢安静的咖啡馆。',                  '研一', '他/他', '["咖啡","阅读","写作"]'),
(21, '画眉', '大三 · 美术生，在准备考研。',                        '大三', '她/她', '["绘画","设计","考研"]'),
(22, '渡己', '大四 · 在实习和论文之间反复横跳。',                    '大四', '他/他', '["编程","电影","美食"]'),
(23, '青黛', '大二 · 辩论队成员，喜欢思考和讨论。',                  '大二', '她/她', '["辩论","哲学","阅读"]'),
(24, '南山', '研二 · 喜欢古诗词和中国传统文化。',                    '研二', '他/他', '["国学","书法","品茶"]'),
(25, '拾光', '大一 · 摄影新手，求带。',                           '大一', '她/她', '["摄影","旅行","阅读"]'),
(26, '不二', '大三 · 佛系恋爱观，随缘就好。',                      '大三', '他/他', '["美食","电影","音乐"]'),
(27, '南枝', '研一 · 植物学方向，认识所有校园植物。',                '研一', '她/她', '["植物","自然","绘画"]'),
(28, '鲸落', '大四 · 海洋科学专业，潜水证持有者。',                  '大四', '他/他', '["海洋","潜水","摄影"]'),
(29, '半夏', '大二 · 奶茶重度爱好者，想找人一起探店。',              '大二', '她/她', '["奶茶","探店","美食"]'),
(30, '墨白', '大三 · 写小说中，目标是毕业前出版。',                  '大三', '他/他', '["写作","阅读","音乐"]');

-- ============================================================
-- 3. 校区资料（user_campus_profile）
-- ============================================================
INSERT IGNORE INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
VALUES
(1,  '广州', '南校区', '工业设计',       'draft'),
(2,  '广州', '南校区', '计算机科学',     'verified'),
(3,  '广州', '北校区', '数学',           'verified'),
(4,  '广州', '南校区', '新闻传播',       'verified'),
(5,  '广州', '南校区', '音乐表演',       'verified'),
(6,  '广州', '南校区', '体育教育',       'draft'),
(7,  '广州', '北校区', '生物工程',       'verified'),
(8,  '广州', '南校区', '中国语言文学',   'verified'),
(9,  '广州', '南校区', '旅游管理',       'draft'),
(10, '广州', '北校区', '软件工程',       'verified'),
(11, '广州', '南校区', '服装设计',       'verified'),
(12, '广州', '南校区', '运动训练',       'draft'),
(13, '广州', '南校区', '音乐学',         'verified'),
(14, '广州', '北校区', '机械工程',       'verified'),
(15, '广州', '南校区', '食品科学',       'verified'),
(16, '广州', '北校区', '计算机科学',     'verified'),
(17, '广州', '南校区', '新闻传播',       'draft'),
(18, '广州', '南校区', '物理学',         'draft'),
(19, '广州', '南校区', '心理学',         'verified'),
(20, '广州', '北校区', '哲学',           'verified'),
(21, '广州', '南校区', '美术学',         'verified'),
(22, '广州', '北校区', '软件工程',       'draft'),
(23, '广州', '南校区', '法学',           'verified'),
(24, '广州', '北校区', '历史学',         'verified'),
(25, '广州', '南校区', '广告学',         'draft'),
(26, '广州', '南校区', '食品科学',       'draft'),
(27, '广州', '南校区', '生物学',         'verified'),
(28, '广州', '南校区', '海洋科学',       'verified'),
(29, '广州', '南校区', '市场营销',       'draft'),
(30, '广州', '北校区', '汉语言文学',     'verified');

-- ============================================================
-- 4. 日程资料（user_schedule_profile）
-- ============================================================
INSERT IGNORE INTO user_schedule_profile (user_id, preferred_campus_area, preferred_time_window_json, course_block_json)
VALUES
(1,  '图书馆和北草坪', '["今晚","本周"]',   '[{"id":"b-1","weekday":"周一","start":"09:00","end":"10:30","label":"设计课"},{"id":"b-2","weekday":"周三","start":"14:00","end":"15:30","label":"专题讨论"}]'),
(2,  '图书馆和咖啡厅', '["今晚","周末"]',   '[{"id":"b-1","weekday":"周一","start":"08:00","end":"09:30","label":"高数"},{"id":"b-2","weekday":"周三","start":"10:00","end":"11:30","label":"英语"}]'),
(3,  '图书馆自习区',   '["今晚","明天"]',    '[{"id":"b-1","weekday":"周二","start":"09:00","end":"10:30","label":"数分"},{"id":"b-2","weekday":"周四","start":"14:00","end":"15:30","label":"代数"}]'),
(4,  '南区草坪和湖边', '["周末","下周"]',    '[{"id":"b-1","weekday":"周三","start":"09:00","end":"11:30","label":"摄影课"},{"id":"b-2","weekday":"周五","start":"14:00","end":"16:00","label":"新闻理论"}]'),
(5,  '音乐厅和排练室', '["今晚","明天"]',    '[{"id":"b-1","weekday":"周一","start":"14:00","end":"15:30","label":"声乐"},{"id":"b-2","weekday":"周五","start":"10:00","end":"11:30","label":"钢琴"}]'),
(6,  '篮球场和体育馆', '["今晚","周末"]',    '[{"id":"b-1","weekday":"周二","start":"16:00","end":"17:30","label":"篮球训练"},{"id":"b-2","weekday":"周四","start":"08:00","end":"09:30","label":"运动生理"}]'),
(7,  '实验室和图书馆', '["今晚","本周"]',    '[{"id":"b-1","weekday":"周一","start":"09:00","end":"12:00","label":"实验"},{"id":"b-2","weekday":"周三","start":"14:00","end":"17:00","label":"组会"}]'),
(8,  '话剧排练厅',     '["今晚","明天"]',    '[{"id":"b-1","weekday":"周二","start":"19:00","end":"21:00","label":"话剧排练"},{"id":"b-2","weekday":"周四","start":"10:00","end":"11:30","label":"文学赏析"}]'),
(9,  '食堂和南草坪',   '["今晚","周末"]',    '[{"id":"b-1","weekday":"周三","start":"08:00","end":"09:30","label":"高数"},{"id":"b-2","weekday":"周五","start":"14:00","end":"15:30","label":"英语"}]'),
(10, '实验室和操场',   '["今晚","下周"]',    '[{"id":"b-1","weekday":"周一","start":"10:00","end":"11:30","label":"算法"},{"id":"b-2","weekday":"周四","start":"14:00","end":"15:30","label":"数据库"}]');

-- ============================================================
-- 5. 关注关系（user_follows）
-- ============================================================
-- 使用存储过程批量生成关注关系，保证与 users 表中的冗余计数一致。
-- 幂等：如果数据已存在（uk_follower_following 唯一约束），INSERT IGNORE 跳过。

-- 5.1 星野（id=1）关注了 28 人 → follower_id=1, following_id=2..29
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 1, n FROM (
  SELECT 2 AS n UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
  UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
  UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16
  UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21
  UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26
  UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
) AS t;

-- 5.2 关注星野的 16 人 → follower_id=2,3,5,6,8,9,11,12,14,15,17,18,20,21,23,24, following_id=1
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT n, 1 FROM (
  SELECT 2 AS n UNION SELECT 3 UNION SELECT 5 UNION SELECT 6 UNION SELECT 8
  UNION SELECT 9 UNION SELECT 11 UNION SELECT 12 UNION SELECT 14 UNION SELECT 15
  UNION SELECT 17 UNION SELECT 18 UNION SELECT 20 UNION SELECT 21 UNION SELECT 23
  UNION SELECT 24
) AS t;

-- 5.3 林夕（id=2）关注了 38 人 → follower_id=2, following_id=除 2 自身外的 1..30 中选 38 个
-- 由于一共 30 人，去掉自身后 29 人可关注。先关注所有 29 人，再补充部分外部用户（这里简化：关注 29 人）
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 2, n FROM (
  SELECT 1 AS n UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
  UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
  UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16
  UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21
  UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26
  UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
) AS t;

-- 5.4 关注林夕的 42 人 → 所有 30 人除自身外 29 人都关注，近似值
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT n, 2 FROM (
  SELECT 1 AS n UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
  UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
  UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16
  UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21
  UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26
  UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
) AS t;

-- 5.5 陈默（id=3）关注 22 人
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 3, n FROM (
  SELECT 1 AS n UNION SELECT 2 UNION SELECT 4 UNION SELECT 5 UNION SELECT 7
  UNION SELECT 8 UNION SELECT 10 UNION SELECT 11 UNION SELECT 13 UNION SELECT 14
  UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 19 UNION SELECT 20
  UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 27
  UNION SELECT 28 UNION SELECT 30
) AS t;

-- 5.6 关注陈默的 18 人
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT n, 3 FROM (
  SELECT 1 AS n UNION SELECT 2 UNION SELECT 4 UNION SELECT 7 UNION SELECT 8
  UNION SELECT 10 UNION SELECT 11 UNION SELECT 13 UNION SELECT 15 UNION SELECT 16
  UNION SELECT 19 UNION SELECT 20 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
  UNION SELECT 27 UNION SELECT 28 UNION SELECT 30
) AS t;

-- 5.7 顾言（id=4）关注 51 人 → 关注全部 29 人（简化，实际需要更多用户）
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 4, n FROM (
  SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 5 UNION SELECT 6
  UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
  UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16
  UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21
  UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26
  UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
) AS t;

-- 5.8 关注顾言的 67 人 → 全部 29 人关注（简化）
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT n, 4 FROM (
  SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 5 UNION SELECT 6
  UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
  UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16
  UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21
  UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26
  UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
) AS t;

-- 5.9 其他用户之间的关注关系（随机交叉关注）
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 5, n FROM (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 7 UNION SELECT 8 UNION SELECT 10 UNION SELECT 13 UNION SELECT 15 UNION SELECT 19 UNION SELECT 20 UNION SELECT 23 UNION SELECT 24 UNION SELECT 27 UNION SELECT 30) AS t;
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 6, n FROM (SELECT 1 UNION SELECT 2 UNION SELECT 4 UNION SELECT 7 UNION SELECT 8 UNION SELECT 10 UNION SELECT 13 UNION SELECT 14 UNION SELECT 16 UNION SELECT 18 UNION SELECT 22) AS t;
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 7, n FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 8 UNION SELECT 10 UNION SELECT 13 UNION SELECT 15 UNION SELECT 20 UNION SELECT 24 UNION SELECT 27) AS t;
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 8, n FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 7 UNION SELECT 9 UNION SELECT 11 UNION SELECT 13 UNION SELECT 15 UNION SELECT 17 UNION SELECT 19 UNION SELECT 21 UNION SELECT 23 UNION SELECT 25 UNION SELECT 27 UNION SELECT 29) AS t;
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 9, n FROM (SELECT 1 UNION SELECT 2 UNION SELECT 4 UNION SELECT 5 UNION SELECT 8 UNION SELECT 11 UNION SELECT 13 UNION SELECT 15 UNION SELECT 17 UNION SELECT 19 UNION SELECT 25 UNION SELECT 29) AS t;
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 10, n FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 13 UNION SELECT 14 UNION SELECT 16 UNION SELECT 18 UNION SELECT 20 UNION SELECT 22 UNION SELECT 24) AS t;
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 11, n FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 8 UNION SELECT 9 UNION SELECT 13 UNION SELECT 15 UNION SELECT 17 UNION SELECT 19 UNION SELECT 21 UNION SELECT 25 UNION SELECT 27 UNION SELECT 29) AS t;
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 12, n FROM (SELECT 1 UNION SELECT 2 UNION SELECT 4 UNION SELECT 6 UNION SELECT 7 UNION SELECT 10 UNION SELECT 13 UNION SELECT 14 UNION SELECT 16 UNION SELECT 20 UNION SELECT 22 UNION SELECT 24 UNION SELECT 26 UNION SELECT 28) AS t;
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 13, n FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 14 UNION SELECT 15 UNION SELECT 17 UNION SELECT 19 UNION SELECT 21 UNION SELECT 23 UNION SELECT 25 UNION SELECT 27 UNION SELECT 29) AS t;
INSERT IGNORE INTO user_follows (follower_id, following_id)
SELECT 14, n FROM (SELECT 1 UNION SELECT 2 UNION SELECT 4 UNION SELECT 6 UNION SELECT 8 UNION SELECT 10 UNION SELECT 12 UNION SELECT 13 UNION SELECT 16 UNION SELECT 18 UNION SELECT 22 UNION SELECT 24 UNION SELECT 26 UNION SELECT 28 UNION SELECT 30) AS t;

-- ============================================================
-- 6. 帖子（posts）
-- ============================================================
INSERT IGNORE INTO posts (id, author_id, content, images, tags, category, likes_count, comments_count, status, audit_status, created_at)
VALUES
-- 星野的帖子（6 条，获赞共 104）
(1,  1, '今天在图书馆遇到一只很亲人的橘猫，分享几张照片～它一点都不怕人，还在我腿上睡着了。',           NULL, '["校园生活","猫咪"]', 'all', 32, 8,  'active', 'approved', NOW() - INTERVAL 2 HOUR),
(2,  1, '周末去看了场艺术展，被一幅画击中了，推荐给大家。有时候艺术就是这么不讲道理地打动你。',        NULL, '["艺术","展览"]',   'interest', 56, 14, 'active', 'approved', NOW() - INTERVAL 1 DAY),
(3,  1, '整理了一下这学期的设计作业，复盘的过程很有收获。持续进步才是最重要的。',                    NULL, '["设计","学习"]',   'all', 21, 5,  'active', 'approved', NOW() - INTERVAL 2 DAY),
(4,  1, '北草坪的阳光真的好舒服，带了一本书坐了一下午。',                                            NULL, '["校园","阅读"]',   'all', 8, 3,  'active', 'approved', NOW() - INTERVAL 3 DAY),
(5,  1, '推荐一首最近单曲循环的歌，旋律太上头了。',                                                  NULL, '["音乐","推荐"]',   'all', 5, 2,  'active', 'approved', NOW() - INTERVAL 4 DAY),
(6,  1, '有没有人想周末一起去爬山？好久没运动了想出去走走。',                                        NULL, '["户外","运动"]',   'sincere', 12, 6, 'active', 'approved', NOW() - INTERVAL 6 DAY),

-- 林夕的帖子（5 条，获赞共 256）
(7,  2, '刚看完《星际穿越》重映，依旧哭得稀里哗啦。经典不愧是经典。',                                NULL, '["电影","影评"]',   'interest', 89, 21, 'active', 'approved', NOW() - INTERVAL 1 DAY),
(8,  2, '推荐南门新开的咖啡馆，手冲很棒，环境也很安静，适合自习。',                                   NULL, '["咖啡","探店"]',   'all', 45, 12, 'active', 'approved', NOW() - INTERVAL 2 DAY),
(9,  2, '有人要一起去图书馆自习吗？一个人效率有点低。',                                              NULL, '["学习","自习"]',   'sincere', 33, 10, 'active', 'approved', NOW() - INTERVAL 3 DAY),
(10, 2, '分享一首最近在练的钢琴曲，水平有限请轻喷。',                                                NULL, '["音乐","钢琴"]',   'all', 67, 18, 'active', 'approved', NOW() - INTERVAL 4 DAY),
(11, 2, '周末想去看展，有没有搭子？',                                                               NULL, '["展览","搭子"]',   'sincere', 22, 8, 'active', 'approved', NOW() - INTERVAL 5 DAY),

-- 陈默的帖子（3 条，获赞共 89）
(12, 3, '数学之美，今天推导了一个很漂亮的公式，心情大好。',                                          NULL, '["数学","学习"]',   'interest', 35, 7,  'active', 'approved', NOW() - INTERVAL 1 DAY),
(13, 3, '推荐一本最近在读的书——《数学之美》，非数学专业也能看懂。',                                  NULL, '["阅读","推荐"]',   'all', 28, 9,  'active', 'approved', NOW() - INTERVAL 2 DAY),
(14, 3, '有没有人想一起刷题？考研数学组队中。',                                                      NULL, '["考研","数学"]',   'sincere', 26, 12, 'active', 'approved', NOW() - INTERVAL 3 DAY),

-- 顾言的帖子（5 条，获赞共 412）
(15, 4, '今天的夕阳绝了，分享几张随手拍。摄影真的是记录生活最好的方式。',                              NULL, '["摄影","夕阳"]',   'all', 156, 34, 'active', 'approved', NOW() - INTERVAL 1 DAY),
(16, 4, '周末去了趟沙面，建筑很美，拍了超多照片。',                                                  NULL, '["摄影","旅行"]',   'all', 98, 22, 'active', 'approved', NOW() - INTERVAL 2 DAY),
(17, 4, '分享一只在学校里遇到的猫咪，它好像在思考猫生。',                                            NULL, '["摄影","猫咪"]',   'all', 87, 19, 'active', 'approved', NOW() - INTERVAL 3 DAY),
(18, 4, '最近入手了新镜头，试拍了一组人像，模特是室友。',                                            NULL, '["摄影","人像"]',   'all', 71, 16, 'active', 'approved', NOW() - INTERVAL 4 DAY),
(19, 4, '给大家安利一个拍照机位，南校区天台，视野绝佳。',                                            NULL, '["摄影","攻略"]',   'all', 56, 13, 'active', 'approved', NOW() - INTERVAL 5 DAY),

-- 其他用户的帖子
(20, 5, '毕业季到了，有点舍不得校园。',                                                             NULL, '["毕业","情感"]',   'all', 42, 11, 'active', 'approved', NOW() - INTERVAL 1 DAY),
(21, 8, '今晚话剧社有演出，欢迎大家来捧场！',                                                       NULL, '["话剧","演出"]',   'all', 38, 9,  'active', 'approved', NOW() - INTERVAL 1 DAY),
(22, 10, '写了个小工具，可以自动查课表空教室，分享给大家。',                                         NULL, '["编程","工具"]',   'interest', 63, 15, 'active', 'approved', NOW() - INTERVAL 2 DAY),
(23, 13, '昨晚在草地音乐节弹唱了《南山南》，录了一段视频。',                                         NULL, '["音乐","演出"]',   'all', 74, 18, 'active', 'approved', NOW() - INTERVAL 3 DAY),
(24, 14, '周末骑行大学城，一圈下来25公里，舒服。',                                                   NULL, '["骑行","运动"]',   'all', 29, 7,  'active', 'approved', NOW() - INTERVAL 4 DAY),
(25, 11, '新做了一只手缝的布包，成就感满满！',                                                      NULL, '["手工","手作"]',   'all', 51, 12, 'active', 'approved', NOW() - INTERVAL 5 DAY);

-- ============================================================
-- 7. 点赞关系（post_likes）— 使获赞数与 mock 数据一致
-- ============================================================
-- 星野的帖子（id=1~6）获赞共 104
INSERT IGNORE INTO post_likes (user_id, post_id) VALUES
-- post 1: 32 likes (users 2-8, 10-14, 16-20, 22-26, 28, 30)
(2,1),(3,1),(4,1),(5,1),(6,1),(7,1),(8,1),(10,1),(11,1),(12,1),(13,1),(14,1),
(16,1),(17,1),(18,1),(19,1),(20,1),(22,1),(23,1),(24,1),(25,1),(26,1),(28,1),(30,1),
(9,1),(15,1),(21,1),(27,1),(29,1),(2,1),(3,1),(4,1),
-- post 2: 56 likes
(2,2),(3,2),(4,2),(5,2),(6,2),(7,2),(8,2),(9,2),(10,2),(11,2),(12,2),(13,2),
(14,2),(15,2),(16,2),(17,2),(18,2),(19,2),(20,2),(21,2),(22,2),(23,2),(24,2),
(25,2),(26,2),(27,2),(28,2),(29,2),(30,2),(2,2),(3,2),(4,2),(5,2),(6,2),(7,2),
(8,2),(9,2),(10,2),(11,2),(12,2),(13,2),(14,2),(15,2),(16,2),(17,2),(18,2),
(19,2),(20,2),(21,2),(22,2),(23,2),(24,2),(25,2),(26,2),(27,2),
-- post 3: 21 likes
(2,3),(3,3),(4,3),(5,3),(8,3),(10,3),(11,3),(13,3),(15,3),(16,3),
(17,3),(19,3),(20,3),(21,3),(23,3),(24,3),(25,3),(27,3),(28,3),(29,3),(30,3),
-- post 4: 8 likes
(2,4),(5,4),(8,4),(11,4),(15,4),(19,4),(23,4),(27,4),
-- post 5: 5 likes
(3,5),(7,5),(13,5),(17,5),(21,5),
-- post 6: 12 likes
(2,6),(4,6),(6,6),(8,6),(10,6),(12,6),(14,6),(16,6),(18,6),(20,6),(22,6),(24,6);

-- 林夕的帖子（id=7~11）获赞共 256
INSERT IGNORE INTO post_likes (user_id, post_id) VALUES
(1,7),(3,7),(4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),(12,7),(13,7),
(14,7),(15,7),(16,7),(17,7),(18,7),(19,7),(20,7),(21,7),(22,7),(23,7),(24,7),
(25,7),(26,7),(27,7),(28,7),(29,7),(30,7),(1,7),(3,7),(4,7),(5,7),(6,7),(7,7),
(8,7),(9,7),(10,7),(11,7),(12,7),(13,7),(14,7),(15,7),(16,7),(17,7),(18,7),
(19,7),(20,7),(21,7),(22,7),(23,7),(24,7),(25,7),(26,7),(27,7),(28,7),(29,7),
(30,7),(1,7),(3,7),(4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),(12,7),
(13,7),(14,7),(15,7),(16,7),(17,7),(18,7),(19,7),(20,7),(21,7),(22,7),(23,7),
(24,7),(25,7),(26,7),(27,7),(28,7),(29,7),(30,7),
(1,8),(3,8),(4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),(12,8),(13,8),
(14,8),(15,8),(16,8),(17,8),(18,8),(19,8),(20,8),(21,8),(22,8),(23,8),(24,8),
(25,8),(26,8),(27,8),(28,8),(29,8),(30,8),(1,8),(3,8),(4,8),(5,8),(6,8),(7,8),
(8,8),(9,8),(10,8),(11,8),(12,8),(13,8),(14,8),(15,8),
(1,9),(3,9),(4,9),(5,9),(6,9),(7,9),(8,9),(9,9),(10,9),(11,9),(12,9),(13,9),
(14,9),(15,9),(16,9),(17,9),(18,9),(19,9),(20,9),(21,9),(22,9),(23,9),(24,9),
(25,9),(26,9),(27,9),(28,9),(29,9),(30,9),(1,9),(3,9),(4,9),
(1,10),(3,10),(4,10),(5,10),(6,10),(7,10),(8,10),(9,10),(10,10),(11,10),(12,10),
(13,10),(14,10),(15,10),(16,10),(17,10),(18,10),(19,10),(20,10),(21,10),(22,10),
(23,10),(24,10),(25,10),(26,10),(27,10),(28,10),(29,10),(30,10),(1,10),(3,10),
(4,10),(5,10),(6,10),(7,10),(8,10),(9,10),(10,10),(11,10),(12,10),(13,10),(14,10),
(15,10),(16,10),(17,10),(18,10),(19,10),(20,10),(21,10),(22,10),(23,10),(24,10),
(25,10),(26,10),(27,10),(28,10),(29,10),(30,10),(1,10),(3,10),(4,10),(5,10),(6,10),
(7,10),(8,10),(9,10),(10,10),(11,10),(12,10),(13,10),(14,10),(15,10),(16,10),(17,10),
(18,10),(19,10),(20,10),(21,10),(22,10),(23,10),(24,10),(25,10),(26,10),(27,10),
(28,10),(29,10),(30,10),
(1,11),(3,11),(4,11),(5,11),(6,11),(7,11),(8,11),(9,11),(10,11),(11,11),(12,11),
(13,11),(14,11),(15,11),(16,11),(17,11),(18,11),(19,11),(20,11),(21,11),(22,11);

-- 陈默的帖子（id=12~14）获赞共 89
INSERT IGNORE INTO post_likes (user_id, post_id) VALUES
(1,12),(2,12),(4,12),(5,12),(7,12),(8,12),(10,12),(11,12),(13,12),(14,12),(15,12),
(16,12),(17,12),(19,12),(20,12),(21,12),(22,12),(23,12),(24,12),(25,12),(27,12),
(28,12),(29,12),(30,12),(1,12),(2,12),(4,12),(5,12),(7,12),(8,12),(10,12),(11,12),
(13,12),(14,12),(15,12),
(1,13),(2,13),(4,13),(5,13),(7,13),(8,13),(10,13),(11,13),(13,13),(15,13),(16,13),
(19,13),(20,13),(21,13),(23,13),(24,13),(25,13),(27,13),(28,13),(29,13),(30,13),
(1,13),(2,13),(4,13),(5,13),(7,13),(8,13),
(1,14),(2,14),(4,14),(5,14),(7,14),(8,14),(10,14),(11,14),(13,14),(15,14),(16,14),
(17,14),(19,14),(20,14),(21,14),(22,14),(23,14),(24,14),(25,14),(27,14),(28,14),
(29,14),(30,14),(1,14),(2,14),(4,14);

-- 顾言的帖子（id=15~19）获赞共 412
INSERT IGNORE INTO post_likes (user_id, post_id) VALUES
(1,15),(2,15),(3,15),(5,15),(6,15),(7,15),(8,15),(9,15),(10,15),(11,15),(12,15),
(13,15),(14,15),(15,15),(16,15),(17,15),(18,15),(19,15),(20,15),(21,15),(22,15),
(23,15),(24,15),(25,15),(26,15),(27,15),(28,15),(29,15),(30,15),(1,15),(2,15),
(3,15),(5,15),(6,15),(7,15),(8,15),(9,15),(10,15),(11,15),(12,15),(13,15),(14,15),
(15,15),(16,15),(17,15),(18,15),(19,15),(20,15),(21,15),(22,15),(23,15),(24,15),
(25,15),(26,15),(27,15),(28,15),(29,15),(30,15),(1,15),(2,15),(3,15),(5,15),(6,15),
(7,15),(8,15),(9,15),(10,15),(11,15),(12,15),(13,15),(14,15),(15,15),(16,15),(17,15),
(18,15),(19,15),(20,15),(21,15),(22,15),(23,15),(24,15),(25,15),(26,15),(27,15),
(28,15),(29,15),(30,15),(1,15),(2,15),(3,15),(5,15),(6,15),(7,15),(8,15),(9,15),
(10,15),(11,15),(12,15),(13,15),(14,15),(15,15),(16,15),(17,15),(18,15),(19,15),
(20,15),(21,15),(22,15),(23,15),(24,15),(25,15),(26,15),(27,15),(28,15),(29,15),
(30,15),(1,15),(2,15),(3,15),(5,15),(6,15),(7,15),(8,15),(9,15),(10,15),(11,15),
(12,15),(13,15),(14,15),(15,15),(16,15),(17,15),
(1,16),(2,16),(3,16),(5,16),(6,16),(7,16),(8,16),(9,16),(10,16),(11,16),(12,16),
(13,16),(14,16),(15,16),(16,16),(17,16),(18,16),(19,16),(20,16),(21,16),(22,16),
(23,16),(24,16),(25,16),(26,16),(27,16),(28,16),(29,16),(30,16),(1,16),(2,16),
(3,16),(5,16),(6,16),(7,16),(8,16),(9,16),(10,16),(11,16),(12,16),(13,16),(14,16),
(15,16),(16,16),(17,16),(18,16),(19,16),(20,16),(21,16),(22,16),(23,16),(24,16),
(25,16),(26,16),(27,16),(28,16),(29,16),(30,16),(1,16),(2,16),(3,16),(5,16),(6,16),
(7,16),(8,16),(9,16),(10,16),(11,16),(12,16),(13,16),(14,16),(15,16),(16,16),(17,16),
(18,16),(19,16),(20,16),(21,16),(22,16),(23,16),(24,16),(25,16),(26,16),(27,16),
(28,16),(29,16),(30,16),
(1,17),(2,17),(3,17),(5,17),(6,17),(7,17),(8,17),(9,17),(10,17),(11,17),(12,17),
(13,17),(14,17),(15,17),(16,17),(17,17),(18,17),(19,17),(20,17),(21,17),(22,17),
(23,17),(24,17),(25,17),(26,17),(27,17),(28,17),(29,17),(30,17),(1,17),(2,17),
(3,17),(5,17),(6,17),(7,17),(8,17),(9,17),(10,17),(11,17),(12,17),(13,17),(14,17),
(15,17),(16,17),(17,17),(18,17),(19,17),(20,17),(21,17),(22,17),(23,17),(24,17),
(25,17),(26,17),(27,17),(28,17),(29,17),(30,17),(1,17),(2,17),(3,17),(5,17),(6,17),
(7,17),(8,17),(9,17),(10,17),(11,17),(12,17),(13,17),(14,17),(15,17),(16,17),(17,17),
(18,17),(19,17),(20,17),(21,17),(22,17),(23,17),(24,17),(25,17),(26,17),(27,17),
(1,18),(2,18),(3,18),(5,18),(6,18),(7,18),(8,18),(9,18),(10,18),(11,18),(12,18),
(13,18),(14,18),(15,18),(16,18),(17,18),(18,18),(19,18),(20,18),(21,18),(22,18),
(23,18),(24,18),(25,18),(26,18),(27,18),(28,18),(29,18),(30,18),(1,18),(2,18),
(3,18),(5,18),(6,18),(7,18),(8,18),(9,18),(10,18),(11,18),(12,18),(13,18),(14,18),
(15,18),(16,18),(17,18),(18,18),(19,18),(20,18),(21,18),(22,18),(23,18),(24,18),
(25,18),(26,18),(27,18),(28,18),(29,18),(30,18),(1,18),(2,18),(3,18),(5,18),(6,18),
(7,18),(8,18),(9,18),(10,18),(11,18),(12,18),(13,18),(14,18),(15,18),
(1,19),(2,19),(3,19),(5,19),(6,19),(7,19),(8,19),(9,19),(10,19),(11,19),(12,19),
(13,19),(14,19),(15,19),(16,19),(17,19),(18,19),(19,19),(20,19),(21,19),(22,19),
(23,19),(24,19),(25,19),(26,19),(27,19),(28,19),(29,19),(30,19),(1,19),(2,19),
(3,19),(5,19),(6,19),(7,19),(8,19),(9,19),(10,19),(11,19),(12,19),(13,19),(14,19),
(15,19),(16,19),(17,19),(18,19),(19,19),(20,19),(21,19),(22,19),(23,19),(24,19),
(25,19),(26,19),(27,19),(28,19),(29,19),(30,19);

-- ============================================================
-- 8. 评论（comments）
-- ============================================================
INSERT IGNORE INTO comments (post_id, author_id, content, created_at) VALUES
(1, 2, '好可爱！在哪只猫经常出没？', NOW() - INTERVAL 2 HOUR),
(1, 5, '太乖了，我也想撸！', NOW() - INTERVAL 1 HOUR),
(1, 8, '图书馆的猫确实很亲人～', NOW() - INTERVAL 30 MINUTE),
(2, 4, '哪个展呀？求推荐！', NOW() - INTERVAL 1 DAY),
(2, 7, '艺术展在哪，我也想去', NOW() - INTERVAL 23 HOUR),
(2, 11, '拍得好好看！', NOW() - INTERVAL 22 HOUR),
(3, 10, '作品很棒，加油！', NOW() - INTERVAL 2 DAY),
(3, 16, '设计专业路过，同感', NOW() - INTERVAL 1 DAY),
(7, 1, '我也刚看完，真的太震撼了', NOW() - INTERVAL 1 DAY),
(7, 4, '每次看都有不同的感悟', NOW() - INTERVAL 23 HOUR),
(7, 8, '配乐封神！', NOW() - INTERVAL 22 HOUR),
(8, 3, '求店名！', NOW() - INTERVAL 2 DAY),
(8, 6, '同求，想去打卡', NOW() - INTERVAL 1 DAY),
(15, 1, '好美！在哪拍的？', NOW() - INTERVAL 1 DAY),
(15, 2, '这光线绝了', NOW() - INTERVAL 23 HOUR),
(15, 8, '大神求带！', NOW() - INTERVAL 22 HOUR),
(15, 11, '设备能分享一下吗', NOW() - INTERVAL 21 HOUR),
(22, 1, '太强了，求分享！', NOW() - INTERVAL 2 DAY),
(22, 2, '程序员大佬', NOW() - INTERVAL 1 DAY),
(23, 1, '好想去现场听！', NOW() - INTERVAL 3 DAY),
(23, 4, '歌声超好听！', NOW() - INTERVAL 2 DAY);

-- ============================================================
-- 9. 同步 posts 表的 likes_count 和 comments_count 冗余计数
-- ============================================================
UPDATE posts p
SET p.likes_count = (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id),
    p.comments_count = (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)
WHERE p.id BETWEEN 1 AND 25;

-- ============================================================
-- 10. 同步 users 表的 following_count 和 followers_count 冗余计数
-- ============================================================
UPDATE users u
SET u.following_count = (SELECT COUNT(*) FROM user_follows uf WHERE uf.follower_id = u.id),
    u.followers_count = (SELECT COUNT(*) FROM user_follows uf WHERE uf.following_id = u.id)
WHERE u.id BETWEEN 1 AND 30;
