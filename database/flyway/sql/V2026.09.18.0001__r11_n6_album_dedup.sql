-- ============================================================
-- 迁移：R11-N6 相册重复图清理（QA 账号 100158 同图重复上传，MD5 字节级相同）
-- 幂等：条件不命中时无操作。
-- 背景：R10 回归截图 R55 实证相册前两格为同一张照片；
--       2026-09-18 下载比对 md5 一致（47398 字节）。
-- ============================================================

-- 1) photo_gallery 去重：仅当恰好两个地址且第一张仍存在于 media_asset 时保留第一张
UPDATE user_basic_profile
   SET photo_gallery = JSON_ARRAY('/api/v1/media/100158/202609/02334af1-9907-425f-8393-b26698c81354.png')
 WHERE user_id = 100158
   AND photo_gallery LIKE '%02334af1-9907-425f-8393-b26698c81354.png%'
   AND photo_gallery LIKE '%0e40ad54-f937-4e29-8520-b3e1780a201f.png%';

-- 2) media_asset 删除被去重的重复行
DELETE FROM media_asset
 WHERE user_id = 100158
   AND url = '/api/v1/media/100158/202609/0e40ad54-f937-4e29-8520-b3e1780a201f.png'
   AND NOT EXISTS (
     SELECT 1 FROM user_basic_profile
      WHERE user_id = 100158
        AND photo_gallery LIKE '%0e40ad54-f937-4e29-8520-b3e1780a201f.png%'
   );
