-- ====================================================================
-- V2026070501003__add_media_asset_composite_index.sql
-- Phase A - Task A2.5: 为 media_asset 表添加 (user_id, type) 复合索引
-- 用途：优化「按用户 + 类型」组合查询场景（如查询某用户的所有视频/图片）。
-- 注意：保留 V2026070501002 中已创建的单列索引 idx_media_user / idx_media_type，
--       不影响已发布的迁移脚本。
-- ====================================================================

CREATE INDEX idx_media_user_type ON media_asset (user_id, type);
