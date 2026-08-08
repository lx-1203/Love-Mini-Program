-- ============================================================
-- 修正：posts.category CHECK 约束追加 activity
-- ============================================================
-- 背景（2026-08-08 频道化重构）：
--   * posts.category 自 V2026.07.27.0005 起为 VARCHAR(32) + CHECK 约束
--     chk_posts_category（原 ENUM 列转换），项目约定不再使用 ENUM 列。
--   * 本版本新增 PostCategory.activity（活动链接帖分类），需要同步
--     CHECK 约束，否则 INSERT category='activity' 报
--     "Check constraint 'chk_posts_category' is violated"。
--   * 若历史环境已执行旧版 V2026.08.09.0004（含 MODIFY ENUM 语句，
--     文件内容已更新移除该语句），本迁移把列改回 VARCHAR(32) 并重建
--     约束，保证列类型与项目约定一致（VARCHAR + CHECK）。
--
-- 语法前提：MySQL 8.0.16+（项目 V2026.07.27.0005 已使用 CHECK 约束，
-- 同版本前提）。约束 chk_posts_category 必然存在（0005 创建、0004 未
-- 动它），先 DROP CHECK 再 ADD CHECK 保证本迁移可安全执行一次。
-- ============================================================

-- 1. 列类型统一回 VARCHAR(32)（兼容误执行 MODIFY ENUM 的环境；幂等）
ALTER TABLE posts
    MODIFY COLUMN category VARCHAR(32) NOT NULL DEFAULT 'all' COMMENT '分类';

-- 2. 重建 CHECK 约束（先删后建，追加 activity 枚举值）
ALTER TABLE posts DROP CHECK chk_posts_category;
ALTER TABLE posts ADD CONSTRAINT chk_posts_category
    CHECK (category IN ('all','interest','sincere','hometown','anonymous','latest','campus','activity'));
