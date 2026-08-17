-- ============================================================
-- 迁移：v3 真人素材录入（体验账号候选池 10001-10014）
-- ============================================================
-- 说明：
--   「寻觅 v3 冻结」：体验账号（guest）的候选池/附近/喜欢我/访客等虚拟用户
--   全部改用 9 张真人素材（apps/client/src/static/assets/images/people|avatars）。
--   - 体验账号自身使用 person-01（RealAuthService.provisionGuestProfile 预填）。
--   - 候选池避免与体验账号同脸；照片可复用，但复用者的姓名/学校/兴趣保持现有差异，
--     同一列表内避免同一头像连续出现。
--   分配：10001→p02、10002→p03、10003→p04、10004→p05、10005→p06、
--         10009→p07、10010→p08、10011→p09、10012→p02、10013→p03、10014→p04。
--   本地 /static 路径由客户端 resolveMediaUrl 原样返回（mp 端可加载）。
-- ============================================================

UPDATE users
SET avatar_url = CASE id
    WHEN 10001 THEN '/static/assets/images/avatars/person-02-avatar.webp'
    WHEN 10002 THEN '/static/assets/images/avatars/person-03-avatar.webp'
    WHEN 10003 THEN '/static/assets/images/avatars/person-04-avatar.webp'
    WHEN 10004 THEN '/static/assets/images/avatars/person-05-avatar.webp'
    WHEN 10005 THEN '/static/assets/images/avatars/person-06-avatar.webp'
    WHEN 10009 THEN '/static/assets/images/avatars/person-07-avatar.webp'
    WHEN 10010 THEN '/static/assets/images/avatars/person-08-avatar.webp'
    WHEN 10011 THEN '/static/assets/images/avatars/person-09-avatar.webp'
    WHEN 10012 THEN '/static/assets/images/avatars/person-02-avatar.webp'
    WHEN 10013 THEN '/static/assets/images/avatars/person-03-avatar.webp'
    WHEN 10014 THEN '/static/assets/images/avatars/person-04-avatar.webp'
    ELSE avatar_url
  END
WHERE id IN (10001, 10002, 10003, 10004, 10005, 10009, 10010, 10011, 10012, 10013, 10014);

UPDATE user_basic_profile
SET photo_gallery = CASE user_id
    WHEN 10001 THEN JSON_ARRAY('/static/assets/images/people/person-02.webp')
    WHEN 10002 THEN JSON_ARRAY('/static/assets/images/people/person-03.webp')
    WHEN 10003 THEN JSON_ARRAY('/static/assets/images/people/person-04.webp')
    WHEN 10004 THEN JSON_ARRAY('/static/assets/images/people/person-05.webp')
    WHEN 10005 THEN JSON_ARRAY('/static/assets/images/people/person-06.webp')
    WHEN 10009 THEN JSON_ARRAY('/static/assets/images/people/person-07.webp')
    WHEN 10010 THEN JSON_ARRAY('/static/assets/images/people/person-08.webp')
    WHEN 10011 THEN JSON_ARRAY('/static/assets/images/people/person-09.webp')
    WHEN 10012 THEN JSON_ARRAY('/static/assets/images/people/person-02.webp')
    WHEN 10013 THEN JSON_ARRAY('/static/assets/images/people/person-03.webp')
    WHEN 10014 THEN JSON_ARRAY('/static/assets/images/people/person-04.webp')
    ELSE photo_gallery
  END,
  half_body_photo_url = CASE user_id
    WHEN 10001 THEN '/static/assets/images/people/person-02.webp'
    WHEN 10002 THEN '/static/assets/images/people/person-03.webp'
    WHEN 10003 THEN '/static/assets/images/people/person-04.webp'
    WHEN 10004 THEN '/static/assets/images/people/person-05.webp'
    WHEN 10005 THEN '/static/assets/images/people/person-06.webp'
    WHEN 10009 THEN '/static/assets/images/people/person-07.webp'
    WHEN 10010 THEN '/static/assets/images/people/person-08.webp'
    WHEN 10011 THEN '/static/assets/images/people/person-09.webp'
    WHEN 10012 THEN '/static/assets/images/people/person-02.webp'
    WHEN 10013 THEN '/static/assets/images/people/person-03.webp'
    WHEN 10014 THEN '/static/assets/images/people/person-04.webp'
    ELSE half_body_photo_url
  END,
  profile_background_url = CASE user_id
    WHEN 10001 THEN '/static/assets/images/people/person-02.webp'
    WHEN 10002 THEN '/static/assets/images/people/person-03.webp'
    WHEN 10003 THEN '/static/assets/images/people/person-04.webp'
    WHEN 10004 THEN '/static/assets/images/people/person-05.webp'
    WHEN 10005 THEN '/static/assets/images/people/person-06.webp'
    WHEN 10009 THEN '/static/assets/images/people/person-07.webp'
    WHEN 10010 THEN '/static/assets/images/people/person-08.webp'
    WHEN 10011 THEN '/static/assets/images/people/person-09.webp'
    WHEN 10012 THEN '/static/assets/images/people/person-02.webp'
    WHEN 10013 THEN '/static/assets/images/people/person-03.webp'
    WHEN 10014 THEN '/static/assets/images/people/person-04.webp'
    ELSE profile_background_url
  END
WHERE user_id IN (10001, 10002, 10003, 10004, 10005, 10009, 10010, 10011, 10012, 10013, 10014);
