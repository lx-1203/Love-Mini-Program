-- ============================================================
-- 迁移：扩展审计字段到剩余 6 张配置/状态表（Task 37 / P2.14 续）
-- ============================================================
-- 背景：
--   V2026.07.28.0004__audit_fields.sql 已为 60 张业务表补齐
--   created_at / updated_at 列。但仍有 6 张"单用户配置/状态表"
--   仅含 updated_at（无 created_at），对应 Entity 仅标注 @LastModifiedDate。
--   本脚本为这 6 张表追加 created_at 列，使对应 Entity 可补齐 @CreatedDate
--   注解，实现完整审计字段覆盖。
--
-- 涉及表（共 6 张）：
--   1. notify_config           —— 通知类型配置
--   2. make_up_quota           —— 补签额度（按用户+月份）
--   3. dnd_settings            —— 免打扰设置（按用户）
--   4. push_preferences        —— 推送偏好（按用户）
--   5. social_progress         —— 社交升温进度（按用户）
--   6. user_online_status      —— 用户在线状态（按用户，主键 user_id）
--
-- 实现说明：
--   * MySQL 不支持 ALTER TABLE ADD COLUMN IF NOT EXISTS（仅 8.0.29+ 支持），
--     通过 information_schema.COLUMNS 查询判断列是否存在，保证幂等
--   * created_at：NOT NULL DEFAULT CURRENT_TIMESTAMP，对应 @CreatedDate
--   * 既有 updated_at 列保持不变（V2026.07.28.0004 已处理或建表时已存在）
--   * 所有 ALTER 操作在事务外执行（DDL 隐式提交）
-- ============================================================

-- ============================================================
-- 辅助存储过程：为指定表添加 created_at 列（幂等）
-- ============================================================
DROP PROCEDURE IF EXISTS add_created_at_column_if_missing_v6;
DELIMITER $$
CREATE PROCEDURE add_created_at_column_if_missing_v6(
    IN tbl_name VARCHAR(64)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = tbl_name
          AND column_name = 'created_at'
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', tbl_name, '` ',
            'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''记录创建时间（Task 37 P2.14 审计自动填充）'''
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- 为 6 张配置/状态表补齐 created_at 列
-- ============================================================
CALL add_created_at_column_if_missing_v6('notify_config');
CALL add_created_at_column_if_missing_v6('make_up_quota');
CALL add_created_at_column_if_missing_v6('dnd_settings');
CALL add_created_at_column_if_missing_v6('push_preferences');
CALL add_created_at_column_if_missing_v6('social_progress');
CALL add_created_at_column_if_missing_v6('user_online_status');

-- 清理辅助存储过程
DROP PROCEDURE IF EXISTS add_created_at_column_if_missing_v6;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- ALTER TABLE notify_config        DROP COLUMN created_at;
-- ALTER TABLE make_up_quota        DROP COLUMN created_at;
-- ALTER TABLE dnd_settings         DROP COLUMN created_at;
-- ALTER TABLE push_preferences     DROP COLUMN created_at;
-- ALTER TABLE social_progress      DROP COLUMN created_at;
-- ALTER TABLE user_online_status   DROP COLUMN created_at;
