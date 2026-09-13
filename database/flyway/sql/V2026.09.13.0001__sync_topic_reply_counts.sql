-- V2026.09.13.0001: 全量同步话题回复计数与回复明细（独立审查 IA-TOPIC-01，Round-4）
--
-- 现象：2026-08 系列种子在 circle_topics.reply_count 写入演示计数，但未造对应
-- circle_replies 行 → 话题详情「回复 5」徽标与「暂无回复」同屏自相矛盾
-- （V2026.09.12.0005 只覆盖了 34~37 四个话题，本次按审查建议全量对齐）。
--
-- 修复：reply_count 一律重算为 circle_replies 真实行数。数据完整性优先于
-- 演示观感——注水假计数正是本缺陷根因，不再批量伪造回复内容。
-- 语句可重放（每次都按当前明细重算），无破坏性。

UPDATE circle_topics t
SET t.reply_count = (
    SELECT COUNT(*) FROM circle_replies r WHERE r.topic_id = t.id
)
WHERE EXISTS (SELECT 1 FROM circle_replies r2 WHERE r2.topic_id = t.id)
   OR t.reply_count <> 0;
