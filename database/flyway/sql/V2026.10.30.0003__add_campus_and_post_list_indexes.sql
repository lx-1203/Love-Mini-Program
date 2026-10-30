-- ============================================================
-- 迁移：补齐列表/统计查询缺索引，并删除一条实测重复索引（S3-3，2026-10-30）
-- ============================================================
-- 依据（实测自 127.0.0.1:3306 campus_love 的 information_schema，非推测）：
--   1) users.campus_name 与 user_campus_profile.campus_name 均无任何索引，
--      而 UserCampusProfileRepository 有两条查询直接按它过滤/分组/排序：
--        - countGroupByCampusName()  → SELECT campus_name, COUNT(*) … GROUP BY campus_name
--        - findDistinctCampusNames() → SELECT DISTINCT campus_name … WHERE campus_name IS NOT NULL
--                                       AND campus_name <> '' ORDER BY campus_name
--      后者是校园列表缓存的每次回源查询，全表扫 + 临时排序。
--   2) posts 缺 (category, status, created_at)：
--      PostRepository.findByCategoryAndStatusOrderByCreatedAtDesc 与
--      findByAuthorIdInAndCategoryAndStatusOrderByCreatedAtDesc 的形态都是
--      WHERE category=? AND status=? ORDER BY created_at DESC，
--      现有 idx_posts_category(category)、idx_posts_status(status)、
--      idx_posts_created_at(created_at) 三条单列索引最多只能用到一条，
--      排序仍需 filesort。
--   3) 实测重复索引：idx_posts_status_created_at 的名字声称 (status, created_at)，
--      但 information_schema.STATISTICS 显示它实际只有 (created_at) 一列，
--      与 idx_posts_created_at 完全等价 ⇒ 纯属多余的写放大与统计噪声，删除。
--      注意：idx_posts_status(status) 保留——它承担 status 前缀查询，
--      idx_posts_visibility(visibility,status,created_at) 无法替代（status 不在最左位）。
--
-- 代价与验证：
--   ADD INDEX 为 INPLACE（并发读写不阻塞，仅最后短暂排他）；本仓 posts/users/
--   user_campus_profile 在生产量级下需要维护窗口观察。
--   前后 EXPLAIN 对比记录在 scripts/qa/index-impact-2026-10-30.md。
--
-- 回滚（Flyway 不自动回滚，手动执行）：
--   ALTER TABLE posts DROP INDEX idx_posts_category_status_created_at,
--     ADD INDEX idx_posts_status_created_at (created_at);
--   DROP INDEX idx_users_campus_name ON users;
--   DROP INDEX idx_ucp_campus_name ON user_campus_profile;
-- ============================================================

CREATE INDEX idx_users_campus_name ON users (campus_name);

CREATE INDEX idx_ucp_campus_name ON user_campus_profile (campus_name);

CREATE INDEX idx_posts_category_status_created_at ON posts (category, status, created_at);

-- 与 idx_posts_created_at 完全重复（实测二者列集合同为 (created_at)），删除以减少写放大。
DROP INDEX idx_posts_status_created_at ON posts;
