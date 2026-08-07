-- ============================================================
-- 迁移：数据字典（eladmin 风格）
-- ============================================================
-- 背景：
--   系统内存在大量固定枚举（活动类型、帖子状态、性别、认证状态等），
--   原硬编码在前后端代码中。本次引入 dicts + dict_items 支持后台维护。
--
-- 幂等性：information_schema 检查表存在性后 CREATE TABLE，种子数据 WHERE NOT EXISTS。
-- ============================================================

SET @has_dicts := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dicts'
);

SET @sql_dicts := IF(
    @has_dicts = 0,
    'CREATE TABLE dicts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(64) NOT NULL COMMENT ''字典名称（中文，如 活动类型）'',
        code VARCHAR(64) NOT NULL COMMENT ''字典编码（如 ACTIVITY_TYPE，唯一）'',
        description VARCHAR(255) NOT NULL DEFAULT '''' COMMENT ''字典描述'',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_dicts_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''数据字典表''',
    'SELECT 1'
);
PREPARE stmt_dicts FROM @sql_dicts;
EXECUTE stmt_dicts;
DEALLOCATE PREPARE stmt_dicts;

SET @has_dict_items := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dict_items'
);

SET @sql_dict_items := IF(
    @has_dict_items = 0,
    'CREATE TABLE dict_items (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        dict_id BIGINT NOT NULL COMMENT ''所属字典 ID（FK -> dicts.id）'',
        label VARCHAR(64) NOT NULL COMMENT ''条目显示名（如 线上）'',
        value VARCHAR(64) NOT NULL COMMENT ''条目值（如 ONLINE）'',
        sort INT NOT NULL DEFAULT 0 COMMENT ''排序权重（升序）'',
        enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''是否启用'',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_dict_items_dict (dict_id),
        CONSTRAINT fk_dict_items_dict FOREIGN KEY (dict_id) REFERENCES dicts (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''数据字典条目表''',
    'SELECT 1'
);
PREPARE stmt_dict_items FROM @sql_dict_items;
EXECUTE stmt_dict_items;
DEALLOCATE PREPARE stmt_dict_items;

-- ============================================================
-- 种子数据（WHERE NOT EXISTS 幂等）
-- ============================================================

-- 活动类型
INSERT INTO dicts (name, code, description)
SELECT '活动类型', 'ACTIVITY_TYPE', '活动类型枚举（线上/线下/混合）'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM dicts WHERE code = 'ACTIVITY_TYPE');

INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '线上', 'ONLINE', 1 FROM dicts d WHERE d.code = 'ACTIVITY_TYPE'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'ONLINE');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '线下', 'OFFLINE', 2 FROM dicts d WHERE d.code = 'ACTIVITY_TYPE'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'OFFLINE');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '混合', 'HYBRID', 3 FROM dicts d WHERE d.code = 'ACTIVITY_TYPE'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'HYBRID');

-- 活动状态
INSERT INTO dicts (name, code, description)
SELECT '活动状态', 'ACTIVITY_STATUS', '活动进行阶段（进行中/即将开始/已结束）'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM dicts WHERE code = 'ACTIVITY_STATUS');

INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '即将开始', 'upcoming', 1 FROM dicts d WHERE d.code = 'ACTIVITY_STATUS'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'upcoming');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '进行中', 'ongoing', 2 FROM dicts d WHERE d.code = 'ACTIVITY_STATUS'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'ongoing');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '已结束', 'ended', 3 FROM dicts d WHERE d.code = 'ACTIVITY_STATUS'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'ended');

-- 性别
INSERT INTO dicts (name, code, description)
SELECT '性别', 'GENDER', '用户性别枚举'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM dicts WHERE code = 'GENDER');

INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '男', 'male', 1 FROM dicts d WHERE d.code = 'GENDER'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'male');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '女', 'female', 2 FROM dicts d WHERE d.code = 'GENDER'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'female');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '保密', 'secret', 3 FROM dicts d WHERE d.code = 'GENDER'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'secret');

-- 帖子审核状态
INSERT INTO dicts (name, code, description)
SELECT '帖子审核状态', 'POST_AUDIT_STATUS', '帖子审核枚举（待审核/已通过/已拒绝）'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM dicts WHERE code = 'POST_AUDIT_STATUS');

INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '待审核', 'pending', 1 FROM dicts d WHERE d.code = 'POST_AUDIT_STATUS'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'pending');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '已通过', 'approved', 2 FROM dicts d WHERE d.code = 'POST_AUDIT_STATUS'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'approved');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '已拒绝', 'rejected', 3 FROM dicts d WHERE d.code = 'POST_AUDIT_STATUS'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'rejected');

-- 用户认证状态
INSERT INTO dicts (name, code, description)
SELECT '认证状态', 'CERTIFICATION_STATUS', '校园认证状态（草稿/待审核/已认证/已拒绝）'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM dicts WHERE code = 'CERTIFICATION_STATUS');

INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '草稿', 'draft', 1 FROM dicts d WHERE d.code = 'CERTIFICATION_STATUS'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'draft');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '待审核', 'pending', 2 FROM dicts d WHERE d.code = 'CERTIFICATION_STATUS'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'pending');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '已认证', 'verified', 3 FROM dicts d WHERE d.code = 'CERTIFICATION_STATUS'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'verified');
INSERT INTO dict_items (dict_id, label, value, sort)
SELECT d.id, '已拒绝', 'rejected', 4 FROM dicts d WHERE d.code = 'CERTIFICATION_STATUS'
  AND NOT EXISTS (SELECT 1 FROM dict_items i WHERE i.dict_id = d.id AND i.value = 'rejected');

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DROP TABLE IF EXISTS dict_items;
-- DROP TABLE IF EXISTS dicts;
