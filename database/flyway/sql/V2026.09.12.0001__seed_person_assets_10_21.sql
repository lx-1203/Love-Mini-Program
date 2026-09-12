-- ============================================================
-- 迁移：人格池扩容素材注册（person-10 ~ 21，2026-09-12）
-- ============================================================
-- 说明：
--   GuestPersona 演示人格池 9 → 21 套（GuestPersona.java 同步扩容）。
--   新增 12 张真人风格头像（apps/client/src/static/assets/images/people/
--   person-10.png ~ person-21.png，200x200 PNG，AI 生成·锚点链派生），
--   三处同步：src/static + static-local-backup/full-static + api uploads。
--
--   real profile 下 /api/v1/media/app-assets/** 强校验 media_asset 注册
--   （url + type=app_asset + audit_status=approved，MediaAccessController），
--   本迁移补齐 person-10 ~ 21 的注册记录；url 唯一索引
--   （V2026.08.10.0030）+ ON DUPLICATE KEY 保证幂等可重放。
--
--   user_id=0 表示系统级公共资产（与既有 app_asset 约定一致）。
-- ============================================================

INSERT INTO media_asset
    (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at, version)
VALUES
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-10.png', 'person-10.png', 'image/png', 75014, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-11.png', 'person-11.png', 'image/png', 61582, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-12.png', 'person-12.png', 'image/png', 60832, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-13.png', 'person-13.png', 'image/png', 58052, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-14.png', 'person-14.png', 'image/png', 64235, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-15.png', 'person-15.png', 'image/png', 74122, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-16.png', 'person-16.png', 'image/png', 70761, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-17.png', 'person-17.png', 'image/png', 58984, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-18.png', 'person-18.png', 'image/png', 57687, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-19.png', 'person-19.png', 'image/png', 55424, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-20.png', 'person-20.png', 'image/png', 75014, 200, 200, 'ready', 'approved', NOW(), 0),
    (0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-21.png', 'person-21.png', 'image/png', 61582, 200, 200, 'ready', 'approved', NOW(), 0)
ON DUPLICATE KEY UPDATE
    audit_status = 'approved',
    status = 'ready',
    mime = 'image/png',
    width = 200,
    height = 200;
