-- ============================================================
-- 迁移脚本：为 heart_signals 表添加 match_type 列
-- 版本：V2026.05.26.0001
-- 说明：match_type 用于区分心动信号的来源类型
--       - mutual_like: 互相喜欢产生的心动信号（默认值）
--       - 话题匹配/咖啡散步/自习搭子/快速匹配: 由匹配表单产生的信号
-- ============================================================

ALTER TABLE heart_signals
    ADD COLUMN match_type VARCHAR(20) DEFAULT 'mutual_like' COMMENT '匹配类型：mutual_like-互相喜欢, topic-话题匹配, coffee-咖啡散步, study-自习搭子, quick-快速匹配'
    AFTER status;
