-- 咨询内容（2026-10-28）：给已有课程补正文/讲师/排序/发布/价格与报名开关。
-- content 用现有 description 回填，不新编内容；price_visible/signup_enabled 默认 0，
-- 支付未就绪前客户端不展示 ¥ 与报名入口。
ALTER TABLE consulting_course
    ADD COLUMN content MEDIUMTEXT NULL COMMENT '课程正文',
    ADD COLUMN lecturer VARCHAR(64) NULL COMMENT '讲师',
    ADD COLUMN sort_order INT NOT NULL DEFAULT 0 COMMENT '排序（升序）',
    ADD COLUMN price_visible TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否展示价格',
    ADD COLUMN signup_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否开放报名',
    ADD COLUMN published_at DATETIME NULL COMMENT '发布时间',
    ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

UPDATE consulting_course SET content = description WHERE content IS NULL;
UPDATE consulting_course SET sort_order = id WHERE sort_order = 0;
