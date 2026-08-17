CREATE TABLE IF NOT EXISTS interest_tag (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_key VARCHAR(32) NULL,
    name VARCHAR(32) NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uk_interest_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_interest_tag (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    -- 2026-08-15 修复：users.id 为 BIGINT UNSIGNED，外键列必须同类型（否则 MySQL 报
    -- 「Referencing column 'user_id' and referenced column 'id' ... are incompatible」）
    user_id BIGINT UNSIGNED NOT NULL,
    tag_id BIGINT NOT NULL,
    UNIQUE KEY uk_user_interest_tag (user_id, tag_id),
    INDEX idx_user_interest_tag_user (user_id),
    CONSTRAINT fk_user_interest_tag_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_interest_tag_tag FOREIGN KEY (tag_id) REFERENCES interest_tag(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO interest_tag (group_key, name, enabled) VALUES
('lifestyle', '旅行', 1),
('lifestyle', '摄影', 1),
('lifestyle', '音乐', 1),
('lifestyle', '电影', 1),
('lifestyle', '美食', 1),
('lifestyle', '猫', 1),
('lifestyle', '游戏', 1),
('lifestyle', '阅读', 1);
