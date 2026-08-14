-- ============================================================
-- 迁移：任务领取记录表（3-J 任务与积分）
-- ============================================================
-- 背景（2026-08-10）：
--   1. 任务中心（前端 pages/profile/tasks.vue）：
--      - daily-checkin（每日签到，+5 积分）
--      - complete-profile（完善资料，+50 积分）
--      - first-post（发布首条动态，+20 积分）
--      - campus-verify（完成校园认证，+100 积分）
--   2. 领取语义：
--      - 每日任务（daily-checkin）：claim_date = 当日，唯一约束
--        (user_id, task_code, claim_date) 防同日重复领取；次日可再领；
--      - 一次性任务（complete-profile / first-post / campus-verify）：
--        claim_date = NULL，应用层校验「同一任务只可领取一次」；
--        （MySQL 唯一索引允许多个 NULL，故由服务层先查后写兜底）
--   3. 奖励发放：领取成功即调用 walletService.recharge 入「交友币钱包」，
--      流水 relatedType = TASK_REWARD，orderId = TASK-{taskCode}-{userId}[-{yyyyMMdd}]。
-- ============================================================

CREATE TABLE task_claim (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    user_id BIGINT NOT NULL COMMENT '用户ID（users.id）',
    task_code VARCHAR(32) NOT NULL COMMENT '任务编码：daily-checkin/complete-profile/first-post/campus-verify',
    claim_date DATE NULL COMMENT '领取日期：每日任务=当日；一次性任务=NULL（服务层校验防重复）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '领取时间',
    UNIQUE KEY uk_task_claim_user_code_date (user_id, task_code, claim_date),
    KEY idx_task_claim_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务领取记录表';
