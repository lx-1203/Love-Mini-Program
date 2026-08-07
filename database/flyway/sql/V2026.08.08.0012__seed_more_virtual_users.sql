-- ============================================================
-- 迁移：补充 60 个虚拟用户（覆盖 17 所学校，P0-21 推荐池）
-- ============================================================
-- 背景：
--   推荐池（candidatePageSize=200）此前仅覆盖 5 所学校，且候选
--   查询已收紧为 status=active + role=USER 的普通用户，需要补充
--   更多学校、更多候选，保证 campus_first 同校池非空。
--
--   数据契约（不变量教训，V2026.08.07.0021 曾违反）：
--   1. users.campus_name 仅 ADMIN/SUPER_ADMIN 管辖校区字段，
--      USER 角色该字段恒为 NULL —— 本次种子一律置 NULL；
--   2. 学校归属只写 user_campus_profile.campus_name（字符串对齐），
--      且仅写 schools 表已存在的高校（本迁移先补齐缺失高校种子）；
--   3. 认证状态 verification_status=verified（机器+人工双重认证语义）。
--   4. id 号段：20057-20116（此前 10057+ 被手工验收用户占用，见 2026-08-08 运行记录）。
--
--   幂等性：固定 id 20057-10116 + WHERE NOT EXISTS，可安全重跑。
-- ============================================================

-- ========== 1. 补齐 schools 表高校（仅缺失的才插入，幂等） ==========
INSERT INTO schools (name, code, sort_order)
SELECT '北京大学', 'PKU', 6 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'PKU');

INSERT INTO schools (name, code, sort_order)
SELECT '清华大学', 'THU', 7 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'THU');

INSERT INTO schools (name, code, sort_order)
SELECT '广州大学', 'GZU', 8 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'GZU');

INSERT INTO schools (name, code, sort_order)
SELECT '上海交通大学', 'SJTU', 9 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'SJTU');

INSERT INTO schools (name, code, sort_order)
SELECT '中山大学', 'SYSU', 10 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'SYSU');

INSERT INTO schools (name, code, sort_order)
SELECT '华中科技大学', 'HUST', 11 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'HUST');

INSERT INTO schools (name, code, sort_order)
SELECT '四川大学', 'SCU', 12 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'SCU');

INSERT INTO schools (name, code, sort_order)
SELECT '西安交通大学', 'XJTU', 13 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'XJTU');

INSERT INTO schools (name, code, sort_order)
SELECT '哈尔滨工业大学', 'HIT', 14 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'HIT');

INSERT INTO schools (name, code, sort_order)
SELECT '南开大学', 'NKU', 15 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'NKU');

INSERT INTO schools (name, code, sort_order)
SELECT '同济大学', 'TJU', 16 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'TJU');

INSERT INTO schools (name, code, sort_order)
SELECT '中国人民大学', 'RUC', 17 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'RUC');

-- ========== 2. 插入 60 个虚拟用户（20057-10116，USER 角色） ==========
-- 固定 id + openid seed-user-{id}；campus_name 置 NULL（不变量：仅管理员校区字段）
-- ---- 第 1 批（20057-20071） ----
INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 20057, 'seed-user-20057', '许清越', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '性格慢热但熟了话很多，想找个能一起吃饭逛街看电影的人。', '13700020057', 'USER', 'active', 100, JSON_ARRAY("阅读","摄影","篮球","音乐"), 0, 0, NULL, NOW(), NOW() UNION ALL
SELECT 20058, 'seed-user-20058', '陆星辞', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '相信真诚是最高级的浪漫，希望遇到双向奔赴的感情。', '13700020058', 'USER', 'active', 100, JSON_ARRAY("绘画","咖啡","旅行","猫咪"), 1, 1, NULL, NOW(), NOW() UNION ALL
SELECT 20059, 'seed-user-20059', '宋知夏', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '生活需要一点仪式感，认真生活的人运气不会差。', '13700020059', 'USER', 'active', 100, JSON_ARRAY("健身","美食","电影","桌游"), 2, 2, NULL, NOW(), NOW() UNION ALL
SELECT 20060, 'seed-user-20060', '沈听澜', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢简单舒服的相处模式，三观合比什么都重要。', '13700020060', 'USER', 'active', 100, JSON_ARRAY("播音","阅读","旅行","烘焙"), 3, 3, NULL, NOW(), NOW() UNION ALL
SELECT 20061, 'seed-user-20061', '江晚吟', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '周末喜欢逛图书馆和操场，希望遇见同频的你。', '13700020061', 'USER', 'active', 100, JSON_ARRAY("编程","游戏","跑步","科幻"), 4, 4, NULL, NOW(), NOW() UNION ALL
SELECT 20062, 'seed-user-20062', '顾言深', 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '学业之外喜欢摄影和旅行，想把生活过成诗。', '13700020062', 'USER', 'active', 100, JSON_ARRAY("民谣","写作","手账","探店"), 5, 5, NULL, NOW(), NOW() UNION ALL
SELECT 20063, 'seed-user-20063', '林叙白', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '理工科但有点文艺，愿意倾听也愿意分享。', '13700020063', 'USER', 'active', 100, JSON_ARRAY("篮球","健身","旅行","投资"), 6, 6, NULL, NOW(), NOW() UNION ALL
SELECT 20064, 'seed-user-20064', '苏黎安', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '爱笑爱闹的元气选手，期待认识新朋友。', '13700020064', 'USER', 'active', 100, JSON_ARRAY("撸猫","园艺","烘焙","养生"), 7, 7, NULL, NOW(), NOW() UNION ALL
SELECT 20065, 'seed-user-20065', '白槿言', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '温和靠谱，正在努力成为更好的自己。', '13700020065', 'USER', 'active', 100, JSON_ARRAY("吉他","天文","跑步","纪录片"), 8, 8, NULL, NOW(), NOW() UNION ALL
SELECT 20066, 'seed-user-20066', '秦书逸', 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢美食和桌游，人生大事是干饭和开心。', '13700020066', 'USER', 'active', 100, JSON_ARRAY("舞蹈","音乐","穿搭","旅行"), 0, 9, NULL, NOW(), NOW() UNION ALL
SELECT 20067, 'seed-user-20067', '叶南枝', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '性格慢热但熟了话很多，想找个能一起吃饭逛街看电影的人。', '13700020067', 'USER', 'active', 100, JSON_ARRAY("摄影","建筑","骑行","咖啡"), 1, 10, NULL, NOW(), NOW() UNION ALL
SELECT 20068, 'seed-user-20068', '温初阳', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '相信真诚是最高级的浪漫，希望遇到双向奔赴的感情。', '13700020068', 'USER', 'active', 100, JSON_ARRAY("推理","辩论","瑜伽","茶道"), 2, 11, NULL, NOW(), NOW() UNION ALL
SELECT 20069, 'seed-user-20069', '穆清欢', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '生活需要一点仪式感，认真生活的人运气不会差。', '13700020069', 'USER', 'active', 100, JSON_ARRAY("历史","博物馆","围棋","古琴"), 3, 12, NULL, NOW(), NOW() UNION ALL
SELECT 20070, 'seed-user-20070', '程亦舟', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢简单舒服的相处模式，三观合比什么都重要。', '13700020070', 'USER', 'active', 100, JSON_ARRAY("动漫","画画","游戏","盲盒"), 4, 13, NULL, NOW(), NOW() UNION ALL
SELECT 20071, 'seed-user-20071', '乔望舒', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '周末喜欢逛图书馆和操场，希望遇见同频的你。', '13700020071', 'USER', 'active', 100, JSON_ARRAY("足球","健身","露营","徒步"), 5, 14, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id IN (20057,20058,20059,20060,20061,20062,20063,20064,20065,20066,20067,20068,20069,20070,20071));

-- ---- 第 2 批（20072-20086） ----
INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 20072, 'seed-user-20072', '洛子衿', 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '学业之外喜欢摄影和旅行，想把生活过成诗。', '13700020072', 'USER', 'active', 100, JSON_ARRAY("手工","烘焙","钢琴","园艺"), 6, 15, NULL, NOW(), NOW() UNION ALL
SELECT 20073, 'seed-user-20073', '阮星眠', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '理工科但有点文艺，愿意倾听也愿意分享。', '13700020073', 'USER', 'active', 100, JSON_ARRAY("钢琴","古典乐","电影","阅读"), 7, 16, NULL, NOW(), NOW() UNION ALL
SELECT 20074, 'seed-user-20074', '贺兰辞', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '爱笑爱闹的元气选手，期待认识新朋友。', '13700020074', 'USER', 'active', 100, JSON_ARRAY("汉服","古筝","国风","旅行"), 8, 17, NULL, NOW(), NOW() UNION ALL
SELECT 20075, 'seed-user-20075', '云舒窈', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '温和靠谱，正在努力成为更好的自己。', '13700020075', 'USER', 'active', 100, JSON_ARRAY("做饭","健身","钓鱼","徒步"), 0, 18, NULL, NOW(), NOW() UNION ALL
SELECT 20076, 'seed-user-20076', '闻人澈', 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢美食和桌游，人生大事是干饭和开心。', '13700020076', 'USER', 'active', 100, JSON_ARRAY("街拍","写作","播客","咖啡"), 1, 19, NULL, NOW(), NOW() UNION ALL
SELECT 20077, 'seed-user-20077', '韩青梧', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '性格慢热但熟了话很多，想找个能一起吃饭逛街看电影的人。', '13700020077', 'USER', 'active', 100, JSON_ARRAY("法语","文学","烘焙","香水"), 2, 20, NULL, NOW(), NOW() UNION ALL
SELECT 20078, 'seed-user-20078', '许栀夏', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '相信真诚是最高级的浪漫，希望遇到双向奔赴的感情。', '13700020078', 'USER', 'active', 100, JSON_ARRAY("DIY","无人机","编程","摄影"), 3, 0, NULL, NOW(), NOW() UNION ALL
SELECT 20079, 'seed-user-20079', '纪淮安', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '生活需要一点仪式感，认真生活的人运气不会差。', '13700020079', 'USER', 'active', 100, JSON_ARRAY("瑜伽","养生","电影","拼图"), 4, 1, NULL, NOW(), NOW() UNION ALL
SELECT 20080, 'seed-user-20080', '唐棠', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢简单舒服的相处模式，三观合比什么都重要。', '13700020080', 'USER', 'active', 100, JSON_ARRAY("军史","健身","登山","策略游戏"), 5, 2, NULL, NOW(), NOW() UNION ALL
SELECT 20081, 'seed-user-20081', '傅时予', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '周末喜欢逛图书馆和操场，希望遇见同频的你。', '13700020081', 'USER', 'active', 100, JSON_ARRAY("英语","绘本","手工","烘焙"), 6, 3, NULL, NOW(), NOW() UNION ALL
SELECT 20082, 'seed-user-20082', '姜语棠', 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '学业之外喜欢摄影和旅行，想把生活过成诗。', '13700020082', 'USER', 'active', 100, JSON_ARRAY("露营","徒步","摄影","骑行"), 7, 4, NULL, NOW(), NOW() UNION ALL
SELECT 20083, 'seed-user-20083', '沈修远', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '理工科但有点文艺，愿意倾听也愿意分享。', '13700020083', 'USER', 'active', 100, JSON_ARRAY("国画","油画","书法","茶艺"), 8, 5, NULL, NOW(), NOW() UNION ALL
SELECT 20084, 'seed-user-20084', '黎梦琪', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '爱笑爱闹的元气选手，期待认识新朋友。', '13700020084', 'USER', 'active', 100, JSON_ARRAY("围棋","茶道","财经","书法"), 0, 6, NULL, NOW(), NOW() UNION ALL
SELECT 20085, 'seed-user-20085', '陆昭明', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '温和靠谱，正在努力成为更好的自己。', '13700020085', 'USER', 'active', 100, JSON_ARRAY("脱口秀","美食","旅行","社交"), 1, 7, NULL, NOW(), NOW() UNION ALL
SELECT 20086, 'seed-user-20086', '夏浅语', 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢美食和桌游，人生大事是干饭和开心。', '13700020086', 'USER', 'active', 100, JSON_ARRAY("珠宝","穿搭","插花","看展"), 2, 8, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id IN (20072,20073,20074,20075,20076,20077,20078,20079,20080,20081,20082,20083,20084,20085,20086));

-- ---- 第 3 批（20087-10101） ----
INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 20087, 'seed-user-20087', '顾临川', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '性格慢热但熟了话很多，想找个能一起吃饭逛街看电影的人。', '13700020087', 'USER', 'active', 100, JSON_ARRAY("阅读","摄影","篮球","音乐"), 3, 9, NULL, NOW(), NOW() UNION ALL
SELECT 20088, 'seed-user-20088', '楚晚宁', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '相信真诚是最高级的浪漫，希望遇到双向奔赴的感情。', '13700020088', 'USER', 'active', 100, JSON_ARRAY("绘画","咖啡","旅行","猫咪"), 4, 10, NULL, NOW(), NOW() UNION ALL
SELECT 20089, 'seed-user-20089', '方既明', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '生活需要一点仪式感，认真生活的人运气不会差。', '13700020089', 'USER', 'active', 100, JSON_ARRAY("健身","美食","电影","桌游"), 5, 11, NULL, NOW(), NOW() UNION ALL
SELECT 20090, 'seed-user-20090', '安知夏', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢简单舒服的相处模式，三观合比什么都重要。', '13700020090', 'USER', 'active', 100, JSON_ARRAY("播音","阅读","旅行","烘焙"), 6, 12, NULL, NOW(), NOW() UNION ALL
SELECT 20091, 'seed-user-20091', '萧景行', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '周末喜欢逛图书馆和操场，希望遇见同频的你。', '13700020091', 'USER', 'active', 100, JSON_ARRAY("编程","游戏","跑步","科幻"), 7, 13, NULL, NOW(), NOW() UNION ALL
SELECT 20092, 'seed-user-20092', '宁清和', 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '学业之外喜欢摄影和旅行，想把生活过成诗。', '13700020092', 'USER', 'active', 100, JSON_ARRAY("民谣","写作","手账","探店"), 8, 14, NULL, NOW(), NOW() UNION ALL
SELECT 20093, 'seed-user-20093', '孟繁星', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '理工科但有点文艺，愿意倾听也愿意分享。', '13700020093', 'USER', 'active', 100, JSON_ARRAY("篮球","健身","旅行","投资"), 0, 15, NULL, NOW(), NOW() UNION ALL
SELECT 20094, 'seed-user-20094', '谢云书', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '爱笑爱闹的元气选手，期待认识新朋友。', '13700020094', 'USER', 'active', 100, JSON_ARRAY("撸猫","园艺","烘焙","养生"), 1, 16, NULL, NOW(), NOW() UNION ALL
SELECT 20095, 'seed-user-20095', '霍思齐', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '温和靠谱，正在努力成为更好的自己。', '13700020095', 'USER', 'active', 100, JSON_ARRAY("吉他","天文","跑步","纪录片"), 2, 17, NULL, NOW(), NOW() UNION ALL
SELECT 20096, 'seed-user-20096', '裴知微', 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢美食和桌游，人生大事是干饭和开心。', '13700020096', 'USER', 'active', 100, JSON_ARRAY("舞蹈","音乐","穿搭","旅行"), 3, 18, NULL, NOW(), NOW() UNION ALL
SELECT 20097, 'seed-user-20097', '郁南乔', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '性格慢热但熟了话很多，想找个能一起吃饭逛街看电影的人。', '13700020097', 'USER', 'active', 100, JSON_ARRAY("摄影","建筑","骑行","咖啡"), 4, 19, NULL, NOW(), NOW() UNION ALL
SELECT 20098, 'seed-user-20098', '任行舟', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '相信真诚是最高级的浪漫，希望遇到双向奔赴的感情。', '13700020098', 'USER', 'active', 100, JSON_ARRAY("推理","辩论","瑜伽","茶道"), 5, 20, NULL, NOW(), NOW() UNION ALL
SELECT 20099, 'seed-user-20099', '左安然', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '生活需要一点仪式感，认真生活的人运气不会差。', '13700020099', 'USER', 'active', 100, JSON_ARRAY("历史","博物馆","围棋","古琴"), 6, 0, NULL, NOW(), NOW() UNION ALL
SELECT 10100, 'seed-user-10100', '薛定谔', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢简单舒服的相处模式，三观合比什么都重要。', '13700010100', 'USER', 'active', 100, JSON_ARRAY("动漫","画画","游戏","盲盒"), 7, 1, NULL, NOW(), NOW() UNION ALL
SELECT 10101, 'seed-user-10101', '殷雪晴', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '周末喜欢逛图书馆和操场，希望遇见同频的你。', '13700010101', 'USER', 'active', 100, JSON_ARRAY("足球","健身","露营","徒步"), 8, 2, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id IN (20087,20088,20089,20090,20091,20092,20093,20094,20095,20096,20097,20098,20099,10100,10101));

-- ---- 第 4 批（10102-10116） ----
INSERT INTO users (id, openid, nickname, avatar_url, bio, phone, role, status,
                   profile_completion, interest_tags, following_count, followers_count,
                   campus_name, created_at, updated_at)
SELECT 10102, 'seed-user-10102', '苏沐橙', 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '学业之外喜欢摄影和旅行，想把生活过成诗。', '13700010102', 'USER', 'active', 100, JSON_ARRAY("手工","烘焙","钢琴","园艺"), 0, 3, NULL, NOW(), NOW() UNION ALL
SELECT 10103, 'seed-user-10103', '乔安夏', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '理工科但有点文艺，愿意倾听也愿意分享。', '13700010103', 'USER', 'active', 100, JSON_ARRAY("钢琴","古典乐","电影","阅读"), 1, 4, NULL, NOW(), NOW() UNION ALL
SELECT 10104, 'seed-user-10104', '田归农', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '爱笑爱闹的元气选手，期待认识新朋友。', '13700010104', 'USER', 'active', 100, JSON_ARRAY("汉服","古筝","国风","旅行"), 2, 5, NULL, NOW(), NOW() UNION ALL
SELECT 10105, 'seed-user-10105', '明澈', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '温和靠谱，正在努力成为更好的自己。', '13700010105', 'USER', 'active', 100, JSON_ARRAY("做饭","健身","钓鱼","徒步"), 3, 6, NULL, NOW(), NOW() UNION ALL
SELECT 10106, 'seed-user-10106', '祝嘉树', 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢美食和桌游，人生大事是干饭和开心。', '13700010106', 'USER', 'active', 100, JSON_ARRAY("街拍","写作","播客","咖啡"), 4, 7, NULL, NOW(), NOW() UNION ALL
SELECT 10107, 'seed-user-10107', '段承泽', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '性格慢热但熟了话很多，想找个能一起吃饭逛街看电影的人。', '13700010107', 'USER', 'active', 100, JSON_ARRAY("法语","文学","烘焙","香水"), 5, 8, NULL, NOW(), NOW() UNION ALL
SELECT 10108, 'seed-user-10108', '苗雨薇', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '相信真诚是最高级的浪漫，希望遇到双向奔赴的感情。', '13700010108', 'USER', 'active', 100, JSON_ARRAY("DIY","无人机","编程","摄影"), 6, 9, NULL, NOW(), NOW() UNION ALL
SELECT 10109, 'seed-user-10109', '金亦凡', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '生活需要一点仪式感，认真生活的人运气不会差。', '13700010109', 'USER', 'active', 100, JSON_ARRAY("瑜伽","养生","电影","拼图"), 7, 10, NULL, NOW(), NOW() UNION ALL
SELECT 10110, 'seed-user-10110', '柳如是', 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢简单舒服的相处模式，三观合比什么都重要。', '13700010110', 'USER', 'active', 100, JSON_ARRAY("军史","健身","登山","策略游戏"), 8, 11, NULL, NOW(), NOW() UNION ALL
SELECT 10111, 'seed-user-10111', '章若楠', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '周末喜欢逛图书馆和操场，希望遇见同频的你。', '13700010111', 'USER', 'active', 100, JSON_ARRAY("英语","绘本","手工","烘焙"), 0, 12, NULL, NOW(), NOW() UNION ALL
SELECT 10112, 'seed-user-10112', '熊思远', 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '学业之外喜欢摄影和旅行，想把生活过成诗。', '13700010112', 'USER', 'active', 100, JSON_ARRAY("露营","徒步","摄影","骑行"), 1, 13, NULL, NOW(), NOW() UNION ALL
SELECT 10113, 'seed-user-10113', '涂山乔', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '理工科但有点文艺，愿意倾听也愿意分享。', '13700010113', 'USER', 'active', 100, JSON_ARRAY("国画","油画","书法","茶艺"), 2, 14, NULL, NOW(), NOW() UNION ALL
SELECT 10114, 'seed-user-10114', '花信风', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '爱笑爱闹的元气选手，期待认识新朋友。', '13700010114', 'USER', 'active', 100, JSON_ARRAY("围棋","茶道","财经","书法"), 3, 15, NULL, NOW(), NOW() UNION ALL
SELECT 10115, 'seed-user-10115', '华清池', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '温和靠谱，正在努力成为更好的自己。', '13700010115', 'USER', 'active', 100, JSON_ARRAY("脱口秀","美食","旅行","社交"), 4, 16, NULL, NOW(), NOW() UNION ALL
SELECT 10116, 'seed-user-10116', '蓝桉', 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop', '喜欢美食和桌游，人生大事是干饭和开心。', '13700010116', 'USER', 'active', 100, JSON_ARRAY("珠宝","穿搭","插花","看展"), 5, 17, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id IN (10102,10103,10104,10105,10106,10107,10108,10109,10110,10111,10112,10113,10114,10115,10116));

-- ========== 3. 校园资料（user_campus_profile，仅 schools 表已有高校） ==========
INSERT INTO user_campus_profile (user_id, city_name, campus_name, department_name, verification_status)
SELECT v.user_id, v.city_name, v.campus_name, v.department_name, v.verification_status
FROM (
SELECT 20057 AS user_id, '北京' AS city_name, '北京大学' AS campus_name, '计算机科学与技术' AS department_name, 'verified' AS verification_status UNION ALL
SELECT 20058, '北京', '北京大学', '汉语言文学', 'verified' UNION ALL
SELECT 20059, '北京', '北京大学', '经济学', 'verified' UNION ALL
SELECT 20060, '北京', '清华大学', '设计学', 'verified' UNION ALL
SELECT 20061, '北京', '清华大学', '电子信息', 'verified' UNION ALL
SELECT 20062, '北京', '清华大学', '机械工程', 'verified' UNION ALL
SELECT 20063, '上海', '复旦大学', '计算机科学与技术', 'verified' UNION ALL
SELECT 20064, '上海', '复旦大学', '汉语言文学', 'verified' UNION ALL
SELECT 20065, '上海', '复旦大学', '经济学', 'verified' UNION ALL
SELECT 20066, '杭州', '浙江大学', '设计学', 'verified' UNION ALL
SELECT 20067, '杭州', '浙江大学', '电子信息', 'verified' UNION ALL
SELECT 20068, '杭州', '浙江大学', '机械工程', 'verified' UNION ALL
SELECT 20069, '南京', '南京大学', '计算机科学与技术', 'verified' UNION ALL
SELECT 20070, '南京', '南京大学', '汉语言文学', 'verified' UNION ALL
SELECT 20071, '南京', '南京大学', '经济学', 'verified' UNION ALL
SELECT 20072, '武汉', '武汉大学', '设计学', 'verified' UNION ALL
SELECT 20073, '武汉', '武汉大学', '电子信息', 'verified' UNION ALL
SELECT 20074, '武汉', '武汉大学', '机械工程', 'verified' UNION ALL
SELECT 20075, '南京', '东南大学', '计算机科学与技术', 'verified' UNION ALL
SELECT 20076, '南京', '东南大学', '汉语言文学', 'verified' UNION ALL
SELECT 20077, '南京', '东南大学', '经济学', 'verified' UNION ALL
SELECT 20078, '广州', '广州大学', '设计学', 'verified' UNION ALL
SELECT 20079, '广州', '广州大学', '电子信息', 'verified' UNION ALL
SELECT 20080, '广州', '广州大学', '机械工程', 'verified' UNION ALL
SELECT 20081, '广州', '广州大学', '计算机科学与技术', 'verified' UNION ALL
SELECT 20082, '上海', '上海交通大学', '汉语言文学', 'verified' UNION ALL
SELECT 20083, '上海', '上海交通大学', '经济学', 'verified' UNION ALL
SELECT 20084, '上海', '上海交通大学', '设计学', 'verified' UNION ALL
SELECT 20085, '上海', '上海交通大学', '电子信息', 'verified' UNION ALL
SELECT 20086, '广州', '中山大学', '机械工程', 'verified' UNION ALL
SELECT 20087, '广州', '中山大学', '计算机科学与技术', 'verified' UNION ALL
SELECT 20088, '广州', '中山大学', '汉语言文学', 'verified' UNION ALL
SELECT 20089, '广州', '中山大学', '经济学', 'verified' UNION ALL
SELECT 20090, '武汉', '华中科技大学', '设计学', 'verified' UNION ALL
SELECT 20091, '武汉', '华中科技大学', '电子信息', 'verified' UNION ALL
SELECT 20092, '武汉', '华中科技大学', '机械工程', 'verified' UNION ALL
SELECT 20093, '武汉', '华中科技大学', '计算机科学与技术', 'verified' UNION ALL
SELECT 20094, '成都', '四川大学', '汉语言文学', 'verified' UNION ALL
SELECT 20095, '成都', '四川大学', '经济学', 'verified' UNION ALL
SELECT 20096, '成都', '四川大学', '设计学', 'verified' UNION ALL
SELECT 20097, '成都', '四川大学', '电子信息', 'verified' UNION ALL
SELECT 20098, '西安', '西安交通大学', '机械工程', 'verified' UNION ALL
SELECT 20099, '西安', '西安交通大学', '计算机科学与技术', 'verified' UNION ALL
SELECT 10100, '西安', '西安交通大学', '汉语言文学', 'verified' UNION ALL
SELECT 10101, '西安', '西安交通大学', '经济学', 'verified' UNION ALL
SELECT 10102, '哈尔滨', '哈尔滨工业大学', '设计学', 'verified' UNION ALL
SELECT 10103, '哈尔滨', '哈尔滨工业大学', '电子信息', 'verified' UNION ALL
SELECT 10104, '哈尔滨', '哈尔滨工业大学', '机械工程', 'verified' UNION ALL
SELECT 10105, '天津', '南开大学', '计算机科学与技术', 'verified' UNION ALL
SELECT 10106, '天津', '南开大学', '汉语言文学', 'verified' UNION ALL
SELECT 10107, '天津', '南开大学', '经济学', 'verified' UNION ALL
SELECT 10108, '天津', '南开大学', '设计学', 'verified' UNION ALL
SELECT 10109, '上海', '同济大学', '电子信息', 'verified' UNION ALL
SELECT 10110, '上海', '同济大学', '机械工程', 'verified' UNION ALL
SELECT 10111, '上海', '同济大学', '计算机科学与技术', 'verified' UNION ALL
SELECT 10112, '上海', '同济大学', '汉语言文学', 'verified' UNION ALL
SELECT 10113 AS user_id, '北京' AS city_name, '中国人民大学' AS campus_name, '经济学' AS department_name, 'verified' AS verification_status UNION ALL
SELECT 10114 AS user_id, '北京' AS city_name, '中国人民大学' AS campus_name, '设计学' AS department_name, 'verified' AS verification_status UNION ALL
SELECT 10115 AS user_id, '北京' AS city_name, '中国人民大学' AS campus_name, '电子信息' AS department_name, 'verified' AS verification_status UNION ALL
SELECT 10116 AS user_id, '北京' AS city_name, '中国人民大学' AS campus_name, '机械工程' AS department_name, 'verified' AS verification_status
) v
JOIN schools s ON s.name = v.campus_name
WHERE NOT EXISTS (SELECT 1 FROM user_campus_profile p WHERE p.user_id IN (20057,20058,20059,20060,20061,20062,20063,20064,20065,20066,20067,20068,20069,20070,20071,20072,20073,20074,20075,20076,20077,20078,20079,20080,20081,20082,20083,20084,20085,20086,20087,20088,20089,20090,20091,20092,20093,20094,20095,20096,20097,20098,20099,10100,10101,10102,10103,10104,10105,10106,10107,10108,10109,10110,10111,10112,10113,10114,10115,10116));

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DELETE FROM user_campus_profile WHERE user_id BETWEEN 20057 AND 10116;
-- DELETE FROM users WHERE id BETWEEN 20057 AND 10116;
-- DELETE FROM schools WHERE code IN ('PKU','THU','GZU','SJTU','SYSU','HUST','SCU','XJTU','HIT','NKU','TJU','RUC');
