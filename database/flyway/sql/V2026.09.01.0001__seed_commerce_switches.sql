-- ============================================================
-- V2026.09.01.0001: 批次 A 商业化/视频上传功能开关 seed
-- ============================================================
-- 新增 6 个开关 key 到 app_switch 表（ADR-1/ADR-2）：
--   总闸 + 4 个商业化子闸 + 视频上传独立闸
--   value 一律为 false（封存态）：代码层缺省同样为 false，
--   防止漏 seed 时商业化裸奔；放开开关仅需后台置 true，零代码变更。
--
-- 幂等：INSERT ... SELECT ... WHERE NOT EXISTS，重复执行不覆盖已有值
-- （若开关已存在，保留管理员当前设置，不做强制回写）。
-- ============================================================

INSERT INTO app_switch (switch_key, enabled, description, created_at, updated_at, version)
SELECT 'commerce.enabled', FALSE, '商业化总闸：关闭时无视子闸全部付费功能封存', NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_switch WHERE switch_key = 'commerce.enabled');

INSERT INTO app_switch (switch_key, enabled, description, created_at, updated_at, version)
SELECT 'commerce.vip', FALSE, '会员/VIP 子闸：VIP 购买、自动续费开通、优惠码兑换', NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_switch WHERE switch_key = 'commerce.vip');

INSERT INTO app_switch (switch_key, enabled, description, created_at, updated_at, version)
SELECT 'commerce.coin', FALSE, '虚拟货币子闸：钱包充值、交友币扣费、付费内容解锁', NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_switch WHERE switch_key = 'commerce.coin');

INSERT INTO app_switch (switch_key, enabled, description, created_at, updated_at, version)
SELECT 'commerce.course', FALSE, '付费课程子闸：课程报名', NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_switch WHERE switch_key = 'commerce.course');

INSERT INTO app_switch (switch_key, enabled, description, created_at, updated_at, version)
SELECT 'commerce.consult', FALSE, '付费咨询子闸：独立咨询报名端点接入时生效（预留）', NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_switch WHERE switch_key = 'commerce.consult');

INSERT INTO app_switch (switch_key, enabled, description, created_at, updated_at, version)
SELECT 'upload.video.enabled', FALSE, '视频上传独立闸：关闭时 type=video 上传被拒（与商业化总闸解耦）', NOW(), NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM app_switch WHERE switch_key = 'upload.video.enabled');
