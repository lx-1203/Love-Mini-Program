-- ============================================================
-- 视频通话历史记录表（与 video_calls 区分）
-- ============================================================
-- 用途：记录一次视频通话的历史信息，用于"我的通话记录"列表展示与统计。
--       与 video_calls 表的区别：
--         video_calls          通话进行中的实时状态表（RINGING/ONGOING/ENDED/MISSED/REJECTED）
--         video_call_records   通话历史记录表（INITIATING/CONNECTED/MISSED/REJECTED/FAILED）
--                              用于历史列表展示，不影响实时通话流程。
--
-- 字段说明：
--   id           主键 ID
--   room_id      通话房间 ID（与 video_calls.room_id 关联，全局唯一）
--   caller_id    发起方用户 ID
--   receiver_id  接收方用户 ID
--   start_time   通话开始时间（发起时刻）
--   end_time     通话结束时间（挂断/拒绝/超时时刻）
--   duration     通话时长（秒），仅 CONNECTED 状态下有意义
--   status       通话状态：INITIATING/CONNECTED/MISSED/REJECTED/FAILED
--   created_at   记录创建时间
--   updated_at   记录更新时间
--
-- 索引说明：
--   uk_video_call_records_room_id        room_id 唯一索引，用于按房间号快速定位
--   idx_video_call_records_caller_id     发起方索引，用于"我发起的通话"查询
--   idx_video_call_records_receiver_id   接收方索引，用于"我接听的通话"查询
--   idx_video_call_records_start_time    开始时间索引，用于按时间倒序展示通话记录
--
-- DOWN 回滚：
--   DROP TABLE IF EXISTS video_call_records;
-- ============================================================

CREATE TABLE IF NOT EXISTS `video_call_records` (
    `id`           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `room_id`      VARCHAR(64)  NOT NULL COMMENT '通话房间 ID（与 video_calls.room_id 关联）',
    `caller_id`    BIGINT       NOT NULL COMMENT '发起方用户 ID',
    `receiver_id`  BIGINT       NOT NULL COMMENT '接收方用户 ID',
    `start_time`   DATETIME     NOT NULL COMMENT '通话开始时间（发起时刻）',
    `end_time`     DATETIME     NULL COMMENT '通话结束时间（挂断/拒绝/超时时刻）',
    `duration`     INT          NULL COMMENT '通话时长（秒），仅 CONNECTED 状态下有意义',
    `status`       VARCHAR(16)  NOT NULL DEFAULT 'INITIATING' COMMENT '通话状态：INITIATING/CONNECTED/MISSED/REJECTED/FAILED',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`   DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_video_call_records_room_id` (`room_id`),
    KEY `idx_video_call_records_caller_id` (`caller_id`),
    KEY `idx_video_call_records_receiver_id` (`receiver_id`),
    KEY `idx_video_call_records_start_time` (`start_time`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '视频通话历史记录表';
