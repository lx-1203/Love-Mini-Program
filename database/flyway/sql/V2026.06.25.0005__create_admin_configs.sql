-- ============================================================
-- 迁移：Phase 2 任务 8/9/10 - 创建管理后台配置表
-- ============================================================
-- 背景：
--   管理后台需要支持运行时动态调整：
--   * 系统参数配置（app_config）
--   * 业务规则（app_rule）
--   * 功能开关（app_switch）
--   * 匹配算法权重（match_config）
--   * 推荐策略权重（recommend_strategy）
--
-- 设计说明：
--   1. 所有配置表均使用 key/value 结构，便于动态扩展
--   2. match_config 与 recommend_strategy 中的 value 使用字符串存储，
--      应用层负责按字段类型解析（int / double / boolean）
--   3. 表结构与现有 com.campuslove.api.config.{MatchConfig, RecommendationConfig} 配置类一一对应，
--      管理后台写入数据库后，运行时通过 AdminConfigService 查询并刷新内存配置
--   4. 不修改 application-*.yml；初始 seed 数据使用内置默认值，与 MatchConfig/RecommendationConfig 默认值保持一致
-- ============================================================

-- 1. 系统参数配置表
CREATE TABLE IF NOT EXISTS app_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(128) NOT NULL UNIQUE COMMENT '配置键（如 site.title、register.enabled）',
    config_value TEXT NOT NULL COMMENT '配置值（字符串存储，应用层按需解析）',
    description VARCHAR(255) DEFAULT '' COMMENT '配置说明',
    updated_by BIGINT COMMENT '最后更新者用户ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统参数配置表';

-- 2. 业务规则表
CREATE TABLE IF NOT EXISTS app_rule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(128) NOT NULL UNIQUE COMMENT '规则名称（如 daily_recommend_limit）',
    rule_expression VARCHAR(512) NOT NULL COMMENT '规则表达式/值（如 10、>=5）',
    description VARCHAR(255) DEFAULT '' COMMENT '规则说明',
    enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    updated_by BIGINT COMMENT '最后更新者用户ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='业务规则表';

-- 3. 功能开关表
CREATE TABLE IF NOT EXISTS app_switch (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    switch_key VARCHAR(128) NOT NULL UNIQUE COMMENT '开关键（如 maintenance_mode、register_open）',
    enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否开启',
    description VARCHAR(255) DEFAULT '' COMMENT '开关说明',
    updated_by BIGINT COMMENT '最后更新者用户ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='功能开关表';

-- 4. 匹配算法配置表（与 MatchConfig 字段一一对应）
CREATE TABLE IF NOT EXISTS match_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(128) NOT NULL UNIQUE COMMENT '配置键（如 heartSignalExpireHours、campusWeight）',
    config_value VARCHAR(64) NOT NULL COMMENT '配置值（字符串存储，应用层解析为 int/double/boolean）',
    description VARCHAR(255) DEFAULT '' COMMENT '配置说明',
    updated_by BIGINT COMMENT '最后更新者用户ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='匹配算法配置表';

-- 5. 推荐策略配置表（与 RecommendationConfig 字段一一对应）
CREATE TABLE IF NOT EXISTS recommend_strategy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    strategy_key VARCHAR(128) NOT NULL UNIQUE COMMENT '策略键（如 dailyLimit、campusWeight）',
    strategy_value VARCHAR(64) NOT NULL COMMENT '策略值（字符串存储，应用层解析）',
    description VARCHAR(255) DEFAULT '' COMMENT '策略说明',
    updated_by BIGINT COMMENT '最后更新者用户ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='推荐策略配置表';

-- ============================================================
-- Seed 数据：使用内置默认值，与 MatchConfig / RecommendationConfig 默认值保持一致
-- ============================================================

-- 系统参数配置初始数据
INSERT INTO app_config (config_key, config_value, description) VALUES
    ('site.title', '校园恋爱', '站点标题'),
    ('site.subtitle', '遇见对的人', '站点副标题'),
    ('register.enabled', 'true', '是否开放注册'),
    ('maintenance.mode', 'false', '是否处于维护模式'),
    ('contact.email', 'support@campuslove.example', '联系邮箱')
ON DUPLICATE KEY UPDATE config_value = config_value;

-- 业务规则初始数据
INSERT INTO app_rule (rule_name, rule_expression, description, enabled) VALUES
    ('daily_recommend_limit', '10', '每日推荐数量上限', TRUE),
    ('heart_signal_expire_hours', '48', '心动信号过期小时数', TRUE),
    ('default_chat_duration_minutes', '20', '默认聊天时长（分钟）', TRUE),
    ('candidate_page_size', '50', '匹配候选用户分页大小', TRUE),
    ('min_profile_completion', '60', '推荐最低资料完善度', TRUE)
ON DUPLICATE KEY UPDATE rule_expression = rule_expression;

-- 功能开关初始数据
INSERT INTO app_switch (switch_key, enabled, description) VALUES
    ('maintenance_mode', FALSE, '系统维护模式开关'),
    ('register_open', TRUE, '注册功能开关'),
    ('login_open', TRUE, '登录功能开关'),
    ('match_open', TRUE, '匹配功能开关'),
    ('recommend_open', TRUE, '推荐功能开关'),
    ('post_publish_open', TRUE, '发帖功能开关'),
    ('feedback_open', TRUE, '反馈功能开关')
ON DUPLICATE KEY UPDATE enabled = enabled;

-- 匹配算法配置初始数据（与 MatchConfig 默认值一致）
INSERT INTO match_config (config_key, config_value, description) VALUES
    ('heartSignalExpireHours', '48', '心动信号过期时间（小时）'),
    ('candidatePageSize', '50', '匹配候选用户分页查询数量上限'),
    ('defaultChatDuration', '20', '默认聊天时长（分钟）'),
    ('campusWeight', '50', '同校区权重'),
    ('cityWeight', '20', '同城市权重'),
    ('interestWeight', '10', '兴趣标签匹配权重（每个匹配标签）'),
    ('scheduleWeight', '15', '日程重叠权重')
ON DUPLICATE KEY UPDATE config_value = config_value;

-- 推荐策略配置初始数据（与 RecommendationConfig 默认值一致）
INSERT INTO recommend_strategy (strategy_key, strategy_value, description) VALUES
    ('dailyLimit', '10', '每日推荐上限'),
    ('discussionLimit', '10', '讨论推荐返回数量上限'),
    ('candidatePageSize', '200', '候选用户分页查询数量上限'),
    ('campusWeight', '50', '同校区权重'),
    ('cityWeight', '20', '同城市权重'),
    ('interestWeight', '10', '兴趣标签匹配权重（每个匹配标签）'),
    ('scheduleWeight', '15', '日程重叠权重'),
    ('sameSchoolBoostPercent', '0.30', '同校百分比加成（乘数，默认 0.30 即 +30%）'),
    ('sameMajorWeight', '20', '同专业额外加分'),
    ('commonCircleWeight', '5', '共同兴趣圈每个加分'),
    ('commonDailyAnswerWeight', '3', '共同每日一问回答每个加分'),
    ('circleWeight', '8', '兴趣圈权重'),
    ('sameSchoolBoostEnabled', 'true', '同校百分比加成启用开关')
ON DUPLICATE KEY UPDATE strategy_value = strategy_value;
