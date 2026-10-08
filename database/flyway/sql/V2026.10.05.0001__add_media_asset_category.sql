-- ============================================================
-- 迁移：media_asset 增加 category 业务分类列并回填实名认证照片
-- ============================================================
-- 背景（安全修复：身份证照片越权面收敛）：
--   实名/恋爱认证照片（身份证正反面、学生证）此前仅靠 URL 路径关键词
--   （id-card/verification/certification）在访问侧识别为 ID_CARD，
--   而上传落盘路径为 {userId}/{yyyyMM}/{uuid}.jpg，不含关键词 → 被判 IMAGE
--   （登录用户公开可读），存在越权读取身份证照片的风险面。
--
-- 变更：
--   1) media_asset 增加 category 列（默认 GENERAL），应用侧上传时显式写入；
--   2) 回填：凡被实名认证（real_name_certifications.id_card_front_url /
--      id_card_back_url）或恋爱认证（love_verification_application.student_id_card_url）
--      照片 URL 引用的资产，category 置为 ID_CARD（仅本人/ADMIN 可读）。
--
-- 回滚：ALTER TABLE media_asset DROP COLUMN category;
-- ============================================================

ALTER TABLE media_asset
    ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT 'GENERAL' COMMENT '业务分类：GENERAL/AVATAR/POST/VOICE/VIDEO/ID_CARD（ID_CARD 仅本人/ADMIN 可读）';

-- 回填实名认证照片（身份证正反面）
UPDATE media_asset
SET category = 'ID_CARD'
WHERE category = 'GENERAL'
  AND url IN (
      SELECT id_card_front_url FROM real_name_certifications WHERE id_card_front_url IS NOT NULL
      UNION
      SELECT id_card_back_url FROM real_name_certifications WHERE id_card_back_url IS NOT NULL
      UNION
      SELECT student_id_card_url FROM love_verification_application WHERE student_id_card_url IS NOT NULL
  );

-- 分类筛选索引（访问侧按 URL 定位分类为主键级查询，url 已唯一使用；
-- 此索引服务管理后台按分类筛选场景）
CREATE INDEX idx_media_asset_category ON media_asset (category);
