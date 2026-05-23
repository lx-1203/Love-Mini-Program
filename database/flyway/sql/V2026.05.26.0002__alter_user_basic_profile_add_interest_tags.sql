-- ============================================================
-- 迁移脚本：为 user_basic_profile 表添加 interest_tags 列
-- 版本：V2026.05.26.0002
-- 说明：interest_tags 使用 JSON 类型存储用户兴趣标签列表
--       格式示例: ["摄影", "篮球", "阅读", "编程"]
--       用于推荐算法中的兴趣标签匹配，每个共同标签 +10 分
-- ============================================================

ALTER TABLE user_basic_profile
    ADD COLUMN interest_tags JSON DEFAULT NULL COMMENT '兴趣标签列表（JSON数组格式，如 ["摄影","篮球","阅读"]）'
    AFTER pronouns;
