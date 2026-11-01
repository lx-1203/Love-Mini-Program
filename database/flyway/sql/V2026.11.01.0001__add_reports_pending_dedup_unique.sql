-- =====================================================================
-- V2026.11.01.0001__add_reports_pending_dedup_unique.sql
-- C1(a)（2026-11 第六轮修复波 W1）：给 reports 补「活跃举报去重键」业务唯一约束。
--
-- 缺陷：reports 表无任何唯一键，同一举报人对同一目标（reporter_id,target_type,target_id）
--   可重复立案（双击/连点/并发都各插一行），审核队列被同一投诉塞满。@Idempotent 只防
--   「同一次逻辑调用被送达两次」，不防「两次独立点击」，判据应当是业务唯一键。
--
-- 方案：新增可空列 pending_dedup_key，服务端在建单时派生为
--   CONCAT(reporter_id,':',target_type,':',target_id)，并对该列加唯一键 uk_reports_pending_dedup。
--   MySQL 唯一键允许多行 NULL ⇒ 只有「活跃(PENDING)」举报各占一个非空键，
--   工单结案（HANDLED/REJECTED）时应用层把该列置回 NULL，既保留历史、又允许日后再次举报。
--
-- 去重现状与风险（诚实声明）：
--   * 本文件不查询现网数据（本机无库、应用账号对 campus_love 无写权限），
--     故用「先去重再加约束」的写法保证加约束不会因存量重复行而失败：
--     回填后，对同一 pending_dedup_key 的多条 PENDING 仅保留 MIN(id)，其余置 NULL。
--   * 置 NULL 而非删除，保留历史投诉；被置 NULL 的旧 PENDING 行不再占用唯一槽位。
--
-- 幂等：沿用本仓既有形态（V2026.10.13.0002 的 SET @has_col + IF + PREPARE/EXECUTE，
--   以及 V2026.10.05.0011 的 information_schema.STATISTICS 索引存在性判断）。
--   列/索引已存在时对应 DDL 段是 no-op。
-- =====================================================================

-- ---- 1. 加列 pending_dedup_key（不存在才加）----
SET @has_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'reports'
      AND COLUMN_NAME = 'pending_dedup_key'
);
SET @sql := IF(
    @has_col = 0,
    'ALTER TABLE reports ADD COLUMN pending_dedup_key VARCHAR(256) NULL DEFAULT NULL COMMENT ''活跃举报去重键：reporter_id:target_type:target_id；结案置 NULL'' AFTER handled_at',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---- 2. 回填现存 PENDING 行的去重键 ----
UPDATE reports
SET pending_dedup_key = CONCAT(reporter_id, ':', target_type, ':', target_id)
WHERE status = 'PENDING'
  AND pending_dedup_key IS NULL;

-- ---- 3. 去重：同一 pending_dedup_key 的多条 PENDING 仅保留 MIN(id)，其余置 NULL ----
UPDATE reports r
JOIN (
    SELECT pending_dedup_key AS k, MIN(id) AS keep_id
    FROM reports
    WHERE status = 'PENDING' AND pending_dedup_key IS NOT NULL
    GROUP BY pending_dedup_key
    HAVING COUNT(*) > 1
) dup ON r.pending_dedup_key = dup.k
SET r.pending_dedup_key = NULL
WHERE r.id <> dup.keep_id;

-- ---- 4. 加唯一键 uk_reports_pending_dedup（不存在才加）----
SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'reports'
      AND INDEX_NAME = 'uk_reports_pending_dedup'
);
SET @sql := IF(
    @has_idx = 0,
    'ALTER TABLE reports ADD UNIQUE KEY uk_reports_pending_dedup (pending_dedup_key)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================================
-- DOWN 回滚脚本（手动执行；Flyway 社区版不做自动回滚）
-- =====================================================================
-- ALTER TABLE reports DROP INDEX uk_reports_pending_dedup;
-- ALTER TABLE reports DROP COLUMN pending_dedup_key;
