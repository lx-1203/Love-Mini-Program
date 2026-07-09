-- ====================================================================
-- V2026070501001__extend_user_basic_profile.sql
-- Phase A - Task A1: 扩展 user_basic_profile 表
-- 新增字段：
--   1. height               INT          (身高 cm, 120-250)
--   2. education_level      VARCHAR(16)  (high_school/bachelor/master/phd)
--   3. relationship_status  VARCHAR(16)  (never/married_before/divorced/widowed)
--   4. hometown_province    VARCHAR(32)  (籍贯-省份)
--   5. hometown_city        VARCHAR(32)  (籍贯-城市)
--   6. future_city          VARCHAR(32)  (未来计划定居城市)
--   7. future_plan_tags     JSON          (未来规划标签数组，默认 '[]')
--   8. photo_gallery        JSON          (照片墙 URL 数组，最多 6 张，默认 '[]')
--   9. half_body_photo_url  VARCHAR(512) (半身照 URL)
--  10. personal_video_url   VARCHAR(512) (个人视频 URL，≤60s)
--  11. profile_background_url VARCHAR(512) (个人主页背景图 URL)
-- 注意：所有新字段均可空，向后兼容已有数据。
-- ====================================================================

ALTER TABLE user_basic_profile
    ADD COLUMN height INT NULL,
    ADD COLUMN education_level VARCHAR(16) NULL,
    ADD COLUMN relationship_status VARCHAR(16) NULL,
    ADD COLUMN hometown_province VARCHAR(32) NULL,
    ADD COLUMN hometown_city VARCHAR(32) NULL,
    ADD COLUMN future_city VARCHAR(32) NULL,
    ADD COLUMN future_plan_tags JSON DEFAULT '[]',
    ADD COLUMN photo_gallery JSON DEFAULT '[]',
    ADD COLUMN half_body_photo_url VARCHAR(512) NULL,
    ADD COLUMN personal_video_url VARCHAR(512) NULL,
    ADD COLUMN profile_background_url VARCHAR(512) NULL;
