-- ============================================================
-- 迁移：邀请码表 + 邀请奖励表（3-K 邀请奖励）
-- ============================================================
-- 背景（2026-08-10）：
--   1. 每个用户至多一个邀请码（uk_invite_code_user），code 全局唯一；
--   2. 被邀请用户通过「输入邀请码」绑定邀请人：
--      - 不能邀请自己（服务层校验）；
--      - 一个用户只能被绑定一次（uk_invite_reward_invitee 唯一约束 + 服务层校验）；
--   3. 奖励发放：accept 时即发放（最简单可靠，邀请人 wallet 入账，
--      relatedType = INVITE_REWARD，orderId = INVITE-{inviteeUserId}）；
--      TODO(产品)：可改为「被邀请人完成注册后发奖励」，届时在 accept 后
--      增加注册完成事件触发发放（invite_reward.status 已预留 PENDING/GRANTED/FAILED）。
-- ============================================================

CREATE TABLE invite_code (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    user_id BIGINT NOT NULL COMMENT '邀请人用户ID（users.id）',
    code VARCHAR(16) NOT NULL COMMENT '邀请码（全局唯一）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_invite_code_code (code),
    UNIQUE KEY uk_invite_code_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户邀请码表';

CREATE TABLE invite_reward (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    inviter_user_id BIGINT NOT NULL COMMENT '邀请人用户ID（users.id）',
    invitee_user_id BIGINT NOT NULL COMMENT '被邀请人用户ID（users.id）',
    reward_points INT NOT NULL DEFAULT 0 COMMENT '奖励积分（发放入邀请人钱包）',
    status VARCHAR(16) NOT NULL DEFAULT 'GRANTED' COMMENT '状态：GRANTED 已发放（预留 PENDING/FAILED）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发放时间',
    UNIQUE KEY uk_invite_reward_invitee (invitee_user_id),
    KEY idx_invite_reward_inviter (inviter_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请奖励记录表';
