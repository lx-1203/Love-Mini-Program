-- ============================================================
-- 迁移：media_asset 增加审核字段（图片审核同步闭环）
-- ============================================================
-- 背景：
--   media_asset 表（V2026.07.24.0002）记录媒体元信息，但无审核维度。
--   本迁移对齐 posts 表审核字段命名风格（V2026.06.25.0004）：
--     audit_status / audit_remark / auditor_id / audited_at
--   存量资产兜底 approved（与 posts 迁移先例一致），仅对新增上传生效 pending。
--
-- 审核语义：
--   pending  待审核（本人可见 + 标注，他人不可见）
--   approved 已通过（对外展示）
--   rejected 未通过（本人可见 + 标注原因，他人不可见）
--
-- 幂等性：information_schema 列存在性检查，可安全重跑。
-- ============================================================

SET @has_audit_status := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'media_asset'
      AND COLUMN_NAME = 'audit_status'
);

SET @sql_add := IF(
    @has_audit_status = 0,
    'ALTER TABLE media_asset
        ADD COLUMN audit_status VARCHAR(16) NOT NULL DEFAULT ''approved'' COMMENT ''审核状态: pending/approved/rejected（存量视为已通过）'',
        ADD COLUMN audit_remark VARCHAR(500) DEFAULT NULL COMMENT ''审核备注（拒绝原因等）'',
        ADD COLUMN auditor_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''审核人用户 ID'' ,
        ADD COLUMN audited_at DATETIME DEFAULT NULL COMMENT ''审核时间''',
    'SELECT 1'
);
PREPARE stmt_add FROM @sql_add;
EXECUTE stmt_add;
DEALLOCATE PREPARE stmt_add;

-- 存量数据兜底（理论上 DEFAULT 已覆盖，此处防御脏值）
UPDATE media_asset
   SET audit_status = 'approved'
 WHERE audit_status IS NULL OR audit_status = '';

-- 审核页查询：pending 优先 + 时间倒序
SET @has_idx1 := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'media_asset'
      AND INDEX_NAME = 'idx_media_audit_status_created'
);
SET @sql_idx1 := IF(
    @has_idx1 = 0,
    'CREATE INDEX idx_media_audit_status_created ON media_asset (audit_status, created_at)',
    'SELECT 1'
);
PREPARE stmt_idx1 FROM @sql_idx1;
EXECUTE stmt_idx1;
DEALLOCATE PREPARE stmt_idx1;

-- 本人视角查询：user_id + 审核状态
SET @has_idx2 := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'media_asset'
      AND INDEX_NAME = 'idx_media_user_audit'
);
SET @sql_idx2 := IF(
    @has_idx2 = 0,
    'CREATE INDEX idx_media_user_audit ON media_asset (user_id, audit_status)',
    'SELECT 1'
);
PREPARE stmt_idx2 FROM @sql_idx2;
EXECUTE stmt_idx2;
DEALLOCATE PREPARE stmt_idx2;

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- ALTER TABLE media_asset
--     DROP COLUMN audit_status,
--     DROP COLUMN audit_remark,
--     DROP COLUMN auditor_id,
--     DROP COLUMN audited_at;
-- DROP INDEX idx_media_audit_status_created ON media_asset;
-- DROP INDEX idx_media_user_audit ON media_asset;
