-- ============================================================
-- 迁移：为 users 表增加 status 字段，为 posts 表增加 audit_status 字段
-- ============================================================
-- 背景：
--   Phase 2 任务 6（用户管理 API）需要支持用户禁用/启用，
--   原 users 表仅有 role 字段区分角色，无独立的"账号状态"字段。
--   Phase 2 任务 7（内容管理 API）需要帖子审核（通过/拒绝），
--   原 posts 表 status 枚举（active/deleted/hidden）语义为"软删/隐藏"，
--   不能直接复用为审核状态，否则与现有村口业务逻辑冲突。
--
-- 修复内容：
--   1. users 表新增 status 列，取值 active/disabled，默认 active
--   2. posts 表新增 audit_status 列，取值 pending/approved/rejected，默认 approved
--      （存量帖子视为已审核通过，避免影响线上展示）
--
-- 注意事项：
--   * users.status 与 users.role 正交：role 表示身份（USER/ADMIN），
--     status 表示账号是否可用（active/disabled），disabled 用户禁止登录
--   * posts.audit_status 与 posts.status 正交：
--     - status 控制"是否在村口列表展示"（active 才展示）
--     - audit_status 控制"管理员审核结果"（approved 才算通过）
--     - 后续可在 VillageService 中增加 audit_status = 'approved' 的过滤
--   * 本脚本不修改存量业务逻辑，仅补字段；应用层在 Phase 3 进一步完善过滤
-- ============================================================

-- users 表新增 status 字段
ALTER TABLE users
    ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT '账号状态: active/disabled';

-- 兜底：为存量用户回填默认值（ADD COLUMN ... DEFAULT 已覆盖新行，此处保证存量数据）
UPDATE users SET status = 'active' WHERE status IS NULL OR status = '';

-- posts 表新增 audit_status 字段及审核元信息
ALTER TABLE posts
    ADD COLUMN audit_status VARCHAR(16) NOT NULL DEFAULT 'approved' COMMENT '审核状态: pending/approved/rejected',
    ADD COLUMN audit_remark VARCHAR(500) DEFAULT NULL COMMENT '审核备注（拒绝原因等）',
    ADD COLUMN auditor_id BIGINT UNSIGNED DEFAULT NULL COMMENT '审核人用户 ID',
    ADD COLUMN audited_at DATETIME DEFAULT NULL COMMENT '审核时间';

-- 兜底：为存量帖子回填默认值（视为已审核通过）
UPDATE posts SET audit_status = 'approved' WHERE audit_status IS NULL OR audit_status = '';

-- 为筛选场景添加索引
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_posts_audit_status ON posts (audit_status);
