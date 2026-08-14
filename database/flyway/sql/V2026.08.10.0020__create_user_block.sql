-- ============================================================
-- 迁移：用户拉黑关系表（3-F 拉黑）
-- ============================================================
-- 背景（2026-08-10）：
--   1. 用户可拉黑其他用户，拉黑后：
--      - 双方无法再互相发送私信消息；
--      - 会话列表过滤掉被拉黑/拉黑自己的会话；
--      - 推荐/匹配候选排除拉黑双方；
--   2. 幂等：同一 (user_id, blocked_user_id) 唯一约束，重复拉黑不产生重复记录；
--   3. 拉黑是单向关系：A 拉黑 B 不影响 B 拉黑 A（A 拉黑 B 时，B 仍可查看 A
--      的资料页，但双方都不能再向对方发送消息——消息发送拦截为双向校验）。
-- ============================================================

CREATE TABLE user_block (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    user_id BIGINT NOT NULL COMMENT '拉黑发起方用户ID（users.id）',
    blocked_user_id BIGINT NOT NULL COMMENT '被拉黑用户ID（users.id）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '拉黑时间',
    UNIQUE KEY uk_user_block_pair (user_id, blocked_user_id),
    KEY idx_user_block_user (user_id),
    KEY idx_user_block_blocked (blocked_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户拉黑关系表';
