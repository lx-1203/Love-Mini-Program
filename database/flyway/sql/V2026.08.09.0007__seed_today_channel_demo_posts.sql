-- ============================================================
-- 迁移：今日频道演示数据种子（置顶帖 + 今日帖子 + 活动关联 + 回帖/互动）
-- ============================================================
-- 背景（2026-08-09 需求）：
--   1. real 侧学校圈流（campus feed）演示：补 4 个普通用户校区（南校区/北校区，
--      verified），否则按校区过滤后流为空；
--   2. 圈子列表「今日频道」演示：2 条置顶帖 + 8 条今日帖（created_at 为今天），
--      其中 2 条关联活动（电影社线下碰面 / 周末篮球友谊赛），1 条图片帖；
--   3. 每帖 2-5 条回帖（至少一条根评论挂楼中楼，parent_id 按根评论内容回查）；
--   4. 互动数据：post_likes / post_favorites / post_view_history + posts 计数同步。
--
-- 定位规则（与 V2026.08.09.0002 同风格）：
--   * 帖子按 title 定位（本迁移 title 均为新文案，不与既有种子冲突）；
--   * 评论按 post_id（title 子查询）+ content 定位；
--   * 管理员按 openid = 'local-dev-admin-openid-123456' 动态解析。
--
-- 幂等性：全部 INSERT ... SELECT ... WHERE NOT EXISTS / ON DUPLICATE KEY，
-- 可安全重跑（Flyway 亦只执行一次）。
-- 注意：users.campus_name 对 USER 角色恒为 NULL（V2026.08.08.0013 不变量），
--       学校归属只写 user_campus_profile.campus_name。
--
-- 前置：posts.category 的 CHECK 约束（chk_posts_category）必须包含 'activity'
-- （本迁移插入 activity 分类帖子）。约束更新语句内联在下方（第 0 步）——
-- 因本迁移版本号（0007）先于修正迁移（0008）执行，不能依赖 0008 先行。
-- ============================================================

-- ========== 0. 更新 posts.category CHECK 约束（追加 activity；自 V2026.07.27.0005 起为 VARCHAR+CHECK 约定） ==========
ALTER TABLE posts DROP CHECK chk_posts_category;
ALTER TABLE posts ADD CONSTRAINT chk_posts_category
    CHECK (category IN ('all','interest','sincere','hometown','anonymous','latest','campus','activity'));

-- ========== 1. 确保演示用户 10005-10008 存在（id 存在则跳过，数据与 0021 一致） ==========

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10005, 'seed-user-10005', '陈叙', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '计算机系学长，安静但有趣，愿意倾听。', '13700001005', 'USER', 'active', 100,
       JSON_ARRAY('编程','游戏','跑步','科幻'), 0, 2, NULL, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10005);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10006, 'seed-user-10006', '许知夏', 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '汉语言文学，文艺少女，喜欢民谣和旧书店。', '13700001006', 'USER', 'active', 100,
       JSON_ARRAY('民谣','写作','手账','探店'), 4, 15, NULL, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10006);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10007, 'seed-user-10007', '沈亦舟', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '金融专业，爱运动爱生活，阳光开朗。', '13700001007', 'USER', 'active', 100,
       JSON_ARRAY('篮球','健身','旅行','投资'), 2, 6, NULL, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10007);

INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10008, 'seed-user-10008', '叶清欢', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
       '药学大四，温柔耐心，喜欢小动物。', '13700001008', 'USER', 'active', 100,
       JSON_ARRAY('撸猫','园艺','烘焙','养生'), 5, 18, NULL, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 10008);

-- ========== 2. 演示用户校区（南校区/北校区，verified；已存在则覆盖保证生效，
--                否则 real 侧学校圈流为空） ==========

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
SELECT 10005, '广州', '南校区', '计算机科学与技术', 'verified'
FROM DUAL
ON DUPLICATE KEY UPDATE city_name = '广州', campus_name = '南校区',
    department_name = '计算机科学与技术', verification_status = 'verified';

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
SELECT 10006, '北京', '北校区', '汉语言文学', 'verified'
FROM DUAL
ON DUPLICATE KEY UPDATE city_name = '北京', campus_name = '北校区',
    department_name = '汉语言文学', verification_status = 'verified';

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
SELECT 10007, '广州', '南校区', '金融学', 'verified'
FROM DUAL
ON DUPLICATE KEY UPDATE city_name = '广州', campus_name = '南校区',
    department_name = '金融学', verification_status = 'verified';

INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
SELECT 10008, '北京', '北校区', '药学', 'verified'
FROM DUAL
ON DUPLICATE KEY UPDATE city_name = '北京', campus_name = '北校区',
    department_name = '药学', verification_status = 'verified';

-- ========== 3. 活动种子（电影社线下碰面 / 周末篮球友谊赛，不存在则先插入再取 id） ==========

INSERT INTO activities (title, location, schedule_text, description, city_name, campus_name,
                        enrollment_count, participant_avatars, activity_date, status, published, created_at, updated_at)
SELECT '电影社线下碰面', '影像楼 B 厅', '周六 15:00-17:00',
       '电影社组织的线下放映交流活动，边看电影边聊天，氛围轻松不拘束。',
       '广州', '南校区', 18,
       JSON_ARRAY('https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'),
       DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'upcoming', 1, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE title = '电影社线下碰面');

INSERT INTO activities (title, location, schedule_text, description, city_name, campus_name,
                        enrollment_count, participant_avatars, activity_date, status, published, created_at, updated_at)
SELECT '周末篮球友谊赛', '校体育馆', '周日 10:00-12:00',
       '篮球爱好者友谊赛，3v3 组队，友谊第一比赛第二，欢迎围观。',
       '广州', '南校区', 20,
       JSON_ARRAY('https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'),
       DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'upcoming', 1, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM activities WHERE title = '周末篮球友谊赛');

-- ========== 4. 置顶帖 2 条（is_pinned=1，列表置顶优先展示） ==========

INSERT INTO posts (author_id, title, content, images, tags, likes_count, comments_count, share_count,
                   view_count, audit_status, category, status, is_pinned, activity_id, created_at, updated_at)
SELECT 10001, '本周圈子公告：七夕主题活动预告',
       '下周就是七夕啦，圈子将推出「七夕主题活动」：同城配对聊天、操场星空夜话、图书馆寻宝游戏三选一，报名通道本周五 20:00 开启，名额有限，敬请期待！',
       JSON_ARRAY(), JSON_ARRAY('公告', '七夕'), 32, 0, 2, 240,
       'approved', 'interest', 'active', 1, NULL, DATE_SUB(NOW(), INTERVAL 1 HOUR), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '本周圈子公告：七夕主题活动预告');

INSERT INTO posts (author_id, title, content, images, tags, likes_count, comments_count, share_count,
                   view_count, audit_status, category, status, is_pinned, activity_id, created_at, updated_at)
SELECT 10007, '校园圈新手指南：如何快速找到搭子',
       '刚进圈子的同学看这里：完善基本资料和校园认证后，可以发兴趣帖找搭子、参加圈子活动、去校园话题逛逛。记得标题写明目的（如「求跑步搭子」），配图更容易被看到哦！',
       JSON_ARRAY(), JSON_ARRAY('指南', '新人'), 21, 0, 3, 180,
       'approved', 'campus', 'active', 1, NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '校园圈新手指南：如何快速找到搭子');

-- ========== 5. 今日帖子 8 条（created_at = NOW() - n MINUTE，保证今天；
--              作者为 10001-10008 之间真实存在的普通用户） ==========

-- 5.1 活动帖：电影社放映（关联电影社线下碰面活动）
INSERT INTO posts (author_id, title, content, images, tags, likes_count, comments_count, share_count,
                   view_count, audit_status, category, status, is_pinned, activity_id, created_at, updated_at)
SELECT 10002, '电影社放映《你的名字》：现场报名ing',
       '周六 15:00 影像楼 B 厅放映《你的名字》，映后有交流环节，现场报名即可入场，座位先到先得。上次《星际穿越》场场爆满，这次早点来呀！',
       JSON_ARRAY(), JSON_ARRAY('活动', '电影'), 18, 0, 1, 150,
       'approved', 'activity', 'active', 0,
       (SELECT id FROM activities WHERE title = '电影社线下碰面'),
       DATE_SUB(NOW(), INTERVAL 25 MINUTE), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '电影社放映《你的名字》：现场报名ing');

-- 5.2 活动帖：周末篮球友谊赛（关联周末篮球友谊赛活动）
INSERT INTO posts (author_id, title, content, images, tags, likes_count, comments_count, share_count,
                   view_count, audit_status, category, status, is_pinned, activity_id, created_at, updated_at)
SELECT 10003, '周末篮球友谊赛，缺两个人！',
       '周日上午 10:00 校体育馆，约了 3v3 友谊赛，目前缺两个人！水平不限，会跑位传球就行，打完一起干饭。想来的评论区扣 1，凑齐就开打～',
       JSON_ARRAY(), JSON_ARRAY('活动', '篮球'), 14, 0, 1, 120,
       'approved', 'activity', 'active', 0,
       (SELECT id FROM activities WHERE title = '周末篮球友谊赛'),
       DATE_SUB(NOW(), INTERVAL 40 MINUTE), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '周末篮球友谊赛，缺两个人！');

-- 5.3 图片帖（晚霞，本地 mock 图片路径）
-- 修复（2026-08-09）：category 原为 'life'，但 PostCategory 枚举与 CHECK 约束
-- 均不含 'life'（V2026.07.27.0005 起 VARCHAR+CHECK 约定），改为 'campus'。
INSERT INTO posts (author_id, title, content, images, tags, likes_count, comments_count, share_count,
                   view_count, audit_status, category, status, is_pinned, activity_id, created_at, updated_at)
SELECT 10004, '今日份图书馆晚霞，治愈了',
       '傍晚在图书馆四楼自习，抬头看到窗外的晚霞，橘粉色一层层漫开，整个人都被治愈了。学习再累，也别忘了看看窗外呀。',
       JSON_ARRAY('/uploads/mock/post-sunrise-1.jpg'), JSON_ARRAY('生活', '晚霞'), 9, 0, 0, 90,
       'approved', 'campus', 'active', 0, NULL, DATE_SUB(NOW(), INTERVAL 55 MINUTE), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '今日份图书馆晚霞，治愈了');

-- 5.4 兴趣帖（夜跑搭子）
INSERT INTO posts (author_id, title, content, images, tags, likes_count, comments_count, share_count,
                   view_count, audit_status, category, status, is_pinned, activity_id, created_at, updated_at)
SELECT 10005, '周五夜跑搭子：操场五公里，跑完一起撸串',
       '每周五晚 8 点操场开跑，配速 6 分半左右，跑 5 公里热身，跑完一起去南门撸串聊聊天。想找 2-3 个坚持得住的搭子，一起把跑步习惯养起来！',
       JSON_ARRAY(), JSON_ARRAY('跑步', '找搭子'), 16, 0, 1, 110,
       'approved', 'interest', 'active', 0, NULL, DATE_SUB(NOW(), INTERVAL 70 MINUTE), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '周五夜跑搭子：操场五公里，跑完一起撸串');

-- 5.5 校园帖（图书馆静音区）
INSERT INTO posts (author_id, title, content, images, tags, likes_count, comments_count, share_count,
                   view_count, audit_status, category, status, is_pinned, activity_id, created_at, updated_at)
SELECT 10006, '图书馆三楼新设自习静音区，体验报告',
       '图书馆三楼靠窗一侧新设了「静音自习区」，全楼最安静的位置，桌面有插座和小台灯，实测下午人不多、体验很好。期末复习的朋友可以来，记得手机静音～',
       JSON_ARRAY(), JSON_ARRAY('校园', '图书馆'), 27, 0, 2, 200,
       'approved', 'campus', 'active', 0, NULL, DATE_SUB(NOW(), INTERVAL 85 MINUTE), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '图书馆三楼新设自习静音区，体验报告');

-- 5.6 真诚帖（摄影搭子）
INSERT INTO posts (author_id, title, content, images, tags, likes_count, comments_count, share_count,
                   view_count, audit_status, category, status, is_pinned, activity_id, created_at, updated_at)
SELECT 10008, '真诚找搭子：想认识喜欢摄影的你',
       '大三摄影爱好者，相机是入门微单，平时喜欢拍校园和城市夜景。想认识同样喜欢拍照的朋友，周末一起扫街、互相学习后期，男生女生都可以，真诚最重要。',
       JSON_ARRAY(), JSON_ARRAY('摄影', '真诚找'), 22, 0, 2, 170,
       'approved', 'sincere', 'active', 0, NULL, DATE_SUB(NOW(), INTERVAL 100 MINUTE), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '真诚找搭子：想认识喜欢摄影的你');

-- 5.7 生活帖（糖水铺）
-- 修复（2026-08-09）：category 原为 'life'，但 PostCategory 枚举与 CHECK 约束
-- 均不含 'life'，改为 'interest'（兴趣分享/探店）。
INSERT INTO posts (author_id, title, content, images, tags, likes_count, comments_count, share_count,
                   view_count, audit_status, category, status, is_pinned, activity_id, created_at, updated_at)
SELECT 10001, '学校后门新开的糖水铺，芋圆真好吃',
       '后门新开的糖水铺上周试营业，点了招牌芋圆糖水，料给得很足，甜度刚刚好，价格对学生也很友好。老板说下周会上新芒果系列，改天再带室友去尝尝。',
       JSON_ARRAY(), JSON_ARRAY('生活', '探店'), 12, 0, 1, 80,
       'approved', 'interest', 'active', 0, NULL, DATE_SUB(NOW(), INTERVAL 115 MINUTE), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '学校后门新开的糖水铺，芋圆真好吃');

-- 5.8 求助帖（校园卡）
-- 修复（2026-08-09）：category 原为 'help'，但 PostCategory 枚举与 CHECK 约束
-- 均不含 'help'，改为 'campus'（校园场景求助）。
INSERT INTO posts (author_id, title, content, images, tags, likes_count, comments_count, share_count,
                   view_count, audit_status, category, status, is_pinned, activity_id, created_at, updated_at)
SELECT 10008, '求助：校园卡丢了，捡到的同学请联系我',
       '今天中午在食堂吃饭，走的时候校园卡落在 2 楼靠窗的位置了，卡套是蓝色的，正面贴了姓名贴。有好心同学捡到的话请联系我，非常感谢！',
       JSON_ARRAY(), JSON_ARRAY('求助', '失物'), 8, 0, 0, 60,
       'approved', 'campus', 'active', 0, NULL, DATE_SUB(NOW(), INTERVAL 130 MINUTE), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = '求助：校园卡丢了，捡到的同学请联系我');

-- ========== 6. 每帖 2-5 条回帖（含楼中楼：至少一条根评论挂 1 条子回复，
--              parent_id 按根评论 content 回查；评论时间比帖子晚几分钟） ==========

-- 6.1 置顶公告帖（作者 10001）：3 条根评论 + 1 条楼中楼
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM posts p
JOIN (
    SELECT 10005 author, '期待！到时候一定去现场看看' content, 50 min_ago UNION ALL
    SELECT 10002, '七夕活动安排什么时候出详情呀？', 45 UNION ALL
    SELECT 10008, '置顶帖终于来啦，蹲一个活动预告', 30
) m ON 1 = 1
WHERE p.title = '本周圈子公告：七夕主题活动预告'
  AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 10001, '明天下午公布，记得关注公告～', c.id, DATE_ADD(c.created_at, INTERVAL 10 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '七夕活动安排什么时候出详情呀？'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '明天下午公布，记得关注公告～');

-- 6.2 电影社放映帖（作者 10002）：2 条根评论 + 1 条楼中楼
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM posts p
JOIN (
    SELECT 10003 author, '《你的名字》yyds！报名报名' content, 20 min_ago UNION ALL
    SELECT 10001, '上次电影社活动超棒，这次也去', 12
) m ON 1 = 1
WHERE p.title = '电影社放映《你的名字》：现场报名ing'
  AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 10002, '现场还有纪念票根哦', c.id, DATE_ADD(c.created_at, INTERVAL 8 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '《你的名字》yyds！报名报名'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '现场还有纪念票根哦');

-- 6.3 篮球友谊赛帖（作者 10003）：2 条根评论 + 1 条楼中楼
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM posts p
JOIN (
    SELECT 10001 author, '我报名！还缺几个？' content, 32 min_ago UNION ALL
    SELECT 10004, '可以带不怎么会打的新手吗哈哈', 20
) m ON 1 = 1
WHERE p.title = '周末篮球友谊赛，缺两个人！'
  AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 10003, '算你一个，还差一个啦', c.id, DATE_ADD(c.created_at, INTERVAL 8 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '我报名！还缺几个？'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '算你一个，还差一个啦');

-- 6.4 晚霞图片帖（作者 10004）：2 条根评论 + 1 条楼中楼
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM posts p
JOIN (
    SELECT 10002 author, '晚霞真好看！构图也很棒' content, 45 min_ago UNION ALL
    SELECT 10005, '拍照是手机还是相机呀', 30
) m ON 1 = 1
WHERE p.title = '今日份图书馆晚霞，治愈了'
  AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 10004, '手机拍的，就调了一下色调～', c.id, DATE_ADD(c.created_at, INTERVAL 6 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '拍照是手机还是相机呀'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '手机拍的，就调了一下色调～');

-- 6.5 夜跑帖（作者 10005）：2 条根评论 + 1 条楼中楼
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM posts p
JOIN (
    SELECT 10006 author, '加我一个！跑完撸串是重点' content, 55 min_ago UNION ALL
    SELECT 10003, '几点开跑？我也想跟', 40
) m ON 1 = 1
WHERE p.title = '周五夜跑搭子：操场五公里，跑完一起撸串'
  AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 10005, '晚 8 点操场旗杆下集合，欢迎来', c.id, DATE_ADD(c.created_at, INTERVAL 10 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '几点开跑？我也想跟'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '晚 8 点操场旗杆下集合，欢迎来');

-- 6.6 图书馆静音区帖（作者 10006）：2 条根评论 + 1 条楼中楼
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM posts p
JOIN (
    SELECT 10001 author, '静音区真的很棒，今天去坐了一下午' content, 70 min_ago UNION ALL
    SELECT 10004, '求具体楼层位置！', 50
) m ON 1 = 1
WHERE p.title = '图书馆三楼新设自习静音区，体验报告'
  AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 10006, '三楼东侧靠窗，电梯出来右转走到头', c.id, DATE_ADD(c.created_at, INTERVAL 12 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '求具体楼层位置！'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '三楼东侧靠窗，电梯出来右转走到头');

-- 6.7 摄影搭子帖（作者 10008）：2 条根评论 + 1 条楼中楼
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM posts p
JOIN (
    SELECT 10004 author, '我也是摄影爱好者！求组队' content, 80 min_ago UNION ALL
    SELECT 10001, '夜景可以去北门天桥拍车流，机位不错', 60
) m ON 1 = 1
WHERE p.title = '真诚找搭子：想认识喜欢摄影的你'
  AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 10008, '太好了，周末一起扫街？', c.id, DATE_ADD(c.created_at, INTERVAL 15 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '我也是摄影爱好者！求组队'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '太好了，周末一起扫街？');

-- 6.8 糖水铺帖（作者 10001）：2 条根评论 + 1 条楼中楼
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM posts p
JOIN (
    SELECT 10006 author, '芋圆确实好吃，推荐加椰奶' content, 95 min_ago UNION ALL
    SELECT 10002, '求店名和位置！', 75
) m ON 1 = 1
WHERE p.title = '学校后门新开的糖水铺，芋圆真好吃'
  AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 10001, '后门奶茶街最里面那家「甜一甜」', c.id, DATE_ADD(c.created_at, INTERVAL 9 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '求店名和位置！'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '后门奶茶街最里面那家「甜一甜」');

-- 6.9 校园卡求助帖（作者 10008）：2 条根评论 + 1 条楼中楼
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT p.id, m.author, m.content, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM posts p
JOIN (
    SELECT 10003 author, '帮顶！今天在食堂见过一张' content, 110 min_ago UNION ALL
    SELECT 10005, '可以先去失物招领处看看', 90
) m ON 1 = 1
WHERE p.title = '求助：校园卡丢了，捡到的同学请联系我'
  AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.content = m.content);

INSERT INTO comments (post_id, author_id, content, parent_id, created_at)
SELECT c.post_id, 10008, '已经去过啦，那里还没有，谢谢提醒～', c.id, DATE_ADD(c.created_at, INTERVAL 10 MINUTE)
FROM comments c
WHERE c.parent_id IS NULL AND c.content = '可以先去失物招领处看看'
  AND NOT EXISTS (SELECT 1 FROM comments s WHERE s.parent_id = c.id AND s.content = '已经去过啦，那里还没有，谢谢提醒～');

-- ========== 7. 互动数据：点赞 / 收藏 / 浏览历史（管理员按 openid 动态解析） ==========

-- 7.1 管理员给 4 条新帖点赞（title 定位，幂等）
INSERT INTO post_likes (user_id, post_id, created_at)
SELECT u.id, p.id, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM users u
JOIN (
    SELECT '电影社放映《你的名字》：现场报名ing' title, 20 min_ago UNION ALL
    SELECT '周五夜跑搭子：操场五公里，跑完一起撸串', 60 UNION ALL
    SELECT '真诚找搭子：想认识喜欢摄影的你', 90 UNION ALL
    SELECT '本周圈子公告：七夕主题活动预告', 50
) m ON 1 = 1
JOIN posts p ON p.title = m.title AND p.status = 'active'
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND NOT EXISTS (SELECT 1 FROM post_likes pl WHERE pl.user_id = u.id AND pl.post_id = p.id);

-- 7.2 虚拟用户 10005-10008 交叉点赞新帖（title 定位，幂等）
INSERT INTO post_likes (user_id, post_id, created_at)
SELECT m.uid, p.id, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM (
    SELECT 10005 uid, '电影社放映《你的名字》：现场报名ing' title, 22 min_ago UNION ALL
    SELECT 10006, '电影社放映《你的名字》：现场报名ing', 25 UNION ALL
    SELECT 10007, '周末篮球友谊赛，缺两个人！', 35 UNION ALL
    SELECT 10008, '周末篮球友谊赛，缺两个人！', 38 UNION ALL
    SELECT 10006, '今日份图书馆晚霞，治愈了', 50 UNION ALL
    SELECT 10007, '今日份图书馆晚霞，治愈了', 52 UNION ALL
    SELECT 10008, '周五夜跑搭子：操场五公里，跑完一起撸串', 65 UNION ALL
    SELECT 10005, '图书馆三楼新设自习静音区，体验报告', 80 UNION ALL
    SELECT 10007, '真诚找搭子：想认识喜欢摄影的你', 95 UNION ALL
    SELECT 10006, '学校后门新开的糖水铺，芋圆真好吃', 100 UNION ALL
    SELECT 10005, '求助：校园卡丢了，捡到的同学请联系我', 120
) m
JOIN posts p ON p.title = m.title AND p.status = 'active'
WHERE NOT EXISTS (SELECT 1 FROM post_likes pl WHERE pl.user_id = m.uid AND pl.post_id = p.id);

-- 7.3 收藏（管理员 + 虚拟用户，title 定位，幂等）
INSERT INTO post_favorites (user_id, post_id, created_at)
SELECT u.id, p.id, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM users u
JOIN (
    SELECT '电影社放映《你的名字》：现场报名ing' title, 30 min_ago UNION ALL
    SELECT '真诚找搭子：想认识喜欢摄影的你', 100
) m ON 1 = 1
JOIN posts p ON p.title = m.title AND p.status = 'active'
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND NOT EXISTS (SELECT 1 FROM post_favorites pf WHERE pf.user_id = u.id AND pf.post_id = p.id);

INSERT INTO post_favorites (user_id, post_id, created_at)
SELECT m.uid, p.id, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM (
    SELECT 10005 uid, '今日份图书馆晚霞，治愈了' title, 55 min_ago UNION ALL
    SELECT 10006, '图书馆三楼新设自习静音区，体验报告', 85 UNION ALL
    SELECT 10007, '本周圈子公告：七夕主题活动预告', 45
) m
JOIN posts p ON p.title = m.title AND p.status = 'active'
WHERE NOT EXISTS (SELECT 1 FROM post_favorites pf WHERE pf.user_id = m.uid AND pf.post_id = p.id);

-- 7.4 浏览历史（管理员最近浏览 5 条新帖，title 定位，幂等）
INSERT INTO post_view_history (user_id, post_id, viewed_at)
SELECT u.id, p.id, DATE_SUB(NOW(), INTERVAL m.min_ago MINUTE)
FROM users u
JOIN (
    SELECT '电影社放映《你的名字》：现场报名ing' title, 15 min_ago UNION ALL
    SELECT '周五夜跑搭子：操场五公里，跑完一起撸串', 55 UNION ALL
    SELECT '真诚找搭子：想认识喜欢摄影的你', 85 UNION ALL
    SELECT '图书馆三楼新设自习静音区，体验报告', 70 UNION ALL
    SELECT '今日份图书馆晚霞，治愈了', 40
) m ON 1 = 1
JOIN posts p ON p.title = m.title AND p.status = 'active'
WHERE u.openid = 'local-dev-admin-openid-123456'
  AND NOT EXISTS (SELECT 1 FROM post_view_history pvh WHERE pvh.user_id = u.id AND pvh.post_id = p.id);

-- ========== 8. posts 计数同步（view_count / likes_count / comments_count 与实际对齐） ==========

-- 8.1 点赞数 = post_likes 实际条数（只升不降）
UPDATE posts p
SET p.likes_count = (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id)
WHERE p.title IN (
    '本周圈子公告：七夕主题活动预告', '校园圈新手指南：如何快速找到搭子',
    '电影社放映《你的名字》：现场报名ing', '周末篮球友谊赛，缺两个人！',
    '今日份图书馆晚霞，治愈了', '周五夜跑搭子：操场五公里，跑完一起撸串',
    '图书馆三楼新设自习静音区，体验报告', '真诚找搭子：想认识喜欢摄影的你',
    '学校后门新开的糖水铺，芋圆真好吃', '求助：校园卡丢了，捡到的同学请联系我'
)
  AND p.likes_count < (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id);

-- 8.2 评论数 = comments 实际条数（含楼中楼，只升不降）
UPDATE posts p
SET p.comments_count = (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)
WHERE p.title IN (
    '本周圈子公告：七夕主题活动预告', '校园圈新手指南：如何快速找到搭子',
    '电影社放映《你的名字》：现场报名ing', '周末篮球友谊赛，缺两个人！',
    '今日份图书馆晚霞，治愈了', '周五夜跑搭子：操场五公里，跑完一起撸串',
    '图书馆三楼新设自习静音区，体验报告', '真诚找搭子：想认识喜欢摄影的你',
    '学校后门新开的糖水铺，芋圆真好吃', '求助：校园卡丢了，捡到的同学请联系我'
)
  AND p.comments_count < (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id);

-- 8.3 浏览量铺底（仅补零值行，真实浏览 +1 优先，幂等守卫）
UPDATE posts p
SET p.view_count = 60 + (p.id MOD 90)
WHERE p.title IN (
    '本周圈子公告：七夕主题活动预告', '校园圈新手指南：如何快速找到搭子',
    '电影社放映《你的名字》：现场报名ing', '周末篮球友谊赛，缺两个人！',
    '今日份图书馆晚霞，治愈了', '周五夜跑搭子：操场五公里，跑完一起撸串',
    '图书馆三楼新设自习静音区，体验报告', '真诚找搭子：想认识喜欢摄影的你',
    '学校后门新开的糖水铺，芋圆真好吃', '求助：校园卡丢了，捡到的同学请联系我'
)
  AND p.view_count = 0;

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM post_view_history WHERE post_id IN (SELECT id FROM posts WHERE title IN ('本周圈子公告：七夕主题活动预告','校园圈新手指南：如何快速找到搭子','电影社放映《你的名字》：现场报名ing','周末篮球友谊赛，缺两个人！','今日份图书馆晚霞，治愈了','周五夜跑搭子：操场五公里，跑完一起撸串','图书馆三楼新设自习静音区，体验报告','真诚找搭子：想认识喜欢摄影的你','学校后门新开的糖水铺，芋圆真好吃','求助：校园卡丢了，捡到的同学请联系我'));
-- DELETE FROM post_favorites WHERE post_id IN (SELECT id FROM posts WHERE title IN ('本周圈子公告：七夕主题活动预告','校园圈新手指南：如何快速找到搭子','电影社放映《你的名字》：现场报名ing','周末篮球友谊赛，缺两个人！','今日份图书馆晚霞，治愈了','周五夜跑搭子：操场五公里，跑完一起撸串','图书馆三楼新设自习静音区，体验报告','真诚找搭子：想认识喜欢摄影的你','学校后门新开的糖水铺，芋圆真好吃','求助：校园卡丢了，捡到的同学请联系我'));
-- DELETE FROM post_likes WHERE post_id IN (SELECT id FROM posts WHERE title IN ('本周圈子公告：七夕主题活动预告','校园圈新手指南：如何快速找到搭子','电影社放映《你的名字》：现场报名ing','周末篮球友谊赛，缺两个人！','今日份图书馆晚霞，治愈了','周五夜跑搭子：操场五公里，跑完一起撸串','图书馆三楼新设自习静音区，体验报告','真诚找搭子：想认识喜欢摄影的你','学校后门新开的糖水铺，芋圆真好吃','求助：校园卡丢了，捡到的同学请联系我'));
-- DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE title IN ('本周圈子公告：七夕主题活动预告','校园圈新手指南：如何快速找到搭子','电影社放映《你的名字》：现场报名ing','周末篮球友谊赛，缺两个人！','今日份图书馆晚霞，治愈了','周五夜跑搭子：操场五公里，跑完一起撸串','图书馆三楼新设自习静音区，体验报告','真诚找搭子：想认识喜欢摄影的你','学校后门新开的糖水铺，芋圆真好吃','求助：校园卡丢了，捡到的同学请联系我'));
-- DELETE FROM posts WHERE title IN ('本周圈子公告：七夕主题活动预告','校园圈新手指南：如何快速找到搭子','电影社放映《你的名字》：现场报名ing','周末篮球友谊赛，缺两个人！','今日份图书馆晚霞，治愈了','周五夜跑搭子：操场五公里，跑完一起撸串','图书馆三楼新设自习静音区，体验报告','真诚找搭子：想认识喜欢摄影的你','学校后门新开的糖水铺，芋圆真好吃','求助：校园卡丢了，捡到的同学请联系我');
-- DELETE FROM activities WHERE title IN ('电影社线下碰面','周末篮球友谊赛');
-- UPDATE user_campus_profile SET campus_name = '复旦大学', city_name = '上海', department_name = '计算机科学与技术', verification_status = 'verified' WHERE user_id = 10005;
-- UPDATE user_campus_profile SET campus_name = '复旦大学', city_name = '上海', department_name = '汉语言文学', verification_status = 'verified' WHERE user_id = 10006;
-- UPDATE user_campus_profile SET campus_name = '南京大学', city_name = '南京', department_name = '金融学', verification_status = 'verified' WHERE user_id = 10007;
-- UPDATE user_campus_profile SET campus_name = '南京大学', city_name = '南京', department_name = '药学', verification_status = 'verified' WHERE user_id = 10008;
