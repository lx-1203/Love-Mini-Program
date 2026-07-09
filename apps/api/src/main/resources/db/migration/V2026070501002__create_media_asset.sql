-- ====================================================================
-- V2026070501002__create_media_asset.sql
-- Phase A - Task A2: 创建 media_asset 表
-- 用途：存储用户上传的媒体文件元信息（图片/视频/背景图）。
-- 字段说明：
--   id            BIGINT       主键，自增
--   user_id       BIGINT       上传者用户 ID（建立索引）
--   type          VARCHAR(16)  媒体类型（image/video/background）
--   url           VARCHAR(512) 访问 URL
--   original_name VARCHAR(255) 原始文件名
--   mime          VARCHAR(64)  MIME 类型（如 image/jpeg）
--   size          BIGINT       文件大小（字节）
--   width         INT          宽度（像素）
--   height        INT          高度（像素）
--   duration_ms   INT          视频时长（毫秒），图片为 NULL
--   status        VARCHAR(16)  资产状态（pending/ready/failed，默认 ready）
--   created_at    DATETIME     创建时间
-- 索引：
--   idx_media_user (user_id) —— 按用户查询场景
--   idx_media_type (type)   —— 按类型筛选场景
-- ====================================================================

CREATE TABLE media_asset (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(16) NOT NULL,
    url VARCHAR(512) NOT NULL,
    original_name VARCHAR(255),
    mime VARCHAR(64),
    size BIGINT,
    width INT,
    height INT,
    duration_ms INT,
    status VARCHAR(16) NOT NULL DEFAULT 'ready',
    created_at DATETIME NOT NULL,
    INDEX idx_media_user (user_id),
    INDEX idx_media_type (type)
);
