CREATE TABLE IF NOT EXISTS verification_request (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  student_id VARCHAR(32) NOT NULL COMMENT '学号',
  image_path VARCHAR(512) NOT NULL COMMENT '学生证图片存储路径',
  status VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  review_notes VARCHAR(512) DEFAULT NULL COMMENT '审核备注',
  reviewed_by BIGINT UNSIGNED DEFAULT NULL COMMENT '审核管理员ID',
  reviewed_at DATETIME DEFAULT NULL COMMENT '审核时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_verification_request_user (user_id),
  KEY idx_verification_request_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;