-- ============================================================
-- 迁移：补齐「村口 feed / 用户搜索」两条最热读路径的排序索引（S3-B，2026-10-31）
-- ============================================================
-- 实测依据（127.0.0.1:3306 campus_love，MySQL 8.0.45，非推测）：
--   posts 现有 9 条二级索引，【没有任何一条包含 is_pinned】：
--     idx_posts_activity / idx_posts_audit_status / idx_posts_author /
--     idx_posts_author_created_at / idx_posts_category /
--     idx_posts_category_status_created_at(category,status,created_at) /
--     idx_posts_created_at / idx_posts_hot_score / idx_posts_status /
--     idx_posts_visibility(visibility,status,created_at)
--   ⇒ 主 feed 查询（PostRepository.java:689 findVisiblePosts、:733 findVisiblePostsByCategory，
--     ORDER BY is_pinned DESC, created_at DESC）今天实测：
--     EXPLAIN FORMAT=TREE SELECT p.id FROM posts p
--       WHERE p.status='active' AND p.audit_status='approved'
--       ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 10;
--     -> Limit: 10 row(s) (cost=22.4 rows=10)
--        -> Sort: p.is_pinned DESC, p.created_at DESC, limit input to 10 row(s) per chunk (cost=22.4 rows=206)
--           -> Filter: ((p.audit_status='approved') and (p.`status`='active')) (cost=22.4 rows=206)
--              -> Table scan on p (cost=22.4 rows=206)
--     经典表格：type=ALL, possible_keys=idx_posts_audit_status,idx_posts_status, key=NULL,
--               rows=206, filtered=94.20, Extra="Using where; Using filesort"
--     ⇒ 排序首列不在任何索引里 ⇒ 全表扫 + filesort，LIMIT 无法短路。
--
--   users 侧（UserRepository.java:315 searchByKeyword，
--     ORDER BY profile_completion DESC, created_at DESC）今天实测：
--     type=ref, key=idx_users_role, key_len=66, ref=const, rows=139, filtered=20.99,
--     Extra="Using where; Using filesort"
--     -> Sort: u.profile_completion DESC, u.created_at DESC (cost=9.67 rows=139)
--        -> Index lookup on u using idx_users_role (role='USER')
--     实测 role 取值分布 USER 139 / GUEST 259 / ADMIN 4 / SUPER_ADMIN 1 / AUDITOR 1，
--     status 全为 active ⇒ idx_users_role 的 ref 本质是一次窄扫描：
--     每页都要读满 139 行再排序（404 行表里 139 行）。
--
-- 为什么 users 上【已有的】idx_users_profile_completion 救不了这条查询（关键证据）：
--   EXPLAIN SELECT u.id FROM users u
--     ORDER BY u.profile_completion DESC, u.created_at DESC LIMIT 20;
--   ⇒ type=ALL, key=NULL, rows=404, Extra="Using filesort"
--   即【单列排序索引对两列 ORDER BY 完全无效】：MySQL 只有在 ORDER BY 的每一列
--   都能由同一条索引的最左前缀按同方向提供时才免排序。所以必须建复合索引，
--   把 profile_completion、created_at 按排序方向放进同一条索引。
--
-- 索引形态 = [等值过滤列…] + [ORDER BY 全部列…]，与本仓已验证有效的
--   V2026.10.30.0003 idx_posts_category_status_created_at 完全同构。该索引在
--   【同一张 206 行的 posts 表】上实测已经把同类查询做到无 filesort：
--     EXPLAIN SELECT p.id FROM posts p WHERE p.category='all' AND p.status='active'
--       ORDER BY p.created_at DESC LIMIT 10;
--     ⇒ type=ref, key=idx_posts_category_status_created_at, key_len=260, rows=3,
--       Extra="Backward index scan; Using index"   ←【没有 Using filesort】
--   这是「等值前缀 + 排序后缀」在本表真实表形下能免排序的直接证据。
--
-- 为什么索引列全部按 ASC 声明、不写 DESC（实测三例，不是风格选择）：
--   InnoDB 二级索引隐含以主键作尾部且恒为 ASC；MySQL 用 Backward index scan 反读整条索引时
--   连这个隐含主键尾也一起反读。实测：
--     A) WHERE category=? AND status=? ORDER BY created_at DESC, id DESC
--        → Backward index scan; Using index            ←【无 filesort，同方向主键尾巴免费】
--     B) WHERE category=? AND status=? ORDER BY created_at DESC, id ASC
--        → Using index; Using filesort                 ←【反方向立刻退化成 filesort】
--     C) WHERE author_id=? ORDER BY created_at DESC, id DESC（idx_posts_author_created_at）
--        → ref, rows=1, Backward index scan; Using index
--     D) ORDER BY profile_completion DESC, id DESC（idx_users_profile_completion）
--        → index, rows=20, Backward index scan; Using index
--   ⇒ 结论：索引【不带】显式 id 列、列全 ASC，配 ORDER BY 末位 `id DESC`（同方向），
--   是实测唯一能免排序的组合；若把列声明成 DESC 再靠主键 ASC 尾，
--   等于自造出上面的 B 情形，反而引入 filesort。同理也不该把 id DESC 写进索引定义。
--
-- ⚠ 诚实声明（不要把本段读成「性能收益已证明」）：
--   dev 库只有 posts 206 行 / users 404 行，这个量级下优化器可能仍然选择全表扫
--   （404 行走二级索引要回表，成本模型未必划算），所以「建完就一定不走 filesort」
--   此刻【未被验证】——本会话禁止对 campus_love 做 DDL（单写者规则，由协调会话统一
--   apply），索引尚未落库。本节能给出的只有：before 实测计划 + 同构索引在真实表形上的
--   机制证明（上面 A/B/C/D 四条）。索引决策的依据是 ORDER BY 前缀规则与这四条实测，
--   而不是编造一个 rows/cost 改善。
--   apply 后必须按 scripts/qa/data-layer-decisions-2026-10-31.md 里的 SQL 重跑 after EXPLAIN；
--   若 206/404 行下仍 Using filesort 或优化器不选它，那【不构成反驳】——
--   要在生产量级库上重判；若那时也不选，就删掉这两条索引，不要用「建了没坏处」糊过去。
--   另：is_pinned 实测 205 行=0 / 1 行=1，作为【过滤器】毫无价值，
--   只作为【排序首列】有意义（置顶永远排最前）——这正是本索引存在的唯一理由。
--
-- 与发现项 C 的绑定：ORDER BY 末位新增的 `id DESC` 是翻页稳定性的修复
--   （created_at 是 datetime(0)，同秒写入被截断 ⇒ 排序键不唯一。实测本表已有 1 组
--   6 行共享 2026-10-26 17:20:47：SELECT created_at,COUNT(*) FROM posts
--   GROUP BY created_at HAVING COUNT(*)>1）。理由与实测见
--   scripts/qa/data-layer-decisions-2026-10-31.md。
--
-- 代价：posts 二级索引 9→10 条、users 8→9 条，发帖/改资料各多一次索引维护；
--   两条均为 INPLACE ADD INDEX（不阻塞读写，末尾短暂排他）。
--   与 V2026.10.30.0003 记录的教训对齐：那条迁移曾发现一条「名字声称 (status,created_at)
--   实际只有 (created_at)」的重复索引并被删除；本迁移的两条索引列集合均不与现有索引重合。
--
-- 回滚（Flyway 不自动回滚，手动执行）：
--   DROP INDEX idx_posts_feed_pin_created ON posts;
--   DROP INDEX idx_users_search_completion_created ON users;
-- ============================================================

DROP PROCEDURE IF EXISTS add_feed_and_search_sort_indexes;
DELIMITER $$
CREATE PROCEDURE add_feed_and_search_sort_indexes()
BEGIN
    -- 村口 feed：WHERE status=? AND audit_status=?
    --   ORDER BY is_pinned DESC, created_at DESC, id DESC（靠 Backward index scan 匹配）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = 'posts'
          AND index_name = 'idx_posts_feed_pin_created'
    ) THEN
        CREATE INDEX idx_posts_feed_pin_created
            ON posts (status, audit_status, is_pinned, created_at);
    END IF;

    -- 用户搜索：WHERE role=? AND status=?
    --   ORDER BY profile_completion DESC, created_at DESC, id DESC
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
          AND index_name = 'idx_users_search_completion_created'
    ) THEN
        CREATE INDEX idx_users_search_completion_created
            ON users (role, status, profile_completion, created_at);
    END IF;
END$$
DELIMITER ;

CALL add_feed_and_search_sort_indexes();
DROP PROCEDURE IF EXISTS add_feed_and_search_sort_indexes;
