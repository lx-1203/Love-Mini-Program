-- ============================================================
-- 迁移：帖子关联活动（posts.activity_id）
-- ============================================================
-- 背景（2026-08-08 需求）：
--   帖子可关联一个校园活动（如「电影社放映报名」关联电影社线下碰面活动），
--   列表/详情下发 ActivitySummaryView 展示活动卡片，帖子分类新增 activity。
--
-- 注意：
--   * posts.audit_status 列由 V2026.06.25.0004 新增（实体 Post.auditStatus），
--     故 activity_id 可安全放在其后（AFTER audit_status）。
--   * 分类枚举追加 activity（实体 PostCategory 同步加值），DDL 与实体
--     @Column(columnDefinition) 保持一致。
--   * 幂等性：本迁移仅做 DDL（ADD COLUMN / ADD INDEX / MODIFY），
--     MODIFY 重复执行天然幂等，可安全重跑（Flyway 亦只执行一次）。
-- ============================================================

-- ========== 1. posts 表新增活动关联列 ==========
ALTER TABLE posts
    ADD COLUMN activity_id BIGINT NULL COMMENT '关联活动ID（activities.id，可为空）' AFTER audit_status;

-- ========== 2. 活动关联索引（按活动查帖子 / 列表批量组装） ==========
CREATE INDEX idx_posts_activity ON posts (activity_id);

-- ========== 3. 分类枚举追加 activity（帖子关联活动场景） ==========
-- 注意：posts.category 自 V2026.07.27.0005 起为 VARCHAR(32) + CHECK 约束（chk_posts_category），
-- 不是 ENUM 列。追加枚举值只需更新 CHECK 约束（V2026.08.09.0008__fix_posts_category_check.sql）。
-- 实体 PostCategory 枚举已同步加 activity（枚举映射 VARCHAR 无 DDL 变更）。
