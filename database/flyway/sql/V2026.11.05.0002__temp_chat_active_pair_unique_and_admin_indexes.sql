-- =====================================================================
-- V2026.11.05.0002__temp_chat_active_pair_unique_and_admin_indexes.sql
-- R17 数据库审计修复辑（2026-11-05）。
--
-- 1) P2：temp_chat_session 补「同一对用户仅一条活跃会话」的 DB 级唯一约束。
--    缺陷：创建临时聊天是双入口热路径（推荐列表开聊 + 心动信号开聊），服务层只有
--    @Transactional check-then-insert（findActiveByUserPair 返回 Optional），无唯一键
--    兜底；两个并发请求同插后，findActiveByUserPair 对重复活跃对抛
--    IncorrectResultSizeDataAccessException——该对用户的临时聊天列表、消息、联系交换
--    全部持久 500，且清理任务按 phase+closes_at 扫描救不回读取路径。
--    方案：生成列 active_pair_key = CASE WHEN phase IN ('matching','active')
--    THEN CONCAT(LEAST(user_a_id,user_b_id),'-',GREATEST(user_a_id,user_b_id)) ELSE NULL END，
--    MySQL 唯一键允许多行 NULL ⇒ 只有活跃会话各占一个键槽；会话关闭/过期后键自动为
--    NULL（应用层无需维护，phase 翻转即失效），同对用户日后可再次开聊。
--    去重现状与风险（诚实声明，沿用 V2026.11.01.0001 形态）：迁移先对存量重复活跃对
--    去重（保留 MIN(id)，其余置 expired + closed_reason='deduped_r17'——重复行本就
--    不可达（findActiveByUserPair 抛异常），置 expired 是把它们交还清理任务回收），
--    保证加约束不因存量重复行失败。
--    应用层配套：createSession 捕获 duplicate-key（DataIntegrityViolationException）
--    回读已有活跃会话幂等返回（见 TempChatSessionService）。
--
-- 2) P3 管理端查询索引补齐（数据库审计 P3 组）：
--    a) interaction_events(created_at)：countByCreatedAtAfter/Between 全局 COUNT
--       无索引（该表只有 user_id 前缀系列），管理端仪表盘每次刷新全表扫；
--       表随互动线性增长。
--    b) posts(owner_circle_path) / comments(owner_circle_path)：V2026.10.13.0002 新增列
--       未建索引，村口管理列表用作 = / 前缀 LIKE / IS NULL 过滤，每页全表扫。
--    c) check_ins(created_at)：管理端积分流水无 userId 筛选时 ORDER BY created_at
--       全表扫+filesort（该表只有 (user_id,created_at)/(user_id,check_in_date)/(source)）。
--
-- 幂等：沿用本仓既有形态（V2026.11.01.0001 的 information_schema 判断 +
-- PREPARE/EXECUTE）。列/索引已存在时对应 DDL 段是 no-op。
-- =====================================================================

-- ---- 1. 存量重复活跃对去重：同一对用户保留 MIN(id)，其余置 expired ----
UPDATE temp_chat_session t
JOIN (
    SELECT MIN(id) AS keep_id,
           LEAST(user_a_id, user_b_id) AS pair_lo,
           GREATEST(user_a_id, user_b_id) AS pair_hi
    FROM temp_chat_session
    WHERE phase IN ('matching', 'active')
    GROUP BY LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id)
    HAVING COUNT(*) > 1
) d ON t.id <> d.keep_id
   AND LEAST(t.user_a_id, t.user_b_id) = d.pair_lo
   AND GREATEST(t.user_a_id, t.user_b_id) = d.pair_hi
   AND t.phase IN ('matching', 'active')
SET t.phase = 'expired',
    t.closed_reason = 'deduped_r17',
    t.closes_at = LEAST(t.closes_at, NOW()),
    t.updated_at = NOW();

-- ---- 2. 加生成列 active_pair_key（不存在才加）----
SET @has_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'temp_chat_session'
      AND COLUMN_NAME = 'active_pair_key'
);
SET @sql := IF(
    @has_col = 0,
    'ALTER TABLE temp_chat_session ADD COLUMN active_pair_key VARCHAR(64) '
        || 'GENERATED ALWAYS AS (CASE WHEN phase IN (''matching'',''active'') '
        || 'THEN CONCAT(LEAST(user_a_id, user_b_id), ''-'', GREATEST(user_a_id, user_b_id)) '
        || 'ELSE NULL END) STORED COMMENT ''活跃对去重键（生成列）：仅 matching/active 非空，'
        || '关闭/过期自动为 NULL；R17 加固''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---- 3. 加唯一键 uk_temp_chat_active_pair（不存在才加）----
SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'temp_chat_session'
      AND INDEX_NAME = 'uk_temp_chat_active_pair'
);
SET @sql := IF(
    @has_idx = 0,
    'ALTER TABLE temp_chat_session ADD UNIQUE KEY uk_temp_chat_active_pair (active_pair_key)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---- 4. 管理端索引补齐（不存在才加）----
SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'interaction_events'
      AND INDEX_NAME = 'idx_interaction_events_created'
);
SET @sql := IF(
    @has_idx = 0,
    'ALTER TABLE interaction_events ADD KEY idx_interaction_events_created (created_at)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'posts'
      AND INDEX_NAME = 'idx_posts_owner_circle_path'
);
SET @sql := IF(
    @has_idx = 0,
    'ALTER TABLE posts ADD KEY idx_posts_owner_circle_path (owner_circle_path)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'comments'
      AND INDEX_NAME = 'idx_comments_owner_circle_path'
);
SET @sql := IF(
    @has_idx = 0,
    'ALTER TABLE comments ADD KEY idx_comments_owner_circle_path (owner_circle_path)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'check_ins'
      AND INDEX_NAME = 'idx_check_ins_created'
);
SET @sql := IF(
    @has_idx = 0,
    'ALTER TABLE check_ins ADD KEY idx_check_ins_created (created_at)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================================
-- DOWN 回滚脚本（手动执行；Flyway 社区版不做自动回滚）
-- =====================================================================
-- ALTER TABLE temp_chat_session DROP INDEX uk_temp_chat_active_pair;
-- ALTER TABLE temp_chat_session DROP COLUMN active_pair_key;
-- ALTER TABLE interaction_events DROP INDEX idx_interaction_events_created;
-- ALTER TABLE posts DROP INDEX idx_posts_owner_circle_path;
-- ALTER TABLE comments DROP INDEX idx_comments_owner_circle_path;
-- ALTER TABLE check_ins DROP INDEX idx_check_ins_created;
