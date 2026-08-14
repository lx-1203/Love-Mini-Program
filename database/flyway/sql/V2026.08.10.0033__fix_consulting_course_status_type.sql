-- 修复 consulting_course.status 列类型与实体不匹配（Hibernate validate 失败）
-- 背景：V2026.08.10.0023 建表时 status 用 TINYINT(1)（MySQL 8 语义=BIT），
-- 实体 ConsultingCourse.status 为 Integer（@Column nullable=false）——
-- ddl-auto=validate 报「wrong column type: found bit, expecting integer」导致启动失败。
-- TINYINT(1) 与 TINYINT(4) 存储空间相同，仅展示语义不同，改类型无数据影响。
ALTER TABLE consulting_course MODIFY COLUMN status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1=可报名，0=下架';
