-- ============================================================
-- 安全收口：禁用公开测试超管，清除公开可登录口令
-- ============================================================
-- 漏洞链（2026-10-25 复审）：
--   1) V2026.08.07.0004 向 users 写入 openid=local-dev-admin-openid-123456、
--      明文 password=Admin@12345、role=SUPER_ADMIN；
--   2) V2026.08.07.0019 把该账号口令改为 Admin@12345 的公开 BCrypt；
--   3) V2026.08.09.0009 把口令改为仓库里可见的 64 位字符串
--      47e0623afa20f48d5e8c396e87af741e5496f554e4334ec5b19fb929f24708cb；
--   4) RealAuthService#loginAsAdmin 曾对非 BCrypt 字段按明文比对并自动迁移。
--   openid 与上述口令都在仓库中公开 ⇒ 从空库跑完整迁移链的库可被直接接管。
--
-- 本迁移是前向补偿，不改已应用迁移（避免 Flyway checksum 断裂）：
--   - 账号保留（便于本地识别与审计），但 status 置 disabled、password 置 NULL；
--   - 已登出的会话由 JwtAuthenticationFilter 的 disabled 检查在 60s 缓存窗口内拒绝；
--   - 本地开发如需重新启用，必须写入新的 BCrypt 哈希（scripts/dev/reset-local-admin.mjs），
--     不得恢复任何仓库内出现过的口令。
--
-- 幂等：重复执行只会把已是 disabled/NULL 的行再写一遍，不产生新行。
-- ============================================================

UPDATE users
SET status = 'disabled',
    password = NULL,
    updated_at = NOW()
WHERE openid = 'local-dev-admin-openid-123456'
  AND role IN ('SUPER_ADMIN', 'ADMIN', 'AUDITOR');

-- 回滚（手动，且不应恢复公开口令）：
-- 先用 scripts/dev/reset-local-admin.mjs 生成新的 BCrypt 哈希并置 active。
