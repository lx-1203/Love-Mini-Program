-- 商业化解锁记录表（P0-17 商业化解锁链路）
--
-- 用途：记录用户已付费解锁的内容（喜欢我列表 / 访客列表），
-- 解锁一次后永久生效，再次请求直接放行不再扣费。
--
-- 唯一键 uk_user_target：(user_id, target_type, target_id) 防止重复扣费/重复解锁。
CREATE TABLE IF NOT EXISTS wallet_unlocks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '解锁用户 ID',
    target_type VARCHAR(32) NOT NULL COMMENT '解锁目标类型：LIKED_ME-喜欢我列表 / VISITOR-访客列表',
    target_id BIGINT NOT NULL DEFAULT 0 COMMENT '解锁目标 ID（如对方用户 ID；列表级解锁时可为 0）',
    amount_cents BIGINT NOT NULL COMMENT '解锁扣费金额（分）',
    created_at DATETIME NOT NULL COMMENT '解锁时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_target (user_id, target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='商业化解锁记录表';
