-- 手机号唯一约束（A-34）
--
-- ⚠️ 修复（R4-00419）：本迁移对重复手机号行执行「phone 置 NULL」属破坏性数据修复，
-- 重复数据会静默丢失（如换绑记录），且无审计。执行前必须：
--   1. 审计受影响行：SELECT phone, COUNT(*) FROM users WHERE phone IS NOT NULL AND phone <> ''
--      GROUP BY phone HAVING COUNT(*) > 1;
--   2. 备份受影响行（示例）：
--      CREATE TABLE users_phone_dup_backup AS
--      SELECT * FROM users WHERE phone IN (
--        SELECT phone FROM users WHERE phone IS NOT NULL AND phone <> ''
--        GROUP BY phone HAVING COUNT(*) > 1);
-- 确认被置空的行确为冗余记录（非在用登录凭据）后再执行迁移。
--
-- 前置清理：历史数据若存在同一 phone 多行（如演示期间注册 + 体验账号路径重复创建），
-- 仅保留最小 id 记录（最小 id 通常是首次注册的正式账号），其余行 phone 置空释放唯一键。
-- 注意：NULL 值不参与唯一键比较（MySQL 多行 NULL 允许共存），置空不会误伤无手机号用户。

-- 1. 空字符串 phone 归一为 NULL（空串与空串互相冲突，会破坏唯一键）
UPDATE users SET phone = NULL WHERE phone = '';

-- 2. 同 phone 多行去重：仅保留最小 id 记录，其余置空
UPDATE users u
JOIN (
    SELECT phone, MIN(id) AS keep_id
    FROM users
    WHERE phone IS NOT NULL AND phone <> ''
    GROUP BY phone
    HAVING COUNT(*) > 1
) dup ON u.phone = dup.phone AND u.id <> dup.keep_id
SET u.phone = NULL;

-- 建唯一键：同一手机号仅允许一条用户记录（注册路径 findByPhone 查重 + 唯一键兜底）
ALTER TABLE users
    ADD UNIQUE KEY uk_users_phone (phone);
