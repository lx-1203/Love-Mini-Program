-- 临时会话图片隐私口径 B：会话绑定 + 过期删除 + 举报 hold（2026-10-28）
-- TEMP_CHAT 媒体落盘路径为 temp/{sessionUid}/{uuid}.ext，URL 不含 userId；
-- 读取仅限会话双方，超时（closesAt + 宽限）后清理任务删除消息/资产/文件。
ALTER TABLE media_asset
    ADD COLUMN temp_session_id BIGINT UNSIGNED DEFAULT NULL COMMENT '临时会话 ID（仅 TEMP_CHAT 分类）',
    ADD COLUMN expires_at DATETIME DEFAULT NULL COMMENT '临时媒体删除时刻（T+48h）',
    ADD COLUMN deleted_at DATETIME DEFAULT NULL COMMENT '物理删除登记（墓碑）',
    ADD COLUMN hold_until DATETIME DEFAULT NULL COMMENT '举报取证保留截止（此时间前不删）',
    ADD KEY idx_media_temp_session (temp_session_id),
    ADD KEY idx_media_temp_expiry (expires_at, deleted_at);

-- 举报 hold 审计：谁在何时为何保留了哪条临时媒体
CREATE TABLE IF NOT EXISTS temp_chat_media_holds (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    media_asset_id BIGINT NOT NULL,
    session_uid VARCHAR(64) NOT NULL,
    reason VARCHAR(255) DEFAULT NULL,
    hold_until DATETIME NOT NULL,
    created_by BIGINT UNSIGNED DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_temp_chat_media_holds_asset (media_asset_id),
    KEY idx_temp_chat_media_holds_until (hold_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='临时会话媒体举报保留';
