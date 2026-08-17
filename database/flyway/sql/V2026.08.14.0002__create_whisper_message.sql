-- 悄悄话（付费留言）表（v3.1 契约 §9/§10）
-- 同一对用户 A↔B 最多 1 条有效（服务层校验）；发送者每日 ≤5 条（服务层校验）
-- 幂等：uk_whisper_client_request（同一 clientRequestId 只扣一次费、只生成一条记录）
CREATE TABLE whisper_message (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sender_id BIGINT NOT NULL COMMENT '发送者用户 ID',
    receiver_id BIGINT NOT NULL COMMENT '接收者用户 ID',
    content VARCHAR(60) NOT NULL COMMENT '留言内容（≤60 字）',
    status VARCHAR(20) NOT NULL COMMENT 'SENT/DELIVERED/READ/PAY_FAILED/REFUNDED',
    client_request_id VARCHAR(64) NOT NULL COMMENT '幂等键',
    price_cents BIGINT NOT NULL DEFAULT 200 COMMENT '扣费金额（分）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    refunded_at DATETIME NULL,
    UNIQUE KEY uk_whisper_client_request (client_request_id),
    KEY idx_whisper_sender (sender_id),
    KEY idx_whisper_receiver_status (receiver_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='悄悄话（付费留言）';
