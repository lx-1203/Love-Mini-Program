-- =====================================================================
-- V2026.10.13.0002__add_circle_axis_columns_to_users_posts_comments.sql
-- 补齐「圈层轴」三列在迁移链中缺失的 ADD COLUMN（schema-integrity 修复，续 V2026.10.13.0001）
--
-- 问题：这三列是生产库里的真实列，实体在映射、后台在按它们过滤、注销清单在清除它们，
--   但 database/flyway/sql 全链没有任何脚本创建过它们（2026-11-01 由
--   apps/api/.../privacy/ErasureSchemaAlignmentTest 与逐文件 grep 双重确认）：
--     - users.circle_path            实体 User#circlePath；AdminScopeService 用它做管理范围轴
--     - posts.owner_circle_path      实体 Post#ownerCirclePath；AdminPostController 的圈层子树过滤
--     - comments.owner_circle_path   与 posts 同轴（AdminScopeService:40 逐条列出这三列）
--   引用方（都是 DML，没有 DDL）：
--     - V2026.10.14.0005:27 起   UPDATE users ... SET circle_path = CASE ...
--     - V2026.10.14.0005:49 起   UPDATE posts ... SET owner_circle_path = CASE ...（多处）
--     - V2026.10.14.0006:67      WHERE t.owner_circle_path IS NULL OR ...
--     - V2026.10.14.0007:31      users.circle_path 为空的行 = 0（结果核对）
--   与 V2026.10.13.0001 的 circle_layer/admin_layer 完全同一个成因：现网库的列来自
--   database/backup/*.sql 转储带外进入，纯迁移链无法复现现网 schema。
--   ⇒ 后果（可复现，不需猜）：任何「只跑 Flyway 链」的新库（CI 的 campus_love_fresh、
--     新环境部署）会在 V2026.10.14.0005 报 Unknown column 'circle_path' 而中断；
--     ddl-auto: validate（application-real.yml）之后也救不回来，因为它排在失败点之后。
--
-- 本文件的 DDL 来源：2026-11-01 对现网库只读执行 information_schema 查询，逐列对齐
--   （三列均为 varchar(256) NULL DEFAULT NULL，且现网**没有**任何索引引用它们——
--     只有 circle_layer 自己的 uk_circle_path / idx_cl_path，那两个由 V2026.10.13.0001 建）。
--   因此本文件只补列、不补索引：补索引等于引入一个现网没有的新schema 事实，超出修复范围。
--
-- 幂等：沿用本仓既有形态（V2026.08.07.0001 的 SET @has_col + IF + PREPARE/EXECUTE），
--   列已存在时整段是 no-op ⇒ 现网库即便被 out-of-order 应用也不会报错。
--
-- 关于版本号（诚实声明，与 V2026.10.13.0001 同一段落）：编号必须排在引用方
--   V2026.10.14.0005 之前，否则救不了前置失败；对已应用过 2026.10.14+ 的存量库，
--   本文件是 low-version pending，在 out-of-order=false（仓库未配置该键）下按
--   ignored pending 跳过（application-real.yml / flyway.toml / database/flyway/flyway.toml
--   三处均已设 ignoreMigrationPatterns="*:ignored"，validate 不会因此失败）——
--   无害，因为存量库本来就有这三列。别再把它改回大版本号。
-- =====================================================================

-- ---- 1. users.circle_path ----
SET @has_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'circle_path'
);

SET @sql := IF(
    @has_col = 0,
    'ALTER TABLE users ADD COLUMN circle_path VARCHAR(256) NULL DEFAULT NULL COMMENT ''所属圈层路径（C1/R1/S1 形式），管理范围与推荐轴用它'' AFTER campus_name',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---- 2. posts.owner_circle_path ----
SET @has_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'posts'
      AND COLUMN_NAME = 'owner_circle_path'
);

SET @sql := IF(
    @has_col = 0,
    'ALTER TABLE posts ADD COLUMN owner_circle_path VARCHAR(256) NULL DEFAULT NULL COMMENT ''发帖时作者的圈层路径；NULL=未归属，仅持 C1 的管理员可见'' AFTER visibility',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---- 3. comments.owner_circle_path ----
SET @has_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'comments'
      AND COLUMN_NAME = 'owner_circle_path'
);

SET @sql := IF(
    @has_col = 0,
    'ALTER TABLE comments ADD COLUMN owner_circle_path VARCHAR(256) NULL DEFAULT NULL COMMENT ''评论作者的圈层路径，与 posts 同轴'' AFTER images',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================================
-- DOWN 回滚脚本（手动执行；Flyway 社区版不做自动回滚）
-- =====================================================================
-- ALTER TABLE comments DROP COLUMN owner_circle_path;
-- ALTER TABLE posts    DROP COLUMN owner_circle_path;
-- ALTER TABLE users    DROP COLUMN circle_path;
