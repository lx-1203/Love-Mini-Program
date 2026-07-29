-- ============================================================
-- Task 25.2：将历史 ENUM 列改为 VARCHAR + CHECK 约束
-- ============================================================
-- 背景：
--   历史迁移脚本中存在 9 个 ENUM 列定义（涉及 V2026.05.21.0001/0003/0005、
--   V2026.05.23.0004、V2026.05.24.0004、V2026.05.27.0001、V2026.05.30.0002、
--   V2026.05.31.0001 等 8 个脚本，共 10 处 ENUM 定义 SQL——其中 posts.category
--   在 V2026.05.31.0001 中被 MODIFY 扩展为 7 个值，故整体被任务描述记为 11 处）。
--   ENUM 类型新增枚举值需 ALTER 全表重建，且与 Java Entity 字符串映射不够灵活。
--   本次迁移统一改为 VARCHAR(32) + CHECK 约束，未来新增枚举值仅需数据层修改。
--
-- Task 25.2 强制约束：
--   * 禁止修改任何已应用的迁移脚本（V2026.05.* / V2026.06.* / V2026.07.25.* /
--     V2026.07.27.0001-0004），仅通过新增本脚本完成 ENUM → VARCHAR+CHECK 的迁移。
--   * 每条 ALTER 通过 information_schema 条件查询保证幂等可重跑。
--
-- 兼容性说明：
--   * MySQL 8.0.16+：CHECK 约束被强制执行（推荐，本项目目标版本）。
--   * MySQL 8.0.0 - 8.0.15：CHECK 语法被解析但被忽略（不强制）。
--   * MySQL 5.7：CHECK 语法被解析但被忽略（不强制）。
--   * 本项目使用 utf8mb4_0900_ai_ci 字符集，要求 MySQL 8.0+，CHECK 约束可生效。
--   * 若降级部署到 MySQL 5.7，本脚本仍可执行（列类型转换有效），但 CHECK 不生效，
--     需在应用层（Java Entity / Service）做枚举值校验。
--
-- 覆盖的 ENUM 列（共 9 列）：
--   1. likes.status                       ENUM('active','cancelled')
--   2. posts.category                     ENUM('all','interest','sincere','hometown','anonymous','latest','campus')
--   3. posts.status                       ENUM('active','deleted','hidden')
--   4. heart_signals.status               ENUM('pending','accepted','expired','declined')
--   5. notifications.type                 ENUM('follow','like','comment','visitor','match')
--   6. notifications.reference_type       ENUM('post','comment','user')（可空）
--   7. activities.status                  ENUM('upcoming','ongoing','ended')
--   8. temp_chat_session.phase            ENUM('matching','active','closed','expired')
--   9. user_online_status.status          ENUM('online','away','offline')
-- ============================================================


-- ----------------------------------------------------------
-- 辅助存储过程：将指定 ENUM 列迁移为 VARCHAR + CHECK 约束
-- ----------------------------------------------------------
-- 参数说明：
--   p_table           表名
--   p_column          列名
--   p_new_column_def  新列的完整定义（VARCHAR(32) ... [DEFAULT ...] [COMMENT ...]）
--   p_check_name      CHECK 约束名（建议 chk_<table>_<column>）
--   p_check_body      CHECK 约束体（不含外层括号，如 "status IN ('active','cancelled')"）
--                     * 可空列请使用 "<col> IS NULL OR <col> IN (...)" 形式
--                     * MySQL 8.0+ 对 NULL IN (...) 返回 UNKNOWN，CHECK 视为通过，
--                       但显式书写 IS NULL OR 可读性更好且跨数据库兼容
-- 幂等逻辑：
--   1. 若残留 `<col>_new` 列（上次失败遗留），先删除
--   2. 若原列仍为 ENUM：执行完整迁移
--      a. ADD COLUMN `<col>_new` VARCHAR(32) ...
--      b. UPDATE 拷贝数据
--      c. DROP COLUMN `<col>`（原 ENUM 列）
--      d. RENAME COLUMN `<col>_new` TO `<col>`
--      e. ADD CONSTRAINT `<p_check_name>` CHECK (...)
--   3. 若原列已是 VARCHAR：仅当 CHECK 约束缺失时补加
--   4. 若原列不存在（如表未建）：跳过，无副作用
-- ----------------------------------------------------------
DROP PROCEDURE IF EXISTS convert_enum_to_varchar_check_25_2;
DELIMITER //

CREATE PROCEDURE convert_enum_to_varchar_check_25_2(
    IN p_table VARCHAR(64),
    IN p_column VARCHAR(64),
    IN p_new_column_def TEXT,
    IN p_check_name VARCHAR(128),
    IN p_check_body TEXT
)
BEGIN
    DECLARE v_is_enum INT DEFAULT 0;
    DECLARE v_is_varchar INT DEFAULT 0;
    DECLARE v_is_new_exists INT DEFAULT 0;
    DECLARE v_chk_exists INT DEFAULT 0;

    -- 1. 清理上次失败遗留的 `<col>_new` 列（幂等保证）
    SELECT COUNT(*) INTO v_is_new_exists
      FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = p_table
       AND column_name = CONCAT(p_column, '_new');
    IF v_is_new_exists > 0 THEN
        SET @ddl_25_2 = CONCAT('ALTER TABLE `', p_table, '` DROP COLUMN `', p_column, '_new`');
        PREPARE stmt FROM @ddl_25_2; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;

    -- 2. 探测原列当前类型
    SELECT COUNT(*) INTO v_is_enum
      FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = p_table
       AND column_name = p_column
       AND data_type = 'enum';

    SELECT COUNT(*) INTO v_is_varchar
      FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = p_table
       AND column_name = p_column
       AND data_type = 'varchar';

    IF v_is_enum > 0 THEN
        -- 完整迁移路径：ENUM → VARCHAR + CHECK
        -- a. 新增 VARCHAR 临时列
        SET @ddl_25_2 = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '_new` ', p_new_column_def);
        PREPARE stmt FROM @ddl_25_2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

        -- b. 数据迁移：从 ENUM 列拷贝到新 VARCHAR 列
        SET @ddl_25_2 = CONCAT('UPDATE `', p_table, '` SET `', p_column, '_new` = `', p_column, '`');
        PREPARE stmt FROM @ddl_25_2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

        -- c. 删除原 ENUM 列
        SET @ddl_25_2 = CONCAT('ALTER TABLE `', p_table, '` DROP COLUMN `', p_column, '`');
        PREPARE stmt FROM @ddl_25_2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

        -- d. 重命名新列回原名
        SET @ddl_25_2 = CONCAT('ALTER TABLE `', p_table, '` RENAME COLUMN `', p_column, '_new` TO `', p_column, '`');
        PREPARE stmt FROM @ddl_25_2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

        -- e. 添加 CHECK 约束
        SET @ddl_25_2 = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_check_name, '` CHECK (', p_check_body, ')');
        PREPARE stmt FROM @ddl_25_2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

    ELSEIF v_is_varchar > 0 THEN
        -- 已迁移路径：仅当 CHECK 约束缺失时补加（应对上次失败于 RENAME 之后、ADD CHECK 之前的情况）
        SELECT COUNT(*) INTO v_chk_exists
          FROM information_schema.check_constraints
         WHERE constraint_schema = DATABASE()
           AND constraint_name = p_check_name;

        IF v_chk_exists = 0 THEN
            SET @ddl_25_2 = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_check_name, '` CHECK (', p_check_body, ')');
            PREPARE stmt FROM @ddl_25_2; EXECUTE stmt; DEALLOCATE PREPARE stmt;
        END IF;
    END IF;
END //

DELIMITER ;


-- ============================================================
-- 调用存储过程，对 9 个 ENUM 列逐一迁移
-- ============================================================

-- 1. likes.status：ENUM('active','cancelled') NOT NULL DEFAULT 'active'
--    来源：V2026.05.21.0001__create_likes_table.sql
CALL convert_enum_to_varchar_check_25_2(
    'likes',
    'status',
    "VARCHAR(32) NOT NULL DEFAULT 'active' COMMENT '状态'",
    'chk_likes_status',
    "status IN ('active','cancelled')"
);

-- 2. posts.category：ENUM('all','interest','sincere','hometown','anonymous','latest','campus') NOT NULL DEFAULT 'all'
--    来源：V2026.05.21.0003__create_posts_table.sql + V2026.05.31.0001__fix_entity_ddl_mismatches.sql（MODIFY 增加 campus）
CALL convert_enum_to_varchar_check_25_2(
    'posts',
    'category',
    "VARCHAR(32) NOT NULL DEFAULT 'all' COMMENT '分类'",
    'chk_posts_category',
    "category IN ('all','interest','sincere','hometown','anonymous','latest','campus')"
);

-- 3. posts.status：ENUM('active','deleted','hidden') NOT NULL DEFAULT 'active'
--    来源：V2026.05.21.0003__create_posts_table.sql
CALL convert_enum_to_varchar_check_25_2(
    'posts',
    'status',
    "VARCHAR(32) NOT NULL DEFAULT 'active' COMMENT '状态'",
    'chk_posts_status',
    "status IN ('active','deleted','hidden')"
);

-- 4. heart_signals.status：ENUM('pending','accepted','expired','declined') NOT NULL DEFAULT 'pending'
--    来源：V2026.05.21.0005__create_heart_signals_table.sql
CALL convert_enum_to_varchar_check_25_2(
    'heart_signals',
    'status',
    "VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态'",
    'chk_heart_signals_status',
    "status IN ('pending','accepted','expired','declined')"
);

-- 5. notifications.type：ENUM('follow','like','comment','visitor','match') NOT NULL
--    来源：V2026.05.23.0004__create_notifications.sql
CALL convert_enum_to_varchar_check_25_2(
    'notifications',
    'type',
    "VARCHAR(32) NOT NULL COMMENT '通知类型'",
    'chk_notifications_type',
    "type IN ('follow','like','comment','visitor','match')"
);

-- 6. notifications.reference_type：ENUM('post','comment','user') DEFAULT NULL（可空列）
--    来源：V2026.05.23.0004__create_notifications.sql
--    可空列 CHECK 体使用 "IS NULL OR" 形式，跨数据库兼容
CALL convert_enum_to_varchar_check_25_2(
    'notifications',
    'reference_type',
    "VARCHAR(32) DEFAULT NULL COMMENT '关联实体类型'",
    'chk_notifications_reference_type',
    "reference_type IS NULL OR reference_type IN ('post','comment','user')"
);

-- 7. activities.status：ENUM('upcoming','ongoing','ended') NOT NULL DEFAULT 'upcoming'
--    来源：V2026.05.24.0004__create_activities.sql
CALL convert_enum_to_varchar_check_25_2(
    'activities',
    'status',
    "VARCHAR(32) NOT NULL DEFAULT 'upcoming'",
    'chk_activities_status',
    "status IN ('upcoming','ongoing','ended')"
);

-- 8. temp_chat_session.phase：ENUM('matching','active','closed','expired') NOT NULL DEFAULT 'matching'
--    来源：V2026.05.27.0001__create_temp_chat_tables.sql
CALL convert_enum_to_varchar_check_25_2(
    'temp_chat_session',
    'phase',
    "VARCHAR(32) NOT NULL DEFAULT 'matching' COMMENT '会话阶段'",
    'chk_temp_chat_session_phase',
    "phase IN ('matching','active','closed','expired')"
);

-- 9. user_online_status.status：ENUM('online','away','offline') NOT NULL DEFAULT 'offline'
--    来源：V2026.05.30.0002__create_user_online_status.sql
CALL convert_enum_to_varchar_check_25_2(
    'user_online_status',
    'status',
    "VARCHAR(32) NOT NULL DEFAULT 'offline'",
    'chk_user_online_status_status',
    "status IN ('online','away','offline')"
);


-- 清理辅助存储过程
DROP PROCEDURE IF EXISTS convert_enum_to_varchar_check_25_2;


-- ============================================================
-- 注意事项 / 回滚说明：
--   * 本迁移不可逆（DROP 原 ENUM 列后无法恢复枚举元数据）。
--   * 回滚需另行编写 V2026.xx.xx.xxxx__revert_enum_to_varchar_check.sql，
--     将 VARCHAR 列改回 ENUM 类型，CHECK 约束会被自动删除。
--   * 索引（如 idx_posts_category、idx_notifications_type、idx_activities_status、
--     idx_temp_chat_session_phase）基于列名而非类型，本迁移不删除/重建索引。
--   * 外键关系：本迁移不涉及任何外键列，无副作用。
-- ============================================================
