-- ============================================================
-- 迁移：存量用户协议同意回填（source=BACKFILL）
-- ============================================================
-- 背景（2026-10-05 合规落库，任务 9 服务端半边）：
--   user_agreement_consent 上线前注册的存量用户没有显式同意留痕，
--   按合规口径统一回填一条 BACKFILL 记录：
--     legal_version = v1.0.0（当前法律文本版本，与 LegalTextProvider 对齐）
--     agreed_at     = 用户注册时间（users.created_at，保留原始时间线）
--     ip            = NULL（历史数据不可考，置空）
--     source        = BACKFILL（与注册时显式同意的 REGISTER 区分，审计可辨）
--
-- 幂等性：uk_user_agreement_consent 唯一键 (user_id, legal_version, source) 兜底，
--   重复执行时 INSERT ... SELECT 的冲突行会失败——故先排除已存在记录再插入。
--
-- 回滚：DELETE FROM user_agreement_consent WHERE source = 'BACKFILL';
-- ============================================================

INSERT INTO user_agreement_consent (user_id, legal_version, agreed_at, ip, source)
SELECT u.id, 'v1.0.0', u.created_at, NULL, 'BACKFILL'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_agreement_consent c
    WHERE c.user_id = u.id
      AND c.legal_version = 'v1.0.0'
      AND c.source = 'BACKFILL'
);
