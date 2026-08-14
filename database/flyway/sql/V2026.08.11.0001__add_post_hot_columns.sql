-- ============================================================
-- 迁移：帖子热度榜字段（热度分/运营倍率/禁止上榜）
-- ============================================================
-- 背景：
--   帖子热度榜（贴吧式）：hot_score 由定时任务按互动加权 + 时间衰减重算；
--   hot_boost 为运营操纵倍率（>1 上榜加成，0 压榜）；
--   hot_banned 禁止上榜（不影响前台可见，与 status=hidden 语义区分）。
--
-- 默认值全部带 DEFAULT，存量行自动填充，无需回填脚本。
-- ============================================================

ALTER TABLE posts
    ADD COLUMN hot_score DOUBLE NOT NULL DEFAULT 0 COMMENT '热度分（定时任务重算）' AFTER view_count,
    ADD COLUMN hot_boost DOUBLE NOT NULL DEFAULT 1.0 COMMENT '运营热度倍率（默认1.0，>1上榜加成，0压榜）' AFTER hot_score,
    ADD COLUMN hot_banned TINYINT(1) NOT NULL DEFAULT 0 COMMENT '禁止上榜（1=不上榜，不影响前台可见）' AFTER hot_boost;

-- 榜单查询：按热度分降序（MySQL 索引默认升序，降序扫描即可）
CREATE INDEX idx_posts_hot_score ON posts (hot_score);
