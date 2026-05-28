-- V2026.05.28.0008: Create daily_benefits table for check-in reward tracking.
-- Records check-in benefits per user per day: extra recommendation quota,
-- hot topics unlock status, and new circle users unlock status.
CREATE TABLE IF NOT EXISTS daily_benefits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    benefit_date DATE NOT NULL,
    extra_recommend_quota INT NOT NULL DEFAULT 0,
    hot_topics_unlocked BOOLEAN NOT NULL DEFAULT TRUE,
    new_users_unlocked BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date (user_id, benefit_date),
    CONSTRAINT fk_daily_benefits_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
