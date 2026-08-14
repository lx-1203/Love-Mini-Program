-- 修复 products.status 列类型与实体不匹配（与 consulting_course 同类问题）
-- 背景：V2026.08.10.0022 建表时 status 用 TINYINT(1)（MySQL 8 语义=BIT），
-- 实体 Product.status 为 Integer —— ddl-auto=validate 报「found bit, expecting integer」。
ALTER TABLE products MODIFY COLUMN status INT NOT NULL DEFAULT 1 COMMENT '状态：1=上架，0=下架';
