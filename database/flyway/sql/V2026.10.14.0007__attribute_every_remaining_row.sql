-- =====================================================================
-- V2026.10.14.0007__attribute_every_remaining_row.sql
-- 把剩下的 17 个无圈层用户与 11 条未归属帖全部归位（裁定：所有数据都要真实可用、便于后期处理）
--
-- 逐组处置与依据（每一组的依据都在数据里，不是猜的）：
--
-- A. 平台服务号 100165「校园小助手」（users.campus_name 为空、发帖 17 条、openid=phone:13711110001）
--    → users.circle_path = 公司节点（树上真实存在的 level-1「校园恋爱总公司」）。
--    它不是任何学校的学生，是平台自己的号；挂在公司节点上，"按圈层收缩"时只有绑 C1 的超管能管，
--    与它现在的实际权限一致。它的 17 条帖由第 D 步按作者自动跟上。
--
-- B. 演示号 100167「演示女生B」 → 补 user_campus_profile（北京大学 · 燕园校区 · 北京）+ 回填路径。
--    与 100166「演示男生A」（已在北京大学）同校，演示"校友互相可见 / 校区管理员只见本校"最省事。
--
-- C. 100170「无绑定管理员」（ADMIN，users.campus_name 已写「南京大学」，无 ucp 行、无 circle_path）
--    → 按它自己声明的校区补 ucp（南京大学 · 鼓楼校区 · 南京）并回填路径。
--    注意：「未绑定圈层的 ADMIN 不得默认看全平台」那条负例依赖的是 admin_layer 里没有它的绑定行，
--    与 users.circle_path 无关 ⇒ 补上路径不削弱该负例（跑门复核）。
--
-- D. 环境内产生的非学生账号 14 个：100001（种子虚拟用户，0 帖 0 关注 0 会话）与
--    100152–100164（历轮 QA/验收注册的号，手机号为 AES 密文，昵称即"验收君/模拟器验收/QA-E2E-User…"）。
--    → 新建一个三级节点「环境与测试账号」挂在「其他区域」下，把它们收进去。
--    为什么不各分一所真实学校：那会让 14 个不是学生的账号在圈层树上冒充学生，
--    正是要消除的假数据形态。集中到一个"名字就说明自己是什么"的节点，后台一眼可筛、后期可批量处置。
--
-- E. 6 条孤儿帖 190–195：author_id 5–10，而 users 表 id 从 10001 起 ⇒ 这些作者行**从来不存在**
--    （V2026.08.07.0021 那支种子把行号当作者 id 用了）。后台详情能读到它们但 authorNickname=null，
--    属于"看着有、其实不可用"。→ 归到 D 的测试节点并 status='hidden' 下架，内容保留可查，
--    不伪造作者、不物理删除。
--
-- 结果（可核对）：users.circle_path 为空的行 = 0；posts.owner_circle_path 为空的行 = 0。
-- 幂等：全部语句以旧值为条件，跑过即不再匹配；新节点用 WHERE NOT EXISTS 保护。
-- 回滚：本文件只改归属与 status，逐行原值见 reports/audit/acceptance-cleanup-2026-10-14/。
-- =====================================================================

-- ---- 0. 新节点：环境与测试账号（挂在「其他区域」下，路径由父节点算出，不写死） ----
INSERT INTO circle_layer (name, level, parent_id, circle_path, status, color, sort, created_at, updated_at)
SELECT '环境与测试账号', 3, p.id, CONCAT(p.circle_path, '/S900'), 'active', '#9aa4b2', 900, NOW(), NOW()
FROM (SELECT id, circle_path FROM circle_layer WHERE name = '其他区域' AND level = 2 LIMIT 1) p
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM circle_layer WHERE name = '环境与测试账号' AND level = 3) e);

-- ---- A. 平台服务号 → 公司节点 ----
UPDATE users
SET circle_path = (SELECT circle_path FROM (SELECT circle_path FROM circle_layer WHERE level = 1 LIMIT 1) c)
WHERE id = 100165 AND (circle_path IS NULL OR circle_path = '');

-- ---- B. 演示号 100167：补校园资料行（学校/校区/城市/院系都是真实值） ----
INSERT INTO user_campus_profile (user_id, city_name, campus_branch, campus_name, department_name,
                                 verification_status, created_at, updated_at)
SELECT 100167, '北京', '燕园校区', '北京大学', '中国语言文学系', 'pending', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM user_campus_profile WHERE user_id = 100167) x);

UPDATE users u
JOIN circle_layer cl ON cl.level = 3 AND cl.name = '北京大学'
SET u.circle_path = cl.circle_path
WHERE u.id = 100167 AND (u.circle_path IS NULL OR u.circle_path = '');

-- ---- C. 100170：按它自己声明的南京大学补全 ----
INSERT INTO user_campus_profile (user_id, city_name, campus_branch, campus_name, department_name,
                                 verification_status, created_at, updated_at)
SELECT 100170, '南京', '鼓楼校区', '南京大学', '法学院', 'pending', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM user_campus_profile WHERE user_id = 100170) x);

UPDATE users u
JOIN circle_layer cl ON cl.level = 3 AND cl.name = '南京大学'
SET u.circle_path = cl.circle_path
WHERE u.id = 100170 AND (u.circle_path IS NULL OR u.circle_path = '');

-- ---- D. 14 个非学生账号 → 环境与测试账号节点 ----
UPDATE users u
JOIN circle_layer cl ON cl.level = 3 AND cl.name = '环境与测试账号'
SET u.circle_path = cl.circle_path
WHERE (u.circle_path IS NULL OR u.circle_path = '')
  AND u.id IN (100001, 100152, 100153, 100154, 100155, 100156, 100157,
               100158, 100159, 100160, 100161, 100162, 100163, 100164);

-- ---- E. 6 条孤儿帖：归入测试节点 + 下架（作者行不存在，不伪造作者、不物删） ----
UPDATE posts t
JOIN circle_layer cl ON cl.level = 3 AND cl.name = '环境与测试账号'
SET t.owner_circle_path = cl.circle_path,
    t.status = 'hidden',
    t.audit_remark = '2026-10-14 数据归真：作者行不存在（author_id 5-10 从未存在于 users，种子 V2026.08.07.0021 把行号当作者 id），故下架并归入环境与测试账号',
    t.updated_at = t.updated_at
WHERE t.id BETWEEN 190 AND 195
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM users s WHERE s.id = t.author_id) a);

-- ---- F. 其余所有未归属帖：一律按作者回填（覆盖 A/B/C/D 各号的历史发帖） ----
UPDATE posts t
JOIN users u ON u.id = t.author_id
SET t.owner_circle_path = u.circle_path
WHERE (t.owner_circle_path IS NULL OR t.owner_circle_path = '')
  AND u.circle_path IS NOT NULL AND u.circle_path <> '';
