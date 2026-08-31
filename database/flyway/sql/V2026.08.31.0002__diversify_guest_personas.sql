-- 2026-08-31 推荐去重根因修复（存量数据）：
-- 历史体验账号全部硬编码昵称「星野」+ 同一头像，推荐/相似作者列表出现
-- 「上下同一个人」观感。按 user_id 取模分配 6 套人格（与新代码 GuestPersona 一致）。
-- 只改 openid 为 guest:% 的体验账号，真实注册用户不受影响。

UPDATE users u
JOIN user_basic_profile b ON b.user_id = u.id
SET u.nickname = ELT(MOD(u.id, 6) + 1, '星野', '夏言', '阿辰', '草莓奶昔', '星辰', '周雨'),
    b.nickname = ELT(MOD(u.id, 6) + 1, '星野', '夏言', '阿辰', '草莓奶昔', '星辰', '周雨'),
    b.bio = ELT(MOD(u.id, 6) + 1,
        '喜欢慢跑和散步，期待遇见有趣的人',
        '喜欢用镜头记录生活的美好瞬间，期待与你一起探索这个世界～',
        '写代码也写诗，偶尔投个三分球',
        '新发现一家超好吃的日料店！食材新鲜，味道绝了～',
        '电子信息，动手能力强的极客，爱折腾',
        '周末常去逛书店和看展，偶尔夜骑'),
    b.interest_tags = ELT(MOD(u.id, 6) + 1,
        '["旅行","摄影","音乐","电影"]',
        '["摄影","阅读","音乐","旅行"]',
        '["篮球","编程","电影","科技"]',
        '["美食","追剧","旅行","摄影"]',
        '["摄影","健身","科技","电影"]',
        '["音乐","游戏","骑行","阅读"]'),
    b.photo_gallery = CONCAT('["/static/assets/images/people/', ELT(MOD(u.id, 6) + 1, 'person-01', 'person-03', 'person-04', 'person-05', 'person-07', 'person-08'), '.png"]'),
    b.half_body_photo_url = CONCAT('/static/assets/images/people/', ELT(MOD(u.id, 6) + 1, 'person-01', 'person-03', 'person-04', 'person-05', 'person-07', 'person-08'), '.png'),
    b.profile_background_url = CONCAT('/static/assets/images/people/', ELT(MOD(u.id, 6) + 1, 'person-01', 'person-03', 'person-04', 'person-05', 'person-07', 'person-08'), '.png'),
    b.gender = ELT(MOD(u.id, 6) + 1, 'female', 'female', 'male', 'female', 'male', 'male'),
    b.birth_year = ELT(MOD(u.id, 6) + 1, 2003, 2004, 2003, 2004, 2003, 2004)
WHERE u.openid LIKE 'guest:%';

-- 校园资料差异化（同校规则仍生效：同校加分不受影响，只消除千人一面）
UPDATE user_campus_profile c
SET c.campus_name = ELT(MOD(c.user_id, 6) + 1,
        '北京大学', '北京大学', '清华大学', '中国人民大学', '北京航空航天大学', '上海交通大学'),
    c.department_name = ELT(MOD(c.user_id, 6) + 1,
        '设计学院', '新闻传播学院', '计算机系', '新闻学院', '电子信息学院', '船舶海洋学院')
WHERE c.user_id IN (SELECT id FROM users WHERE openid LIKE 'guest:%');
