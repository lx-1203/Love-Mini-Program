-- 修复 Entity 与 DDL 字段不一致问题
-- P1-H3: 对齐 Java Entity 定义与数据库表结构

-- DailyQuestion 添加 category 列（Entity 中已定义，DDL 缺失）
ALTER TABLE daily_questions ADD COLUMN category VARCHAR(32) DEFAULT NULL AFTER question_text;

-- PrivateMessage 添加 quote_context 列（Entity 中已定义，DDL 缺失）
ALTER TABLE private_messages ADD COLUMN quote_context TEXT DEFAULT NULL AFTER message_kind;

-- Posts category ENUM 添加 campus 值（Entity 中已包含，DDL 缺失）
ALTER TABLE posts MODIFY COLUMN category ENUM('all','interest','sincere','hometown','anonymous','latest','campus') NOT NULL DEFAULT 'all';

-- DailyBenefit 修改默认值从0改为5（Entity 中默认值为5，DDL 为0）
ALTER TABLE daily_benefits MODIFY COLUMN extra_recommend_quota INT NOT NULL DEFAULT 5;
