-- ============================================================
-- 迁移：创建通知配置表与敏感词管理表
-- ============================================================
-- 背景：
--   Phase 2 任务 11 要求支持通知配置（按类型启停 + 模板）和敏感词动态管理。
--   原先敏感词列表仅通过 application-*.yml 的 app.content-filter.keywords 静态配置，
--   不支持后台动态增删。本迁移新增 sensitive_word 表持久化敏感词库，
--   并新增 notify_config 表持久化各通知类型的启停状态与模板内容。
--
-- 说明：
--   * 版本号选用 V2026.06.25.0006 以避免与其他并行子智能体可能使用的 V0004/V0005 冲突
--   * notify_config.type 取值如：LIKE / COMMENT / FOLLOW / VISITOR / MATCH / SYSTEM 等
--   * sensitive_word.category 取值如：POLITICS / PORN / ABUSE / AD / OTHER（可空）
-- ============================================================

-- ---------- 通知配置表 ----------
CREATE TABLE notify_config (
    id          BIGINT       PRIMARY KEY AUTO_INCREMENT,
    type        VARCHAR(32)  NOT NULL COMMENT '通知类型（如 LIKE/COMMENT/FOLLOW/VISITOR/MATCH/SYSTEM）',
    enabled     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否启用：1启用 0停用',
    template    VARCHAR(512) COMMENT '通知模板内容（可空，预留扩展）',
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_notify_config_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知配置表';

-- 预置常见通知类型默认启用
INSERT INTO notify_config (type, enabled, template) VALUES
    ('LIKE',    1, NULL),
    ('COMMENT', 1, NULL),
    ('FOLLOW',  1, NULL),
    ('VISITOR', 1, NULL),
    ('MATCH',   1, NULL),
    ('SYSTEM',  1, NULL);

-- ---------- 敏感词表 ----------
CREATE TABLE sensitive_word (
    id          BIGINT       PRIMARY KEY AUTO_INCREMENT,
    word        VARCHAR(128) NOT NULL COMMENT '敏感词文本',
    category    VARCHAR(32)  COMMENT '分类：POLITICS/PORN/ABUSE/AD/OTHER（可空）',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_sensitive_word (word),
    INDEX idx_sensitive_word_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='敏感词表';

-- 预置若干初始敏感词（占位示例，生产环境由管理员后台维护）
INSERT INTO sensitive_word (word, category) VALUES
    ('赌博', 'OTHER'),
    ('色情', 'PORN'),
    ('毒品', 'OTHER');
