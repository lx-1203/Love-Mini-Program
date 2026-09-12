-- V2026.09.12.0005: 修复话题回复计数与回复行脱节（2026-09-12 全站真实验收 Round-1）
--
-- 现象：话题详情页回复徽标显示 N（circle_topics.reply_count 由历史种子直接写入），
-- 但 circle_replies 无任何行，详情页呈现「回复 12 + 暂无回复」的自相矛盾状态。
--
-- 修复：为 2026-08-07 种子创建的 4 个话题（34 宿舍电煮锅食谱交换 / 35 柯基 meeting
-- 每周六 / 36 流浪猫投喂点地图更新 / 37 猫咪名字征集）按各自 reply_count 补齐真实
-- 回复行（6/4/8/12，共 22 条），作者轮转使用演示用户池 10001 ~ 10014，
-- 时间落在话题创建之后（话题均为 ~3 天前创建，回复取 4 ~ 66 小时前）。
--
-- 幂等：每条 INSERT ... SELECT 以「该话题当前回复数为 0」为整批守卫，可安全重放；
-- 部分插入的场景（已有部分回复）会被守卫跳过，需人工核对计数后清理再重放。

-- 34 宿舍电煮锅食谱交换 → 6 条
INSERT INTO circle_replies (topic_id, author_id, content, created_at)
SELECT 34, r.author_id, r.content, DATE_SUB(NOW(), INTERVAL r.hours_ago HOUR)
FROM (
    SELECT 10010 author_id, '芝士年糕那个求具体火候！我用三档功率总粘底' content, 64 hours_ago UNION ALL
    SELECT 10003, '可乐鸡翅一键焖试了，出锅前收一下汁绝了', 58 UNION ALL
    SELECT 10006, '收藏了，周末宿舍实践，成功了来返图', 51 UNION ALL
    SELECT 10012, '提醒一句：电煮锅别空烧，先放液体再放料', 33 UNION ALL
    SELECT 10005, '咖喱乌冬 +1，加半块芝士就是宿舍版咖喱锅', 20 UNION ALL
    SELECT 10008, '楼主直接开个食谱楼吧，我追更', 6
) r
WHERE (SELECT COUNT(*) FROM circle_replies WHERE topic_id = 34) = 0;

-- 35 柯基 meeting 每周六 → 4 条
INSERT INTO circle_replies (topic_id, author_id, content, created_at)
SELECT 35, r.author_id, r.content, DATE_SUB(NOW(), INTERVAL r.hours_ago HOUR)
FROM (
    SELECT 10002 author_id, '这周六带我家短腿来报到，第一次参加求带' content, 60 hours_ago UNION ALL
    SELECT 10011, '东门小公园风大，建议带个垫子放包', 47 UNION ALL
    SELECT 10007, '上周去了！柯基真的会自己排队互相闻，笑死', 30 UNION ALL
    SELECT 10014, 'MARK，等我家狗子疫苗打齐就加入', 12
) r
WHERE (SELECT COUNT(*) FROM circle_replies WHERE topic_id = 35) = 0;

-- 36 流浪猫投喂点地图更新 → 8 条
INSERT INTO circle_replies (topic_id, author_id, content, created_at)
SELECT 36, r.author_id, r.content, DATE_SUB(NOW(), INTERVAL r.hours_ago HOUR)
FROM (
    SELECT 10004 author_id, '南门传达室那个点是三花妈妈的固定食堂，感谢整理' content, 63 hours_ago UNION ALL
    SELECT 10009, '补一个：北区宿舍楼下车棚还有一只橘猫，亲人可摸', 55 UNION ALL
    SELECT 10001, '投喂记得用平底碗，塑料碗老被推翻', 49 UNION ALL
    SELECT 10013, '图书馆后门那只小黑最近在做驱虫，别喂太油的', 42 UNION ALL
    SELECT 10005, '要不要搞个接龙文档，谁有空谁去补粮', 35 UNION ALL
    SELECT 10010, '三食堂侧门的猫已经会蹲点等饭了，准点打卡', 26 UNION ALL
    SELECT 10002, '收藏这张地图，开学季流浪猫最缺粮', 15 UNION ALL
    SELECT 10006, '坐标已核实，昨天路过全都在', 6
) r
WHERE (SELECT COUNT(*) FROM circle_replies WHERE topic_id = 36) = 0;

-- 37 猫咪名字征集 → 12 条
INSERT INTO circle_replies (topic_id, author_id, content, created_at)
SELECT 37, r.author_id, r.content, DATE_SUB(NOW(), INTERVAL r.hours_ago HOUR)
FROM (
    SELECT 10003 author_id, '投汤圆！圆滚滚的很贴切' content, 66 hours_ago UNION ALL
    SELECT 10008, '煤球吧，黑猫都得叫这个（不是', 61 UNION ALL
    SELECT 10012, '布丁，叫起来软乎乎的', 57 UNION ALL
    SELECT 10001, '汤圆 +1，圆的就是好的', 52 UNION ALL
    SELECT 10005, '叫「三花」太直白了，但三花真的很美', 46 UNION ALL
    SELECT 10009, '投煤球，等它趴着就是一幅水墨画', 40 UNION ALL
    SELECT 10014, '布丁 +1，这个名单越看越饿', 34 UNION ALL
    SELECT 10004, '要不叫「后门」，出生地纪念款', 27 UNION ALL
    SELECT 10007, '汤圆煤球布丁都有了，凑一桌下午茶', 21 UNION ALL
    SELECT 10011, '跟风投汤圆，圆滚滚万岁', 14 UNION ALL
    SELECT 10006, '求楼主发张照片，不看猫没法投票', 9 UNION ALL
    SELECT 10013, '已经想好以后管它叫汤圆太太了', 4
) r
WHERE (SELECT COUNT(*) FROM circle_replies WHERE topic_id = 37) = 0;
