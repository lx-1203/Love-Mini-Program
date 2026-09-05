-- ============================================================
-- V2026.09.01.0004: 兴趣圈去重——删除「摄影圈子」（保留「摄影」）
-- ============================================================
-- 报告 P3-9：seed 数据中「摄影圈子」与「摄影」可能并存。
-- 保留「摄影」并归并其下话题/成员后再删除「摄影圈子」。
--
-- 幂等性说明：
--   - 若「摄影圈子」已不存在（本库实测仅剩「摄影」id=8），全部步骤无操作；
--   - 表名以实际 schema 为准：circle_topics / circle_memberships / interest_circles
--     （早期 draft 用 interest_circle_topics 等，已按真实表名修正）。
-- ============================================================

-- 0. 若「摄影圈子」不存在 → 直接结束（幂等空操作）
SET @dup_exists = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'interest_circles'
);
SET @dup_exists = (
  SELECT COUNT(*) FROM interest_circles WHERE name = '摄影圈子'
);

-- 1. 把「摄影圈子」下的话题归并到「摄影」（相同标题的话题计数相加）
SET @sql = IF(@dup_exists = 0, 'SELECT 1', '
  UPDATE circle_topics t1
  JOIN interest_circles c1 ON t1.circle_id = c1.id AND c1.name = ''摄影圈子''
  JOIN interest_circles c2 ON c2.name = ''摄影''
  LEFT JOIN circle_topics t2 ON t2.circle_id = c2.id AND t2.title = t1.title
  SET t1.circle_id = c2.id,
      t1.reply_count = t1.reply_count + COALESCE(t2.reply_count, 0)
  WHERE t2.id IS NULL
');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 删除「摄影圈子」下已归并的话题（重复标题）
SET @sql = IF(@dup_exists = 0, 'SELECT 1', '
  DELETE t1
  FROM circle_topics t1
  JOIN interest_circles c1 ON t1.circle_id = c1.id AND c1.name = ''摄影圈子''
');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. 把「摄影圈子」成员归并到「摄影」（不同用户，去重插入）
SET @sql = IF(@dup_exists = 0, 'SELECT 1', '
  INSERT IGNORE INTO circle_memberships (circle_id, user_id, joined_at)
  SELECT c2.id, m.user_id, m.joined_at
  FROM circle_memberships m
  JOIN interest_circles c1 ON m.circle_id = c1.id AND c1.name = ''摄影圈子''
  JOIN interest_circles c2 ON c2.name = ''摄影''
');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. 删除「摄影圈子」成员记录
SET @sql = IF(@dup_exists = 0, 'SELECT 1', '
  DELETE m
  FROM circle_memberships m
  JOIN interest_circles c1 ON m.circle_id = c1.id AND c1.name = ''摄影圈子''
');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. 删除「摄影圈子」自身
SET @sql = IF(@dup_exists = 0, 'SELECT 1', '
  DELETE FROM interest_circles
  WHERE name = ''摄影圈子''
    AND id <> (SELECT min_id FROM (SELECT MIN(id) AS min_id FROM interest_circles WHERE name=''摄影'') AS t)
');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
