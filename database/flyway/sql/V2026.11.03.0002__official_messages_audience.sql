-- ============================================================
-- 迁移：官方号消息受众维度（P1-2「按人群群发」，2026-11-03）
--
-- 背景：
--   官方号广播此前只有「全站」一种受众（audience 固定 ALL_CAMPUS_ALL_USERS），
--   运营无法按校区/圈层定向触达。本迁移为 official_messages 增加受众两列：
--     audience_type：ALL=全站 / CAMPUS=按校区 / CIRCLE=按圈层子树
--     audience_value：CAMPUS=校区名（user_campus_profile.campus_name 同口径）；
--                     CIRCLE=圈层路径前缀（circle_layer.circle_path 同口径，
--                     前缀按路径段匹配：等于节点或位于节点子树内）
--
-- 读取端过滤在 RealOfficialAccountService.getMessages(code, userId)：
--   按当前用户的校区/圈层归属过滤消息流（ALL 全可见）。
--
-- 存量行默认 ALL，行为与迁移前完全一致（增量迁移，不改变任何现有可见性）。
-- ============================================================

ALTER TABLE official_messages
    ADD COLUMN audience_type VARCHAR(16) NOT NULL DEFAULT 'ALL'
        COMMENT '受众类型: ALL=全站 / CAMPUS=按校区 / CIRCLE=按圈层子树' AFTER card_activity_id;

ALTER TABLE official_messages
    ADD COLUMN audience_value VARCHAR(256) DEFAULT NULL
        COMMENT '受众值: CAMPUS=校区名; CIRCLE=圈层路径前缀(C1/R1 形态); ALL 时为 NULL'
        AFTER audience_type;

-- 受众维度索引：管理端按受众筛选统计；用户端过滤在应用层做（单账号消息量级小，
-- 全量拉取后按用户归属内存过滤，避免每个用户一次带用户上下文的 SQL）
CREATE INDEX idx_official_messages_audience ON official_messages (audience_type);
