-- ============================================================
-- 迁移：创建审计日志表 audit_log
-- ============================================================
-- 背景：
--   Phase 2 任务 12 要求对管理端关键操作（审核帖子、禁用用户、修改配置等）
--   进行审计留痕，便于事后追溯与合规检查。
--
-- 实现方式：
--   * 通过 AOP 切面拦截标注 @Auditable 的管理端 Controller 方法
--   * 切面异步写入 audit_log 表，避免阻塞主流程
--   * 请求体中的密码等敏感字段在写入前做脱敏处理
--
-- 字段说明：
--   * operator_id / operator_username / operator_role：操作者信息
--   * operation：操作类型枚举（AUDIT_POST/DISABLE_USER 等）
--   * target_type / target_id：被操作的目标对象
--   * request_method / request_url / request_body：HTTP 请求上下文
--   * response_status / error_message：执行结果
--   * ip / user_agent：来源信息
--   * duration_ms：方法执行耗时
--   * 版本号选用 V2026.06.25.0007 以避免与其他并行子智能体冲突
-- ============================================================

CREATE TABLE audit_log (
    id                 BIGINT       PRIMARY KEY AUTO_INCREMENT,
    operator_id        BIGINT       NOT NULL                COMMENT '操作者用户ID',
    operator_username  VARCHAR(64)  NOT NULL                COMMENT '操作者用户名',
    operator_role      VARCHAR(16)  NOT NULL                COMMENT '操作者角色（ADMIN/USER）',
    operation          VARCHAR(64)  NOT NULL                COMMENT '操作类型（如 AUDIT_POST、DISABLE_USER）',
    target_type        VARCHAR(32)           COMMENT '目标对象类型',
    target_id          VARCHAR(64)           COMMENT '目标对象ID',
    request_method     VARCHAR(8)            COMMENT 'HTTP方法',
    request_url        VARCHAR(256)          COMMENT '请求URL',
    request_body       TEXT                  COMMENT '请求体（脱敏后）',
    response_status    INT                   COMMENT '响应状态码',
    error_message      VARCHAR(512)          COMMENT '错误信息',
    ip                 VARCHAR(64)           COMMENT '操作者IP',
    user_agent         VARCHAR(256)          COMMENT 'User-Agent',
    duration_ms        BIGINT                COMMENT '耗时毫秒',
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_audit_operator   (operator_id),
    INDEX idx_audit_operation  (operation),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审计日志表';
