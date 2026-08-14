-- ============================================================
-- 迁移：media_asset 支持 app_asset 类型 + url 唯一索引
-- ============================================================
-- 背景（2026-08-10 小程序主包瘦身）：
--   小程序主包 16MB 超限，装饰性图片（apps/client/src/static/generated/images/** 与
--   static/assets/images/**）迁移至后端托管，成为可管理媒体资产（后台「图片审核」可视）。
--   写入方式：type='app_asset'、audit_status='approved'、user_id=0（系统资产）。
--   type 列为 VARCHAR(16)，'app_asset'（9 字符）直接可用，无需列结构变更。
--
--   文件复制与数据播种由独立脚本完成（apps/api/scripts/seed-app-assets.ps1，
--   Flyway 无法感知磁盘文件，故不在此迁移内 INSERT 数据行）。
--
-- 本迁移职责：
--   1. 清理存量重复 url（每个 url 仅保留最早一条，防御历史脏数据）
--   2. 为 url 建立唯一索引 uk_media_asset_url —— 种子脚本幂等性的 DB 级兜底
--      （脚本按 url 判重，唯一索引保证并发/重复执行不产生重复行）
--
-- 幂等性：去重语句本身可安全重跑；索引通过 information_schema 存在性检查。
-- ============================================================

-- 1) 清理重复 url：保留每个 url 最早一条（MIN(id)），删除其余
CREATE TEMPORARY TABLE tmp_dup_media_urls AS
SELECT url, MIN(id) AS keep_id
FROM media_asset
GROUP BY url
HAVING COUNT(*) > 1;

DELETE m FROM media_asset m
JOIN tmp_dup_media_urls d ON d.url = m.url AND m.id <> d.keep_id;

DROP TEMPORARY TABLE tmp_dup_media_urls;

-- 2) url 唯一索引（幂等：存在性检查后再创建）
SET @has_url_uk := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'media_asset'
      AND INDEX_NAME = 'uk_media_asset_url'
);

SET @sql_add := IF(
    @has_url_uk = 0,
    'CREATE UNIQUE INDEX uk_media_asset_url ON media_asset (url)',
    'SELECT 1'
);
PREPARE stmt_add FROM @sql_add;
EXECUTE stmt_add;
DEALLOCATE PREPARE stmt_add;

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DROP INDEX uk_media_asset_url ON media_asset;
