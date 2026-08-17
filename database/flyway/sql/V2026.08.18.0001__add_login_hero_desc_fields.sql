-- 登录页 Hero 配置增加品牌描述字段（参考图对齐）
-- 2026-08-18
ALTER TABLE app_login_hero_config
    ADD COLUMN hero_desc VARCHAR(255) NULL COMMENT '登录页品牌描述（如：慢慢成为特别的人）' AFTER hero_subtitle,
    ADD COLUMN hero_desc_sub VARCHAR(255) NULL COMMENT '登录页品牌描述副行（如：校园里的每一次相遇都有美好记录）' AFTER hero_desc;
