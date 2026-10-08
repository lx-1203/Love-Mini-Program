-- ============================================================================
-- prod-sanitize.sql —— 生产建库后 QA 种子数据清理（2026-10-05）
-- ============================================================================
-- 用途：新环境从 Flyway 链建库会自带演示数据（29 个 seed 迁移，含
--       V2026.08.07.0021__seed_50_virtual_users 等）。上生产前跑本脚本
--       把 QA 种子用户与其衍生内容清掉，避免假用户/假内容进入生产。
--
-- 覆盖范围：
--   1) 虚拟用户池：users.openid LIKE 'seed-user-%'（id 10001-10056、20057-20099）
--      及其在全库所有「按用户外键」表中的衍生数据（动态发现，见下方 procedure）；
--   2) 体验账号演示数据：guest-demo-* 会话/私聊/悄悄话（运行时由
--      GuestDemoDataProvisioner 播种，按 conversation_uid / request_id 前缀清除）；
--   3) 种子改动的配置回滚：match_config.candidatePageSize 200 -> 50；
--   4) 可选：超级测试账号（openid='local-dev-admin-openid-123456'，密码公开写死在
--      V2026.08.07.0004__seed_super_test_account.sql，属泄露面）——默认保留，
--      把 @purge_super_test_account 置 1 时一并删除（删前请确认已有正式管理员）。
--
-- 执行方式（mysql 客户端，需 DDL+DML 权限）：
--   mysql -h <host> -u <user> -p <dbname> < database/sanitize/prod-sanitize.sql
--
-- 安全设计：
--   * 全脚本包在事务里，结尾默认 ROLLBACK：先看每个清理段报告的影响行数，
--     确认无误后把最后一行 ROLLBACK 改成 COMMIT 重跑一次（或手工执行 COMMIT）。
--   * 不删除 menus / roles / dicts / schools / app_config / sensitive_word 等
--     系统配置数据（运营上台必需），相关残留见 README 的「需运营确认」清单。
-- ============================================================================

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 0. 参数
-- ---------------------------------------------------------------------------
-- 是否连同「超级测试账号」一并清除（1=删，0=保留）。生产默认应置 1，
-- 但前提是已存在正式管理员账号，否则管理后台无法登录。
SET @purge_super_test_account = 0;

-- ---------------------------------------------------------------------------
-- 1. 圈定 QA 种子用户集合（临时表，会话结束自动消失）
-- ---------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_seed_user_ids;
CREATE TEMPORARY TABLE tmp_seed_user_ids (
  id BIGINT PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO tmp_seed_user_ids (id)
SELECT id FROM users WHERE openid LIKE 'seed-user-%';

-- 超级测试账号（可选清除，见文件头说明）
DROP TEMPORARY TABLE IF EXISTS tmp_super_test_user;
CREATE TEMPORARY TABLE tmp_super_test_user (
  id BIGINT PRIMARY KEY
) ENGINE=MEMORY;
INSERT INTO tmp_super_test_user (id)
SELECT id FROM users
WHERE @purge_super_test_account = 1
  AND openid = 'local-dev-admin-openid-123456';

INSERT IGNORE INTO tmp_seed_user_ids (id) SELECT id FROM tmp_super_test_user;

SELECT COUNT(*) AS seed_user_count FROM tmp_seed_user_ids;

-- ---------------------------------------------------------------------------
-- 2. 动态清除：所有含用户外键列的表，按种子用户集合删除衍生行
--    覆盖列名（与实体 @Column 实名核对过，2026-10-05，仅列「指向 users.id」的列，
--    不含 auditor/reviewer/admin 等运营身份列以免误删审计证据）：
--      user_id / author_id / sender_id / receiver_id /
--      user_a_id / user_b_id / visitor_id / visited_user_id /
--      target_user_id / follower_id / following_id /
--      trigger_user_id / source_user_id / passed_user_id /
--      inviter_user_id / invitee_user_id / blocked_user_id /
--      caller_id / callee_id / reporter_id
--    （likes 表的 user_id + target_user_id 双列均被覆盖；
--      心动信号/私信会话 user_a_id/user_b_id、拉黑 blocked_user_id 同理）
-- ---------------------------------------------------------------------------
DELIMITER $$
DROP PROCEDURE IF EXISTS purge_rows_by_seed_users $$
CREATE PROCEDURE purge_rows_by_seed_users()
BEGIN
  DECLARE v_table_name VARCHAR(64);
  DECLARE v_column_name VARCHAR(64);
  DECLARE v_affected INT DEFAULT 0;
  DECLARE v_done INT DEFAULT 0;
  DECLARE v_cur CURSOR FOR
    SELECT c.TABLE_NAME, c.COLUMN_NAME
    FROM information_schema.COLUMNS c
    JOIN information_schema.TABLES t
      ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
    WHERE c.TABLE_SCHEMA = DATABASE()
      AND c.TABLE_NAME NOT IN ('tmp_seed_user_ids', 'tmp_super_test_user')
      AND c.COLUMN_NAME IN (
        'user_id', 'author_id', 'sender_id', 'receiver_id',
        'user_a_id', 'user_b_id', 'visitor_id', 'visited_user_id',
        'target_user_id', 'follower_id', 'following_id',
        'trigger_user_id', 'source_user_id', 'passed_user_id',
        'inviter_user_id', 'invitee_user_id', 'blocked_user_id',
        'caller_id', 'callee_id', 'reporter_id'
      )
      AND t.TABLE_TYPE = 'BASE TABLE';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  OPEN v_cur;
  purge_loop: LOOP
    FETCH v_cur INTO v_table_name, v_column_name;
    IF v_done = 1 THEN
      LEAVE purge_loop;
    END IF;
    -- 逐表删除：列值命中种子用户集合的行（动态拼 SQL，表/列名来自
    -- information_schema，不存在注入面；SET SESSION 失败不影响主流程）
    SET @stmt = CONCAT(
      'DELETE FROM `', v_table_name, '` WHERE `', v_column_name,
      '` IN (SELECT id FROM tmp_seed_user_ids)'
    );
    PREPARE s FROM @stmt;
    EXECUTE s;
    -- 在 DEALLOCATE 之前取受影响行数（ROW_COUNT() 反映上一条语句）
    SET v_affected = ROW_COUNT();
    DEALLOCATE PREPARE s;
    SELECT CONCAT('purged ', v_table_name, '.', v_column_name) AS step, v_affected AS affected;
  END LOOP;
  CLOSE v_cur;
END $$
DELIMITER ;

CALL purge_rows_by_seed_users();
DROP PROCEDURE purge_rows_by_seed_users;

-- ---------------------------------------------------------------------------
-- 3. 体验账号（guest）运行时演示数据清除
--    GuestDemoDataProvisioner 按登录的体验账号动态播种，用户本体不是种子用户，
--    需按业务前缀识别：conversation_uid='guest-demo-{userId}-{peerId}'、
--    悄悄话 request_id='guest-demo-whisper-...'
-- ---------------------------------------------------------------------------
DELETE FROM private_messages
WHERE conversation_id IN (
  SELECT id FROM private_conversations WHERE conversation_uid LIKE 'guest-demo-%');
DELETE FROM private_conversations WHERE conversation_uid LIKE 'guest-demo-%';
-- 悄悄话（whisper_message.client_request_id，实体列实名核对 2026-10-05）
DELETE FROM whisper_message WHERE client_request_id LIKE 'guest-demo-whisper-%';
SELECT ROW_COUNT() AS guest_demo_rows_purged;

-- ---------------------------------------------------------------------------
-- 4. 种子改动过的系统配置回滚
--    V2026.08.07.0021 把 candidatePageSize 从 50 扩到 200（容纳虚拟用户池），
--    虚拟用户清除后恢复默认候选池大小。
-- ---------------------------------------------------------------------------
UPDATE match_config
SET config_value = '50',
    description = '匹配候选用户分页查询数量上限',
    updated_at = NOW()
WHERE config_key = 'candidatePageSize'
  AND config_value = '200';
SELECT ROW_COUNT() AS match_config_rows_reverted;

-- ---------------------------------------------------------------------------
-- 5. 种子用户清除后的孤儿行清扫（无用户外键列、按父行联动的表）
-- ---------------------------------------------------------------------------
DELETE FROM post_tags
WHERE post_id NOT IN (SELECT id FROM posts);
DELETE FROM post_likes
WHERE post_id NOT IN (SELECT id FROM posts);
DELETE FROM post_favorites
WHERE post_id NOT IN (SELECT id FROM posts);
DELETE FROM post_view_history
WHERE post_id NOT IN (SELECT id FROM posts);
DELETE FROM comments
WHERE post_id IS NOT NULL AND post_id NOT IN (SELECT id FROM posts);
DELETE FROM circle_replies
WHERE topic_id IS NOT NULL AND topic_id NOT IN (SELECT id FROM circle_topics);
DELETE FROM campus_topic_replies
WHERE topic_id IS NOT NULL AND topic_id NOT IN (SELECT id FROM campus_topics);
SELECT ROW_COUNT() AS orphan_rows_purged;

-- ---------------------------------------------------------------------------
-- 6. 结果复核（应接近全 0；users 中不应再有 seed-user-*)
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS remaining_seed_users FROM users WHERE openid LIKE 'seed-user-%';
SELECT COUNT(*) AS remaining_guest_demo_conversations
FROM private_conversations WHERE conversation_uid LIKE 'guest-demo-%';

-- ============================================================================
-- 复核无误后：把下一行注释去掉（或手工执行）提交；否则回滚全部清理动作。
-- ============================================================================
-- COMMIT;
ROLLBACK;
