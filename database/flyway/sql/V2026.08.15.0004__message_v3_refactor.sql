-- ============================================================
-- 消息模块 V3 重构：官方号合并 + 关系数据字段
-- ============================================================
-- 目标：
--   1. official-assistant 统一为「寻觅助手」；
--   2. official-promoter 停用并迁移历史消息到助手号；
--   3. official_messages 增加活动关联与推荐理由字段，用于活动卡展示。
-- Flyway 仅执行一次，更新类语句天然幂等。
-- ============================================================

-- 1. 官方号改名与停用
UPDATE official_accounts
SET name = '寻觅助手',
    name_en = 'Xunmi Assistant',
    description = '你的恋爱小管家',
    description_en = 'Your love relationship assistant',
    icon_url = '/static/assets/message/svg/assistant_avatar.svg',
    sort_order = 1,
    enabled = 1
WHERE code = 'official-assistant';

UPDATE official_accounts
SET enabled = 0,
    sort_order = 99
WHERE code = 'official-promoter';

-- 2. official_messages 增加活动关联与推荐理由
ALTER TABLE official_messages
    ADD COLUMN card_activity_id BIGINT NULL COMMENT '活动卡关联的 activities.id',
    ADD COLUMN recommend_reason TEXT NULL COMMENT '活动卡推荐理由（面向用户）';

-- 3. 将 official-promoter 的历史消息迁移到 official-assistant
UPDATE official_messages om
JOIN official_accounts old_acc ON old_acc.id = om.account_id
JOIN official_accounts new_acc ON new_acc.code = 'official-assistant'
SET om.account_id = new_acc.id
WHERE old_acc.code = 'official-promoter';

-- 4. 活动卡补充推荐理由与活动列表跳转（真实活动 ID 由后续种子维护；此处先确保链接可达）
UPDATE official_messages
SET card_target_url = '/subpackages/discover/activities/index'
WHERE message_type = 'card'
  AND (card_target_url IS NULL OR card_target_url = '' OR card_target_url LIKE '%/pages/activities/index%');
