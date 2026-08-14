-- app-assets 种子数据（由 seed-app-assets.ps1 生成，幂等：按 url 判重）
-- 表结构依赖迁移 V2026.08.10.0030（media_asset.url 唯一索引 uk_media_asset_url）
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/activities/art-exhibition.jpg', 'art-exhibition.jpg', 'image/jpeg', 231902, 1368, 768, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/activities/art-exhibition.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/activities/music-festival.jpg', 'music-festival.jpg', 'image/jpeg', 321680, 1368, 768, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/activities/music-festival.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/activities/sports-day.jpg', 'sports-day.jpg', 'image/jpeg', 364625, 1368, 768, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/activities/sports-day.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/avatars/default-boy.jpg', 'default-boy.jpg', 'image/jpeg', 72840, 1024, 1024, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/avatars/default-boy.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/avatars/default-girl.jpg', 'default-girl.jpg', 'image/jpeg', 96278, 1024, 1024, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/avatars/default-girl.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/campus/campus-cafeteria.jpg', 'campus-cafeteria.jpg', 'image/jpeg', 313271, 1216, 912, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/campus/campus-cafeteria.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/campus/campus-classroom.jpg', 'campus-classroom.jpg', 'image/jpeg', 212152, 1216, 912, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/campus/campus-classroom.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/campus/campus-club.jpg', 'campus-club.jpg', 'image/jpeg', 314016, 1216, 912, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/campus/campus-club.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/campus/campus-dorm.jpg', 'campus-dorm.jpg', 'image/jpeg', 296969, 1216, 912, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/campus/campus-dorm.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/campus/campus-gate.jpg', 'campus-gate.jpg', 'image/jpeg', 342373, 1216, 912, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/campus/campus-gate.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/campus/campus-lake.jpg', 'campus-lake.jpg', 'image/jpeg', 393388, 1216, 912, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/campus/campus-lake.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/campus/campus-library.jpg', 'campus-library.jpg', 'image/jpeg', 279449, 1216, 912, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/campus/campus-library.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/campus/campus-night.jpg', 'campus-night.jpg', 'image/jpeg', 342152, 1216, 912, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/campus/campus-night.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/campus/campus-playground.jpg', 'campus-playground.jpg', 'image/jpeg', 315204, 1216, 912, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/campus/campus-playground.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/campus/campus-rain.jpg', 'campus-rain.jpg', 'image/jpeg', 416025, 1216, 912, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/campus/campus-rain.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/illustrations/empty-no-data.jpg', 'empty-no-data.jpg', 'image/jpeg', 161353, 1024, 1024, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/illustrations/empty-no-data.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/posters/home-poster.jpg', 'home-poster.jpg', 'image/jpeg', 251817, 768, 1368, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/posters/home-poster.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/generated/images/posters/login-poster.jpg', 'login-poster.jpg', 'image/jpeg', 281977, 768, 1368, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/generated/images/posters/login-poster.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/activities/activity-1.jpg', 'activity-1.jpg', 'image/jpeg', 130682, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/activities/activity-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/activities/activity-2.jpg', 'activity-2.jpg', 'image/jpeg', 140747, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/activities/activity-2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/activities/activity-3.jpg', 'activity-3.jpg', 'image/jpeg', 62348, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/activities/activity-3.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/activities/activity-4.jpg', 'activity-4.jpg', 'image/jpeg', 38062, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/activities/activity-4.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/activities/activity-5.jpg', 'activity-5.jpg', 'image/jpeg', 32498, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/activities/activity-5.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/activities/activity-6.jpg', 'activity-6.jpg', 'image/jpeg', 70877, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/activities/activity-6.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/activities/activity-sports.jpg', 'activity-sports.jpg', 'image/jpeg', 128821, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/activities/activity-sports.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/activities/activity-study.jpg', 'activity-study.jpg', 'image/jpeg', 108295, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/activities/activity-study.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-1.jpg', 'avatar-1.jpg', 'image/jpeg', 38089, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-10.jpg', 'avatar-10.jpg', 'image/jpeg', 34319, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-10.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-11.jpg', 'avatar-11.jpg', 'image/jpeg', 10370, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-11.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-12.jpg', 'avatar-12.jpg', 'image/jpeg', 26584, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-12.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-13.jpg', 'avatar-13.jpg', 'image/jpeg', 3460, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-13.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-14.jpg', 'avatar-14.jpg', 'image/jpeg', 5157, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-14.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-15.jpg', 'avatar-15.jpg', 'image/jpeg', 6322, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-15.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-16.jpg', 'avatar-16.jpg', 'image/jpeg', 3218, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-16.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-17.jpg', 'avatar-17.jpg', 'image/jpeg', 2967, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-17.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-18.jpg', 'avatar-18.jpg', 'image/jpeg', 6492, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-18.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-19.jpg', 'avatar-19.jpg', 'image/jpeg', 5469, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-19.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-2.jpg', 'avatar-2.jpg', 'image/jpeg', 28534, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-20.jpg', 'avatar-20.jpg', 'image/jpeg', 5810, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-20.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-21.jpg', 'avatar-21.jpg', 'image/jpeg', 5522, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-21.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-22.jpg', 'avatar-22.jpg', 'image/jpeg', 3935, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-22.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-23.jpg', 'avatar-23.jpg', 'image/jpeg', 6096, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-23.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-24.jpg', 'avatar-24.jpg', 'image/jpeg', 4067, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-24.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-25.jpg', 'avatar-25.jpg', 'image/jpeg', 5071, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-25.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-26.jpg', 'avatar-26.jpg', 'image/jpeg', 3617, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-26.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-27.jpg', 'avatar-27.jpg', 'image/jpeg', 4753, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-27.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-28.jpg', 'avatar-28.jpg', 'image/jpeg', 6888, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-28.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-29.jpg', 'avatar-29.jpg', 'image/jpeg', 3740, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-29.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-3.jpg', 'avatar-3.jpg', 'image/jpeg', 19227, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-3.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-30.jpg', 'avatar-30.jpg', 'image/jpeg', 2881, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-30.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-31.jpg', 'avatar-31.jpg', 'image/jpeg', 4105, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-31.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-32.jpg', 'avatar-32.jpg', 'image/jpeg', 5900, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-32.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-33.jpg', 'avatar-33.jpg', 'image/jpeg', 3473, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-33.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-34.jpg', 'avatar-34.jpg', 'image/jpeg', 6042, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-34.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-35.jpg', 'avatar-35.jpg', 'image/jpeg', 3614, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-35.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-36.jpg', 'avatar-36.jpg', 'image/jpeg', 11329, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-36.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-37.jpg', 'avatar-37.jpg', 'image/jpeg', 6790, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-37.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-38.jpg', 'avatar-38.jpg', 'image/jpeg', 3598, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-38.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-39.jpg', 'avatar-39.jpg', 'image/jpeg', 4701, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-39.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-4.jpg', 'avatar-4.jpg', 'image/jpeg', 35224, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-4.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-40.jpg', 'avatar-40.jpg', 'image/jpeg', 5631, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-40.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-41.jpg', 'avatar-41.jpg', 'image/jpeg', 6336, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-41.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-42.jpg', 'avatar-42.jpg', 'image/jpeg', 3249, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-42.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-43.jpg', 'avatar-43.jpg', 'image/jpeg', 4834, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-43.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-44.jpg', 'avatar-44.jpg', 'image/jpeg', 4988, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-44.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-45.jpg', 'avatar-45.jpg', 'image/jpeg', 5352, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-45.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-46.jpg', 'avatar-46.jpg', 'image/jpeg', 2438, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-46.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-47.jpg', 'avatar-47.jpg', 'image/jpeg', 5422, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-47.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-48.jpg', 'avatar-48.jpg', 'image/jpeg', 5147, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-48.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-49.jpg', 'avatar-49.jpg', 'image/jpeg', 5610, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-49.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-5.jpg', 'avatar-5.jpg', 'image/jpeg', 15106, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-5.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-50.jpg', 'avatar-50.jpg', 'image/jpeg', 4181, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-50.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-51.jpg', 'avatar-51.jpg', 'image/jpeg', 6741, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-51.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-52.jpg', 'avatar-52.jpg', 'image/jpeg', 3805, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-52.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-53.jpg', 'avatar-53.jpg', 'image/jpeg', 5973, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-53.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-54.jpg', 'avatar-54.jpg', 'image/jpeg', 3805, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-54.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-55.jpg', 'avatar-55.jpg', 'image/jpeg', 4344, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-55.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-56.jpg', 'avatar-56.jpg', 'image/jpeg', 6947, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-56.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-57.jpg', 'avatar-57.jpg', 'image/jpeg', 4726, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-57.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-58.jpg', 'avatar-58.jpg', 'image/jpeg', 4335, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-58.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-59.jpg', 'avatar-59.jpg', 'image/jpeg', 4752, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-59.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-6.jpg', 'avatar-6.jpg', 'image/jpeg', 16886, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-6.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-60.jpg', 'avatar-60.jpg', 'image/jpeg', 5615, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-60.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-61.jpg', 'avatar-61.jpg', 'image/jpeg', 18074, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-61.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-62.jpg', 'avatar-62.jpg', 'image/jpeg', 4829, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-62.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-7.jpg', 'avatar-7.jpg', 'image/jpeg', 34677, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-7.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-8.jpg', 'avatar-8.jpg', 'image/jpeg', 32524, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-8.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/avatar-9.jpg', 'avatar-9.jpg', 'image/jpeg', 10882, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/avatar-9.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/banners/home-banner.jpg', 'home-banner.jpg', 'image/jpeg', 207710, 1280, 720, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/banners/home-banner.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/banners/village-banner.jpg', 'village-banner.jpg', 'image/jpeg', 107572, 1280, 720, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/banners/village-banner.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posters/home-poster.jpg', 'home-poster.jpg', 'image/jpeg', 97408, 720, 1280, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posters/home-poster.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posters/login-poster.jpg', 'login-poster.jpg', 'image/jpeg', 67822, 720, 1280, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posters/login-poster.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posters/login-poster.png', 'login-poster.png', 'image/png', 137124, 720, 1280, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posters/login-poster.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posts/campus-library.jpg', 'campus-library.jpg', 'image/jpeg', 67226, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posts/campus-library.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posts/post-1.jpg', 'post-1.jpg', 'image/jpeg', 51047, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posts/post-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posts/post-2.jpg', 'post-2.jpg', 'image/jpeg', 57989, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posts/post-2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posts/post-3.jpg', 'post-3.jpg', 'image/jpeg', 58210, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posts/post-3.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posts/post-4.jpg', 'post-4.jpg', 'image/jpeg', 27309, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posts/post-4.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posts/post-5.jpg', 'post-5.jpg', 'image/jpeg', 89708, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posts/post-5.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posts/post-6.jpg', 'post-6.jpg', 'image/jpeg', 70607, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posts/post-6.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posts/post-7.jpg', 'post-7.jpg', 'image/jpeg', 73122, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posts/post-7.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posts/post-8.jpg', 'post-8.jpg', 'image/jpeg', 27996, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posts/post-8.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posts/post-placeholder.jpg', 'post-placeholder.jpg', 'image/jpeg', 33754, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posts/post-placeholder.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/products/food-1.jpg', 'food-1.jpg', 'image/jpeg', 61466, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/products/food-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/products/food-2.jpg', 'food-2.jpg', 'image/jpeg', 13424, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/products/food-2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/products/merch-1.jpg', 'merch-1.jpg', 'image/jpeg', 51594, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/products/merch-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/products/merch-2.jpg', 'merch-2.jpg', 'image/jpeg', 41406, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/products/merch-2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/products/ticket-1.jpg', 'ticket-1.jpg', 'image/jpeg', 41093, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/products/ticket-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/products/ticket-2.jpg', 'ticket-2.jpg', 'image/jpeg', 50337, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/products/ticket-2.jpg');
