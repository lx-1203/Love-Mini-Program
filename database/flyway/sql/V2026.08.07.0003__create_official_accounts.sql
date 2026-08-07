-- ============================================================
-- 迁移：官方号体系（产品助手号 / 活动运营号）
-- ============================================================
-- 背景：
--   消息列表「官方号」会话此前为前端本地 mock（official-chat 页硬编码 i18n 文案），
--   后端无官方账号概念。本次引入两张表承载官方号账号元信息与消息流：
--
--   official_accounts  官方账号表（code 唯一，如 official-assistant / official-promoter）
--   official_messages  官方消息表（text 文本消息 / card 活动卡片消息，含 CTA）
--
--   消息文案与前端既有 i18n 键（officialAssistantMsg1-4 / officialPromoterMsg1-3）
--   对齐；账号名统一为「产品助手」「活动运营」（设计稿口径）。
--
-- 幂等性：information_schema 检查表存在性后 CREATE TABLE，种子数据 WHERE NOT EXISTS，可安全重跑。
-- ============================================================

-- ---------- official_accounts ----------
SET @has_accounts := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'official_accounts'
);

SET @sql_accounts := IF(
    @has_accounts = 0,
    'CREATE TABLE official_accounts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(32) NOT NULL COMMENT ''官方号唯一标识（official-assistant / official-promoter）'',
        name VARCHAR(64) NOT NULL COMMENT ''官方号名称（中文，如 产品助手）'',
        name_en VARCHAR(64) NOT NULL DEFAULT '''' COMMENT ''官方号名称（英文）'',
        description VARCHAR(255) NOT NULL DEFAULT '''' COMMENT ''官方号简介（中文）'',
        description_en VARCHAR(255) NOT NULL DEFAULT '''' COMMENT ''官方号简介（英文）'',
        icon_url VARCHAR(512) NOT NULL DEFAULT '''' COMMENT ''官方号专属头像 URL（空时前端用默认图标）'',
        sort_order INT NOT NULL DEFAULT 0 COMMENT ''展示顺序（升序）'',
        enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''是否启用（0=下线）'',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_official_accounts_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''官方账号表''',
    'SELECT 1'
);
PREPARE stmt_accounts FROM @sql_accounts;
EXECUTE stmt_accounts;
DEALLOCATE PREPARE stmt_accounts;

-- ---------- official_messages ----------
SET @has_messages := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'official_messages'
);

SET @sql_messages := IF(
    @has_messages = 0,
    'CREATE TABLE official_messages (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        account_id BIGINT NOT NULL COMMENT ''所属官方号 ID（FK -> official_accounts.id）'',
        message_type VARCHAR(16) NOT NULL DEFAULT ''text'' COMMENT ''消息类型：text 文本 / card 活动卡片'',
        content TEXT NOT NULL COMMENT ''消息正文（card 类型为卡片副标题文案）'',
        card_title VARCHAR(128) NULL COMMENT ''活动卡片标题（card 类型）'',
        card_desc VARCHAR(255) NULL COMMENT ''活动卡片描述（card 类型）'',
        card_tag VARCHAR(32) NULL COMMENT ''活动卡片角标（如 七夕限定）'',
        card_target_url VARCHAR(512) NULL COMMENT ''活动卡片 CTA 跳转地址'',
        sort_order INT NOT NULL DEFAULT 0 COMMENT ''消息顺序（升序展示）'',
        published_at DATETIME NOT NULL COMMENT ''发布时间（列表预览取最新一条）'',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_official_messages_account_published (account_id, published_at),
        CONSTRAINT fk_official_messages_account
            FOREIGN KEY (account_id) REFERENCES official_accounts (id)
            ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT=''官方号消息表''',
    'SELECT 1'
);
PREPARE stmt_messages FROM @sql_messages;
EXECUTE stmt_messages;
DEALLOCATE PREPARE stmt_messages;

-- ============================================================
-- 种子数据（WHERE NOT EXISTS 幂等）
-- ============================================================

-- 产品助手号（系统通知 · 功能答疑）
INSERT INTO official_accounts (code, name, name_en, description, description_en, sort_order, enabled)
SELECT 'official-assistant', '产品助手', 'Assistant', '系统通知 · 功能答疑', 'System notices & help', 1, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM official_accounts WHERE code = 'official-assistant');

-- 活动运营号（活动推送 · 福利通知）
INSERT INTO official_accounts (code, name, name_en, description, description_en, sort_order, enabled)
SELECT 'official-promoter', '活动运营', 'Promoter', '活动推送 · 福利通知', 'Events & benefits', 2, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM official_accounts WHERE code = 'official-promoter');

-- 产品助手消息流（4 条 text）
INSERT INTO official_messages (account_id, message_type, content, sort_order, published_at)
SELECT a.id, 'text', '你好，我是产品助手 🤖 有任何恋爱困惑、功能使用问题都可以问我～', 1,
       DATE_SUB(NOW(), INTERVAL 4 DAY)
FROM official_accounts a
WHERE a.code = 'official-assistant'
  AND NOT EXISTS (
      SELECT 1 FROM official_messages m
      JOIN official_accounts a2 ON a2.id = m.account_id
      WHERE a2.code = 'official-assistant' AND m.content LIKE '%产品助手%'
  );

INSERT INTO official_messages (account_id, message_type, content, sort_order, published_at)
SELECT a.id, 'text', '解锁访客 / 喜欢你：进入消息页点击对应入口，可使用交友币解锁全部内容。', 2,
       DATE_SUB(NOW(), INTERVAL 3 DAY)
FROM official_accounts a
WHERE a.code = 'official-assistant'
  AND NOT EXISTS (
      SELECT 1 FROM official_messages m
      JOIN official_accounts a2 ON a2.id = m.account_id
      WHERE a2.code = 'official-assistant' AND m.content LIKE '%交友币解锁全部内容%'
  );

INSERT INTO official_messages (account_id, message_type, content, sort_order, published_at)
SELECT a.id, 'text', '缘分速配玩法：随机匹配后，互发 5 条解锁更多信息，聊满 20 条解锁 TA 的主页。', 3,
       DATE_SUB(NOW(), INTERVAL 2 DAY)
FROM official_accounts a
WHERE a.code = 'official-assistant'
  AND NOT EXISTS (
      SELECT 1 FROM official_messages m
      JOIN official_accounts a2 ON a2.id = m.account_id
      WHERE a2.code = 'official-assistant' AND m.content LIKE '%缘分速配玩法%'
  );

INSERT INTO official_messages (account_id, message_type, content, sort_order, published_at)
SELECT a.id, 'text', '开通会员后，访客 / 喜欢你 / 私信全部免费解锁，快去看看吧～', 4,
       DATE_SUB(NOW(), INTERVAL 1 DAY)
FROM official_accounts a
WHERE a.code = 'official-assistant'
  AND NOT EXISTS (
      SELECT 1 FROM official_messages m
      JOIN official_accounts a2 ON a2.id = m.account_id
      WHERE a2.code = 'official-assistant' AND m.content LIKE '%全部免费解锁%'
  );

-- 活动运营消息流（2 条 text + 2 条 card）
INSERT INTO official_messages (account_id, message_type, content, sort_order, published_at)
SELECT a.id, 'text', '每日签到可领交友币，连续签到奖励翻倍！', 1,
       DATE_SUB(NOW(), INTERVAL 5 DAY)
FROM official_accounts a
WHERE a.code = 'official-promoter'
  AND NOT EXISTS (
      SELECT 1 FROM official_messages m
      JOIN official_accounts a2 ON a2.id = m.account_id
      WHERE a2.code = 'official-promoter' AND m.content LIKE '%连续签到奖励翻倍%'
  );

INSERT INTO official_messages (account_id, message_type, content, sort_order, published_at)
SELECT a.id, 'card', '本周五晚 19:00 校园操场，现场抽幸运观众上台告白～', 2,
       DATE_SUB(NOW(), INTERVAL 4 DAY)
FROM official_accounts a
WHERE a.code = 'official-promoter'
  AND NOT EXISTS (
      SELECT 1 FROM official_messages m
      JOIN official_accounts a2 ON a2.id = m.account_id
      WHERE a2.code = 'official-promoter' AND m.card_title = '校园操场「星空告白夜」'
  );

UPDATE official_messages m
JOIN official_accounts a ON a.id = m.account_id
SET m.card_title = '校园操场「星空告白夜」',
    m.card_desc = '本周五晚 19:00 · 现场抽幸运观众上台告白',
    m.card_tag = '本周活动',
    m.card_target_url = '/pages/activities/detail?id=star-confession'
WHERE a.code = 'official-promoter' AND m.card_title = '校园操场「星空告白夜」';

INSERT INTO official_messages (account_id, message_type, content, sort_order, published_at)
SELECT a.id, 'text', '七夕特别企划：在星空下认识心动的人，游戏与表白墙等你来解锁。', 3,
       DATE_SUB(NOW(), INTERVAL 2 DAY)
FROM official_accounts a
WHERE a.code = 'official-promoter'
  AND NOT EXISTS (
      SELECT 1 FROM official_messages m
      JOIN official_accounts a2 ON a2.id = m.account_id
      WHERE a2.code = 'official-promoter' AND m.content LIKE '%七夕特别企划%'
  );

INSERT INTO official_messages (account_id, message_type, content, sort_order, published_at)
SELECT a.id, 'card', '在星空下认识心动的人，游戏与表白墙等你来解锁。', 4,
       DATE_SUB(NOW(), INTERVAL 1 DAY)
FROM official_accounts a
WHERE a.code = 'official-promoter'
  AND NOT EXISTS (
      SELECT 1 FROM official_messages m
      JOIN official_accounts a2 ON a2.id = m.account_id
      WHERE a2.code = 'official-promoter' AND m.card_title = '七夕特别企划：星空告白夜'
  );

UPDATE official_messages m
JOIN official_accounts a ON a.id = m.account_id
SET m.card_title = '七夕特别企划：星空告白夜',
    m.card_desc = '在星空下认识心动的人，游戏与表白墙等你来解锁。',
    m.card_tag = '七夕限定',
    m.card_target_url = '/pages/activities/detail?id=qixi-2026'
WHERE a.code = 'official-promoter' AND m.card_title = '七夕特别企划：星空告白夜';

-- ============================================================
-- DOWN 回滚脚本（手动执行）
-- ============================================================
-- DROP TABLE IF EXISTS official_messages;
-- DROP TABLE IF EXISTS official_accounts;
