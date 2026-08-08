-- ============================================================
-- 迁移：敏感词批量导入任务表（R4-00383）
-- ============================================================
-- 背景：
--   敏感词批量异步导入任务状态原仅存内存（taskRegistry），应用重启/多实例
--   部署后任务状态丢失、客户端轮询 /import/status/{taskId} 查不到任务。
--   本迁移新增任务表，服务层将任务快照落库（内存仍作快速路径，DB 为
--   跨重启/多实例的持久化事实源），支持任务中断后状态可追溯。
--
-- 幂等性：CREATE TABLE 依赖 Flyway 单次执行（validateOnMigrate 校验 checksum）。
-- ============================================================

CREATE TABLE sensitive_word_import_task (
    task_id      VARCHAR(64)  NOT NULL COMMENT '任务 ID（sw-import-{uuid}）',
    total        INT          NOT NULL DEFAULT 0 COMMENT '待导入总条数',
    imported     INT          NOT NULL DEFAULT 0 COMMENT '已导入条数',
    skipped      INT          NOT NULL DEFAULT 0 COMMENT '跳过条数（去重/空词）',
    failed       INT          NOT NULL DEFAULT 0 COMMENT '失败条数',
    status       VARCHAR(16)  NOT NULL COMMENT '任务状态：ACCEPTED/RUNNING/DONE/FAILED/EMPTY_INPUT',
    message      VARCHAR(512) NULL COMMENT '状态描述（进度/结果/异常摘要）',
    operator_id  BIGINT       NULL COMMENT '操作者用户 ID',
    created_at   DATETIME     NOT NULL COMMENT '任务创建时间',
    updated_at   DATETIME     NOT NULL COMMENT '状态更新时间',
    PRIMARY KEY (task_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '敏感词批量导入任务表（R4-00383 落库，跨重启/多实例状态追踪）';

CREATE INDEX idx_sw_import_task_created_at
    ON sensitive_word_import_task (created_at);

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP INDEX idx_sw_import_task_created_at ON sensitive_word_import_task;
-- DROP TABLE sensitive_word_import_task;
