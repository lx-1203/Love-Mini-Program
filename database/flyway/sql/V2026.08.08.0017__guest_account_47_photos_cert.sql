-- ============================================================================
-- V2026.08.08.0017：临时体验号（主账号 47）资料补齐（验收轮）
-- ----------------------------------------------------------------------------
-- 走查要求：体验账号信息齐全、可体验全部功能。
-- 47 已有完整画像（V0015 覆盖：职业/收入/MBTI/性格/期待/出生年份/兴趣），
-- 本迁移补齐缺失的照片与校园认证（幂等可重跑）：
--   1) 半身照 + 照片墙 2 张 + 主页背景图（pexels 图源，模拟器已验证可加载）
--   2) campus_certifications APPROVED（北京大学）→ 推荐/详情「双重认证」角标
-- ============================================================================

UPDATE user_basic_profile SET
  half_body_photo_url = 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
  photo_gallery = JSON_ARRAY(
    'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'),
  profile_background_url = 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop'
WHERE user_id = 47;

INSERT INTO campus_certifications
    (user_id, school_name, major, student_id_card_url, status, reviewer_id,
     review_comment, submitted_at, reviewed_at)
SELECT 47, '北京大学', '新媒体传播学', 'https://campus-love.example/student-id/CL-47',
       'APPROVED', 1, '种子数据：校园认证审核通过',
       NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 6 DAY
ON DUPLICATE KEY UPDATE
  status = 'APPROVED',
  school_name = '北京大学',
  reviewed_at = NOW();
