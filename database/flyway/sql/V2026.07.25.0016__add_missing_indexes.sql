-- ============================================================
-- 迁移：补充缺失的业务查询索引
-- ============================================================
-- 背景：
--   部分表缺少高频查询字段的索引，导致在数据量增长后查询性能下降。
--   本次迁移为以下字段补充索引：
--
--   1. activities.city_name         — 按城市筛选活动
--   2. activities.campus_name        — 按校区筛选活动
--   3. feedback_tickets.status       — 按状态筛选反馈工单
--   4. campus_certifications.status  — 按认证状态筛选
-- ============================================================

-- 1. activities.city_name — 按城市筛选活动
ALTER TABLE activities
    ADD INDEX idx_activities_city (city_name);

-- 2. activities.campus_name — 按校区筛选活动
ALTER TABLE activities
    ADD INDEX idx_activities_campus (campus_name);

-- 3. feedback_tickets.status — 按状态筛选工单
ALTER TABLE feedback_tickets
    ADD INDEX idx_feedback_status (status);

-- 4. campus_certifications.status — 按认证状态筛选
ALTER TABLE campus_certifications
    ADD INDEX idx_cert_status (status);
