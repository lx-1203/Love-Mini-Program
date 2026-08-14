-- ============================================================
-- 迁移：校园认证表新增学历认证（学信网）字段
-- ============================================================
-- 背景：
--   B1-3 学历认证前置：校园认证（campus_certifications）新增
--   chsi_code（学信网在线验证码）与 chsi_screenshot_url（学信网
--   学历截图 URL），供运营审核学历真实性。
--
-- 幂等性：ADD COLUMN 无 IF NOT EXISTS 语法（MySQL 5.7-8.0 均不支持
-- 列级 IF NOT EXISTS），依赖 Flyway 版本记录保证仅执行一次。
-- ============================================================

ALTER TABLE campus_certifications
    ADD COLUMN chsi_code VARCHAR(64) NULL COMMENT '学信网在线验证码（可空）' AFTER student_id_card_url,
    ADD COLUMN chsi_screenshot_url VARCHAR(512) NULL COMMENT '学信网学历截图 URL（可空）' AFTER chsi_code;
