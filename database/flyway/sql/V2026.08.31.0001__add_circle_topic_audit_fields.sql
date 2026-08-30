-- 圈子话题后台审核链路（CircleTopic）。
-- 背景：圈子发帖后进入待审（audit_status = pending），由管理后台审核
-- （approved / rejected），前台仅展示已审核话题。
-- 说明：audit_status 默认 'approved'，兼容存量数据（既有话题无需重新审核即可展示）。
--       audit_remark / auditor_id / audited_at 为审核记录元数据，默认 NULL。
ALTER TABLE circle_topics
    ADD COLUMN audit_status VARCHAR(16) NOT NULL DEFAULT 'approved',
    ADD COLUMN audit_remark VARCHAR(500) NULL,
    ADD COLUMN auditor_id BIGINT NULL,
    ADD COLUMN audited_at DATETIME NULL;