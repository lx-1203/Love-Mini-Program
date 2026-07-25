-- ============================================================
-- 功能6：通知免打扰设置表
-- ============================================================
-- 用途：记录用户的通知免打扰偏好，在指定时间段内不接收消息推送。
--
-- 字段说明：
--   id              - 主键，自增
--   user_id         - 用户 ID（唯一，一个用户一条记录）
--   enabled         - 是否开启免打扰
--   start_time      - 免打扰开始时间（HH:mm 格式，如 22:00）
--   end_time        - 免打扰结束时间（HH:mm 格式，如 08:00）
--   repeat_mode     - 重复方式：EVERYDAY / WEEKDAYS / WEEKENDS / CUSTOM
--   custom_weekdays - 自定义重复的星期（CSV，1-7，仅 repeat_mode=CUSTOM 时使用）
--   allow_urgent    - 是否允许紧急消息穿透免打扰
--   updated_at      - 更新时间
--
-- 唯一约束：user_id 唯一，确保一个用户仅有一条偏好记录
-- ============================================================

CREATE TABLE IF NOT EXISTS dnd_settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户 ID',
    enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否开启免打扰：0=关闭，1=开启',
    start_time VARCHAR(8) NOT NULL DEFAULT '22:00' COMMENT '免打扰开始时间（HH:mm）',
    end_time VARCHAR(8) NOT NULL DEFAULT '08:00' COMMENT '免打扰结束时间（HH:mm）',
    repeat_mode VARCHAR(16) NOT NULL DEFAULT 'EVERYDAY' COMMENT '重复方式：EVERYDAY/WEEKDAYS/WEEKENDS/CUSTOM',
    custom_weekdays VARCHAR(16) DEFAULT NULL COMMENT '自定义星期（CSV，1-7），仅 CUSTOM 模式使用',
    allow_urgent TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否允许紧急消息穿透：0=不允许，1=允许',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_dnd_user_id (user_id),
    KEY idx_dnd_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通知免打扰设置表';
