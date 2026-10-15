-- =====================================================================
-- V2026.10.14.0006__real_school_names_and_campus_branch.sql
-- 两所"学校"归真 + 校区区分（裁定：全部采取真实学校校名以及校区区分）
--
-- 事实：user_campus_profile.campus_name 有 2 行存的是「北校区 / 南校区」这种**没有学校名的校区词**，
-- 而它在本仓同时承担两件事——(1) 后台数据隔离的权威校区字段（AdminUserController / AdminDataScope
-- 都按它过滤），(2) 圈层树三级节点名的匹配键（ProfileUpdateService#circlePathOfCampus 按名字全等）。
-- 于是这 2 行既匹配不上任何节点（用户与其发帖永远落「未归属」），又把"校区"和"学校"两个语义混在一列。
--
-- 来源已定位：这两个值是从 mock 夹具漏进真库种子——
--   apps/client/src/i18n/locales/zh-CN.ts:4710  "campusName": "南校区"
--   apps/client/src/stores/messages/mock-data.ts:127  school:"南校区", city:"广州"
-- 而 10007 的 city_name 正是「广州」，与夹具逐字一致；两行的 users.campus_name 侧写的却是真实校名
-- （10006=清华大学、10007=复旦大学）。⇒ 以 users 侧的真校名为准归一，城市按学校所在地修正。
--
-- 校区区分不塞进同一列（那会再次破坏名字匹配），而是**新增一列** campus_branch 承载：
--   campus_name   = 真实学校校名（权威：隔离 + 圈层匹配）
--   campus_branch = 该学校的真实校区名（展示用，UI 可拼成「学校 · 校区」）
--
-- 幂等：所有 UPDATE 都以「旧值」为条件，跑过一次即不再匹配；ALTER 用 information_schema 守卫。
-- =====================================================================

-- ---- 1. 新增校区列（幂等） ----
SET @has_branch := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'user_campus_profile' AND column_name = 'campus_branch'
);
SET @ddl := IF(@has_branch = 0,
    'ALTER TABLE user_campus_profile ADD COLUMN campus_branch VARCHAR(64) NULL COMMENT ''学校之下的校区名，仅展示用；单一校区/未区分时为 NULL'' AFTER city_name',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---- 2. 两行归真：学校名 + 校区 + 城市 ----
-- 许知夏：清华大学（北京）——清华的教学主体在海淀主校区
UPDATE user_campus_profile
SET campus_name = '清华大学',
    city_name = '北京',
    campus_branch = '主校区',
    updated_at = updated_at
WHERE user_id = 10006 AND campus_name = '北校区';

-- 沈亦舟：复旦大学（上海）——seed 里的「广州」是 mock 夹具带进来的，按学校所在地改正；
-- 复旦的中文/金融本科生在邯郸校区（本部）
UPDATE user_campus_profile
SET campus_name = '复旦大学',
    city_name = '上海',
    campus_branch = '邯郸校区',
    updated_at = updated_at
WHERE user_id = 10007 AND campus_name = '南校区';

-- ---- 3. 用户圈层归属：按学校名现查三级节点，不写死路径 ----
-- （路径由 V2026.10.14.0005 的真大区重排决定，这里再写死就等于把上一次的判决烤进这一次）
UPDATE users u
JOIN user_campus_profile p ON p.user_id = u.id
JOIN circle_layer cl ON cl.level = 3 AND cl.name = p.campus_name
SET u.circle_path = cl.circle_path
WHERE (u.circle_path IS NULL OR u.circle_path = '')
  AND u.id IN (10006, 10007);

-- ---- 4. 这两人发帖的圈层归属：跟着作者走 ----
UPDATE posts t
JOIN users u ON u.id = t.author_id
SET t.owner_circle_path = u.circle_path
WHERE t.author_id IN (10006, 10007)
  AND (t.owner_circle_path IS NULL OR t.owner_circle_path = '')
  AND u.circle_path IS NOT NULL
  AND u.circle_path <> '';
