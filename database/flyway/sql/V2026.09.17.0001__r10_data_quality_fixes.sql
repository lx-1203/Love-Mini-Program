-- ============================================================
-- 迁移：R10 数据质量修复（2026-09-17 全站审查 P3 批次）
-- 对应报告：reports/audit/2026-09-17-r10-visual/audit-report.md
--   P3-015 审计残留数据清理（Round-7/8 验收帖、聊天验证消息、浏览残留）
--   P3-019 官方助手消息内容修正（季节错位 / 商业化封存期推币类文案矛盾）
--   P3-018 讨论圈同文案帖子多次霸榜 → 种子文案按 id 扰动去重
-- 原则：全部为幂等 UPDATE/DELETE（条件命中才生效），可重复执行。
-- 注意：MySQL 行内注释必须为 -- 加空格开头，否则报 1064 语法错误。
-- ============================================================

-- ========== 1. P3-015：审计残留数据清理 ==========

-- 1.1 QA 账号（曦风 100158 / 小新生 100159）的验收打卡帖 + 周边互动
DELETE FROM post_likes
 WHERE post_id IN (SELECT id FROM posts
                    WHERE author_id IN (100158, 100159)
                      AND (content LIKE '%Round-%' OR title LIKE '%Round-%'));
DELETE FROM post_favorites
 WHERE post_id IN (SELECT id FROM posts
                    WHERE author_id IN (100158, 100159)
                      AND (content LIKE '%Round-%' OR title LIKE '%Round-%'));
DELETE FROM comments
 WHERE post_id IN (SELECT id FROM posts
                    WHERE author_id IN (100158, 100159)
                      AND (content LIKE '%Round-%' OR title LIKE '%Round-%'));
DELETE FROM posts
 WHERE author_id IN (100158, 100159)
   AND (content LIKE '%Round-%' OR title LIKE '%Round-%');

-- 1.2 聊天验证残留（Round-8 audit: chat send verification）
DELETE FROM private_messages WHERE content LIKE '%Round-8 audit%';
DELETE FROM temp_chat_message WHERE body LIKE '%Round-%audit%';

-- 1.3 QA 账号浏览残留（指向已删帖子的浏览历史）
DELETE FROM post_view_history
 WHERE user_id IN (100158, 100159)
   AND post_id NOT IN (SELECT id FROM posts);

-- ========== 2. P3-019：官方助手消息内容修正 ==========

-- 2.1 季节错位：9 月推「春季联谊会」→ 改为季节无关表述
UPDATE official_messages
   SET content = '本周社团联谊会开始报名啦！名额有限，手慢无。'
 WHERE id = 11 AND content LIKE '%春季联谊会%';

-- 2.2 封存矛盾：commerce.coin/vip 缺省封存期，不下发币类/会员解锁承诺 → 改为功能引导
UPDATE official_messages
   SET content = '完善个人资料、完成校园认证，可以解锁更多匹配与互动功能哦～'
 WHERE id = 12 AND content LIKE '%签到奖励已更新%';

UPDATE official_messages
   SET content = '进入消息页「喜欢你 / 访客」入口，看看谁关注了你～'
 WHERE id = 2 AND content LIKE '%交友币解锁%';

UPDATE official_messages
   SET content = '资料越完善，匹配越精准；完成实名认证还能提升信任度哦～'
 WHERE id = 4 AND content LIKE '%开通会员%';

UPDATE official_messages
   SET content = '坚持每日签到，记录你的校园恋爱进度吧！'
 WHERE id = 5 AND content LIKE '%签到可领交友币%';

-- ========== 3. P3-018：种子同文案帖子按 id 扰动（讨论圈不再同句霸榜） ==========
-- 原 V2026.08.07.0022 种子中 u.id MOD 6 = 5 的用户全部发同一句「操场晚霞」，
-- 热度排序后讨论圈同句重复 3 次。注意：这批帖子 id 等差为 6（MOD(id,6) 恒定），
-- 扰动基数须用 ((id - 1) DIV 6)，按发帖序号轮换 6 种同主题改写。
UPDATE posts
   SET content = CASE ((id - 1) DIV 6) MOD 6
       WHEN 0 THEN '今天在操场跑步遇到了很美的晚霞，随手拍了下来，分享给你们。'
       WHEN 1 THEN '傍晚绕着操场慢跑，抬头看见整片橘粉色的晚霞，一天的疲惫都没了。'
       WHEN 2 THEN '晚霞把操场染成了暖橘色，跑完步站在风里看了好久。'
       WHEN 3 THEN '跑步的意外收获：今天操场上空的晚霞美得像滤镜，可惜手机拍不出十分之一。'
       WHEN 4 THEN '晚跑途中停下拍了张晚霞，操场的黄昏真的百看不厌。'
       ELSE '傍晚的操场，晚霞、晚风和跑步的人，这就是校园里平凡又珍贵的一天。'
   END
 WHERE content LIKE '%操场跑步遇到了很美的晚霞%'
    OR content LIKE '%傍晚绕着操场慢跑%';
