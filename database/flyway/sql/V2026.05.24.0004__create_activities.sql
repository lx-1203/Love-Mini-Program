CREATE TABLE IF NOT EXISTS activities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(128) NOT NULL,
    location VARCHAR(256) NOT NULL,
    schedule_text VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    city_name VARCHAR(64) DEFAULT NULL,
    campus_name VARCHAR(128) DEFAULT NULL,
    enrollment_count INT NOT NULL DEFAULT 0,
    participant_avatars JSON DEFAULT NULL,
    status ENUM('upcoming', 'ongoing', 'ended') NOT NULL DEFAULT 'upcoming',
    activity_date DATE DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_activities_status (status),
    KEY idx_activities_date (activity_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='活动表';
