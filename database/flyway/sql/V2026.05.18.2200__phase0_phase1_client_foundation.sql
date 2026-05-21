CREATE TABLE IF NOT EXISTS user_basic_profile (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  nickname VARCHAR(64) NOT NULL,
  bio VARCHAR(255) NOT NULL,
  grade_label VARCHAR(32) NOT NULL,
  pronouns VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_basic_profile_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_campus_profile (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  city_name VARCHAR(64) NOT NULL,
  campus_name VARCHAR(128) NOT NULL,
  department_name VARCHAR(128) NOT NULL,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_campus_profile_user (user_id),
  KEY idx_user_campus_profile_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_schedule_profile (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  preferred_campus_area VARCHAR(128) NOT NULL,
  preferred_time_window_json JSON NOT NULL,
  course_block_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_schedule_profile_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_match_ticket (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_uid VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  queue_status VARCHAR(32) NOT NULL DEFAULT 'queued',
  topic_ids_json JSON NOT NULL,
  time_window_code VARCHAR(64) NOT NULL,
  duration_minutes INT NOT NULL,
  temp_chat_session_uid VARCHAR(64) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_match_ticket_uid (ticket_uid),
  KEY idx_user_match_ticket_user_status (user_id, queue_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS temp_chat_session (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_uid VARCHAR(64) NOT NULL,
  match_ticket_uid VARCHAR(64) NOT NULL,
  phase VARCHAR(32) NOT NULL DEFAULT 'matching',
  closes_at DATETIME NOT NULL,
  closed_reason VARCHAR(32) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_temp_chat_session_uid (session_uid),
  KEY idx_temp_chat_session_phase_close (phase, closes_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS temp_chat_message (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_uid VARCHAR(64) NOT NULL,
  message_uid VARCHAR(64) NOT NULL,
  sender_role VARCHAR(16) NOT NULL,
  message_kind VARCHAR(16) NOT NULL,
  message_body TEXT NOT NULL,
  duration_seconds INT DEFAULT NULL,
  sent_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_temp_chat_message_uid (message_uid),
  KEY idx_temp_chat_message_session_time (session_uid, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS temp_chat_contact_exchange (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_uid VARCHAR(64) NOT NULL,
  proposer_role VARCHAR(16) DEFAULT NULL,
  exchange_status VARCHAR(32) NOT NULL DEFAULT 'idle',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_temp_chat_contact_exchange_session (session_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
