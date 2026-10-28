-- 2026-10-28 产品缺口 API 冒烟 QA 数据清理（只清本轮新增）
START TRANSACTION;
UPDATE posts SET status='deleted', updated_at=NOW() WHERE id IN (431,432);
DELETE FROM post_mentions WHERE post_id IN (431,432);
DELETE FROM notifications WHERE type='mention' AND reference_id IN (431,432);
DELETE FROM pass_records WHERE user_id IN (100255,100256) AND passed_user_id=100171;
DELETE FROM circle_topic_likes WHERE user_id IN (100255,100256);
COMMIT;
