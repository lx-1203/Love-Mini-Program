-- ============================================================
-- R4-00373：消息 outbox 事件表（MQ 不可用时的补偿重投）
--
-- 背景：MessageProducer 在 RabbitTemplate 为 null 或发送失败时仅记日志丢弃消息，
-- 通知/匹配事件在高峰或 MQ 抖动期丢失且不可追溯（FIN-00046「日志+丢弃」）。
--
-- 方案：发送前/发送失败时落库 outbox_event，定时任务扫描 PENDING 事件补偿重投，
-- 成功置 SENT；重试超过上限置 FAILED 供人工介入。
-- ============================================================
CREATE TABLE IF NOT EXISTS outbox_event (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    -- 队列类型：notification / match / checkin（对应 MessageProducer 三类发送）
    queue_type VARCHAR(32) NOT NULL COMMENT '队列类型：notification/match/checkin',
    -- 目标交换机与路由键（补偿重投时原样使用）
    exchange_name VARCHAR(128) NOT NULL COMMENT '目标交换机',
    routing_key VARCHAR(128) NOT NULL COMMENT '路由键',
    -- 消息体 JSON（MessageProducer 序列化）
    payload_json TEXT NOT NULL COMMENT '消息体 JSON',
    -- 状态：PENDING 待重投 / SENT 已投递 / FAILED 重试超限
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/SENT/FAILED',
    retry_count INT NOT NULL DEFAULT 0 COMMENT '已重试次数',
    last_error VARCHAR(512) DEFAULT NULL COMMENT '最近一次发送错误信息',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（落库时间）',
    sent_at DATETIME DEFAULT NULL COMMENT '补偿投递成功时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_outbox_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='消息 outbox 事件表（MQ 补偿重投）';
