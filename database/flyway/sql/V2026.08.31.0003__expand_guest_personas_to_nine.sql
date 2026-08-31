-- 2026-08-31 人格池扩充 6→9（配合 GuestPersona 扩充）：
-- 存量体验账号按 user_id 取模重新分配 9 套人格，进一步稀释「同名同头像」密度。
-- 与 V2026.08.31.0002 同口径，仅改 ELT 槽位数；真实注册用户不受影响。

UPDATE users u
JOIN user_basic_profile b ON b.user_id = u.id
SET u.nickname = ELT(MOD(u.id, 9) + 1, '星野', '夏言', '阿辰', '草莓奶昔', '星辰', '周雨', '小满', '暮然', '秋薇'),
    b.nickname = ELT(MOD(u.id, 9) + 1, '星野', '夏言', '阿辰', '草莓奶昔', '星辰', '周雨', '小满', '暮然', '秋薇'),
    b.bio = ELT(MOD(u.id, 9) + 1,
        '喜欢慢跑和散步，期待遇见有趣的人',
        '喜欢用镜头记录生活的美好瞬间，期待与你一起探索这个世界～',
        '写代码也写诗，偶尔投个三分球',
        '新发现一家超好吃的日料店！食材新鲜，味道绝了～',
        '电子信息，动手能力强的极客，爱折腾',
        '周末常去逛书店和看展，偶尔夜骑',
        '在图书馆修中文，也在操场修心情',
        '机车与吉他各占一半生活，剩下的一半在打球',
        '爱观察生活的细节，也爱记录四季的光'),
    b.interest_tags = ELT(MOD(u.id, 9) + 1,
        '["旅行","摄影","音乐","电影"]',
        '["摄影","阅读","音乐","旅行"]',
        '["篮球","编程","电影","科技"]',
        '["美食","追剧","旅行","摄影"]',
        '["摄影","健身","科技","电影"]',
        '["音乐","游戏","骑行","阅读"]',
        '["读书","跑步","美食","音乐"]',
        '["机车","吉他","篮球","旅行"]',
        '["插画","心理学","旅行","摄影"]'),
    b.photo_gallery = CONCAT('["/static/assets/images/people/', ELT(MOD(u.id, 9) + 1, 'person-01', 'person-03', 'person-04', 'person-05', 'person-07', 'person-08', 'person-02', 'person-06', 'person-09'), '.png"]'),
    b.half_body_photo_url = CONCAT('/static/assets/images/people/', ELT(MOD(u.id, 9) + 1, 'person-01', 'person-03', 'person-04', 'person-05', 'person-07', 'person-08', 'person-02', 'person-06', 'person-09'), '.png'),
    b.profile_background_url = CONCAT('/static/assets/images/people/', ELT(MOD(u.id, 9) + 1, 'person-01', 'person-03', 'person-04', 'person-05', 'person-07', 'person-08', 'person-02', 'person-06', 'person-09'), '.png'),
    b.gender = ELT(MOD(u.id, 9) + 1, 'female', 'female', 'male', 'female', 'male', 'male', 'female', 'male', 'female'),
    b.birth_year = ELT(MOD(u.id, 9) + 1, 2003, 2004, 2003, 2004, 2003, 2004, 2005, 2002, 2003)
WHERE u.openid LIKE 'guest:%';

UPDATE user_campus_profile c
SET c.campus_name = ELT(MOD(c.user_id, 9) + 1,
        '北京大学', '北京大学', '清华大学', '中国人民大学', '北京航空航天大学', '上海交通大学', '复旦大学', '北京理工大学', '北京师范大学'),
    c.department_name = ELT(MOD(c.user_id, 9) + 1,
        '设计学院', '新闻传播学院', '计算机系', '新闻学院', '电子信息学院', '船舶海洋学院', '中文系', '机械工程', '心理学部')
WHERE c.user_id IN (SELECT id FROM users WHERE openid LIKE 'guest:%');
