-- ============================================================
-- R4-00405：官方号活动卡片死链修复
--
-- 背景：official_messages 活动卡片 card_target_url 指向
--   /pages/activities/detail?id=star-confession 与 id=qixi-2026，
-- 对应活动不存在于任何数据源（activities 表无此类 id），点击卡片
-- 跳转进入不存在页面（死链）。
--
-- 处理：改为活动列表页 /pages/activities/index（始终可达），
-- 与 MockOfficialAccountService（R4-00405）口径保持一致。
-- 幂等：UPDATE 天然幂等，可安全重跑。
-- ============================================================
UPDATE official_messages
SET card_target_url = '/pages/activities/index'
WHERE card_target_url IN (
    '/pages/activities/detail?id=star-confession',
    '/pages/activities/detail?id=qixi-2026'
);
