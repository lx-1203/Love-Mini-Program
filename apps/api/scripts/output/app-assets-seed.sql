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
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-1.jpg', 'activity-1.jpg', 'image/jpeg', 130682, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-2.jpg', 'activity-2.jpg', 'image/jpeg', 140747, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-3.jpg', 'activity-3.jpg', 'image/jpeg', 62348, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-3.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-4.jpg', 'activity-4.jpg', 'image/jpeg', 38062, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-4.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-5.jpg', 'activity-5.jpg', 'image/jpeg', 32498, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-5.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-6.jpg', 'activity-6.jpg', 'image/jpeg', 70877, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-6.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-sports.jpg', 'activity-sports.jpg', 'image/jpeg', 128821, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-sports.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-study.jpg', 'activity-study.jpg', 'image/jpeg', 108295, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/activities/activity-study.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-1.jpg', 'avatar-1.jpg', 'image/jpeg', 38089, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-10.jpg', 'avatar-10.jpg', 'image/jpeg', 34319, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-10.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-11.jpg', 'avatar-11.jpg', 'image/jpeg', 10370, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-11.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-12.jpg', 'avatar-12.jpg', 'image/jpeg', 26584, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-12.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-13.jpg', 'avatar-13.jpg', 'image/jpeg', 3460, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-13.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-14.jpg', 'avatar-14.jpg', 'image/jpeg', 5157, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-14.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-15.jpg', 'avatar-15.jpg', 'image/jpeg', 6322, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-15.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-16.jpg', 'avatar-16.jpg', 'image/jpeg', 3218, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-16.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-17.jpg', 'avatar-17.jpg', 'image/jpeg', 2967, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-17.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-18.jpg', 'avatar-18.jpg', 'image/jpeg', 6492, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-18.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-19.jpg', 'avatar-19.jpg', 'image/jpeg', 5469, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-19.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-2.jpg', 'avatar-2.jpg', 'image/jpeg', 28534, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-20.jpg', 'avatar-20.jpg', 'image/jpeg', 5810, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-20.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-21.jpg', 'avatar-21.jpg', 'image/jpeg', 5522, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-21.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-22.jpg', 'avatar-22.jpg', 'image/jpeg', 3935, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-22.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-23.jpg', 'avatar-23.jpg', 'image/jpeg', 6096, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-23.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-24.jpg', 'avatar-24.jpg', 'image/jpeg', 4067, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-24.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-25.jpg', 'avatar-25.jpg', 'image/jpeg', 5071, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-25.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-26.jpg', 'avatar-26.jpg', 'image/jpeg', 3617, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-26.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-27.jpg', 'avatar-27.jpg', 'image/jpeg', 4753, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-27.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-28.jpg', 'avatar-28.jpg', 'image/jpeg', 6888, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-28.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-29.jpg', 'avatar-29.jpg', 'image/jpeg', 3740, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-29.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-3.jpg', 'avatar-3.jpg', 'image/jpeg', 19227, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-3.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-30.jpg', 'avatar-30.jpg', 'image/jpeg', 2881, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-30.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-31.jpg', 'avatar-31.jpg', 'image/jpeg', 4105, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-31.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-32.jpg', 'avatar-32.jpg', 'image/jpeg', 5900, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-32.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-33.jpg', 'avatar-33.jpg', 'image/jpeg', 3473, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-33.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-34.jpg', 'avatar-34.jpg', 'image/jpeg', 6042, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-34.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-35.jpg', 'avatar-35.jpg', 'image/jpeg', 3614, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-35.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-36.jpg', 'avatar-36.jpg', 'image/jpeg', 11329, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-36.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-37.jpg', 'avatar-37.jpg', 'image/jpeg', 6790, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-37.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-38.jpg', 'avatar-38.jpg', 'image/jpeg', 3598, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-38.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-39.jpg', 'avatar-39.jpg', 'image/jpeg', 4701, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-39.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-4.jpg', 'avatar-4.jpg', 'image/jpeg', 35224, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-4.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-40.jpg', 'avatar-40.jpg', 'image/jpeg', 5631, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-40.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-41.jpg', 'avatar-41.jpg', 'image/jpeg', 6336, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-41.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-42.jpg', 'avatar-42.jpg', 'image/jpeg', 3249, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-42.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-43.jpg', 'avatar-43.jpg', 'image/jpeg', 4834, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-43.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-44.jpg', 'avatar-44.jpg', 'image/jpeg', 4988, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-44.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-45.jpg', 'avatar-45.jpg', 'image/jpeg', 5352, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-45.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-46.jpg', 'avatar-46.jpg', 'image/jpeg', 2438, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-46.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-47.jpg', 'avatar-47.jpg', 'image/jpeg', 5422, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-47.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-48.jpg', 'avatar-48.jpg', 'image/jpeg', 5147, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-48.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-49.jpg', 'avatar-49.jpg', 'image/jpeg', 5610, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-49.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-5.jpg', 'avatar-5.jpg', 'image/jpeg', 15106, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-5.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-50.jpg', 'avatar-50.jpg', 'image/jpeg', 4181, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-50.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-51.jpg', 'avatar-51.jpg', 'image/jpeg', 6741, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-51.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-52.jpg', 'avatar-52.jpg', 'image/jpeg', 3805, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-52.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-53.jpg', 'avatar-53.jpg', 'image/jpeg', 5973, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-53.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-54.jpg', 'avatar-54.jpg', 'image/jpeg', 3805, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-54.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-55.jpg', 'avatar-55.jpg', 'image/jpeg', 4344, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-55.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-56.jpg', 'avatar-56.jpg', 'image/jpeg', 6947, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-56.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-57.jpg', 'avatar-57.jpg', 'image/jpeg', 4726, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-57.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-58.jpg', 'avatar-58.jpg', 'image/jpeg', 4335, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-58.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-59.jpg', 'avatar-59.jpg', 'image/jpeg', 4752, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-59.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-6.jpg', 'avatar-6.jpg', 'image/jpeg', 16886, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-6.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-60.jpg', 'avatar-60.jpg', 'image/jpeg', 5615, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-60.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-61.jpg', 'avatar-61.jpg', 'image/jpeg', 18074, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-61.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-62.jpg', 'avatar-62.jpg', 'image/jpeg', 4829, 128, 128, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-62.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-7.jpg', 'avatar-7.jpg', 'image/jpeg', 34677, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-7.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-8.jpg', 'avatar-8.jpg', 'image/jpeg', 32524, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-8.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-9.jpg', 'avatar-9.jpg', 'image/jpeg', 10882, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/avatars/avatar-9.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/banners/home-banner.jpg', 'home-banner.jpg', 'image/jpeg', 207710, 1280, 720, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/banners/home-banner.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/banners/village-banner.jpg', 'village-banner.jpg', 'image/jpeg', 107572, 1280, 720, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/banners/village-banner.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-basketball.png', 'circle-basketball.png', 'image/png', 612280, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-basketball.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-boardgame.png', 'circle-boardgame.png', 'image/png', 603060, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-boardgame.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-cutepets.png', 'circle-cutepets.png', 'image/png', 598747, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-cutepets.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-food.png', 'circle-food.png', 'image/png', 45594, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-food.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-friend-1.png', 'circle-friend-1.png', 'image/png', 2264, 34, 34, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-friend-1.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-friend-2.png', 'circle-friend-2.png', 'image/png', 2195, 34, 34, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-friend-2.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-friend-3.png', 'circle-friend-3.png', 'image/png', 2254, 34, 34, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-friend-3.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-game.png', 'circle-game.png', 'image/png', 493785, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-game.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-music.png', 'circle-music.png', 'image/png', 41965, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-music.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-pet.png', 'circle-pet.png', 'image/png', 613074, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-pet.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-photo.png', 'circle-photo.png', 'image/png', 47398, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-photo.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-postgraduate.png', 'circle-postgraduate.png', 'image/png', 419374, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-postgraduate.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-reading.png', 'circle-reading.png', 'image/png', 540737, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-reading.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-sky.png', 'circle-sky.png', 'image/png', 36383, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-sky.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-sports.png', 'circle-sports.png', 'image/png', 42631, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-sports.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-studybuddy.png', 'circle-studybuddy.png', 'image/png', 546253, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-studybuddy.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-travel.png', 'circle-travel.png', 'image/png', 43254, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/circle-travel.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/school-life.png', 'school-life.png', 'image/png', 424608, 750, 420, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/school-life.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/covers/school-main.png', 'school-main.png', 'image/png', 519447, 750, 420, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/covers/school-main.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posters/home-poster.jpg', 'home-poster.jpg', 'image/jpeg', 97408, 720, 1280, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posters/home-poster.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posters/login-poster.jpg', 'login-poster.jpg', 'image/jpeg', 67822, 720, 1280, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posters/login-poster.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posters/login-poster.png', 'login-poster.png', 'image/png', 137124, 720, 1280, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posters/login-poster.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posts/campus-library.jpg', 'campus-library.jpg', 'image/jpeg', 67226, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posts/campus-library.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posts/post-1.jpg', 'post-1.jpg', 'image/jpeg', 51047, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posts/post-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posts/post-2.jpg', 'post-2.jpg', 'image/jpeg', 57989, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posts/post-2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posts/post-3.jpg', 'post-3.jpg', 'image/jpeg', 58210, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posts/post-3.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posts/post-4.jpg', 'post-4.jpg', 'image/jpeg', 27309, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posts/post-4.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posts/post-5.jpg', 'post-5.jpg', 'image/jpeg', 89708, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posts/post-5.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posts/post-6.jpg', 'post-6.jpg', 'image/jpeg', 70607, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posts/post-6.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posts/post-7.jpg', 'post-7.jpg', 'image/jpeg', 73122, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posts/post-7.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posts/post-8.jpg', 'post-8.jpg', 'image/jpeg', 27996, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posts/post-8.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/posts/post-placeholder.jpg', 'post-placeholder.jpg', 'image/jpeg', 33754, 800, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/posts/post-placeholder.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/products/food-1.jpg', 'food-1.jpg', 'image/jpeg', 61466, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/products/food-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/products/food-2.jpg', 'food-2.jpg', 'image/jpeg', 13424, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/products/food-2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/products/merch-1.jpg', 'merch-1.jpg', 'image/jpeg', 51594, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/products/merch-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/products/merch-2.jpg', 'merch-2.jpg', 'image/jpeg', 41406, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/products/merch-2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/products/ticket-1.jpg', 'ticket-1.jpg', 'image/jpeg', 41093, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/products/ticket-1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/assets-images/products/ticket-2.jpg', 'ticket-2.jpg', 'image/jpeg', 50337, 600, 600, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/assets-images/products/ticket-2.jpg');
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
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/person-01-avatar.png', 'person-01-avatar.png', 'image/png', 45345, 160, 160, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/person-01-avatar.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/person-02-avatar.png', 'person-02-avatar.png', 'image/png', 42519, 160, 160, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/person-02-avatar.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/person-03-avatar.png', 'person-03-avatar.png', 'image/png', 41127, 160, 160, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/person-03-avatar.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/person-04-avatar.png', 'person-04-avatar.png', 'image/png', 40438, 160, 160, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/person-04-avatar.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/person-05-avatar.png', 'person-05-avatar.png', 'image/png', 39091, 160, 160, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/person-05-avatar.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/person-06-avatar.png', 'person-06-avatar.png', 'image/png', 44532, 160, 160, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/person-06-avatar.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/person-07-avatar.png', 'person-07-avatar.png', 'image/png', 45874, 160, 160, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/person-07-avatar.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/person-08-avatar.png', 'person-08-avatar.png', 'image/png', 37190, 160, 160, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/person-08-avatar.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/avatars/person-09-avatar.png', 'person-09-avatar.png', 'image/png', 51063, 160, 160, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/avatars/person-09-avatar.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/banners/home-banner.jpg', 'home-banner.jpg', 'image/jpeg', 207710, 1280, 720, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/banners/home-banner.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/banners/village-banner.jpg', 'village-banner.jpg', 'image/jpeg', 107572, 1280, 720, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/banners/village-banner.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/A_cute_golden_retriever_dog_lo_2026-08-21T03-36-28.png', 'A_cute_golden_retriever_dog_lo_2026-08-21T03-36-28.png', 'image/png', 43872, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/A_cute_golden_retriever_dog_lo_2026-08-21T03-36-28.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/A_person_reading_a_book_in_a_c_2026-08-21T03-35-17.png', 'A_person_reading_a_book_in_a_c_2026-08-21T03-35-17.png', 'image/png', 34904, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/A_person_reading_a_book_in_a_c_2026-08-21T03-35-17.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/basketball.png', 'basketball.png', 'image/png', 42375, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/basketball.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/board-game.png', 'board-game.png', 'image/png', 45246, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/board-game.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/campus-life.png', 'campus-life.png', 'image/png', 36660, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/campus-life.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/campus-main.png', 'campus-main.png', 'image/png', 47762, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/campus-main.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-basketball.png', 'circle-basketball.png', 'image/png', 612280, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-basketball.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-boardgame.png', 'circle-boardgame.png', 'image/png', 603060, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-boardgame.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-cutepets.png', 'circle-cutepets.png', 'image/png', 598747, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-cutepets.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-food.png', 'circle-food.png', 'image/png', 45594, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-food.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-friend-1.png', 'circle-friend-1.png', 'image/png', 2264, 34, 34, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-friend-1.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-friend-2.png', 'circle-friend-2.png', 'image/png', 2195, 34, 34, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-friend-2.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-friend-3.png', 'circle-friend-3.png', 'image/png', 2254, 34, 34, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-friend-3.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-game.png', 'circle-game.png', 'image/png', 493785, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-game.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-music.png', 'circle-music.png', 'image/png', 41965, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-music.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-pet.png', 'circle-pet.png', 'image/png', 613074, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-pet.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-photo.png', 'circle-photo.png', 'image/png', 47398, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-photo.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-postgraduate.png', 'circle-postgraduate.png', 'image/png', 419374, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-postgraduate.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-reading.png', 'circle-reading.png', 'image/png', 540737, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-reading.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-sky.png', 'circle-sky.png', 'image/png', 36383, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-sky.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-sports.png', 'circle-sports.png', 'image/png', 42631, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-sports.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-studybuddy.png', 'circle-studybuddy.png', 'image/png', 546253, 750, 750, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-studybuddy.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/circle-travel.png', 'circle-travel.png', 'image/png', 43254, 185, 195, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/circle-travel.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/Cozy_flat_lay_of_video_game_co_2026-08-21T03-34-01.png', 'Cozy_flat_lay_of_video_game_co_2026-08-21T03-34-01.png', 'image/png', 33080, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/Cozy_flat_lay_of_video_game_co_2026-08-21T03-34-01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/cute-pets.png', 'cute-pets.png', 'image/png', 43748, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/cute-pets.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/gaming.png', 'gaming.png', 'image/png', 39016, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/gaming.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/pet-life.png', 'pet-life.png', 'image/png', 42402, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/pet-life.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/postgraduate.png', 'postgraduate.png', 'image/png', 26114, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/postgraduate.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/reading.png', 'reading.png', 'image/png', 41087, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/reading.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/school-life.png', 'school-life.png', 'image/png', 424608, 750, 420, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/school-life.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/school-main.png', 'school-main.png', 'image/png', 519447, 750, 420, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/school-main.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/covers/study-buddy.png', 'study-buddy.png', 'image/png', 40961, 300, 220, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/covers/study-buddy.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_01.png', 'circle_row6_01.png', 'image/png', 32678, 170, 145, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_02.png', 'circle_row6_02.png', 'image/png', 32685, 173, 145, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_03.png', 'circle_row6_03.png', 'image/png', 31763, 172, 145, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_04.png', 'circle_row6_04.png', 'image/png', 33479, 177, 145, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_05.png', 'circle_row6_05.png', 'image/png', 18839, 167, 78, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_06.png', 'circle_row6_06.png', 'image/png', 12928, 128, 79, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_07.png', 'circle_row6_07.png', 'image/png', 5359, 59, 53, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_08.png', 'circle_row6_08.png', 'image/png', 5579, 61, 57, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_09.png', 'circle_row6_09.png', 'image/png', 5256, 60, 53, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/circle/circle_row6_09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_01.png', 'toolbar_row7_01.png', 'image/png', 7182, 78, 76, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_02.png', 'toolbar_row7_02.png', 'image/png', 7061, 78, 75, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_03.png', 'toolbar_row7_03.png', 'image/png', 7219, 68, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_04.png', 'toolbar_row7_04.png', 'image/png', 7558, 68, 69, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_05.png', 'toolbar_row7_05.png', 'image/png', 8208, 70, 69, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_06.png', 'toolbar_row7_06.png', 'image/png', 8565, 70, 70, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_07.png', 'toolbar_row7_07.png', 'image/png', 4699, 68, 50, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_08.png', 'toolbar_row7_08.png', 'image/png', 7574, 74, 67, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_09.png', 'toolbar_row7_09.png', 'image/png', 9631, 75, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_10.png', 'toolbar_row7_10.png', 'image/png', 10158, 75, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_10.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_11.png', 'toolbar_row7_11.png', 'image/png', 13675, 77, 75, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_11.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_12.png', 'toolbar_row7_12.png', 'image/png', 7888, 72, 70, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_12.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_13.png', 'toolbar_row7_13.png', 'image/png', 7657, 70, 69, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/home-split/toolbar/toolbar_row7_13.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login/btn-phone.png', 'btn-phone.png', 'image/png', 4306, 400, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login/btn-phone.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login/btn-wechat.png', 'btn-wechat.png', 'image/png', 6495, 400, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login/btn-wechat.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login/floating-hearts.png', 'floating-hearts.png', 'image/png', 3339, 300, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login/floating-hearts.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login/illustration-frame.png', 'illustration-frame.png', 'image/png', 11132, 400, 267, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login/illustration-frame.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login/mascot-center.png', 'mascot-center.png', 'image/png', 34315, 333, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login/mascot-center.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r01_c01.png', '登录页_r01_c01.png', 'image/png', 9008, 119, 37, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r01_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r01_c02.png', '登录页_r01_c02.png', 'image/png', 14095, 199, 37, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r01_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r02_c01.png', '登录页_r02_c01.png', 'image/png', 3573, 39, 61, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r02_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r02_c02.png', '登录页_r02_c02.png', 'image/png', 6288, 68, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r02_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r02_c03.png', '登录页_r02_c03.png', 'image/png', 4022, 58, 57, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r02_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r03_c01.png', '登录页_r03_c01.png', 'image/png', 2872, 50, 30, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r03_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r03_c02.png', '登录页_r03_c02.png', 'image/png', 3115, 51, 30, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r03_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r03_c03.png', '登录页_r03_c03.png', 'image/png', 5685, 101, 30, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r03_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r03_c04.png', '登录页_r03_c04.png', 'image/png', 5670, 102, 30, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r03_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r04_c01.png', '登录页_r04_c01.png', 'image/png', 4082, 82, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r04_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r04_c02.png', '登录页_r04_c02.png', 'image/png', 4146, 82, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r04_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r04_c03.png', '登录页_r04_c03.png', 'image/png', 4114, 82, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r04_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r04_c04.png', '登录页_r04_c04.png', 'image/png', 4112, 83, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r04_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r05_c01.png', '登录页_r05_c01.png', 'image/png', 13415, 174, 36, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r05_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r06_c01.png', '登录页_r06_c01.png', 'image/png', 7884, 76, 64, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r06_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r06_c02.png', '登录页_r06_c02.png', 'image/png', 8954, 73, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r06_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r06_c03.png', '登录页_r06_c03.png', 'image/png', 5406, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r06_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r06_c04.png', '登录页_r06_c04.png', 'image/png', 2636, 35, 56, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r06_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r07_c01.png', '登录页_r07_c01.png', 'image/png', 6096, 94, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r07_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r07_c02.png', '登录页_r07_c02.png', 'image/png', 6008, 103, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r07_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r07_c03.png', '登录页_r07_c03.png', 'image/png', 6255, 103, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r07_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r07_c04.png', '登录页_r07_c04.png', 'image/png', 4762, 82, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r07_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r08_c01.png', '登录页_r08_c01.png', 'image/png', 4182, 83, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r08_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r08_c02.png', '登录页_r08_c02.png', 'image/png', 4197, 82, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r08_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r08_c03.png', '登录页_r08_c03.png', 'image/png', 4243, 82, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r08_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r08_c04.png', '登录页_r08_c04.png', 'image/png', 4290, 83, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r08_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r09_c01.png', '登录页_r09_c01.png', 'image/png', 15028, 202, 36, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r09_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r10_c01.png', '登录页_r10_c01.png', 'image/png', 3273, 58, 45, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r10_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r10_c02.png', '登录页_r10_c02.png', 'image/png', 5108, 62, 49, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r10_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r10_c03.png', '登录页_r10_c03.png', 'image/png', 4268, 78, 44, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r10_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r10_c04.png', '登录页_r10_c04.png', 'image/png', 4118, 47, 60, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r10_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r11_c01.png', '登录页_r11_c01.png', 'image/png', 2660, 49, 29, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r11_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r11_c02.png', '登录页_r11_c02.png', 'image/png', 2932, 59, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r11_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r11_c03.png', '登录页_r11_c03.png', 'image/png', 2818, 47, 29, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r11_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r11_c04.png', '登录页_r11_c04.png', 'image/png', 3043, 48, 29, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r11_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r12_c01.png', '登录页_r12_c01.png', 'image/png', 3978, 79, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r12_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r12_c02.png', '登录页_r12_c02.png', 'image/png', 3968, 79, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r12_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r12_c03.png', '登录页_r12_c03.png', 'image/png', 3934, 79, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r12_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r12_c04.png', '登录页_r12_c04.png', 'image/png', 3952, 79, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r12_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r13_c01.png', '登录页_r13_c01.png', 'image/png', 3877, 47, 59, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r13_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r13_c02.png', '登录页_r13_c02.png', 'image/png', 6551, 62, 62, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r13_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r13_c03.png', '登录页_r13_c03.png', 'image/png', 5208, 53, 61, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r13_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r13_c04.png', '登录页_r13_c04.png', 'image/png', 5470, 53, 64, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r13_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r14_c01.png', '登录页_r14_c01.png', 'image/png', 5872, 97, 30, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r14_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r14_c02.png', '登录页_r14_c02.png', 'image/png', 6006, 98, 29, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r14_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r14_c03.png', '登录页_r14_c03.png', 'image/png', 2436, 47, 30, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r14_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r14_c04.png', '登录页_r14_c04.png', 'image/png', 5252, 88, 29, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r14_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r15_c01.png', '登录页_r15_c01.png', 'image/png', 3970, 79, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r15_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r15_c02.png', '登录页_r15_c02.png', 'image/png', 4056, 80, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r15_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r15_c03.png', '登录页_r15_c03.png', 'image/png', 3982, 79, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r15_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r15_c04.png', '登录页_r15_c04.png', 'image/png', 3984, 79, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r15_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/login-split/登录页_r16_c01.png', '登录页_r16_c01.png', 'image/png', 70455, 1285, 75, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/login-split/登录页_r16_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/camera_icon.png', 'camera_icon.png', 'image/png', 7176, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/camera_icon.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/chat_are_you.png', 'chat_are_you.png', 'image/png', 5978, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/chat_are_you.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/chat_good.png', 'chat_good.png', 'image/png', 6360, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/chat_good.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/chat_goodnight.png', 'chat_goodnight.png', 'image/png', 5587, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/chat_goodnight.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/chat_great.png', 'chat_great.png', 'image/png', 5737, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/chat_great.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/chat_hi.png', 'chat_hi.png', 'image/png', 5971, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/chat_hi.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/chat_received.png', 'chat_received.png', 'image/png', 6526, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/chat_received.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/confetti.png', 'confetti.png', 'image/png', 6606, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/confetti.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_31.png', 'decor_31.png', 'image/png', 20490, 143, 94, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_31.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_32.png', 'decor_32.png', 'image/png', 19535, 138, 90, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_32.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_33.png', 'decor_33.png', 'image/png', 23479, 144, 103, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_33.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_34.png', 'decor_34.png', 'image/png', 22722, 140, 103, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_34.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_35.png', 'decor_35.png', 'image/png', 22373, 150, 92, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_35.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_36.png', 'decor_36.png', 'image/png', 27020, 170, 103, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_36.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_37.png', 'decor_37.png', 'image/png', 13886, 88, 96, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_37.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_38.png', 'decor_38.png', 'image/png', 14086, 88, 98, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_38.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_39.png', 'decor_39.png', 'image/png', 13294, 83, 95, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_39.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_40.png', 'decor_40.png', 'image/png', 9342, 83, 81, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_40.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_41.png', 'decor_41.png', 'image/png', 17426, 111, 97, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_41.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_42.png', 'decor_42.png', 'image/png', 8092, 78, 71, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_42.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_43.png', 'decor_43.png', 'image/png', 6949, 73, 65, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_43.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_44.png', 'decor_44.png', 'image/png', 5461, 55, 62, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_44.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_45.png', 'decor_45.png', 'image/png', 7576, 73, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_45.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_46.png', 'decor_46.png', 'image/png', 7159, 63, 66, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_46.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_47.png', 'decor_47.png', 'image/png', 7004, 63, 66, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_47.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_48.png', 'decor_48.png', 'image/png', 7390, 60, 63, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_48.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_49.png', 'decor_49.png', 'image/png', 8082, 78, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_49.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_50.png', 'decor_50.png', 'image/png', 8724, 87, 69, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_50.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_51.png', 'decor_51.png', 'image/png', 9749, 86, 71, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_51.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/decor_52.png', 'decor_52.png', 'image/png', 7679, 75, 69, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/decor_52.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/default.png', 'default.png', 'image/png', 57407, 256, 256, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/default.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/dotted_orbit.png', 'dotted_orbit.png', 'image/png', 8640, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/dotted_orbit.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/exclamation.png', 'exclamation.png', 'image/png', 168, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/exclamation.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_19.png', 'expression_19.png', 'image/png', 12935, 150, 52, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_19.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_20.png', 'expression_20.png', 'image/png', 31030, 144, 139, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_20.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_21.png', 'expression_21.png', 'image/png', 24463, 117, 133, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_21.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_22.png', 'expression_22.png', 'image/png', 26604, 113, 143, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_22.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_23.png', 'expression_23.png', 'image/png', 26204, 126, 133, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_23.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_24.png', 'expression_24.png', 'image/png', 24944, 121, 135, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_24.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_25.png', 'expression_25.png', 'image/png', 24743, 117, 137, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_25.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_26.png', 'expression_26.png', 'image/png', 25720, 122, 134, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_26.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_27.png', 'expression_27.png', 'image/png', 28701, 123, 136, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_27.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_28.png', 'expression_28.png', 'image/png', 27306, 121, 135, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_28.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_29.png', 'expression_29.png', 'image/png', 30957, 123, 145, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_29.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/expression_30.png', 'expression_30.png', 'image/png', 20624, 100, 122, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/expression_30.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/floating.png', 'floating.png', 'image/png', 7617, 240, 240, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/floating.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/flower.png', 'flower.png', 'image/png', 7599, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/flower.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/happy.png', 'happy.png', 'image/png', 50426, 256, 256, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/happy.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/head_crush.png', 'head_crush.png', 'image/png', 8279, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/head_crush.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/head_default.png', 'head_default.png', 'image/png', 7983, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/head_default.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/head_glasses.png', 'head_glasses.png', 'image/png', 9543, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/head_glasses.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/head_happy.png', 'head_happy.png', 'image/png', 8400, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/head_happy.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/head_sleepy.png', 'head_sleepy.png', 'image/png', 7953, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/head_sleepy.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/heart_bubble.png', 'heart_bubble.png', 'image/png', 6409, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/heart_bubble.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/heart_decor_pair.png', 'heart_decor_pair.png', 'image/png', 5973, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/heart_decor_pair.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/heart_green.png', 'heart_green.png', 'image/png', 3336, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/heart_green.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/heart_mini.png', 'heart_mini.png', 'image/png', 168, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/heart_mini.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/heart_pink.png', 'heart_pink.png', 'image/png', 168, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/heart_pink.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/heart_pink_large.png', 'heart_pink_large.png', 'image/png', 6438, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/heart_pink_large.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/leaf_pair.png', 'leaf_pair.png', 'image/png', 6195, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/leaf_pair.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/logo.png', 'logo.png', 'image/png', 7457, 240, 240, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/logo.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/love.png', 'love.png', 'image/png', 51758, 256, 256, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/love.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_angry.png', 'mascot_angry.png', 'image/png', 7778, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_angry.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_calm.png', 'mascot_calm.png', 'image/png', 7657, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_calm.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_camera.png', 'mascot_camera.png', 'image/png', 8339, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_camera.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_cheer.png', 'mascot_cheer.png', 'image/png', 6272, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_cheer.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_clap.png', 'mascot_clap.png', 'image/png', 7067, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_clap.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_corner_frame.png', 'mascot_corner_frame.png', 'image/png', 8531, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_corner_frame.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_crush.png', 'mascot_crush.png', 'image/png', 7897, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_crush.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_cry.png', 'mascot_cry.png', 'image/png', 6490, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_cry.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_default.png', 'mascot_default.png', 'image/png', 7578, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_default.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_10.png', 'mascot_extra_10.png', 'image/png', 22120, 300, 300, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_10.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_11.png', 'mascot_extra_11.png', 'image/png', 25426, 124, 132, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_11.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_12.png', 'mascot_extra_12.png', 'image/png', 23999, 116, 136, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_12.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_13.png', 'mascot_extra_13.png', 'image/png', 26047, 117, 140, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_13.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_14.png', 'mascot_extra_14.png', 'image/png', 31946, 142, 144, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_14.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_15.png', 'mascot_extra_15.png', 'image/png', 25510, 122, 132, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_15.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_16.png', 'mascot_extra_16.png', 'image/png', 29219, 142, 136, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_16.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_17.png', 'mascot_extra_17.png', 'image/png', 31481, 140, 138, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_17.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_18.png', 'mascot_extra_18.png', 'image/png', 30353, 124, 140, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_extra_18.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_greeting.png', 'mascot_greeting.png', 'image/png', 7531, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_greeting.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_happy.png', 'mascot_happy.png', 'image/png', 7361, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_happy.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_heart.png', 'mascot_heart.png', 'image/png', 7979, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_heart.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_hug.png', 'mascot_hug.png', 'image/png', 5908, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_hug.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_jump.png', 'mascot_jump.png', 'image/png', 6119, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_jump.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_like.png', 'mascot_like.png', 'image/png', 8313, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_like.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_love.png', 'mascot_love.png', 'image/png', 7445, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_love.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_party.png', 'mascot_party.png', 'image/png', 6576, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_party.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_phone.png', 'mascot_phone.png', 'image/png', 4916, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_phone.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_ref_01.png', 'mascot_ref_01.png', 'image/png', 35635, 300, 300, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_ref_01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_search.png', 'mascot_search.png', 'image/png', 7896, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_search.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_shy.png', 'mascot_shy.png', 'image/png', 7720, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_shy.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_sleep.png', 'mascot_sleep.png', 'image/png', 6804, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_sleep.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_sleepy.png', 'mascot_sleepy.png', 'image/png', 6126, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_sleepy.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_smile.png', 'mascot_smile.png', 'image/png', 6977, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_smile.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_surprised.png', 'mascot_surprised.png', 'image/png', 6386, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_surprised.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_tearful.png', 'mascot_tearful.png', 'image/png', 6114, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_tearful.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_thinking.png', 'mascot_thinking.png', 'image/png', 8030, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_thinking.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_wave.png', 'mascot_wave.png', 'image/png', 7336, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_wave.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/mascot_wink.png', 'mascot_wink.png', 'image/png', 6886, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/mascot_wink.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/nav_home_mascot.png', 'nav_home_mascot.png', 'image/png', 7145, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/nav_home_mascot.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/nav_match_mascot.png', 'nav_match_mascot.png', 'image/png', 3463, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/nav_match_mascot.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/nav_message_mascot.png', 'nav_message_mascot.png', 'image/png', 1300, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/nav_message_mascot.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/nav_nearby_mascot.png', 'nav_nearby_mascot.png', 'image/png', 2844, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/nav_nearby_mascot.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/nav_profile_mascot.png', 'nav_profile_mascot.png', 'image/png', 7584, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/nav_profile_mascot.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/party.png', 'party.png', 'image/png', 7297, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/party.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/question.png', 'question.png', 'image/png', 4670, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/question.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/sad.png', 'sad.png', 'image/png', 42880, 256, 256, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/sad.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/sparkle.png', 'sparkle.png', 'image/png', 4957, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/sparkle.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/sparkle_decor.png', 'sparkle_decor.png', 'image/png', 2612, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/sparkle_decor.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/sprout.png', 'sprout.png', 'image/png', 5208, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/sprout.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/sprout_outline.png', 'sprout_outline.png', 'image/png', 6500, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/sprout_outline.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/star.png', 'star.png', 'image/png', 5997, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/star.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/status_busy.png', 'status_busy.png', 'image/png', 5872, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/status_busy.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/status_crush.png', 'status_crush.png', 'image/png', 3835, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/status_crush.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/status_offline.png', 'status_offline.png', 'image/png', 7149, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/status_offline.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/status_online.png', 'status_online.png', 'image/png', 3037, 72, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/status_online.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/thinking.png', 'thinking.png', 'image/png', 55487, 256, 256, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/thinking.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/utility_53.png', 'utility_53.png', 'image/png', 26891, 121, 139, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/utility_53.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/utility_54.png', 'utility_54.png', 'image/png', 15571, 95, 105, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/utility_54.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/utility_55.png', 'utility_55.png', 'image/png', 15891, 95, 106, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/utility_55.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/utility_56.png', 'utility_56.png', 'image/png', 20164, 99, 123, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/utility_56.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/utility_57.png', 'utility_57.png', 'image/png', 16957, 98, 104, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/utility_57.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/utility_58.png', 'utility_58.png', 'image/png', 20261, 300, 300, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/utility_58.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/utility_59.png', 'utility_59.png', 'image/png', 12724, 99, 86, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/utility_59.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/utility_60.png', 'utility_60.png', 'image/png', 5330, 62, 57, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/utility_60.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/utility_61.png', 'utility_61.png', 'image/png', 22938, 129, 132, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/utility_61.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/utility_62.png', 'utility_62.png', 'image/png', 5825, 63, 58, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/utility_62.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/mascot/waving.png', 'waving.png', 'image/png', 48284, 256, 256, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/mascot/waving.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r01_c01.png', '匹配_r01_c01.png', 'image/png', 5783, 125, 35, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r01_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r01_c02.png', '匹配_r01_c02.png', 'image/png', 3315, 133, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r01_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r01_c03.png', '匹配_r01_c03.png', 'image/png', 6453, 91, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r01_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c01.png', '匹配_r02_c01.png', 'image/png', 10895, 124, 65, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c02.png', '匹配_r02_c02.png', 'image/png', 4979, 62, 55, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c03.png', '匹配_r02_c03.png', 'image/png', 3549, 65, 62, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c04.png', '匹配_r02_c04.png', 'image/png', 6089, 74, 67, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c05.png', '匹配_r02_c05.png', 'image/png', 9339, 106, 66, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c06.png', '匹配_r02_c06.png', 'image/png', 14129, 145, 70, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r02_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r03_c01.png', '匹配_r03_c01.png', 'image/png', 2018, 42, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r03_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r03_c02.png', '匹配_r03_c02.png', 'image/png', 1574, 42, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r03_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r04_c01.png', '匹配_r04_c01.png', 'image/png', 51854, 153, 208, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r04_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r04_c02.png', '匹配_r04_c02.png', 'image/png', 5627, 91, 30, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r04_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r04_c03.png', '匹配_r04_c03.png', 'image/png', 9285, 132, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r04_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c01.png', '匹配_r05_c01.png', 'image/png', 37242, 151, 178, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c02.png', '匹配_r05_c02.png', 'image/png', 9400, 127, 57, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c03.png', '匹配_r05_c03.png', 'image/png', 9781, 127, 57, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c04.png', '匹配_r05_c04.png', 'image/png', 8908, 127, 58, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c05.png', '匹配_r05_c05.png', 'image/png', 8332, 120, 58, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c06.png', '匹配_r05_c06.png', 'image/png', 20621, 128, 129, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c07.png', '匹配_r05_c07.png', 'image/png', 23359, 134, 132, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c08.png', '匹配_r05_c08.png', 'image/png', 31850, 137, 164, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r05_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r06_c01.png', '匹配_r06_c01.png', 'image/png', 5561, 97, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r06_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r06_c02.png', '匹配_r06_c02.png', 'image/png', 7173, 130, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r06_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r07_c01.png', '匹配_r07_c01.png', 'image/png', 7075, 110, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r07_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r07_c02.png', '匹配_r07_c02.png', 'image/png', 7987, 133, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r07_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r07_c03.png', '匹配_r07_c03.png', 'image/png', 27921, 130, 159, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r07_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r07_c04.png', '匹配_r07_c04.png', 'image/png', 32158, 137, 164, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r07_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r07_c05.png', '匹配_r07_c05.png', 'image/png', 32856, 139, 165, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r07_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r08_c01.png', '匹配_r08_c01.png', 'image/png', 7814, 81, 61, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r08_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r08_c02.png', '匹配_r08_c02.png', 'image/png', 6977, 73, 67, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r08_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r08_c03.png', '匹配_r08_c03.png', 'image/png', 4961, 42, 62, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r08_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r08_c04.png', '匹配_r08_c04.png', 'image/png', 5529, 62, 58, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r08_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r09_c01.png', '匹配_r09_c01.png', 'image/png', 7190, 112, 30, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r09_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r09_c02.png', '匹配_r09_c02.png', 'image/png', 4781, 154, 32, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r09_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r09_c03.png', '匹配_r09_c03.png', 'image/png', 8427, 130, 30, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r09_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c01.png', '匹配_r10_c01.png', 'image/png', 5969, 65, 62, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c02.png', '匹配_r10_c02.png', 'image/png', 6216, 54, 64, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c03.png', '匹配_r10_c03.png', 'image/png', 9228, 78, 73, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c04.png', '匹配_r10_c04.png', 'image/png', 8804, 77, 71, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c05.png', '匹配_r10_c05.png', 'image/png', 5485, 58, 62, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c06.png', '匹配_r10_c06.png', 'image/png', 2780, 59, 45, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c07.png', '匹配_r10_c07.png', 'image/png', 4034, 62, 48, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c08.png', '匹配_r10_c08.png', 'image/png', 4040, 82, 48, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c09.png', '匹配_r10_c09.png', 'image/png', 4012, 58, 34, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c10.png', '匹配_r10_c10.png', 'image/png', 3876, 58, 34, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r10_c10.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r11_c01.png', '匹配_r11_c01.png', 'image/png', 1966, 42, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r11_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r11_c02.png', '匹配_r11_c02.png', 'image/png', 2126, 42, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r11_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r11_c03.png', '匹配_r11_c03.png', 'image/png', 1881, 39, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r11_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c01.png', '匹配_r12_c01.png', 'image/png', 6156, 72, 67, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c02.png', '匹配_r12_c02.png', 'image/png', 6348, 53, 64, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c03.png', '匹配_r12_c03.png', 'image/png', 7053, 73, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c04.png', '匹配_r12_c04.png', 'image/png', 4036, 60, 61, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c05.png', '匹配_r12_c05.png', 'image/png', 4924, 64, 66, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c06.png', '匹配_r12_c06.png', 'image/png', 8117, 129, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c07.png', '匹配_r12_c07.png', 'image/png', 9968, 158, 31, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r12_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r13_c01.png', '匹配_r13_c01.png', 'image/png', 5125, 63, 56, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r13_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r13_c02.png', '匹配_r13_c02.png', 'image/png', 4475, 58, 52, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r13_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r13_c03.png', '匹配_r13_c03.png', 'image/png', 2494, 40, 39, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r13_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r13_c04.png', '匹配_r13_c04.png', 'image/png', 2213, 37, 36, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r13_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r14_c01.png', '匹配_r14_c01.png', 'image/png', 2505, 52, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r14_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r14_c02.png', '匹配_r14_c02.png', 'image/png', 4257, 93, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r14_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r14_c03.png', '匹配_r14_c03.png', 'image/png', 4266, 94, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r14_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r15_c01.png', '匹配_r15_c01.png', 'image/png', 36283, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r15_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r15_c02.png', '匹配_r15_c02.png', 'image/png', 15963, 103, 100, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r15_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r16_c01.png', '匹配_r16_c01.png', 'image/png', 7189, 75, 76, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r16_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r16_c02.png', '匹配_r16_c02.png', 'image/png', 6752, 74, 75, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r16_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r16_c03.png', '匹配_r16_c03.png', 'image/png', 6922, 76, 76, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r16_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r16_c04.png', '匹配_r16_c04.png', 'image/png', 6804, 76, 76, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r16_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/匹配_r16_c05.png', '匹配_r16_c05.png', 'image/png', 6349, 73, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/匹配_r16_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/match-split/图标预览_联系表.png', '图标预览_联系表.png', 'image/png', 52932, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/match-split/图标预览_联系表.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r01_c01.png', '消息_r01_c01.png', 'image/png', 7028, 117, 32, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r01_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r01_c02.png', '消息_r01_c02.png', 'image/png', 9975, 171, 32, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r01_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c01.png', '消息_r02_c01.png', 'image/png', 3537, 52, 52, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c02.png', '消息_r02_c02.png', 'image/png', 3536, 52, 52, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c03.png', '消息_r02_c03.png', 'image/png', 3920, 49, 56, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c04.png', '消息_r02_c04.png', 'image/png', 3640, 55, 51, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c05.png', '消息_r02_c05.png', 'image/png', 7038, 67, 69, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c06.png', '消息_r02_c06.png', 'image/png', 3691, 51, 54, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c07.png', '消息_r02_c07.png', 'image/png', 5212, 65, 59, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c08.png', '消息_r02_c08.png', 'image/png', 4872, 66, 59, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c09.png', '消息_r02_c09.png', 'image/png', 5842, 75, 60, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r02_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r03_c01.png', '消息_r03_c01.png', 'image/png', 2574, 49, 48, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r03_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r03_c02.png', '消息_r03_c02.png', 'image/png', 1953, 49, 48, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r03_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r03_c03.png', '消息_r03_c03.png', 'image/png', 7973, 99, 52, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r03_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r03_c04.png', '消息_r03_c04.png', 'image/png', 7297, 95, 52, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r03_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c01.png', '消息_r04_c01.png', 'image/png', 1789, 41, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c02.png', '消息_r04_c02.png', 'image/png', 2062, 41, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c03.png', '消息_r04_c03.png', 'image/png', 1912, 41, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c04.png', '消息_r04_c04.png', 'image/png', 1890, 41, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c05.png', '消息_r04_c05.png', 'image/png', 1847, 41, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c06.png', '消息_r04_c06.png', 'image/png', 1844, 42, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c07.png', '消息_r04_c07.png', 'image/png', 5304, 68, 49, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c08.png', '消息_r04_c08.png', 'image/png', 1932, 41, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c09.png', '消息_r04_c09.png', 'image/png', 4048, 88, 28, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c10.png', '消息_r04_c10.png', 'image/png', 4040, 88, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c10.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c11.png', '消息_r04_c11.png', 'image/png', 1968, 42, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c11.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c12.png', '消息_r04_c12.png', 'image/png', 1856, 42, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r04_c12.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r05_c01.png', '消息_r05_c01.png', 'image/png', 6918, 117, 32, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r05_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r05_c02.png', '消息_r05_c02.png', 'image/png', 11665, 203, 33, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r05_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c01.png', '消息_r06_c01.png', 'image/png', 4733, 62, 60, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c02.png', '消息_r06_c02.png', 'image/png', 9221, 77, 104, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c03.png', '消息_r06_c03.png', 'image/png', 4955, 57, 52, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c04.png', '消息_r06_c04.png', 'image/png', 5931, 65, 62, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c05.png', '消息_r06_c05.png', 'image/png', 4299, 54, 54, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c06.png', '消息_r06_c06.png', 'image/png', 4785, 56, 56, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c07.png', '消息_r06_c07.png', 'image/png', 3291, 50, 50, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c08.png', '消息_r06_c08.png', 'image/png', 3568, 46, 52, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c09.png', '消息_r06_c09.png', 'image/png', 3319, 51, 47, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c10.png', '消息_r06_c10.png', 'image/png', 6514, 67, 66, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c10.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c11.png', '消息_r06_c11.png', 'image/png', 3352, 47, 50, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r06_c11.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r07_c01.png', '消息_r07_c01.png', 'image/png', 4916, 58, 50, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r07_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r07_c02.png', '消息_r07_c02.png', 'image/png', 3833, 48, 53, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r07_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c01.png', '消息_r08_c01.png', 'image/png', 4112, 86, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c02.png', '消息_r08_c02.png', 'image/png', 2658, 58, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c03.png', '消息_r08_c03.png', 'image/png', 4074, 86, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c04.png', '消息_r08_c04.png', 'image/png', 4030, 87, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c05.png', '消息_r08_c05.png', 'image/png', 2055, 42, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c06.png', '消息_r08_c06.png', 'image/png', 4115, 87, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c07.png', '消息_r08_c07.png', 'image/png', 1817, 42, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c08.png', '消息_r08_c08.png', 'image/png', 1875, 41, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c09.png', '消息_r08_c09.png', 'image/png', 1913, 41, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c10.png', '消息_r08_c10.png', 'image/png', 1791, 41, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c10.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c11.png', '消息_r08_c11.png', 'image/png', 2107, 42, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c11.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c12.png', '消息_r08_c12.png', 'image/png', 2068, 41, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r08_c12.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r09_c01.png', '消息_r09_c01.png', 'image/png', 11917, 203, 33, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r09_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r09_c02.png', '消息_r09_c02.png', 'image/png', 9930, 171, 32, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r09_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r09_c03.png', '消息_r09_c03.png', 'image/png', 10357, 170, 33, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r09_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c01.png', '消息_r10_c01.png', 'image/png', 11803, 82, 81, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c02.png', '消息_r10_c02.png', 'image/png', 11805, 82, 81, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c03.png', '消息_r10_c03.png', 'image/png', 11588, 79, 80, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c04.png', '消息_r10_c04.png', 'image/png', 4778, 73, 55, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c05.png', '消息_r10_c05.png', 'image/png', 4104, 56, 52, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c06.png', '消息_r10_c06.png', 'image/png', 4384, 56, 59, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r10_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r11_c01.png', '消息_r11_c01.png', 'image/png', 1827, 31, 45, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r11_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r11_c02.png', '消息_r11_c02.png', 'image/png', 3890, 68, 33, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r11_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r11_c03.png', '消息_r11_c03.png', 'image/png', 3016, 58, 35, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r11_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c01.png', '消息_r12_c01.png', 'image/png', 3595, 72, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c02.png', '消息_r12_c02.png', 'image/png', 3362, 72, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c03.png', '消息_r12_c03.png', 'image/png', 3254, 73, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c04.png', '消息_r12_c04.png', 'image/png', 4102, 88, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c05.png', '消息_r12_c05.png', 'image/png', 3725, 80, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c06.png', '消息_r12_c06.png', 'image/png', 3606, 72, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c07.png', '消息_r12_c07.png', 'image/png', 4289, 88, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c08.png', '消息_r12_c08.png', 'image/png', 4371, 89, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c09.png', '消息_r12_c09.png', 'image/png', 3400, 73, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c10.png', '消息_r12_c10.png', 'image/png', 3476, 73, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r12_c10.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r13_c01.png', '消息_r13_c01.png', 'image/png', 9466, 160, 33, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r13_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r13_c02.png', '消息_r13_c02.png', 'image/png', 10397, 169, 32, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r13_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r13_c03.png', '消息_r13_c03.png', 'image/png', 10364, 169, 33, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r13_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c01.png', '消息_r14_c01.png', 'image/png', 9847, 73, 90, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c02.png', '消息_r14_c02.png', 'image/png', 9563, 72, 87, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c03.png', '消息_r14_c03.png', 'image/png', 9433, 72, 87, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c04.png', '消息_r14_c04.png', 'image/png', 9402, 72, 87, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c05.png', '消息_r14_c05.png', 'image/png', 11670, 84, 76, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c06.png', '消息_r14_c06.png', 'image/png', 4512, 55, 59, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c07.png', '消息_r14_c07.png', 'image/png', 5380, 67, 57, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c08.png', '消息_r14_c08.png', 'image/png', 6868, 66, 65, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c09.png', '消息_r14_c09.png', 'image/png', 4826, 58, 60, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c10.png', '消息_r14_c10.png', 'image/png', 5150, 69, 55, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c10.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c11.png', '消息_r14_c11.png', 'image/png', 6139, 59, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r14_c11.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r15_c01.png', '消息_r15_c01.png', 'image/png', 4198, 47, 55, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r15_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c01.png', '消息_r16_c01.png', 'image/png', 3777, 78, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c02.png', '消息_r16_c02.png', 'image/png', 1897, 42, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c03.png', '消息_r16_c03.png', 'image/png', 2085, 42, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c04.png', '消息_r16_c04.png', 'image/png', 1911, 41, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c05.png', '消息_r16_c05.png', 'image/png', 2066, 42, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c06.png', '消息_r16_c06.png', 'image/png', 1644, 40, 26, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c07.png', '消息_r16_c07.png', 'image/png', 3604, 80, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r16_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r17_c01.png', '消息_r17_c01.png', 'image/png', 10163, 170, 32, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r17_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r17_c02.png', '消息_r17_c02.png', 'image/png', 11195, 196, 32, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r17_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c01.png', '消息_r18_c01.png', 'image/png', 24203, 345, 62, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c02.png', '消息_r18_c02.png', 'image/png', 6629, 90, 47, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c03.png', '消息_r18_c03.png', 'image/png', 17674, 237, 62, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c04.png', '消息_r18_c04.png', 'image/png', 6808, 81, 70, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c05.png', '消息_r18_c05.png', 'image/png', 7478, 96, 70, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c06.png', '消息_r18_c06.png', 'image/png', 1429, 30, 33, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c07.png', '消息_r18_c07.png', 'image/png', 6803, 81, 75, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c08.png', '消息_r18_c08.png', 'image/png', 8594, 81, 78, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r18_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r19_c01.png', '消息_r19_c01.png', 'image/png', 3549, 80, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r19_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r19_c02.png', '消息_r19_c02.png', 'image/png', 3475, 81, 27, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r19_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r20_c01.png', '消息_r20_c01.png', 'image/png', 12543, 195, 65, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r20_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r20_c02.png', '消息_r20_c02.png', 'image/png', 16469, 203, 65, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r20_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r20_c03.png', '消息_r20_c03.png', 'image/png', 11904, 191, 66, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r20_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/messages-split/消息_r20_c04.png', '消息_r20_c04.png', 'image/png', 59794, 571, 73, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/messages-split/消息_r20_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-01.png', 'person-01.png', 'image/png', 25149, 200, 200, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/people/person-01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-02.png', 'person-02.png', 'image/png', 26448, 200, 200, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/people/person-02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-03.png', 'person-03.png', 'image/png', 24334, 200, 200, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/people/person-03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-04.png', 'person-04.png', 'image/png', 22090, 200, 200, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/people/person-04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-05.png', 'person-05.png', 'image/png', 22012, 200, 200, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/people/person-05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-06.png', 'person-06.png', 'image/png', 27639, 200, 200, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/people/person-06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-07.png', 'person-07.png', 'image/png', 25038, 200, 200, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/people/person-07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-08.png', 'person-08.png', 'image/png', 22763, 200, 200, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/people/person-08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/people/person-09.png', 'person-09.png', 'image/png', 30389, 200, 200, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/people/person-09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/portraits/p1.jpg', 'p1.jpg', 'image/jpeg', 69294, 600, 800, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/portraits/p1.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/portraits/p2.jpg', 'p2.jpg', 'image/jpeg', 70718, 600, 800, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/portraits/p2.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/portraits/p3.jpg', 'p3.jpg', 'image/jpeg', 61809, 600, 800, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/portraits/p3.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/portraits/p4.jpg', 'p4.jpg', 'image/jpeg', 58584, 600, 800, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/portraits/p4.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/portraits/p5.jpg', 'p5.jpg', 'image/jpeg', 68326, 600, 800, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/portraits/p5.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/portraits/p6.jpg', 'p6.jpg', 'image/jpeg', 72165, 600, 800, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/portraits/p6.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/portraits/p7.jpg', 'p7.jpg', 'image/jpeg', 69490, 600, 800, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/portraits/p7.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/portraits/p8.jpg', 'p8.jpg', 'image/jpeg', 61653, 600, 800, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/portraits/p8.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/portraits/p9.jpg', 'p9.jpg', 'image/jpeg', 100039, 600, 800, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/portraits/p9.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posters/home-poster.jpg', 'home-poster.jpg', 'image/jpeg', 97408, 720, 1280, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posters/home-poster.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posters/login-illustration.jpg', 'login-illustration.jpg', 'image/jpeg', 60874, 750, 1000, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posters/login-illustration.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posters/login-illustration.png', 'login-illustration.png', 'image/png', 252074, 750, 1000, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posters/login-illustration.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posters/login-poster.jpg', 'login-poster.jpg', 'image/jpeg', 67822, 720, 1280, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posters/login-poster.jpg');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posters/login-poster.png', 'login-poster.png', 'image/png', 137124, 720, 1280, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posters/login-poster.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/posters/notlogged-waiting.png', 'notlogged-waiting.png', 'image/png', 219973, 750, 1000, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/posters/notlogged-waiting.png');
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
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c01.png', '主页_他人1_r01_c01.png', 'image/png', 16368, 112, 110, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c02.png', '主页_他人1_r01_c02.png', 'image/png', 17069, 143, 82, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c03.png', '主页_他人1_r01_c03.png', 'image/png', 21805, 186, 95, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c04.png', '主页_他人1_r01_c04.png', 'image/png', 26342, 223, 95, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c05.png', '主页_他人1_r01_c05.png', 'image/png', 3734, 38, 60, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c06.png', '主页_他人1_r01_c06.png', 'image/png', 3820, 62, 48, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c07.png', '主页_他人1_r01_c07.png', 'image/png', 4845, 63, 50, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c08.png', '主页_他人1_r01_c08.png', 'image/png', 5021, 83, 48, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r01_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c01.png', '主页_他人1_r02_c01.png', 'image/png', 19624, 195, 85, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c02.png', '主页_他人1_r02_c02.png', 'image/png', 20212, 196, 85, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c03.png', '主页_他人1_r02_c03.png', 'image/png', 18563, 196, 85, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c04.png', '主页_他人1_r02_c04.png', 'image/png', 19547, 197, 85, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c05.png', '主页_他人1_r02_c05.png', 'image/png', 19794, 195, 85, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c06.png', '主页_他人1_r02_c06.png', 'image/png', 20397, 195, 85, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r02_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c01.png', '主页_他人1_r03_c01.png', 'image/png', 22178, 132, 132, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c02.png', '主页_他人1_r03_c02.png', 'image/png', 13266, 159, 40, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c03.png', '主页_他人1_r03_c03.png', 'image/png', 20916, 131, 131, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c04.png', '主页_他人1_r03_c04.png', 'image/png', 12667, 157, 39, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c05.png', '主页_他人1_r03_c05.png', 'image/png', 23577, 132, 132, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c06.png', '主页_他人1_r03_c06.png', 'image/png', 13415, 157, 39, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r03_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r04_c01.png', '主页_他人1_r04_c01.png', 'image/png', 11384, 180, 37, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r04_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r04_c02.png', '主页_他人1_r04_c02.png', 'image/png', 10983, 172, 37, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r04_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r04_c03.png', '主页_他人1_r04_c03.png', 'image/png', 5242, 87, 37, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r04_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r04_c04.png', '主页_他人1_r04_c04.png', 'image/png', 3625, 60, 36, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r04_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c01.png', '主页_他人1_r05_c01.png', 'image/png', 8742, 81, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c02.png', '主页_他人1_r05_c02.png', 'image/png', 9026, 87, 79, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c03.png', '主页_他人1_r05_c03.png', 'image/png', 7907, 76, 77, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c04.png', '主页_他人1_r05_c04.png', 'image/png', 8680, 89, 80, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c05.png', '主页_他人1_r05_c05.png', 'image/png', 9164, 79, 78, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c06.png', '主页_他人1_r05_c06.png', 'image/png', 10939, 82, 79, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c07.png', '主页_他人1_r05_c07.png', 'image/png', 9376, 69, 81, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c08.png', '主页_他人1_r05_c08.png', 'image/png', 8170, 69, 80, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c09.png', '主页_他人1_r05_c09.png', 'image/png', 7225, 68, 79, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r05_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c01.png', '主页_他人1_r06_c01.png', 'image/png', 30454, 249, 100, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c02.png', '主页_他人1_r06_c02.png', 'image/png', 36888, 315, 101, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c03.png', '主页_他人1_r06_c03.png', 'image/png', 32040, 278, 103, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c04.png', '主页_他人1_r06_c04.png', 'image/png', 14601, 108, 109, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c05.png', '主页_他人1_r06_c05.png', 'image/png', 16898, 110, 110, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c06.png', '主页_他人1_r06_c06.png', 'image/png', 15133, 110, 109, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c07.png', '主页_他人1_r06_c07.png', 'image/png', 15542, 110, 111, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r06_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c01.png', '主页_他人1_r07_c01.png', 'image/png', 6675, 74, 71, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c02.png', '主页_他人1_r07_c02.png', 'image/png', 7194, 70, 67, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c03.png', '主页_他人1_r07_c03.png', 'image/png', 5945, 69, 65, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c04.png', '主页_他人1_r07_c04.png', 'image/png', 6198, 72, 68, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c05.png', '主页_他人1_r07_c05.png', 'image/png', 7272, 68, 71, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c06.png', '主页_他人1_r07_c06.png', 'image/png', 18019, 127, 127, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c07.png', '主页_他人1_r07_c07.png', 'image/png', 17991, 128, 127, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c08.png', '主页_他人1_r07_c08.png', 'image/png', 18793, 128, 127, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c09.png', '主页_他人1_r07_c09.png', 'image/png', 27573, 144, 143, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r07_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r08_c01.png', '主页_他人1_r08_c01.png', 'image/png', 4051, 61, 36, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r08_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r08_c02.png', '主页_他人1_r08_c02.png', 'image/png', 2842, 60, 36, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r08_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r08_c03.png', '主页_他人1_r08_c03.png', 'image/png', 2915, 60, 36, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r08_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r08_c04.png', '主页_他人1_r08_c04.png', 'image/png', 3006, 60, 36, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r08_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r08_c05.png', '主页_他人1_r08_c05.png', 'image/png', 2758, 59, 35, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r08_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c01.png', '主页_他人1_r09_c01.png', 'image/png', 14686, 106, 106, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c02.png', '主页_他人1_r09_c02.png', 'image/png', 7610, 70, 70, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c03.png', '主页_他人1_r09_c03.png', 'image/png', 11983, 90, 90, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c04.png', '主页_他人1_r09_c04.png', 'image/png', 7794, 76, 78, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c05.png', '主页_他人1_r09_c05.png', 'image/png', 9368, 76, 76, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c06.png', '主页_他人1_r09_c06.png', 'image/png', 8197, 79, 73, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c07.png', '主页_他人1_r09_c07.png', 'image/png', 6659, 67, 75, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c08.png', '主页_他人1_r09_c08.png', 'image/png', 7665, 71, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c09.png', '主页_他人1_r09_c09.png', 'image/png', 6778, 61, 77, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c10.png', '主页_他人1_r09_c10.png', 'image/png', 8343, 76, 71, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/主页_他人1_r09_c10.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other1-split/图标预览_联系表.png', '图标预览_联系表.png', 'image/png', 67389, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other1-split/图标预览_联系表.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r01_c01.png', '主页_他人2_r01_c01.png', 'image/png', 4787, 46, 73, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r01_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r01_c02.png', '主页_他人2_r01_c02.png', 'image/png', 13188, 98, 96, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r01_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r01_c03.png', '主页_他人2_r01_c03.png', 'image/png', 19369, 178, 83, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r01_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r01_c04.png', '主页_他人2_r01_c04.png', 'image/png', 27982, 243, 103, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r01_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r01_c05.png', '主页_他人2_r01_c05.png', 'image/png', 33467, 261, 108, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r01_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c01.png', '主页_他人2_r02_c01.png', 'image/png', 20537, 201, 86, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c02.png', '主页_他人2_r02_c02.png', 'image/png', 21590, 205, 86, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c03.png', '主页_他人2_r02_c03.png', 'image/png', 19629, 205, 86, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c04.png', '主页_他人2_r02_c04.png', 'image/png', 21305, 212, 90, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c05.png', '主页_他人2_r02_c05.png', 'image/png', 22386, 220, 90, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c06.png', '主页_他人2_r02_c06.png', 'image/png', 22623, 211, 90, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r02_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r03_c01.png', '主页_他人2_r03_c01.png', 'image/png', 27927, 146, 147, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r03_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r03_c02.png', '主页_他人2_r03_c02.png', 'image/png', 24956, 147, 147, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r03_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r03_c03.png', '主页_他人2_r03_c03.png', 'image/png', 29581, 149, 149, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r03_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r04_c01.png', '主页_他人2_r04_c01.png', 'image/png', 12980, 161, 40, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r04_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r04_c02.png', '主页_他人2_r04_c02.png', 'image/png', 12269, 156, 40, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r04_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r04_c03.png', '主页_他人2_r04_c03.png', 'image/png', 11759, 154, 38, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r04_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r05_c01.png', '主页_他人2_r05_c01.png', 'image/png', 34982, 174, 159, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r05_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r05_c02.png', '主页_他人2_r05_c02.png', 'image/png', 61702, 189, 159, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r05_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r05_c03.png', '主页_他人2_r05_c03.png', 'image/png', 47901, 190, 159, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r05_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r05_c04.png', '主页_他人2_r05_c04.png', 'image/png', 42183, 184, 159, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r05_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c01.png', '主页_他人2_r06_c01.png', 'image/png', 31977, 272, 108, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c02.png', '主页_他人2_r06_c02.png', 'image/png', 35151, 274, 108, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c03.png', '主页_他人2_r06_c03.png', 'image/png', 36487, 274, 110, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c04.png', '主页_他人2_r06_c04.png', 'image/png', 4864, 62, 56, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c05.png', '主页_他人2_r06_c05.png', 'image/png', 5170, 62, 57, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c06.png', '主页_他人2_r06_c06.png', 'image/png', 6202, 69, 67, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c07.png', '主页_他人2_r06_c07.png', 'image/png', 7647, 73, 71, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c08.png', '主页_他人2_r06_c08.png', 'image/png', 8741, 83, 77, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c09.png', '主页_他人2_r06_c09.png', 'image/png', 8500, 76, 73, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r06_c09.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c01.png', '主页_他人2_r07_c01.png', 'image/png', 7264, 78, 64, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c02.png', '主页_他人2_r07_c02.png', 'image/png', 6416, 60, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c03.png', '主页_他人2_r07_c03.png', 'image/png', 2297, 32, 49, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c04.png', '主页_他人2_r07_c04.png', 'image/png', 4358, 56, 63, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c05.png', '主页_他人2_r07_c05.png', 'image/png', 6505, 74, 64, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c06.png', '主页_他人2_r07_c06.png', 'image/png', 3325, 54, 63, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c06.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c07.png', '主页_他人2_r07_c07.png', 'image/png', 6805, 73, 72, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c07.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c08.png', '主页_他人2_r07_c08.png', 'image/png', 5899, 73, 74, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/主页_他人2_r07_c08.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-other2-split/图标预览_联系表.png', '图标预览_联系表.png', 'image/png', 54945, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-other2-split/图标预览_联系表.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r01_c01.png', '主页_个人_r01_c01.png', 'image/png', 17507, 120, 116, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r01_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r01_c02.png', '主页_个人_r01_c02.png', 'image/png', 18508, 123, 118, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r01_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r01_c03.png', '主页_个人_r01_c03.png', 'image/png', 31113, 235, 99, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r01_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r02_c01.png', '主页_个人_r02_c01.png', 'image/png', 31356, 136, 180, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r02_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r02_c02.png', '主页_个人_r02_c02.png', 'image/png', 30749, 135, 181, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r02_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r02_c03.png', '主页_个人_r02_c03.png', 'image/png', 32198, 137, 183, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r02_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r02_c04.png', '主页_个人_r02_c04.png', 'image/png', 32940, 138, 181, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r02_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r02_c05.png', '主页_个人_r02_c05.png', 'image/png', 43841, 268, 123, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r02_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r03_c01.png', '主页_个人_r03_c01.png', 'image/png', 70461, 199, 203, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r03_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r03_c02.png', '主页_个人_r03_c02.png', 'image/png', 79172, 204, 204, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r03_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r03_c03.png', '主页_个人_r03_c03.png', 'image/png', 60614, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r03_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r03_c04.png', '主页_个人_r03_c04.png', 'image/png', 31607, 259, 103, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r03_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r04_c01.png', '主页_个人_r04_c01.png', 'image/png', 11841, 100, 99, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r04_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r05_c01.png', '主页_个人_r05_c01.png', 'image/png', 4670, 45, 71, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r05_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r06_c01.png', '主页_个人_r06_c01.png', 'image/png', 21863, 133, 130, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r06_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r06_c02.png', '主页_个人_r06_c02.png', 'image/png', 23362, 135, 130, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r06_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r06_c03.png', '主页_个人_r06_c03.png', 'image/png', 21871, 135, 130, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r06_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r06_c04.png', '主页_个人_r06_c04.png', 'image/png', 22992, 134, 129, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r06_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r06_c05.png', '主页_个人_r06_c05.png', 'image/png', 74824, 303, 116, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r06_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r07_c01.png', '主页_个人_r07_c01.png', 'image/png', 12926, 101, 97, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r07_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r07_c02.png', '主页_个人_r07_c02.png', 'image/png', 13777, 101, 101, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r07_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r07_c03.png', '主页_个人_r07_c03.png', 'image/png', 9987, 94, 85, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r07_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r07_c04.png', '主页_个人_r07_c04.png', 'image/png', 13397, 90, 97, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r07_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r08_c01.png', '主页_个人_r08_c01.png', 'image/png', 12148, 103, 97, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r08_c01.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r08_c02.png', '主页_个人_r08_c02.png', 'image/png', 13212, 91, 105, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r08_c02.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r08_c03.png', '主页_个人_r08_c03.png', 'image/png', 13332, 107, 97, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r08_c03.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r08_c04.png', '主页_个人_r08_c04.png', 'image/png', 24718, 145, 127, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r08_c04.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r08_c05.png', '主页_个人_r08_c05.png', 'image/png', 10372, 95, 97, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/主页_个人_r08_c05.png');
INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)
SELECT 0, 'app_asset', '/api/v1/media/app-assets/assets/images/profile-self-split/图标预览_联系表.png', '图标预览_联系表.png', 'image/png', 53065, 400, 400, 'ready', 'approved', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '/api/v1/media/app-assets/assets/images/profile-self-split/图标预览_联系表.png');
