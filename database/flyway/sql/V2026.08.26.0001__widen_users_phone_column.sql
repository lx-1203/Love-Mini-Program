-- ============================================================
-- V2026.08.26.0001：加宽 users.phone 列（VARCHAR(32) → VARCHAR(64)）
-- 原因：R4-00249 手机号 AES-GCM 加密落库后 base64 密文约 52 字符，
--       原 32 长度导致 INSERT 时 Data truncation (1406)，
--       被 DataIntegrityViolationException 误判为"手机号已注册"，
--       新用户注册全部失败。
-- 影响：仅加宽列，不动数据；明文历史数据（11 位）与密文新数据均兼容。
-- ============================================================
ALTER TABLE users
    MODIFY COLUMN phone VARCHAR(64) NULL COMMENT '手机号（AES-GCM 密文或历史明文）';
