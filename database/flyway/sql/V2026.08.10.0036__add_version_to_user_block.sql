-- 修复 user_block 表缺 version 乐观锁列（实体 UserBlock 有 @Version，Hibernate validate 报缺失）
-- 背景：V2026.08.10.0020 建表未包含 version 列，与实体不一致（其他表由 V2026.07.26.0003 统一补充）。
ALTER TABLE user_block ADD COLUMN version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号（Task 2.1.1）' AFTER created_at;
