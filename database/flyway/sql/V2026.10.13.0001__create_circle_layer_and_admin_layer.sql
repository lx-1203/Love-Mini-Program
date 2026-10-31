-- =====================================================================
-- V2026.10.13.0001__create_circle_layer_and_admin_layer.sql
-- 补齐 RBAC 三级圈层两张表在迁移链中缺失的 CREATE TABLE（S3-x schema-integrity 修复）
--
-- 问题（FINDING A）：CircleLayer/AdminLayer 是映射实体（apps/api/.../entity/circle/），
--   但 database/flyway/sql 全目录约 230 个脚本里对这两张表只有 DML、没有 DDL：
--     - V2026.10.14.0005:154  UPDATE circle_layer ...
--     - V2026.10.14.0006:57   JOIN circle_layer ...
--     - V2026.10.14.0007:37   INSERT INTO circle_layer ...（另有多处 SELECT/JOIN）
--   现行 dev 库里两张表存在，是从 database/backup/*.sql 转储（含 CREATE TABLE）
--   带外的方式进来的——纯迁移链无法复现它们。ddl-auto: validate
--   （application-real.yml:115）下，任何"只跑 Flyway 链"的新库都会在半路崩掉。
--
-- 本文件的 DDL 来源：2026-10-31 对现网库只读执行 SHOW CREATE TABLE circle_layer /
--   admin_layer，逐列核对实体注解后原样落表（列/类型/默认值/索引/唯一键全对齐：
--   uk_circle_path、idx_cl_parent/path/level、uk_admin_layer、idx_al_admin/layer）。
--   与实体的已知差异仅两处、且 validate 不检查、无需改实体：
--     1) 现网 circle_layer 有自引用外键 circle_layer_ibfk_1（实体只映射 parent_id 列）；
--     2) 现网多出的 idx_al_admin/idx_al_layer 普通索引（实体未声明，validate 允许多余索引）。
--   COLLATE 显式写 utf8mb4_0900_ai_ci：与 V2026.10.30.0004（S3-8 全库统一排序规则）
--   一致；新库即便在本迁移先跑、0004 后跑，0004 对本表也是 no-op，不再产生漂移。
--
-- 关于 Flyway 版本顺序（诚实声明）：Flyway 按版本号升序应用 versioned 迁移，
--   曾拟用 V2026.10.31.0001 ——那排在引用方 V2026.10.14.0005 之后，后置版本救不了前置失败，
--   故本文件已按下面的 (a) 落在 V2026.10.13.0001（编号即修复的一部分，别再改回大版本号）。
--   两个真正的修法：
--     (a) 把本文件编号放到 V2026.10.14.0005 之下 ——【已采用，即当前文件名】；
--     (b) 把 0005/0006/0007 里引用这两张表的语句改成条件保护/幂等。
--   (b) 不可取：这三个脚本在现网已应用，改动会让 checksum 变化，
--       flyway.toml:5 validateOnMigrate=true 下所有存量库启动即校验失败；
--       且本仓铁律"已应用的历史迁移不得改写"（见 V2026.10.30.0004 头注）。
--   (a) 是正确终态（本文件即采用）：对纯新库按序生效；对存量库，因为仓库没有配置 out-of-order
--       （application-real.yml 的 flyway 段 :68-113 无 out-of-order 键、
--       flyway.toml 亦无，即默认 false），低编号新迁移会被当作 ignored pending 跳过——
--       无害，因为存量库（backup 转储建的）本来就有这两张表。
--   但本文件编号是编排方预先指派的，不由本任务改动；对"从未在任何库应用过的新文件"
--   改编号零成本（无 checksum 历史）。⇒ 需要编排动作：要么把本文件重命名到
--   V2026.10.14.0005 之前，要么接受"新库须先从 database/backup 转储建表"。
--
-- 运维预期：
--   - 已迁移过的库 / 由 backup 转储建的库：IF NOT EXISTS ⇒ no-op，仅记录一条成功历史。
--   - 纯链新库：链走到 V2026.10.14.0005 仍会先因缺表中断（除非按上文重编号）；
--     重编号或人工补建后，本迁移创建两表，0005/0007 的圈层 DML 随之正常回填。
-- =====================================================================

CREATE TABLE IF NOT EXISTS `circle_layer` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(64)  NOT NULL,
    `level`       TINYINT      NOT NULL,
    `parent_id`   BIGINT       DEFAULT NULL,
    `circle_path` VARCHAR(256) NOT NULL,
    `status`      VARCHAR(16)  NOT NULL DEFAULT 'active',
    `color`       VARCHAR(16)  NOT NULL DEFAULT '#0064e0',
    `sort`        INT          NOT NULL DEFAULT 0,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_circle_path` (`circle_path`),
    KEY `idx_cl_parent` (`parent_id`),
    KEY `idx_cl_path` (`circle_path`),
    KEY `idx_cl_level` (`level`),
    CONSTRAINT `circle_layer_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `circle_layer` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `admin_layer` (
    `id`              BIGINT      NOT NULL AUTO_INCREMENT,
    `admin_id`        BIGINT      NOT NULL,
    `circle_layer_id` BIGINT      NOT NULL,
    `role_code`       VARCHAR(32) NOT NULL DEFAULT 'ADMIN',
    `created_at`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_admin_layer` (`admin_id`, `circle_layer_id`),
    KEY `idx_al_admin` (`admin_id`),
    KEY `idx_al_layer` (`circle_layer_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
