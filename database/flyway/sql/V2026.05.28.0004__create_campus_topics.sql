CREATE TABLE IF NOT EXISTS campus_topics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    school_id BIGINT UNSIGNED NOT NULL,
    category VARCHAR(50) NOT NULL COMMENT 'course/club/activity/study/life/alumni',
    title VARCHAR(200) NOT NULL,
    content TEXT,
    images JSON,
    author_id BIGINT UNSIGNED NOT NULL,
    reply_count INT NOT NULL DEFAULT 0,
    view_count INT NOT NULL DEFAULT 0,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_school_category (school_id, category),
    INDEX idx_school_created (school_id, created_at DESC),
    INDEX idx_author (author_id),
    FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS campus_topic_replies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    topic_id BIGINT UNSIGNED NOT NULL,
    author_id BIGINT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_topic (topic_id),
    FOREIGN KEY (topic_id) REFERENCES campus_topics(id),
    FOREIGN KEY (author_id) REFERENCES users(id)
);