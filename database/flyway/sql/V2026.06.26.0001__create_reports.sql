-- ============================================================
-- 迁移：创建举报表 reports
-- ============================================================
-- 背景：
--   P1 遗留问题 1 要求补全"举报表与举报全链路"功能：
--   * 客户端可对帖子/评论/用户/话题发起举报
--   * 管理后台可分页查询举报列表并处理（已处理/已驳回）
--   * 处理过程留痕（处理人、处理备注、处理时间）
--
-- 字段说明：
--   * target_type / target_id：被举报目标对象（POST/COMMENT/USER/TOPIC）
--   * reporter_id：举报人用户ID
--   * reason / description：举报原因分类 + 详细描述
--   * status：处理状态（PENDING 待处理 / HANDLED 已处理 / REJECTED 已驳回）
--   * handler_id / handle_remark / handled_at：处理人信息与备注
--
-- 索引说明：
--   * idx_reports_status：按状态筛选（管理后台通常优先看待 PENDING）
--   * idx_reports_target：按目标对象聚合查询（同一目标多次举报）
--   * idx_reports_reporter：按举报人查询（防刷举报）
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
    id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
    target_type     VARCHAR(32)  NOT NULL                COMMENT '举报目标类型 POST/COMMENT/USER/TOPIC',
    target_id       BIGINT       NOT NULL                COMMENT '目标ID',
    reporter_id     BIGINT       NOT NULL                COMMENT '举报人用户ID',
    reason          VARCHAR(64)  NOT NULL                COMMENT '举报原因（简短）',
    description     VARCHAR(500)                         COMMENT '详细描述',
    status          VARCHAR(16)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/HANDLED/REJECTED',
    handler_id      BIGINT                               COMMENT '处理人管理员ID',
    handle_remark   VARCHAR(500)                         COMMENT '处理备注',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    handled_at      DATETIME                             COMMENT '处理时间',
    INDEX idx_reports_status   (status),
    INDEX idx_reports_target   (target_type, target_id),
    INDEX idx_reports_reporter (reporter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='举报表';
