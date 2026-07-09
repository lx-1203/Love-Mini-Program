-- 用户在线状态表
-- 记录用户心跳时间、在线状态和设备类型，用于在线状态感知功能
CREATE TABLE IF NOT EXISTS user_online_status (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    last_heartbeat DATETIME NOT NULL,
    status ENUM('online', 'away', 'offline') NOT NULL DEFAULT 'offline',
    device_type VARCHAR(20),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
