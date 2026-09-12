-- ============================================================
-- 迁移：场景/注册页素材注册（2026-09-12 第二批）
-- ============================================================
-- 说明：
--   落地 AI 补齐素材 8 张（三处同步：src/static + static-local-backup/
--   full-static + api uploads/app-assets）：
--     · 注册页页头/成功页插图 2 张（deliverables/注册页/assets，750x480 / 600x600 JPEG）
--     · 兴趣圈摄影封面升级 4 张（circle-cover-{photography,travel,music,sports}，750x562）
--     · 校园圈兜底封面 1 张（campus-circle-cover，750x562）
--     · 匹配卡兜底主视觉 1 张（match-card-hero，640x1024）
--
--   real profile 下 /api/v1/media/app-assets/** 强校验 media_asset 注册
--   （url + type=app_asset + audit_status=approved，MediaAccessController），
--   本迁移补齐注册记录；url 唯一索引（V2026.08.10.0030）+ ON DUPLICATE KEY
--   保证幂等可重放。user_id=0 表示系统级公共资产（与既有 app_asset 约定一致）。
-- ============================================================

INSERT INTO media_asset
    (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at, version)
VALUES
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/register/reg-hero-illustration.jpg', 'reg-hero-illustration.jpg', 'image/jpeg', 11202, 750, 480, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/register/reg-success-illustration.jpg', 'reg-success-illustration.jpg', 'image/jpeg', 12876, 600, 600, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-cover-photography.jpg', 'circle-cover-photography.jpg', 'image/jpeg', 32088, 750, 562, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-cover-travel.jpg', 'circle-cover-travel.jpg', 'image/jpeg', 22885, 750, 562, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-cover-music.jpg', 'circle-cover-music.jpg', 'image/jpeg', 24415, 750, 562, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-cover-sports.jpg', 'circle-cover-sports.jpg', 'image/jpeg', 28501, 750, 562, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/campus-circle-cover.jpg', 'campus-circle-cover.jpg', 'image/jpeg', 23345, 750, 562, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/match/match-card-hero.jpg', 'match-card-hero.jpg', 'image/jpeg', 47595, 640, 1024, 'ready', 'approved', NOW(), 0)
ON DUPLICATE KEY UPDATE
    audit_status = 'approved',
    status = 'ready',
    mime = 'image/jpeg',
    size = VALUES(size),
    width = VALUES(width),
    height = VALUES(height);
