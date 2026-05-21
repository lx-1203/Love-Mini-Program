CREATE TABLE IF NOT EXISTS app_login_hero_config (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  scene_key VARCHAR(64) NOT NULL,
  hero_mode VARCHAR(16) NOT NULL DEFAULT 'animation',
  hero_video_url VARCHAR(512) DEFAULT NULL,
  hero_poster_url VARCHAR(512) DEFAULT NULL,
  hero_animation_theme VARCHAR(64) NOT NULL DEFAULT 'campus-night',
  hero_title VARCHAR(128) NOT NULL,
  hero_subtitle VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_app_login_hero_scene_key (scene_key),
  KEY idx_app_login_hero_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO app_login_hero_config (
  scene_key,
  hero_mode,
  hero_video_url,
  hero_poster_url,
  hero_animation_theme,
  hero_title,
  hero_subtitle,
  is_active
) VALUES (
  'default',
  'animation',
  NULL,
  NULL,
  'campus-night',
  '欢迎来到校园恋爱社区',
  '内容认识人，活动认识人，再把关系慢慢聊出来。',
  1
)
ON DUPLICATE KEY UPDATE
  hero_mode = VALUES(hero_mode),
  hero_animation_theme = VALUES(hero_animation_theme),
  hero_title = VALUES(hero_title),
  hero_subtitle = VALUES(hero_subtitle),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS chat_ai_feature_flag (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  flag_key VARCHAR(64) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  exposure_scope VARCHAR(32) NOT NULL DEFAULT 'internal',
  description VARCHAR(255) DEFAULT NULL,
  updated_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_chat_ai_feature_flag_key (flag_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO chat_ai_feature_flag (
  flag_key,
  enabled,
  exposure_scope,
  description
) VALUES (
  'chat_ai_enabled',
  0,
  'internal',
  'Reserved for future AI conversation assistant. Disabled in phase one.'
)
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  exposure_scope = VALUES(exposure_scope),
  description = VALUES(description),
  updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS chat_ai_session_context (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  chat_thread_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  context_payload JSON NOT NULL,
  source_type VARCHAR(32) NOT NULL DEFAULT 'reserved',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_ai_session_context_thread_user (chat_thread_id, user_id),
  KEY idx_chat_ai_session_context_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS chat_ai_suggestion_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  chat_thread_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  suggestion_text TEXT NOT NULL,
  suggestion_status VARCHAR(32) NOT NULL DEFAULT 'reserved',
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consumed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_chat_ai_suggestion_log_thread_user (chat_thread_id, user_id),
  KEY idx_chat_ai_suggestion_log_generated (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_feedback_ticket (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_type VARCHAR(32) NOT NULL,
  submitter_user_id BIGINT UNSIGNED NOT NULL,
  submitter_phone VARCHAR(32) NOT NULL,
  submitter_campus_id BIGINT UNSIGNED DEFAULT NULL,
  title VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  contact_wechat VARCHAR(64) DEFAULT NULL,
  attachment_json JSON DEFAULT NULL,
  latest_reply_summary VARCHAR(255) DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'submitted',
  handled_by BIGINT UNSIGNED DEFAULT NULL,
  handled_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_feedback_ticket_type_status (ticket_type, status),
  KEY idx_user_feedback_ticket_submitter (submitter_user_id, created_at),
  KEY idx_user_feedback_ticket_campus (submitter_campus_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS activity_proposal (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  submitter_user_id BIGINT UNSIGNED NOT NULL,
  submitter_phone VARCHAR(32) NOT NULL,
  submitter_campus_id BIGINT UNSIGNED DEFAULT NULL,
  proposal_scope VARCHAR(32) NOT NULL DEFAULT 'city',
  title VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  expected_city VARCHAR(64) DEFAULT NULL,
  expected_campus VARCHAR(128) DEFAULT NULL,
  expected_time_window VARCHAR(128) DEFAULT NULL,
  attachment_json JSON DEFAULT NULL,
  latest_reply_summary VARCHAR(255) DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'submitted',
  converted_activity_id BIGINT UNSIGNED DEFAULT NULL,
  handled_by BIGINT UNSIGNED DEFAULT NULL,
  handled_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_proposal_status_scope (status, proposal_scope),
  KEY idx_activity_proposal_submitter (submitter_user_id, created_at),
  KEY idx_activity_proposal_campus (submitter_campus_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS feedback_admin_reply (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_type VARCHAR(32) NOT NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  replier_user_id BIGINT UNSIGNED NOT NULL,
  reply_content TEXT NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_feedback_admin_reply_source (source_type, source_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
