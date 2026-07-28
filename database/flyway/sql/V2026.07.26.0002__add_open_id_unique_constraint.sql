-- ============================================================
-- 迁移：保证 users.openid 唯一约束存在（Task 0.1.3）
-- ============================================================
-- 背景：
--   微信登录真实链路（Task 0.1）依赖 users.openid 唯一约束 uk_users_openid
--   保证一个微信号只能注册一个账号。V2026.05.18.0001__create_users.sql 在
--   CREATE TABLE 时已声明 UNIQUE KEY uk_users_openid，但部分历史环境可能因
--   手工运维或表结构迁移导致约束缺失，存在同一 openid 注册多账号的数据风险。
--
--   本脚本作为 Task 0.1.3 的幂等保护，在已有约束时不重复创建，缺失时补齐。
--   JPA 层使用 findByOpenid().orElseGet(() -> save()) 模式依赖此约束防止并发重复插入；
--   约束缺失时两个并发请求可能同时通过 findByOpenid 检查并各自 save，
--   导致同一 openid 产生两条用户记录（违反业务约束）。
--
-- 实现说明：
--   * MySQL 不支持 ALTER TABLE ADD UNIQUE INDEX IF NOT EXISTS 语法，
--     通过 information_schema.STATISTICS 查询判断约束是否已存在
--   * 使用预编译语句执行 DDL，避免 SQL 注入风险
--   * 约束名与 V2026.05.18.0001 / User.java @UniqueConstraint 保持一致：uk_users_openid
--   * 若已存在同名约束但列不同，本脚本不处理（应由 DBA 人工介入）
-- ============================================================

DROP PROCEDURE IF EXISTS add_users_openid_unique_constraint;

DELIMITER $$
CREATE PROCEDURE add_users_openid_unique_constraint()
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
          AND index_name = 'uk_users_openid'
    ) THEN
        ALTER TABLE users ADD UNIQUE INDEX uk_users_openid (openid);
    END IF;
END$$
DELIMITER ;

CALL add_users_openid_unique_constraint();

DROP PROCEDURE IF EXISTS add_users_openid_unique_constraint;
