-- ============================================================
-- 迁移：论坛分页管理后台字段（村落动态置顶 + 校园圈话题状态/审核）
-- ============================================================
-- 背景：
--   管理后台「论坛分页管理」重构（eladmin 风格，每个论坛体系独立页面独立端点）需要：
--   1. posts.is_pinned —— 村落动态置顶/取消置顶（管理后台维护，村口列表置顶优先展示，
--      Post 实体新增 isPinned 字段，见 V2026.08.07.0017 配套实体变更）
--   2. campus_topics.status —— 校园圈话题状态（active/deleted/hidden），支持管理后台软删
--   3. campus_topics.audit_status / audit_remark / auditor_id / audited_at
--      —— 校园圈话题审核（通过/拒绝），与 posts 表审核字段语义对齐（V2026.06.25.0004）
--
-- 幂等性：information_schema 检查列存在性后 ADD COLUMN，可安全重跑。
-- 索引：status / audit_status 筛选场景各建一个索引（与 posts 表 idx_posts_audit_status 对齐）。
-- ============================================================

-- 1. posts 表新增 is_pinned 列（管理后台置顶）
SET @has_col_posts_pinned := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'posts'
      AND COLUMN_NAME = 'is_pinned'
);

SET @sql_posts_pinned := IF(
    @has_col_posts_pinned = 0,
    'ALTER TABLE posts ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否置顶（管理后台维护，村口列表置顶优先）''',
    'SELECT 1'
);
PREPARE stmt_posts_pinned FROM @sql_posts_pinned;
EXECUTE stmt_posts_pinned;
DEALLOCATE PREPARE stmt_posts_pinned;

-- 2. campus_topics 表新增 status 列（软删/隐藏）
SET @has_col_ct_status := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'campus_topics'
      AND COLUMN_NAME = 'status'
);

SET @sql_ct_status := IF(
    @has_col_ct_status = 0,
    'ALTER TABLE campus_topics ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT ''active'' COMMENT ''话题状态: active/deleted/hidden''',
    'SELECT 1'
);
PREPARE stmt_ct_status FROM @sql_ct_status;
EXECUTE stmt_ct_status;
DEALLOCATE PREPARE stmt_ct_status;

-- 3. campus_topics 表新增审核字段（与 posts 表 audit 语义对齐）
SET @has_col_ct_audit_status := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'campus_topics'
      AND COLUMN_NAME = 'audit_status'
);

SET @sql_ct_audit := IF(
    @has_col_ct_audit_status = 0,
    'ALTER TABLE campus_topics
        ADD COLUMN audit_status VARCHAR(16) NOT NULL DEFAULT ''approved'' COMMENT ''审核状态: pending/approved/rejected'' AFTER status,
        ADD COLUMN audit_remark VARCHAR(500) DEFAULT NULL COMMENT ''审核备注（拒绝原因等）'' AFTER audit_status,
        ADD COLUMN auditor_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''审核人用户 ID'' AFTER audit_remark,
        ADD COLUMN audited_at DATETIME DEFAULT NULL COMMENT ''审核时间'' AFTER auditor_id',
    'SELECT 1'
);
PREPARE stmt_ct_audit FROM @sql_ct_audit;
EXECUTE stmt_ct_audit;
DEALLOCATE PREPARE stmt_ct_audit;

-- 兜底：为存量话题回填默认值（视为已审核通过，避免影响线上展示）
UPDATE campus_topics SET status = 'active' WHERE status IS NULL OR status = '';
UPDATE campus_topics SET audit_status = 'approved' WHERE audit_status IS NULL OR audit_status = '';

-- 4. 索引：校园圈话题按状态 / 审核状态筛选
SET @has_idx_ct_status := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'campus_topics'
      AND INDEX_NAME = 'idx_campus_topics_status'
);

SET @sql_idx_ct_status := IF(
    @has_idx_ct_status = 0,
    'CREATE INDEX idx_campus_topics_status ON campus_topics (status)',
    'SELECT 1'
);
PREPARE stmt_idx_ct_status FROM @sql_idx_ct_status;
EXECUTE stmt_idx_ct_status;
DEALLOCATE PREPARE stmt_idx_ct_status;

SET @has_idx_ct_audit := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'campus_topics'
      AND INDEX_NAME = 'idx_campus_topics_audit_status'
);

SET @sql_idx_ct_audit := IF(
    @has_idx_ct_audit = 0,
    'CREATE INDEX idx_campus_topics_audit_status ON campus_topics (audit_status)',
    'SELECT 1'
);
PREPARE stmt_idx_ct_audit FROM @sql_idx_ct_audit;
EXECUTE stmt_idx_ct_audit;
DEALLOCATE PREPARE stmt_idx_ct_audit;

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- ALTER TABLE posts DROP COLUMN is_pinned;
-- ALTER TABLE campus_topics DROP COLUMN audited_at;
-- ALTER TABLE campus_topics DROP COLUMN auditor_id;
-- ALTER TABLE campus_topics DROP COLUMN audit_remark;
-- ALTER TABLE campus_topics DROP COLUMN audit_status;
-- ALTER TABLE campus_topics DROP COLUMN status;
-- DROP INDEX idx_campus_topics_status ON campus_topics;
-- DROP INDEX idx_campus_topics_audit_status ON campus_topics;
