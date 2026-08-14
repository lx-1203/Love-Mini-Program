-- 修复 consulting_course.status 列类型与实体不匹配（第二步）
-- 背景：V2026.08.10.0033 将 TINYINT(1)（BIT）改为 TINYINT 后，Hibernate validate
-- 仍报「found tinyint, expecting integer」——实体 Integer 需要 INT（4 字节）类型。
-- TINYINT 与 INT 存储空间：1 字节 vs 4 字节，本表行数少，无空间顾虑，改 INT 语义最准。
ALTER TABLE consulting_course MODIFY COLUMN status INT NOT NULL DEFAULT 1 COMMENT '状态：1=可报名，0=下架';
