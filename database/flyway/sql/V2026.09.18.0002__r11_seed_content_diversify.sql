-- ============================================================
-- 迁移：R11 Phase4 数据质量治理（2026-09-18）
-- 1) 清理 QA 验收残留帖（222/223/224，作者为 guest/QA 账号）
-- 2) 种子同文案模板组轮换改写：讨论圈/社区流不再同句霸榜
--    （根因：V2026.08.07.0022 种子每模板命中 ~1/5 用户，同模板 9-12 连发）
-- 幂等：LIKE 条件命中才改写；改写后短语互不回命中。
-- ============================================================

-- ========== 1. QA 残留清理 ==========
DELETE FROM post_likes WHERE post_id IN (
  SELECT id FROM posts WHERE id IN (222,223,224)
    AND (author_id = 100151 OR author_id = 100155
         OR title LIKE '%验收%' OR content LIKE '%全链路验收%'));
DELETE FROM post_favorites WHERE post_id IN (
  SELECT id FROM posts WHERE id IN (222,223,224)
    AND (author_id = 100151 OR author_id = 100155
         OR title LIKE '%验收%' OR content LIKE '%全链路验收%'));
DELETE FROM comments WHERE post_id IN (
  SELECT id FROM posts WHERE id IN (222,223,224)
    AND (author_id = 100151 OR author_id = 100155
         OR title LIKE '%验收%' OR content LIKE '%全链路验收%'));
DELETE FROM posts
 WHERE id IN (222,223,224)
   AND (author_id IN (100151, 100155)
        OR title LIKE '%验收%' OR content LIKE '%全链路验收%');

-- ========== 2. 模板组轮换改写（每组保留原句为 MOD 0，另写 3 个同主题变体） ==========

-- 组1 小王子读书（12 连发）
UPDATE posts SET content = CASE MOD((id DIV 6) + (id MOD 6), 4)
  WHEN 1 THEN '重读《小王子》第三章，狐狸说「驯养就是建立联系」，突然理解了为什么有些相遇与众不同。'
  WHEN 2 THEN '睡前翻了翻《小王子》，这次读到点灯人的星球，觉得坚持一件小事本身就挺浪漫的。'
  WHEN 3 THEN '小时候读《小王子》只当童话，现在重看才发现满本都是大人们弄丢的东西。'
  ELSE content END
 WHERE content LIKE '最近在读《小王子》%';

-- 组2 想认识新朋友（11）
UPDATE posts SET content = CASE MOD((id DIV 6) + (id MOD 6), 4)
  WHEN 1 THEN '刚来这个圈子报到，喜欢看电影和压马路，欢迎来找我聊天呀。'
  WHEN 2 THEN '社恐但想认识新朋友，如果你也慢热，我们可以一起慢慢熟起来。'
  WHEN 3 THEN '交个朋友吧！感兴趣的话题超多，从食堂菜谱聊到宇宙起源都可以。'
  ELSE content END
 WHERE content LIKE '想认识新朋友，欢迎来聊聊天%';

-- 组3 课结束去旅行（11）
UPDATE posts SET content = CASE MOD((id DIV 6) + (id MOD 6), 4)
  WHEN 1 THEN '考完最后一科啦，做了份周边城市两日游攻略，有没有想拼车同行的。'
  WHEN 2 THEN '这学期终于收尾，攒了半学期的生活费准备去看海，想想就很激动。'
  WHEN 3 THEN '假期倒计时！打算去古镇住两晚，不看攻略随便走走的那种旅行。'
  ELSE content END
 WHERE content LIKE '这学期的课终于快结束了%';

-- 组4 好吃的餐厅（11）
UPDATE posts SET content = CASE MOD((id DIV 6) + (id MOD 6), 4)
  WHEN 1 THEN '后街新开的那家砂锅粥真的绝，已经拉着室友去打卡两次了，想安利给所有人。'
  WHEN 2 THEN '被一家苍蝇小馆的糖醋排骨惊艳到，老板娘还多送了例汤，下次带你们去。'
  WHEN 3 THEN '探店报告：巷口那家葱油饼排队二十分钟也值得，酥脆掉渣，配豆浆一绝。'
  ELSE content END
 WHERE content LIKE '发现了一家超好吃的餐厅%';

-- 组5 一个人好好吃饭（11）
UPDATE posts SET content = CASE MOD((id DIV 6) + (id MOD 6), 4)
  WHEN 1 THEN '给自己煮了碗加了溏心蛋的阳春面，热汤下肚的瞬间，孤独感也被治愈了。'
  WHEN 2 THEN '一个人也要认真吃早餐呀，今天的三明治煎得边缘焦焦的，很成功。'
  WHEN 3 THEN '独自去吃了顿小火锅，不用迁就任何人的口味，锅底全辣，快乐加倍。'
  ELSE content END
 WHERE content LIKE '一个人也要好好吃饭%';

-- 组6 旧书店淘诗集（10）
UPDATE posts SET content = CASE MOD((id DIV 6) + (id MOD 6), 4)
  WHEN 1 THEN '周末在旧书市场淘到一本八几年的诗集，扉页还有上一位主人的赠言，好浪漫的际遇。'
  WHEN 2 THEN '二手书店真是宝藏，今天翻到一本泛黄的散文集，坐在窗边读了半小时舍不得走。'
  WHEN 3 THEN '淘书日记：用十五块钱买回了三本旧书和一个下午的快乐。'
  ELSE content END
 WHERE content LIKE '周末去逛了校园的旧书店%';

-- 组7 图书馆下午阳光（9）
UPDATE posts SET content = CASE MOD((id DIV 6) + (id MOD 6), 4)
  WHEN 1 THEN '图书馆四楼靠窗的位置太难抢了，但抢到的那一刻，觉得整个下午都值了。'
  WHEN 2 THEN '在图书馆复习到抬头，窗外的树影晃啊晃，突然觉得安静努力的日子在发光。'
  WHEN 3 THEN '下午的图书馆，阳光、书页、笔尖沙沙声，是校园里最治愈的白噪音。'
  ELSE content END
 WHERE content LIKE '图书馆的下午，阳光透过窗户洒在书页上%';

-- 组8 爬山看日出（9）
UPDATE posts SET content = CASE MOD((id DIV 6) + (id MOD 6), 4)
  WHEN 1 THEN '凌晨四点出发爬山，日出跳出云海的那一秒，全世界的瞌睡都值了。'
  WHEN 2 THEN '和社团一起夜爬看日出，山顶的风很冷，但大家分着喝的热豆浆很暖。'
  WHEN 3 THEN '第一次看山间日出，云一层层被点亮，忽然明白为什么有人愿意反复早起。'
  ELSE content END
 WHERE content LIKE '和社团的朋友一起去爬山看日出%';

-- 组9 学做甜点（9）
UPDATE posts SET content = CASE MOD((id DIV 6) + (id MOD 6), 4)
  WHEN 1 THEN '烘焙日记：第二次做提拉米苏终于不塌了，马斯卡彭的香气铺满整个宿舍楼道。'
  WHEN 2 THEN '跟着教程做了芒果班戟，卖相七分味道九分，室友们抢着吃就是最好的评价。'
  WHEN 3 THEN '周末烘焙挑战曲奇，挤花挤到手酸，出炉那刻的黄油香就是最好的奖励。'
  ELSE content END
 WHERE content LIKE '最近在学做甜点%';

-- 组10 音乐会爵士演出（9）
UPDATE posts SET content = CASE MOD((id DIV 6) + (id MOD 6), 4)
  WHEN 1 THEN '抢到周五晚的爵士现场，想去感受一把萨克斯在耳边转弯的夜晚，有同行的吗。'
  WHEN 2 THEN '学校音乐厅的弦乐四重奏票不贵，打算去接受一次艺术的熏陶，回来写听后感。'
  WHEN 3 THEN '歌单里循环了一周的歌，现场版居然就在本市演出，这必须得去圆梦。'
  ELSE content END
 WHERE content LIKE '想找个人一起去听音乐会%';
