-- Flyway migration: Create campus_certifications table
-- 校园认证表，用于存储用户的校园身份认证信息

CREATE TABLE IF NOT EXISTS campus_certifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    school_name VARCHAR(100) NOT NULL,
    major VARCHAR(100),
    student_id_card_url VARCHAR(512),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/APPROVED/REJECTED',
    reviewer_id BIGINT UNSIGNED,
    review_comment VARCHAR(500),
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
);