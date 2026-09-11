-- R3 审计（2026-09-10）：帖子图文语义修复 + 演示资料修正 + 帖子互动补齐
-- 背景：4 名无记忆 judge 对 20 张截图对抗审查，判定种子数据存在图文不匹配
-- 热气球图配「操场晚霞」、车内补觉图配「图书馆自习」，破坏社区可信度。
-- 注意：MySQL 行内注释必须为 -- 加空格开头，否则报 1064 语法错误。
-- 原则：全部为幂等 UPDATE/INSERT（条件命中才生效），可重复执行。

-- 1) 「操场晚霞」帖：post-7.jpg（热气球）→ 黄昏球场 basketball.png
UPDATE posts
   SET images = JSON_ARRAY('/static/assets/images/covers/basketball.png')
 WHERE content LIKE '%操场跑步遇到了很美的晚霞%'
   AND JSON_UNQUOTE(JSON_EXTRACT(images, '$[0]')) = '/static/assets/images/posts/post-7.jpg';

-- 2) 「图书馆晚霞」帖：campus-library.jpg（实为车内人像，素材内容与命名不符）→ 校园黄昏 campus-main.png
UPDATE posts
   SET images = JSON_ARRAY('/static/assets/images/covers/campus-main.png')
 WHERE title LIKE '%图书馆晚霞%'
   AND JSON_UNQUOTE(JSON_EXTRACT(images, '$[0]')) = '/static/assets/images/posts/campus-library.jpg';

-- 3) 其余「图书馆/自习/书店/读书」帖：campus-library.jpg / post-7.jpg → 阅读 circle-reading.png
UPDATE posts
   SET images = JSON_ARRAY('/static/assets/images/covers/circle-reading.png')
 WHERE (title LIKE '%图书馆%' OR title LIKE '%旧书店%' OR title LIKE '%读书%'
        OR title LIKE '%小王子%' OR title LIKE '%哲学课%' OR title LIKE '%书单%' OR title LIKE '%读书会%')
   AND (JSON_UNQUOTE(JSON_EXTRACT(images, '$[0]')) = '/static/assets/images/posts/campus-library.jpg'
        OR JSON_UNQUOTE(JSON_EXTRACT(images, '$[0]')) = '/static/assets/images/posts/post-7.jpg');

-- 4) 音乐会/聚餐/旅行/日出/电影/交友：post-7.jpg 按语义轮换到既有素材
UPDATE posts SET images = JSON_ARRAY('/static/assets/images/posts/post-4.jpg')
 WHERE images LIKE '%post-7.jpg%' AND (title LIKE '%音乐会%' OR title LIKE '%好好吃饭%' OR title LIKE '%餐厅%');
UPDATE posts SET images = JSON_ARRAY('/static/assets/images/posts/post-6.jpg')
 WHERE images LIKE '%post-7.jpg%' AND title LIKE '%旅行%';
UPDATE posts SET images = JSON_ARRAY('/static/assets/images/posts/post-8.jpg')
 WHERE images LIKE '%post-7.jpg%' AND (title LIKE '%爬山看日出%' OR title LIKE '%登山%');
UPDATE posts SET images = JSON_ARRAY('/static/assets/images/posts/post-placeholder.jpg')
 WHERE images LIKE '%post-7.jpg%' AND (title LIKE '%电影社%' OR title LIKE '%流星雨%' OR title LIKE '%夜景%');
UPDATE posts SET images = JSON_ARRAY('/static/assets/images/posts/post-5.jpg')
 WHERE images LIKE '%post-7.jpg%' AND title LIKE '%想认识新朋友%';

-- 5) 小满(10003, 女) 半身照原为男性素材 person-03.png → 女性 person-02.png（他人主页封面性别自洽）
UPDATE user_basic_profile
   SET half_body_photo_url = '/static/assets/images/people/person-02.png'
 WHERE user_id = 10003
   AND half_body_photo_url = '/static/assets/images/people/person-03.png';

-- 6) 帖子 221（今日日常：图书馆自习+操场跑步）互动数为 0，补演示点赞与评论（真实产品观感）
INSERT INTO post_likes (user_id, post_id)
SELECT u.id, 221 FROM users u
 WHERE u.id IN (10001,10002,10004,10005,10006,10007,10008,10009,10010,10011,10012,10013)
   AND NOT EXISTS (SELECT 1 FROM post_likes pl WHERE pl.user_id = u.id AND pl.post_id = 221);

INSERT INTO comments (post_id, author_id, content, created_at)
SELECT 221, 10005, '图书馆四楼靠窗的位置最舒服了，下次一起去！', NOW() - INTERVAL 20 HOUR
 WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id = 221 AND author_id = 10005);
INSERT INTO comments (post_id, author_id, content, created_at)
SELECT 221, 10008, '晚上操场跑步真的太治愈了，赞一个～', NOW() - INTERVAL 15 HOUR
 WHERE NOT EXISTS (SELECT 1 FROM comments WHERE post_id = 221 AND author_id = 10008);

UPDATE posts
   SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = 221),
       comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = 221)
 WHERE id = 221;
