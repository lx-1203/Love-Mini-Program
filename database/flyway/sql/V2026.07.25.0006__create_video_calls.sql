-- ============================================================
-- 视频通话记录表
-- ============================================================
-- 用途：记录一次视频通话的发起方、接收方、开始时间、结束时间、通话时长及通话状态。
--       用于视频通话历史查询、统计分析与异常排查。
--
-- 字段说明：
--   id           主键 ID
--   room_id      通话房间 ID（WebRTC 房间号，全局唯一）
--   caller_id    发起方用户 ID
--   callee_id    接收方用户 ID
--   status       通话状态：RINGING/ONGOING/ENDED/MISSED/REJECTED
--   started_at   通话开始时间（接听时刻，可空）
--   ended_at     通话结束时间（挂断时刻，可空）
--   duration_sec 通话时长（秒），结束后填充
--   end_reason   结束原因：CALLER_HANGUP/CALLEE_HANGUP/TIMEOUT/NETWORK_ERROR
--   created_at   记录创建时间
--   updated_at   记录更新时间
--
-- 索引说明：
--   uk_video_calls_room_id     room_id 唯一索引，用于按房间号快速定位
--   idx_video_calls_caller_id  发起方索引，用于用户通话历史查询
--   idx_video_calls_callee_id  接收方索引，用于用户通话历史查询
--   idx_video_calls_status     状态索引，用于定时任务扫描超时通话
--
-- DOWN 回滚：
--   DROP TABLE IF EXISTS video_calls;
-- ============================================================

CREATE TABLE IF NOT EXISTS `video_calls` (
    `id`            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `room_id`       VARCHAR(64)  NOT NULL COMMENT '通话房间 ID（WebRTC 房间号，全局唯一）',
    `caller_id`     BIGINT       NOT NULL COMMENT '发起方用户 ID',
    `callee_id`     BIGINT       NOT NULL COMMENT '接收方用户 ID',
    `status`        VARCHAR(16)  NOT NULL DEFAULT 'RINGING' COMMENT '通话状态：RINGING/ONGOING/ENDED/MISSED/REJECTED',
    `started_at`    DATETIME     NULL COMMENT '通话开始时间（接听时刻）',
    `ended_at`      DATETIME     NULL COMMENT '通话结束时间（挂断时刻）',
    `duration_sec`  INT          NULL COMMENT '通话时长（秒）',
    `end_reason`    VARCHAR(32)  NULL COMMENT '结束原因：CALLER_HANGUP/CALLEE_HANGUP/TIMEOUT/NETWORK_ERROR',
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`    DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_video_calls_room_id` (`room_id`),
    KEY `idx_video_calls_caller_id` (`caller_id`),
    KEY `idx_video_calls_callee_id` (`callee_id`),
    KEY `idx_video_calls_status` (`status`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '视频通话记录表';
