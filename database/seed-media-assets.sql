-- ============================================================
-- 测试数据种子脚本（2026-08-09）
-- 用途：本地联调「图片审核」闭环——为测试账号（5-10 号）补齐
--   1. media_asset 头像资产（approved）
--   2. media_asset 照片墙资产（含演示混合审核状态：pending / rejected / approved）
--   3. 同步 user_basic_profile.photo_gallery（与服务端 JSON 串行化格式一致）
--
-- 演示状态设计：
--   - 用户 5：照片墙含 2 张 pending（管理后台待审核可见）
--   - 用户 6：照片墙含 1 张 rejected（附拒绝原因 remark）
--   - 其余 approved（对外展示）
--
-- 幂等：重复执行前先按固定 user_id 清理本脚本创建的行。
-- ⚠️ 测试数据：仅用于本地联调，禁止生产执行。
-- ============================================================

-- 1. 清理旧种子数据（幂等）
DELETE FROM media_asset WHERE user_id IN (5,6,7,8,9,10);

-- 2. 头像资产（6 用户，approved；URL 与 seed-test-users.sql 的头像路径保持一致）
INSERT INTO media_asset
  (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
VALUES
  (5,  'avatar', '/static/assets/images/avatars/avatar-1.jpg', 'avatar-1.jpg', 'image/jpeg', 0, 400, 400, 'ready', 'approved', NOW()),
  (6,  'avatar', '/static/assets/images/avatars/avatar-2.jpg', 'avatar-2.jpg', 'image/jpeg', 0, 400, 400, 'ready', 'approved', NOW()),
  (7,  'avatar', '/static/assets/images/avatars/avatar-3.jpg', 'avatar-3.jpg', 'image/jpeg', 0, 400, 400, 'ready', 'approved', NOW()),
  (8,  'avatar', '/static/assets/images/avatars/avatar-4.jpg', 'avatar-4.jpg', 'image/jpeg', 0, 400, 400, 'ready', 'approved', NOW()),
  (9,  'avatar', '/static/assets/images/avatars/avatar-5.jpg', 'avatar-5.jpg', 'image/jpeg', 0, 400, 400, 'ready', 'approved', NOW()),
  (10, 'avatar', '/static/assets/images/avatars/avatar-6.jpg', 'avatar-6.jpg', 'image/jpeg', 0, 400, 400, 'ready', 'approved', NOW());

-- 3. 照片墙资产（每用户 6 张，本地素材 post-1..6.jpg，演示混合审核状态）
--    用户 5：index 0-1 pending（待审核）、2-5 approved
--    用户 6：index 2 rejected（含拒绝原因）、其余 approved
--    用户 7-10：全部 approved
INSERT INTO media_asset
  (user_id, type, url, original_name, mime, size, width, height, status, audit_status, audit_remark, auditor_id, audited_at, created_at)
VALUES
  -- 用户 5：2 张 pending（演示管理后台待审核流）
  (5, 'image', '/static/assets/images/posts/post-1.jpg', 'post-1.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'pending', NULL, NULL, NULL, NOW()),
  (5, 'image', '/static/assets/images/posts/post-2.jpg', 'post-2.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'pending', NULL, NULL, NULL, NOW()),
  (5, 'image', '/static/assets/images/posts/post-3.jpg', 'post-3.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (5, 'image', '/static/assets/images/posts/post-4.jpg', 'post-4.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (5, 'image', '/static/assets/images/posts/post-5.jpg', 'post-5.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (5, 'image', '/static/assets/images/posts/post-6.jpg', 'post-6.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  -- 用户 6：1 张 rejected（含拒绝原因，演示驳回语义）
  (6, 'image', '/static/assets/images/posts/post-1.jpg', 'post-1.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (6, 'image', '/static/assets/images/posts/post-2.jpg', 'post-2.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (6, 'image', '/static/assets/images/posts/post-3.jpg', 'post-3.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'rejected', '含联系方式，请更换后重传', 1, NOW(), NOW()),
  (6, 'image', '/static/assets/images/posts/post-4.jpg', 'post-4.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (6, 'image', '/static/assets/images/posts/post-5.jpg', 'post-5.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (6, 'image', '/static/assets/images/posts/post-6.jpg', 'post-6.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  -- 用户 7-10：全部 approved
  (7, 'image', '/static/assets/images/posts/post-1.jpg', 'post-1.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (7, 'image', '/static/assets/images/posts/post-2.jpg', 'post-2.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (7, 'image', '/static/assets/images/posts/post-3.jpg', 'post-3.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (7, 'image', '/static/assets/images/posts/post-4.jpg', 'post-4.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (7, 'image', '/static/assets/images/posts/post-5.jpg', 'post-5.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (7, 'image', '/static/assets/images/posts/post-6.jpg', 'post-6.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (8, 'image', '/static/assets/images/posts/post-1.jpg', 'post-1.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (8, 'image', '/static/assets/images/posts/post-2.jpg', 'post-2.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (8, 'image', '/static/assets/images/posts/post-3.jpg', 'post-3.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (8, 'image', '/static/assets/images/posts/post-4.jpg', 'post-4.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (8, 'image', '/static/assets/images/posts/post-5.jpg', 'post-5.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (8, 'image', '/static/assets/images/posts/post-6.jpg', 'post-6.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (9, 'image', '/static/assets/images/posts/post-1.jpg', 'post-1.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (9, 'image', '/static/assets/images/posts/post-2.jpg', 'post-2.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (9, 'image', '/static/assets/images/posts/post-3.jpg', 'post-3.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (9, 'image', '/static/assets/images/posts/post-4.jpg', 'post-4.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (9, 'image', '/static/assets/images/posts/post-5.jpg', 'post-5.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (9, 'image', '/static/assets/images/posts/post-6.jpg', 'post-6.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (10, 'image', '/static/assets/images/posts/post-1.jpg', 'post-1.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (10, 'image', '/static/assets/images/posts/post-2.jpg', 'post-2.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (10, 'image', '/static/assets/images/posts/post-3.jpg', 'post-3.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (10, 'image', '/static/assets/images/posts/post-4.jpg', 'post-4.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (10, 'image', '/static/assets/images/posts/post-5.jpg', 'post-5.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW()),
  (10, 'image', '/static/assets/images/posts/post-6.jpg', 'post-6.jpg', 'image/jpeg', 0, 600, 400, 'ready', 'approved', NULL, NULL, NULL, NOW());

-- 4. 同步 user_basic_profile.photo_gallery（与服务端 JSON 数组一致；用户 5 的 pending 图仅本人可见、他人视角由服务端过滤）
UPDATE user_basic_profile SET photo_gallery = JSON_ARRAY(
  '/static/assets/images/posts/post-1.jpg',
  '/static/assets/images/posts/post-2.jpg',
  '/static/assets/images/posts/post-3.jpg',
  '/static/assets/images/posts/post-4.jpg',
  '/static/assets/images/posts/post-5.jpg',
  '/static/assets/images/posts/post-6.jpg')
WHERE user_id IN (5,6,7,8,9,10);

-- ============================================================
-- 一键清理（仅清理本脚本创建的数据）
-- ============================================================
-- DELETE FROM media_asset WHERE user_id IN (5,6,7,8,9,10);
-- UPDATE user_basic_profile SET photo_gallery = JSON_ARRAY() WHERE user_id IN (5,6,7,8,9,10);
