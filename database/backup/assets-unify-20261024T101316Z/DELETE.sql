-- 本次删除：只删 url 含 /assets-images/ 的 app_asset 行（每条都有规范孪生行，孤儿=0，已实测）
START TRANSACTION;
DELETE FROM media_asset WHERE type='app_asset' AND url LIKE '%/assets-images/%';
SELECT CONCAT('deleted_remaining=', COUNT(*)) FROM media_asset WHERE url LIKE '%/assets-images/%';
COMMIT;
