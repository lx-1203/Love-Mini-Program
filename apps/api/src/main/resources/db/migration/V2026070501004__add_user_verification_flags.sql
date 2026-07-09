-- ====================================================================
-- V2026070501004__add_user_verification_flags.sql
-- Phase B - Task B3.3/B3.4: 邮箱/身份证认证徽章支持
-- 用途：为 user_basic_profile 表添加 email_verified / id_card_verified 标志列，
--       用于支持 getVerificationBadgeLevel 返回 "email" / "idcard" 徽章级别。
-- 优先级：school > email > idcard > none
-- 注意：不修改已发布的 V2026070501001/V2026070501002 脚本，仅追加列。
-- ====================================================================

ALTER TABLE user_basic_profile
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN id_card_verified BOOLEAN NOT NULL DEFAULT FALSE;
