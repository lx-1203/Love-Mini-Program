-- ============================================================
-- 迁移：search_queries 增加乐观锁 version 列
-- 背景：SearchQuery 实体 @Version 需要 version 列（乐观锁），
--       原 V2026.08.11.0002 建表未含该列（Hibernate validate 报错）。
-- ============================================================
ALTER TABLE search_queries
  ADD COLUMN version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号（@Version）' AFTER updated_at;
